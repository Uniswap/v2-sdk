import TopologicalSort from './TopologicalSort';
import { ASSERT, calcInByOut, calcOutByIn, closeValues } from './MultiRouterMath';
import {PoolType, Pool, Token, RouteLeg, Route} from './MultiRouterTypes'


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
        const pool = this.pool;
        let out, gas = this.amountInPrevious ? 0 : this.GasConsumption;
        if (v == this.vert1) {
            if (this.direction) {
                if (amountIn < this.amountOutPrevious) {
                    out = this.amountInPrevious - calcInByOut(pool, this.amountOutPrevious - amountIn, false);
                } else {
                    out = calcOutByIn(pool, amountIn - this.amountOutPrevious, false) + this.amountInPrevious;
                }
                if (amountIn == this.amountOutPrevious) // TODO: accuracy?
                    gas = -this.GasConsumption;
            } else {
                out = calcOutByIn(pool, this.amountOutPrevious + amountIn, false) - this.amountInPrevious;
                const price = this.pool.token1.gasPrice/this.pool.token0.gasPrice;
                console.assert(out < amountIn/price && out >= 0);
            }
        } else {
            if (this.direction) {
                out = calcOutByIn(pool, this.amountInPrevious + amountIn, true) - this.amountOutPrevious;
                const price = this.pool.token1.gasPrice/this.pool.token0.gasPrice;
                console.assert(out < amountIn*price && out >= 0);
            } else {
                if (amountIn == this.amountOutPrevious) // TODO: accuracy?
                    gas = -this.GasConsumption;
                if (amountIn < this.amountOutPrevious) {
                    out = this.amountInPrevious - calcInByOut(pool, this.amountOutPrevious - amountIn, true);
                } else {
                    out = calcOutByIn(pool, amountIn - this.amountOutPrevious, true) + this.amountInPrevious;
                }
            }
        }

        return [out, gas];
    }

    applySwap(from: Vertice) {
        console.assert(this.amountInPrevious*this.amountOutPrevious >= 0);
        const inPrev = this.direction ? this.amountInPrevious : -this.amountOutPrevious;
        const outPrev = this.direction ? this.amountOutPrevious : -this.amountInPrevious;
        const to = from.getNeibour(this);
        if (to) {
            const inInc = from == this.vert0 ? from.bestIncome : -from.bestIncome;
            const outInc = from == this.vert0 ? to.bestIncome : -to.bestIncome;
            const inNew = inPrev + inInc;
            const outNew = outPrev + outInc;
            console.assert(inNew*outNew >= 0);
            if (inNew >= 0) {
                this.direction = true;
                this.amountInPrevious = inNew;
                this.amountOutPrevious = outNew;
            } else {
                this.direction = false;
                this.amountInPrevious = -outNew;
                this.amountOutPrevious = -inNew;
            } 
        } else
            console.error("Error 221");

        ASSERT(() => {
            if (this.direction)
                return closeValues(this.amountOutPrevious, calcOutByIn(this.pool, this.amountInPrevious, this.direction), 1e-6);
            else {
                return closeValues(this.amountInPrevious, calcOutByIn(this.pool, this.amountOutPrevious, this.direction), 1e-6);
            }
        }, `Error 225`)
    }
}

class Vertice {
    token: Token;
    edges: Edge[];

    bestIncome: number;    // temp data used for findBestPath algorithm
    gasSpent: number;      // temp data used for findBestPath algorithm
    bestTotal: number;     // temp data used for findBestPath algorithm
    bestSource?: Edge;     // temp data used for findBestPath algorithm

    constructor(t:Token) {
        this.token = t;
        this.edges = [];
        this.bestIncome = 0;
        this.gasSpent = 0;
        this.bestTotal = 0;
        this.bestSource = undefined;
    }

    getNeibour(e?: Edge) {
        if (!e)
            return;
        return e.vert0 == this? e.vert1 : e.vert0;
    }
}

