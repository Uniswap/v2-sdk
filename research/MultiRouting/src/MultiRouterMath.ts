import { Pool, PoolType } from "./MultiRouterTypes";


export function ConstantMeanParamsFromData(data: ArrayBuffer): [number, number] {
    const arr = new Uint8Array(data);
    return [arr[0], 100-arr[0]];
}

export function ConstantMeanDataFromParams(weight0: number, weight1: number): ArrayBuffer {
    console.assert(weight0+weight1 == 100, 'Weight wrong')
    const data = new ArrayBuffer(16);
    const arr = new Uint8Array(data);
    arr[0] = weight0;
    return data;
}

export function HybridParamsFromData(data: ArrayBuffer): number {
    const arr = new Int32Array(data);
    return arr[0];
}

export function HybridDataFromParams(A: number): ArrayBuffer {
    const data = new ArrayBuffer(16);
    const arr = new Int32Array(data);
    arr[0] = A;
    return data;
}

const DCache = new Map<Pool, number>();
export function HybridComputeLiquidity(pool: Pool): number {
    const res = DCache.get(pool);
    if (res != undefined)
        return res;

    const s = pool.reserve0 + pool.reserve1;
    if (s == 0) {
        DCache.set(pool, 0);
        return 0;
    }

    const A = HybridParamsFromData(pool.data);
    const nA = A * 2;

    let prevD;
    let D = s;
    for (let i = 0; i < 256; i++) {
        const dP = D*D*D / (pool.reserve0 * pool.reserve1 * 4);
        prevD = D;
        D = (nA*s + dP * 2)*D/((nA - 1)*D + dP * 3);
        if ( (D - prevD) <= 1 ) {
            break;
        }
    }
    DCache.set(pool, D);
    return D;
}

export function HybridgetY(pool: Pool, x: number): number {
    const D = HybridComputeLiquidity(pool);
    const A = HybridParamsFromData(pool.data);
    return calcSquareEquation(16*A*x, 16*A*x*x + 4*D*x - 16*A*D*x, -D*D*D)[1];
}

export function calcOutByIn(pool:Pool, amountIn: number, direction = true): number {
    const x = direction ? pool.reserve0 : pool.reserve1;
    const y = direction ? pool.reserve1 : pool.reserve0;
    switch(pool.type) {
        case PoolType.ConstantProduct: {
            return y*amountIn/(x/(1-pool.fee) + amountIn);
        } 
        case PoolType.ConstantMean: {
            const [weight0, weight1] = ConstantMeanParamsFromData(pool.data);
            const weightRatio = direction ? weight0/weight1 : weight1/weight0;
            const actualIn = amountIn*(1-pool.fee);
            return y*(1-Math.pow(x/(x+actualIn), weightRatio));
        } 
        case PoolType.Hybrid: {
            const xNew = x + amountIn;
            const yNew = HybridgetY(pool, xNew);
            const dy = (y - yNew)*(1-pool.fee); // TODO: Why other pools take fees at the beginning, and this one - at the end?
            return dy;
        }
    }
    console.error('Unknown pool type');
}

export function calcInByOut(pool:Pool, amountOut: number, direction: boolean): number {
    let input = 0;
    const x = direction ? pool.reserve0 : pool.reserve1;
    const y = direction ? pool.reserve1 : pool.reserve0;
    switch(pool.type) {
        case PoolType.ConstantProduct: {
            input = x*amountOut/(1-pool.fee)/(y - amountOut);
            break;
        } 
        case PoolType.ConstantMean: {
            const [weight0, weight1] = ConstantMeanParamsFromData(pool.data);
            const weightRatio = direction ? weight1/weight0 : weight1/weight0;
            input = x*(1-pool.fee)*(Math.pow(1-amountOut/y, -weightRatio) - 1);
            break;
        } 
        case PoolType.Hybrid: {
            const yNew = y - amountOut/(1-pool.fee);
            const xNew = HybridgetY(pool, yNew);
            input = (x - xNew);
            break;
        }
        default:
            console.error('Unknown pool type');
    }
    ASSERT(() => Math.abs(amountOut/calcOutByIn(pool, input, direction)-1) < 1e-6, "Error 138");
    return input;
}

