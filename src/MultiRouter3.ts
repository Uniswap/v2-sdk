
interface Token {
    name: string;
    gasPrice: number;
}

enum PoolType {
    ConstantProduct = 'ConstantProduct',
    ConstantMean = 'ConstantMean',
    Hybrid = 'Hybrid'
}

interface Pool {
    token0: Token;
    token1: Token;
    address: string;
    type: PoolType;
    reserve0: number;
    reserve1: number;
    data: ArrayBuffer;
    fee: number;
}

function calcSquareEquation(a:number, b:number, c:number): [number, number] {
    const D = b*b-4*a*c;
    console.assert(D >= 0, `Discriminant is negative! ${a} ${b} ${c}`);
    const sqrtD = Math.sqrt(D);
    return [(-b-sqrtD)/2/a, (-b+sqrtD)/2/a];
}

function ConstantMeanParamsFromData(data: ArrayBuffer): [number, number] {
    const arr = new Uint8Array(data);
    return [arr[0], 100-arr[0]];
}

function ConstantMeanDataFromParams(weight0: number, weight1: number): ArrayBuffer {
    console.assert(weight0+weight1 == 100, 'Weight wrong')
    const data = new ArrayBuffer(16);
    const arr = new Uint8Array(data);
    arr[0] = weight0;
    return data;
}

function HybridParamsFromData(data: ArrayBuffer): number {
    const arr = new Int32Array(data);
    return arr[0];
}

function HybridDataFromParams(A: number): ArrayBuffer {
    const data = new ArrayBuffer(16);
    const arr = new Int32Array(data);
    arr[0] = A;
    return data;
}