export class Graph {
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
        this.vertices.push(vert);
        this.tokens.set(token, vert);
        return vert;
    }

    findBestPath(from: Token, to: Token, amountIn: number): {
        path: Edge[];
        output: number;
        gasSpent: number;
        totalOutput: number
     } | undefined {
        const start = this.tokens.get(from);
        const finish = this.tokens.get(to);
        if (!start || !finish)
            return;
        
        this.vertices.forEach(v => {
            v.bestIncome = 0;
            v.gasSpent = 0;
            v.bestTotal = 0;
            v.bestSource = undefined;
        });
        start.bestIncome = amountIn;
        start.bestTotal = amountIn;
        const processedVert = new Set<Vertice>();
        const nextVertList = [start];               // TODO: Use sorted Set!

        for(;;) {
            let closestVert: Vertice | undefined;
            let closestTotal = -1;
            let closestPosition = 0;
            nextVertList.forEach((v, i) => {
                if (v.bestTotal > closestTotal) {
                    closestTotal = v.bestTotal;
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
                return {
                    path: bestPath, 
                    output: finish.bestIncome, 
                    gasSpent: finish.gasSpent,
                    totalOutput: finish.bestTotal
                };
            }
            nextVertList.splice(closestPosition, 1);

            closestVert.edges.forEach(e => {
                const v2 = closestVert == e.vert0 ? e.vert1 : e.vert0;
                if (processedVert.has(v2))
                    return;
                const [newIncome, gas] = e.calcOutput((closestVert as Vertice), (closestVert as Vertice).bestIncome);
                const newGasSpent = (closestVert as Vertice).gasSpent + gas;
                const price = to.gasPrice/v2.token.gasPrice;
                const newTotal = newIncome*price - newGasSpent*to.gasPrice;
                //console.log(newIncome, gas, newTotal);
                
                if (!v2.bestSource)
                    nextVertList.push(v2);
                if (!v2.bestSource || newTotal > v2.bestTotal) {
                    v2.bestIncome = newIncome;
                    v2.gasSpent = newGasSpent;
                    v2.bestTotal = newTotal;
                    v2.bestSource = e;
                }
            })
            processedVert.add(closestVert);
        }
    }

    addPath(from: Vertice | undefined, path: Edge[]) {
        path.forEach(e => {
            if (from) {
                e.applySwap(from);
                from = from.getNeibour(e);
            } else {
                console.error("Unexpected 315");
            }
        })
    }

    findBestRoute(from: Token, to: Token, amountIn: number, steps = 100): Route | undefined {
        this.edges.forEach(e => {
            e.amountInPrevious = 0;
            e.amountOutPrevious = 0;
            e.direction = true;
        });
        let output = 0;
        let gasSpent = 0;
        let totalOutput = 0;
        for (let step = 0; step < steps; ++step) {
            const p = this.findBestPath(from, to, amountIn/steps);
            if (!p) {
                return;
            } else {
                //console.log(step, totalOutput, p.gasSpent, p.output);
                output += p.output;
                gasSpent += p.gasSpent;
                totalOutput += p.totalOutput;
                this.addPath(this.tokens.get(from), p.path);
            }
        }
        return {
            amountIn,
            amountOut: output,
            legs: this.getRouteLegs(),
            gasSpent: gasSpent,
            totalAmountOut: totalOutput
        }
    }

    getRouteLegs(): RouteLeg[] {
        const nodes = this.topologySort();        
        const legs = [];
        nodes.forEach(n => {
            const outEdges = n.edges.map(e => {
                const from = this.edgeFrom(e);
                return from ? [e, from[0], from[1]] : [e]
            }).filter(e => e[1] == n);

            let outAmount = outEdges.reduce((a, b) => a + (b[2] as number), 0);
            if (outAmount <= 0)
                return;

            const total = outAmount;
            outEdges.forEach((e, i) => {
                const p = e[2] as number;
                const quantity = i + 1 == outEdges.length ? 1 : p/outAmount;
                legs.push({
                    address: (e[0] as Edge).pool.address,
                    token: n.token,
                    quantity,
                    relative: p/total
                });
                outAmount -= p;
            });
            console.assert(Math.abs(outAmount) < 1e-6 , "Error 281");
        })
        return legs;
    }
    
    edgeFrom(e: Edge): [Vertice, number] | undefined {
        if (e.amountInPrevious == 0)
            return undefined;
        return e.direction ? [e.vert0, e.amountInPrevious] : [e.vert1, e.amountOutPrevious];
    }

    getOutputEdges(v: Vertice): Edge[] {
        return v.edges.filter(e => this.edgeFrom(e)[0] == v);
    }

    topologySort(): Vertice[] {
        const nodes = new Map<string, Vertice>();
        this.vertices.forEach(v => nodes.set(v.token.name, v));
        const sortOp = new TopologicalSort(nodes);
        this.edges.forEach(e => {
            if (e.amountInPrevious == 0)
                return;
            if(e.direction)
                sortOp.addEdge(e.vert0.token.name, e.vert1.token.name);
            else
                sortOp.addEdge(e.vert1.token.name, e.vert0.token.name);
        })
        const sorted = Array.from(sortOp.sort().keys()).map(k => nodes.get(k));

        return sorted;
    }
}
