
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

enum Topology {
    Single = "Single",
    Parallel = "Parallel",
    Serial = "Serial"
}

abstract class MultiRouter {
    topology: Topology;

    constructor(_top: Topology) {
        this.topology = _top;
    }

    abstract calcOutByIn(amountIn: number): number;
    abstract calcPrice(amountIn: number): number;
    abstract calcInputByPrice(price: number, hint: number): number;
}

class MultiRouterSingle extends MultiRouter {
    pool: Pool;
    HybridD?: number;

    constructor(_pool: Pool) {
        super(Topology.Single);
        this.pool = _pool;
    }

    getConstantMeanParams(): [number, number] {
        const arr = new Uint8Array(this.pool.data);
        return [arr[0], 100-arr[0]];
    }

    setConstantMeanDataFromParams(weight0: number, weight1: number) {
        console.assert(weight0+weight1 == 100, 'Weight wrong')
        const data = new ArrayBuffer(16);
        const arr = new Uint8Array(data);
        arr[0] = weight0;
        this.pool.data = data;
    }

    getHybridParams(): number {
        const arr = new Int32Array(this.pool.data);
        return arr[0];
    }

    setHybridDataFromParams(A: number) {
        const data = new ArrayBuffer(16);
        const arr = new Int32Array(data);
        arr[0] = A;
        this.pool.data = data;
        this.HybridD = undefined;
    }