export function calcPrice(pool:Pool, amountIn: number): number {
    switch(pool.type) {
        case PoolType.ConstantProduct: {
            const x = pool.reserve0/(1-pool.fee);
            return pool.reserve1*x/(x+amountIn)/(x+amountIn);
        } 
        case PoolType.ConstantMean: {
            const [weight0, weight1] = ConstantMeanParamsFromData(pool.data);
            const weightRatio = weight0/weight1;
            const x = pool.reserve0+amountIn*(1-pool.fee);
            return pool.reserve1*weightRatio*(1-pool.fee)*Math.pow(pool.reserve0/x, weightRatio)/x;
        } 
        case PoolType.Hybrid: {
            const D = HybridComputeLiquidity(pool);
            const A = HybridParamsFromData(pool.data);
            const x = pool.reserve0 + amountIn;
            const b = 4*A*x + D - 4*A*D;
            const ac4 = D*D*D/x;
            const Ds = Math.sqrt(b*b + 4*A*ac4);
            const res = (0.5 - (2*b-ac4/x)/Ds/4)*(1-pool.fee);
            return res;
        }
    }
    return 0;
}

function calcInputByPriceConstantMean(pool:Pool, price:number) {
    const w = ConstantMeanParamsFromData(pool.data);
    const weightRatio = w[0]/w[1];
    const t = pool.reserve1*price*weightRatio*(1-pool.fee)*Math.pow(pool.reserve0, weightRatio);
    return (Math.pow(t, 1/(weightRatio+1)) - pool.reserve0)/(1-pool.fee);
}

export function calcInputByPrice(pool: Pool, priceEffective: number, hint = 1): number {
    switch(pool.type) {
        case PoolType.ConstantProduct: {
            const x = pool.reserve0/(1-pool.fee);
            const res =  Math.sqrt(pool.reserve1*x*priceEffective) - x;
            return res;
        } 
        case PoolType.ConstantMean: {
            const res = calcInputByPriceConstantMean(pool, priceEffective);
            return res;
        } 
        case PoolType.Hybrid: {
            return revertPositive( (x:number) => 1/calcPrice(pool, x), priceEffective, hint);
        }
    }
}


//====================== Utils ========================

export function ASSERT(f: () => boolean, t: string) {
    if (!f())
        console.error(t);
}

export function closeValues(a: number, b: number, accuracy: number): boolean {
    return Math.abs(a/b-1) < accuracy;
}

export function calcSquareEquation(a:number, b:number, c:number): [number, number] {
    const D = b*b-4*a*c;
    console.assert(D >= 0, `Discriminant is negative! ${a} ${b} ${c}`);
    const sqrtD = Math.sqrt(D);
    return [(-b-sqrtD)/2/a, (-b+sqrtD)/2/a];
}

// returns such x > 0 that f(x) = out or 0 if there is no such x or f defined not everywhere
// hint - approximation of x to spead up the algorithm
// f assumed to be continues monotone growth function defined everywhere
export function revertPositive(f: (x:number)=>number, out: number, hint = 1) {
    try {
        if (out <= f(0)) return 0;
        let min, max;
        if (f(hint) > out) {
            min = hint/2;
            while (f(min) > out) min /= 2;
            max = min*2;
        } else {
            max = hint*2;
            while (f(max) < out) max *= 2;
            min = max/2;
        }
        
        while((max/min - 1) > 1e-4)
        {
            const x0: number = (min+max)/2;
            const y0 = f(x0);
            if (out == y0) return x0;
            if (out < y0) 
                max=x0;
            else
                min=x0;
        }
        return (min+max)/2;
    } catch (e) {
        return 0;
    }
}