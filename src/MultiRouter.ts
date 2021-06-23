
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
}

class MultiRouterSingle extends MultiRouter {
    pool: Pool;
    HybridD: number | undefined;

    constructor(_pool: Pool) {
        super(Topology.Single);
        this.pool = _pool;
    }

    getConstantMeanParamsFromData(): [number, number] {
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

    getHybridParamsFromData(): number {
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

        const A = this.getHybridParamsFromData();
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
        const A = this.getHybridParamsFromData();
        return calcSquareEquation(16*A*x, 16*A*x*x + 4*D*x - 16*A*D*x, -D*D*D)[1];
    }

    calcOutByIn(amountIn: number): number {
        const pool = this.pool;
        switch(pool.type) {
            case PoolType.ConstantProduct: {
                return pool.reserve1*amountIn/(pool.reserve0/(1-pool.fee) + amountIn);
            } 
            case PoolType.ConstantMean: {
                const [weight0, weight1] = this.getConstantMeanParamsFromData();
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
}

// class MultiRouter3 {
//     topology: Topology;
//     subRouters: MultiRouter[];
//     pool?: Pool;

//     constructor(_top: Topology, _sub: MultiRouter[], _pool: Pool | undefined ) {
//         this.topology = _top;
//         this.subRouters = _sub;
//         this.pool = _pool;
//     }

//     calcOutByIn(amountIn: number): number {
//         if (this.topology == Topology.Single) {
//             return calcOutByIn(this.pool, amountIn);
//         }
//     }
// }


function calcSquareEquation(a:number, b:number, c:number): [number, number] {
    const D = b*b-4*a*c;
    console.assert(D >= 0, `Discriminant is negative! ${a} ${b} ${c}`);
    const sqrtD = Math.sqrt(D);
    return [(-b-sqrtD)/2/a, (-b+sqrtD)/2/a];
}