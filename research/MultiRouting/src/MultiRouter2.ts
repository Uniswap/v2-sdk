import { calcSquareEquation, revertPositive } from './MultiRouterMath';
import {PoolType, Pool} from './MultiRouterTypes'

export abstract class MultiRouter {
    abstract calcOutByIn(amountIn: number): [number, number];
    abstract calcPrice(amountIn: number): number;
    abstract calcInputByPrice(price: number, hint: number): number;
}

export class MultiRouterConstantProduct extends MultiRouter {
    readonly GasConsumption = 40_000;
    pool: Pool;

    constructor(_pool: Pool) {
        super();
        console.assert(_pool.type == PoolType.ConstantProduct, 
            "Wrong pool type " + _pool.type + " != " + PoolType.ConstantProduct);
        this.pool = _pool;
    }

    calcOutByIn(amountIn: number): [number, number] {
        const pool = this.pool;
        return [pool.reserve1*amountIn/(pool.reserve0/(1-pool.fee) + amountIn), this.GasConsumption];
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

export class MultiRouterConstantMean extends MultiRouter {
    readonly GasConsumption = 40_000;
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

    calcOutByIn(amountIn: number): [number, number] {
        const pool = this.pool;
        const [weight0, weight1] = this.getWeights();
        const weightRatio = weight0/weight1;
        const actualIn = amountIn*(1-pool.fee);
        return [pool.reserve1*(1-Math.pow(pool.reserve0/(pool.reserve0+actualIn), weightRatio)), this.GasConsumption];
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

export class MultiRouterHybrid extends MultiRouter {
    readonly GasConsumption = 40_000;
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

    calcOutByIn(amountIn: number): [number, number] {
        const pool = this.pool;
        const xNew = pool.reserve0 + amountIn;
        const yNew = this.computeY(xNew);
        const dy = (pool.reserve1 - yNew)*(1-pool.fee); // TODO: Why other pools take fees at the beginning, and this one - at the end?
        return [dy, this.GasConsumption];
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

export class MultiRouterParallel extends MultiRouter {
    subRouters: MultiRouter[];
    gasPriceInOutToken: number;

    constructor(_sub: MultiRouter[], _gasPriceInOutToken: number) {
        super();
        this.subRouters = _sub;
        this.gasPriceInOutToken = _gasPriceInOutToken;
    }
        
    findBestDistributionWithoutTransactionCost(
        amountIn: number,
        subRouters: MultiRouter[]       // TODO: maybe use initial distribution?
    ): [number, number, number[]] {

        if (amountIn == 0) {
            return [0, 0, [1]];
        }

        if (subRouters.length == 1) {
            const [out, gas] = subRouters[0].calcOutByIn(amountIn);
            return [out, gas, [1]];
        }

        let distr = subRouters.map(p => Math.max(p.calcOutByIn(amountIn/subRouters.length)[0], 0));
        
        for(let i = 0; i < 5; ++i) {
            const sum = distr.reduce((a, b) => a+b, 0);
            console.assert(sum > 0, "Error 508 " + sum + " " + i + " " + amountIn);
            
            const prices = distr.map((d, j) => 1/subRouters[j].calcPrice(amountIn*d/sum))
            const pr = prices.reduce((a, b) => Math.max(a, b), 0);
            
            distr = subRouters.map((p, i) => p.calcInputByPrice(pr, distr[i]));        
        }

        const sum = distr.reduce((a, b) => a + b, 0);
        distr = distr.map(d => d/sum);

        let out = 0, gas = 0;
        for (let i = 0; i < subRouters.length; ++i) {
            const [out0, gas0] = subRouters[i].calcOutByIn(distr[i]*amountIn);
            out += out0;
            gas += gas0;
        }

        return [out, gas, distr];
    }

    findBestDistribution(
        amountIn: number,
        gasPriceInOutToken: number
    ): [number, number, number[][]] {
        let [bestOut, bestGas, distr] = this.findBestDistributionWithoutTransactionCost(amountIn, this.subRouters);
        bestOut -= bestGas*gasPriceInOutToken;
        let bestGroup = distr.map((d, i) => [i, d]).sort((a,b) => b[1] - a[1]);
        
        let flagDown = false;
        const poolsSorted = bestGroup.map(a => this.subRouters[a[0]]);    
        for (let i = this.subRouters.length-1; i >= 1; --i) {
            const group = poolsSorted.slice(0, i);
            let [out, gas, distr] = this.findBestDistributionWithoutTransactionCost(amountIn, group);
            out -= gas*gasPriceInOutToken;
            
            if (out > bestOut) {
                console.assert(flagDown == false, "408 flagDown at " + amountIn);
                bestOut = out;
                bestGas = gas;
                bestGroup = distr.map((d, i) => [bestGroup[i][0], d]);
            } else {
                flagDown = true;
            // break;            // TODO: uncomment for speed up ???
            }
        }

        return [bestOut + bestGas*gasPriceInOutToken, bestGas, bestGroup];
    }

    calcOutByIn(amountIn: number): [number, number] {
        const [bestOut, bestGas] = this.findBestDistribution(amountIn, this.gasPriceInOutToken);
        return [bestOut, bestGas];
    }

    calcPrice(amountIn: number): number {
        const distr = this.findBestDistribution(amountIn, this.gasPriceInOutToken)[2];
        const sub = this.subRouters[distr[0][0]];
        return sub.calcPrice(amountIn*distr[0][1]);
    }

    calcInputByPrice(price: number, hint = 1): number {
        return revertPositive( (x:number) => 1/this.calcPrice(x), price, hint);
    }

    getDistrib(amountIn: number): number[][] {
        return this.findBestDistribution(amountIn, this.gasPriceInOutToken)[2];
    }
}

export class MultiRouterSerial extends MultiRouter {
    subRouters: MultiRouter[];

    constructor(_sub: MultiRouter[]) {
        super();
        this.subRouters = _sub;
    }

    calcOutByIn(amountIn: number): [number, number] {
        let out = amountIn, gas = 0;
        for (let i = 0; i < this.subRouters.length; ++i) {
            const [o, g] = this.subRouters[i].calcOutByIn(out);
            out = o;
            gas += g;
        }
        return [out, gas];
    }

    calcPrice(amountIn: number): number {
        let out = amountIn, derivative = 1;
        const last = this.subRouters.length - 1;
        for (let i = 0; i < last; ++i) {
            derivative *= this.subRouters[i].calcPrice(out);
            out = this.subRouters[i].calcOutByIn(out)[0];
        }
        const res = derivative * this.subRouters[last].calcPrice(out);
    
        // TODO: to delete
        const res2 = (this.calcOutByIn( amountIn + 0.01)[0] - this.calcOutByIn(amountIn)[0])/0.01;
        if (Math.abs(res/res2-1) > 1e-1)
            console.error("316 " + res + " " + res2 + " " + Math.abs(res/res2-1));
    
        return res;
    }

    calcInputByPrice(price: number, hint = 1): number {
        if (this.subRouters.length == 1)
            return this.subRouters[0].calcInputByPrice(price, hint);

        return revertPositive( (x:number) => 1/this.calcPrice(x), price, hint);
    }
}
