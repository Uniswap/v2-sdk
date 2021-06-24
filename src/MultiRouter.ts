
const LegGasConsuming = 40_000;

enum PoolType {
    ConstantProduct = 'ConstantProduct',
    ConstantMean = 'ConstantMean',
    Hybrid = 'Hybrid'
}

interface Pool {
    address: string;
    type: PoolType;
    reserve0: number;
    reserve1: number;
    data: ArrayBuffer;
    fee: number;
}

abstract class MultiRouter {
    abstract calcOutByIn(amountIn: number): number;
    abstract calcPrice(amountIn: number): number;
    abstract calcInputByPrice(price: number, hint: number): number;
}

class MultiRouterConstantProduct extends MultiRouter {
    pool: Pool;

    constructor(_pool: Pool) {
        super();
        console.assert(_pool.type == PoolType.ConstantProduct, 
            "Wrong pool type " + _pool.type + " != " + PoolType.ConstantProduct);
        this.pool = _pool;
    }

    calcOutByIn(amountIn: number): number {
        const pool = this.pool;
        return pool.reserve1*amountIn/(pool.reserve0/(1-pool.fee) + amountIn);
    }

    calcPrice(amountIn: number): number {
        const pool = this.pool;
        const x = pool.reserve0/(1-pool.fee);
        return pool.reserve1*x/(x+amountIn)/(x+amountIn);
    }

    calcInputByPrice(price: number): number {
        const pool = this.pool;
        const x = pool.reserve0/(1-pool.fee);
        const res =  Math.sqrt(pool.reserve1*x*price) - x;
        return res;
    }
}

class MultiRouterConstantMean extends MultiRouter {
    pool: Pool;

    constructor(_pool: Pool) {
        super();
        console.assert(_pool.type == PoolType.ConstantMean, 
            "Wrong pool type " + _pool.type + " != " + PoolType.ConstantMean);
        this.pool = _pool;
    }

    getWeights(): [number, number] {
        const arr = new Uint8Array(this.pool.data);
        return [arr[0], 100-arr[0]];
    }

    setWeights(weight0: number, weight1: number) {
        console.assert(weight0+weight1 == 100, 'Weight wrong')
        const data = new ArrayBuffer(16);
        const arr = new Uint8Array(data);
        arr[0] = weight0;
        this.pool.data = data;
    }

    calcOutByIn(amountIn: number): number {
        const pool = this.pool;
        const [weight0, weight1] = this.getWeights();
        const weightRatio = weight0/weight1;
        const actualIn = amountIn*(1-pool.fee);
        return pool.reserve1*(1-Math.pow(pool.reserve0/(pool.reserve0+actualIn), weightRatio));
    }

    calcPrice(amountIn: number): number {
        const pool = this.pool;
        const [weight0, weight1] = this.getWeights();
        const weightRatio = weight0/weight1;
        const x = pool.reserve0+amountIn*(1-pool.fee);
        return pool.reserve1*weightRatio*(1-pool.fee)*Math.pow(pool.reserve0/x, weightRatio)/x;
    }

    calcInputByPrice(price: number): number {
        const pool = this.pool;
        const w = this.getWeights();
        const weightRatio = w[0]/w[1];
        const t = pool.reserve1*price*weightRatio*(1-pool.fee)*Math.pow(pool.reserve0, weightRatio);
        return (Math.pow(t, 1/(weightRatio+1)) - pool.reserve0)/(1-pool.fee);
    }
}

class MultiRouterHybrid extends MultiRouter {
    pool: Pool;
    HybridD?: number;

    constructor(_pool: Pool) {
        super();
        console.assert(_pool.type == PoolType.Hybrid, 
            "Wrong pool type " + _pool.type + " != " + PoolType.Hybrid);
        this.pool = _pool;
    }

    getA(): number {
        const arr = new Int32Array(this.pool.data);
        return arr[0];
    }

    setA(A: number) {
        const data = new ArrayBuffer(16);
        const arr = new Int32Array(data);
        arr[0] = A;
        this.pool.data = data;
        this.HybridD = undefined;
    }

    computeLiquidity(): number {
        const pool = this.pool;
        if (this.HybridD != undefined)
            return this.HybridD;

        const s = pool.reserve0 + pool.reserve1;
        if (s == 0) {
            this.HybridD = 0;
            return 0;
        }

        const A = this.getA();
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
        this.HybridD = D;
        return D;
    }

    computeY(x: number): number {
        const D = this.computeLiquidity();
        const A = this.getA();
        return calcSquareEquation(16*A*x, 16*A*x*x + 4*D*x - 16*A*D*x, -D*D*D)[1];
    }

    calcOutByIn(amountIn: number): number {
        const pool = this.pool;
        const xNew = pool.reserve0 + amountIn;
        const yNew = this.computeY(xNew);
        const dy = (pool.reserve1 - yNew)*(1-pool.fee); // TODO: Why other pools take fees at the beginning, and this one - at the end?
        return dy;
    }

    calcPrice(amountIn: number): number {
        const pool = this.pool;
        const D = this.computeLiquidity();
        const A = this.getA();
        const x = pool.reserve0 + amountIn;
        const b = 4*A*x + D - 4*A*D;
        const ac4 = D*D*D/x;
        const Ds = Math.sqrt(b*b + 4*A*ac4);
        const res = (0.5 - (2*b-ac4/x)/Ds/4)*(1-pool.fee);
        return res;
    }

    calcInputByPrice(price: number, hint = 1): number {
        return revertPositive( (x:number) => 1/this.calcPrice(x), price, hint);
    }
}


function calcSquareEquation(a:number, b:number, c:number): [number, number] {
    const D = b*b-4*a*c;
    console.assert(D >= 0, `Discriminant is negative! ${a} ${b} ${c}`);
    const sqrtD = Math.sqrt(D);
    return [(-b-sqrtD)/2/a, (-b+sqrtD)/2/a];
}

// returns such x > 0 that f(x) = out or 0 if there is no such x or f defined not everywhere
// hint - approximation of x to spead up the algorithm
// f assumed to be continues monotone growth function defined everywhere
function revertPositive(f: (x:number)=>number, out: number, hint = 1) {
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