    computeHybridLiquidity(): number {
        const pool = this.pool;
        if (this.HybridD != undefined)
            return this.HybridD;

        const s = pool.reserve0 + pool.reserve1;
        if (s == 0) {
            this.HybridD = 0;
            return 0;
        }

        const A = this.getHybridParams();
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

    computeHybridY(x: number): number {
        const D = this.computeHybridLiquidity();
        const A = this.getHybridParams();
        return calcSquareEquation(16*A*x, 16*A*x*x + 4*D*x - 16*A*D*x, -D*D*D)[1];
    }

    calcInputByPriceConstantMean(price:number): number {
        const pool = this.pool;
        const w = this.getConstantMeanParams();
        const weightRatio = w[0]/w[1];
        const t = pool.reserve1*price*weightRatio*(1-pool.fee)*Math.pow(pool.reserve0, weightRatio);
        return (Math.pow(t, 1/(weightRatio+1)) - pool.reserve0)/(1-pool.fee);
    }

    calcOutByIn(amountIn: number): number {
        const pool = this.pool;
        switch(pool.type) {
            case PoolType.ConstantProduct: {
                return pool.reserve1*amountIn/(pool.reserve0/(1-pool.fee) + amountIn);
            } 
            case PoolType.ConstantMean: {
                const [weight0, weight1] = this.getConstantMeanParams();
                const weightRatio = weight0/weight1;
                const actualIn = amountIn*(1-pool.fee);
                return pool.reserve1*(1-Math.pow(pool.reserve0/(pool.reserve0+actualIn), weightRatio));
            } 
            case PoolType.Hybrid: {
                const xNew = pool.reserve0 + amountIn;
                const yNew = this.computeHybridY(xNew);
                const dy = (pool.reserve1 - yNew)*(1-pool.fee); // TODO: Why other pools take fees at the beginning, and this one - at the end?
                return dy;
            }
        }
        console.assert("Unknown Pool type: " + pool.type);
    }

    calcPrice(amountIn: number): number {
        const pool = this.pool;
        switch(pool.type) {
            case PoolType.ConstantProduct: {
                const x = pool.reserve0/(1-pool.fee);
                return pool.reserve1*x/(x+amountIn)/(x+amountIn);
            } 
            case PoolType.ConstantMean: {
                const [weight0, weight1] = this.getConstantMeanParams();
                const weightRatio = weight0/weight1;
                const x = pool.reserve0+amountIn*(1-pool.fee);
                return pool.reserve1*weightRatio*(1-pool.fee)*Math.pow(pool.reserve0/x, weightRatio)/x;
            } 
            case PoolType.Hybrid: {
                const D = this.computeHybridLiquidity();
                const A = this.getHybridParams();
                const x = pool.reserve0 + amountIn;
                const b = 4*A*x + D - 4*A*D;
                const ac4 = D*D*D/x;
                const Ds = Math.sqrt(b*b + 4*A*ac4);
                const res = (0.5 - (2*b-ac4/x)/Ds/4)*(1-pool.fee);
                return res;
            }
        }
        console.assert("Unknown Pool type: " + pool.type);
    }

    calcInputByPrice(price: number, hint = 1): number {
        const pool = this.pool;
        switch(pool.type) {
            case PoolType.ConstantProduct: {
                const x = pool.reserve0/(1-pool.fee);
                const res =  Math.sqrt(pool.reserve1*x*price) - x;
                return res;
            } 
            case PoolType.ConstantMean: {
                const res = this.calcInputByPriceConstantMean(price);
                return res;
            } 
            case PoolType.Hybrid: {
                return revertPositive( (x:number) => 1/this.calcPrice(x), price, hint);
            }
        }
        console.assert("Unknown Pool type: " + pool.type);
    }
}

// class MultiRouterParallel extends MultiRouter {
//     subRouters: MultiRouter[];

//     constructor(_sub: MultiRouter[]) {
//         super(Topology.Parallel);
//         this.subRouters = _sub;
//     }
        
//     findBestDistributionWithoutTransactionCost(
//         amountIn: number,
//         subRouters: MultiRouter[]       // TODO: maybe use initial distribution?
//     ): [number, number[]] {

//         if (subRouters.length == 1) {
//             return [subRouters[0].calcOutByIn(amountIn), [1]];
//         }

//         let distr = subRouters.map(p => Math.max(p.calcOutByIn(amountIn/subRouters.length), 0));
        
//         for(let i = 0; i < 5; ++i) {
//             const sum = distr.reduce((a, b) => a+b, 0);
//             console.assert(sum > 0, "Error 508 " + sum);
            
//             const prices = distr.map((d, j) => 1/calcPrice(pools[j], amountIn*d/sum))
//             const pr = prices.reduce((a, b) => Math.max(a, b), 0);
            
//             distr = pools.map((p, i) => calcInputByPrice(p, pr, distr[i]));        
//         }

//         const sum = distr.reduce((a, b) => a + b, 0);
//         distr = distr.map(d => d/sum);
//         const out = distr.map((p, i) => calcOutByIn(pools[i], p*amountIn)).reduce((a, b) => a+b, 0);

//         return [out, distr];
//     }

//     findBestDistribution(
//         amountIn: number,
//         pools: Pool[],
//         tokenOutPriceBase: number,
//         gasPriceGWeiBase: number
//     ): Route  | [number, number[][]]{
//         const legPriceInTokenOut = LegGasConsuming*gasPriceGWeiBase*1e-9/tokenOutPriceBase;

//         let [bestOut, distr] = findBestDistributionWithoutTransactionCost(amountIn, pools);
//         bestOut -= legPriceInTokenOut*pools.length;
//         let bestGroup = distr.map((d, i) => [i, d]).sort((a,b) => b[1] - a[1]);
        
//         let flagDown = false;
//         const poolsSorted = bestGroup.map(a => pools[a[0]]);    
//         for (let i = pools.length-1; i >= 1; --i) {
//             const group = poolsSorted.slice(0, i);
//             let [out, distr] = findBestDistributionWithoutTransactionCost(amountIn, group);
//             out -= legPriceInTokenOut*i;
            
//             if (out > bestOut) {
//                 console.assert(flagDown == false, "408 flagDown at " + amountIn);
//                 bestOut = out;
//                 bestGroup = distr.map((d, i) => [bestGroup[i][0], d]);
//             } else {
//                 flagDown = true;
//             // break;            // TODO: uncomment for speed up ???
//             }
//         }
            
//         const checkedOut = calcOut(amountIn, pools, bestGroup, tokenOutPriceBase, gasPriceGWeiBase);
//         return [checkedOut, bestGroup];
//     }


//     calcOutByIn(amountIn: number): number {

//     }
// }


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