const DCache = new Map<Pool, number>();
function HybridComputeLiquidity(pool: Pool): number {
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

function HybridgetY(pool: Pool, x: number): number {
    const D = HybridComputeLiquidity(pool);
    const A = HybridParamsFromData(pool.data);
    return calcSquareEquation(16*A*x, 16*A*x*x + 4*D*x - 16*A*D*x, -D*D*D)[1];
}

function calcOutByIn(pool:Pool, amountIn: number): number {
    switch(pool.type) {
        case PoolType.ConstantProduct: {
            return pool.reserve1*amountIn/(pool.reserve0/(1-pool.fee) + amountIn);
        } 
        case PoolType.ConstantMean: {
            const [weight0, weight1] = ConstantMeanParamsFromData(pool.data);
            const weightRatio = weight0/weight1;
            const actualIn = amountIn*(1-pool.fee);
            return pool.reserve1*(1-Math.pow(pool.reserve0/(pool.reserve0+actualIn), weightRatio));
        } 
        case PoolType.Hybrid: {
            const xNew = pool.reserve0 + amountIn;
            const yNew = HybridgetY(pool, xNew);
            const dy = (pool.reserve1 - yNew)*(1-pool.fee); // TODO: Why other pools take fees at the beginning, and this one - at the end?
            return dy;
        }
    }
    console.error('Unknown pool type');
}

function calcInByOut(pool:Pool, amountOut: number): number {
    let input = 0;
    switch(pool.type) {
        case PoolType.ConstantProduct: {
            input = pool.reserve0*amountOut/(1-pool.fee)/(pool.reserve1 - amountOut);
            break;
        } 
        case PoolType.ConstantMean: {
            const [weight0, weight1] = ConstantMeanParamsFromData(pool.data);
            const weightRatio = weight1/weight0;
            input = pool.reserve0*(1-pool.fee)*(Math.pow(1-amountOut/pool.reserve1, -weightRatio) - 1);
            break;
        } 
        case PoolType.Hybrid: {
            const yNew = pool.reserve1 - amountOut/(1-pool.fee);
            const xNew = HybridgetY(pool, yNew);
            input = (pool.reserve0 - xNew);
            break;
        }
        default:
            console.error('Unknown pool type');
    }
    console.assert(Math.abs(amountOut/calcOutByIn(pool, input)-1) < 1e-6);
    return input;
}

class Edge {
    readonly GasConsumption = 40_000;
    pool: Pool;
    vert0: Vertice;
    vert1: Vertice;

    direction: boolean;
    amountInPrevious: number;      // How many liquidity were passed from vert0 to vert1
    amountOutPrevious: number;     // How many liquidity were passed from vert0 to vert1


    constructor(p: Pool, v0: Vertice, v1: Vertice) {
        this.pool = p;
        this.vert0 = v0;
        this.vert1 = v1;
        this.amountInPrevious = 0;
        this.amountOutPrevious = 0;
        this.direction = true;
    }

    calcOutput(v: Vertice, amountIn: number) {
        const pool = {...this.pool};
        let out;
        if (v == this.vert1) {
            pool.reserve0 = this.pool.reserve1;
            pool.reserve1 = this.pool.reserve0;
            if (this.direction) {
                if (amountIn < this.amountOutPrevious) {    // TODO: reduce gas fee if this.amountOutPrevious == amountIn ?
                    out = this.amountInPrevious - calcInByOut(pool, this.amountOutPrevious - amountIn);
                } else {
                    out = calcOutByIn(pool, amountIn - this.amountOutPrevious) + this.amountInPrevious;
                }
                console.assert(out > amountIn);
            } else {
                out = calcOutByIn(pool, this.amountInPrevious + amountIn) - this.amountOutPrevious;
                console.assert(out < amountIn && out >= 0);
            }
        } else {
            if (this.direction) {
                out = calcOutByIn(pool, this.amountInPrevious + amountIn) - this.amountOutPrevious;
                console.assert(out < amountIn && out >= 0);
            } else {
                if (amountIn < this.amountOutPrevious) {
                    out = this.amountInPrevious - calcInByOut(pool, this.amountOutPrevious - amountIn);
                } else {
                    out = calcOutByIn(pool, amountIn - this.amountOutPrevious) + this.amountInPrevious;
                }
                console.assert(out > amountIn);
            }
        }

        return [out, this.amountInPrevious? 0 : this.GasConsumption];   // ???? sometimes -this.GasConsumption
    }
}

class Vertice {
    token: Token;
    edges: Edge[];

    bestIncome: number;         // temp data used for findBestPath algorithm
    bestSource?: Edge;     // temp data used for findBestPath algorithm

    constructor(t:Token) {
        this.token = t;
        this.edges = [];
        this.bestIncome = 0;
        this.bestSource = undefined;
    }

    getNeibour(e?: Edge) {
        if (!e)
            return;
        return e.vert0 == this? e.vert1 : e.vert0;
    }
}

class Graph {
    vertices: Vertice[];
    edges: Edge[];
    tokens: Map<Token, Vertice>;

    constructor(pools: Pool[]) {
        this.vertices = [];
        this.edges = [];
        this.tokens = new Map();
        pools.forEach(p => {
            const v0 = this.getOrCreateVertice(p.token0);
            const v1 = this.getOrCreateVertice(p.token1);
            const edge = new Edge(p, v0, v1);
            v0.edges.push(edge);
            v1.edges.push(edge);
            this.edges.push(edge);
        })
    }

    getOrCreateVertice(token: Token) {
        let vert = this.tokens.get(token);
        if (vert)
            return vert;
        vert = new Vertice(token);
        this.tokens.set(token, vert);
        return vert;
    }

    findBestPath(from: Token, to: Token, amountIn: number) {
        const start = this.tokens.get(from);
        const finish = this.tokens.get(to);
        if (!start || !finish)
            return;
        
        this.vertices.forEach(v => {v.bestIncome = 0; v.bestSource = undefined});
        const processedVert = new Set<Vertice>();
        const nextVertList = [start];               // TODO: Use sorted Set!

        for(;;) {
            let closestVert: Vertice | undefined;
            let closestIncome = -1;
            let closestPosition = 0;
            nextVertList.forEach((v, i) => {
                if (v.bestIncome > closestIncome) {
                    closestIncome = v.bestIncome;
                    closestVert = v;
                    closestPosition = i;
                }
            });

            if (!closestVert)
                return;
            if (closestVert == finish) {
                const bestPath = [];
                for (let v: Vertice | undefined = finish; v?.bestSource; v = v.getNeibour(v.bestSource)) {
                    bestPath.unshift(v.bestSource);
                }
                return bestPath;
            }
            nextVertList.splice(closestPosition, 1);

            closestVert.edges.forEach(e => {
                const v2 = closestVert == e.vert0 ? e.vert1 : e.vert0;
                if (processedVert.has(v2))
                    return;
                let [newIncome, gas] = e.calcOutput((closestVert as Vertice), amountIn);
                newIncome -= gas*to.gasPrice;
                if (!v2.bestSource)
                    nextVertList.push(v2);
                if (!v2.bestSource || newIncome > v2.bestIncome) {
                    v2.bestIncome = newIncome;
                    v2.bestSource = e;
                }
            })
            processedVert.add(closestVert);
        }

    }
}


function testEnvironment() {
    const price1In0 = 1;
    const reserve = [1_000_000, 100_000, 1_000_000, 1_000_000, 10_000];

    const T1 = {
        name: "1",
        gasPrice: 1*200*1e-9
    }
    const T2 = {
        name: "2",
        gasPrice: 1*200*1e-9
    }

    var testPool1 = {
        token0: T1,
        token1: T2,
        address: "xxx",
        type: PoolType.ConstantProduct,
        reserve0: reserve[0],
        reserve1: reserve[0]/price1In0 - 100,
        data: new ArrayBuffer(16),
        fee: 0.003
    };
    var testPool2 = {
        token0: T1,
        token1: T2,
        address: "xxx",
        type: PoolType.ConstantProduct,
        reserve0: reserve[1],
        reserve1: reserve[1]/price1In0,
        data: new ArrayBuffer(16),
        fee: 0.003
    };
    const weight0 = 90, weight1 = 10;
    var testPool3 = {
        token0: T1,
        token1: T2,
        address: "xxx",
        type: PoolType.ConstantMean,
        reserve0: 2*weight0*price1In0*reserve[2]/(weight0*price1In0 + weight1),
        reserve1: 2*weight1*reserve[2]/(weight0*price1In0 + weight1),
        data: ConstantMeanDataFromParams(weight0, weight1),
        fee: 0.002
    };
    var testPool4 = {
        token0: T1,
        token1: T2,
        address: "xxx",
        type: PoolType.ConstantProduct,
        reserve0: reserve[3] - 100,
        reserve1: reserve[3]/price1In0,
        data: new ArrayBuffer(16),
        fee: 0.003
    };
    var testPool5 = {
        token0: T1,
        token1: T2,
        address: "xxx",
        type: PoolType.Hybrid,
        reserve0: reserve[4],
        reserve1: reserve[4]/price1In0,
        data: HybridDataFromParams(80),
        fee: 0.003
    }; 

    var testPools = [testPool1, testPool2, testPool3, testPool4];
    if (price1In0 == 1)
        testPools.push(testPool5);

    const tokens = [T1, T2];

    return {
        testPools,
        tokens
    }
}

function test1(pool: number, amountIn: number) {
    const env = testEnvironment();
    const g = new Graph(pool >= 0 ? [env.testPools[pool]] : env.testPools);
    const p = g.findBestPath(env.tokens[0], env.tokens[1], amountIn) as Edge[];
    return [p, p[0].vert1.bestIncome];
}

console.log(test1(0, 100));