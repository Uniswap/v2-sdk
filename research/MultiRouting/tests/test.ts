import {Bridge} from './Env7Bridge'
import { Graph } from '../src/MultiRouter3';

const g = new Graph(Bridge.testPools);
const out = g.findBestRoute(Bridge.tokens[0], Bridge.tokens[3], 400000, 19);
console.log(out);
