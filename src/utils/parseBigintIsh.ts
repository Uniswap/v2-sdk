import { BigintIsh } from "../constants";
import JSBI from "jsbi";

export function parseBigintIsh(bigintIsh: BigintIsh): JSBI {
    return bigintIsh instanceof JSBI
        ? bigintIsh
        : typeof bigintIsh === 'number'
        ? JSBI.BigInt(bigintIsh.toString())
        : JSBI.BigInt(bigintIsh)
}