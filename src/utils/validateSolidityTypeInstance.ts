import JSBI from "jsbi";
import invariant from "tiny-invariant";
import { SolidityType, SOLIDITY_TYPE_MAXIMA, ZERO } from "../constants";

export function validateSolidityTypeInstance(value:JSBI, solidityType: SolidityType) {
    invariant(JSBI.greaterThanOrEqual(value, ZERO), `${value} is not a ${solidityType}`)
    invariant(JSBI.lessThanOrEqual(value, SOLIDITY_TYPE_MAXIMA[solidityType]), `${value} is not a ${solidityType}`)
}