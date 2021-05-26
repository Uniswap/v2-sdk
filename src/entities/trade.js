import invariant from 'tiny-invariant';
import { ONE, TradeType, ZERO } from '../constants';
import { sortedInsert } from '../utils';
import { Fraction } from './fractions/fraction';
import { Percent } from './fractions/percent';
import { Price } from './fractions/price';
import { TokenAmount } from './fractions/tokenAmount';
import { Route } from './route';
import { currencyEquals, Token } from './token';
/**
 * Returns the percent difference between the mid price and the execution price, i.e. price impact.
 * @param midPrice mid price before the trade
 * @param inputAmount the input amount of the trade
 * @param outputAmount the output amount of the trade
 */
function computePriceImpact(midPrice, inputAmount, outputAmount) {
    const exactQuote = midPrice.raw.multiply(inputAmount.raw);
    // calculate slippage := (exactQuote - outputAmount) / exactQuote
    const slippage = exactQuote.subtract(outputAmount.raw).divide(exactQuote);
    return new Percent(slippage.numerator, slippage.denominator);
}
// comparator function that allows sorting trades by their output amounts, in decreasing order, and then input amounts
// in increasing order. i.e. the best trades have the most outputs for the least inputs and are sorted first
export function inputOutputComparator(a, b) {
    // must have same input and output token for comparison
    invariant(currencyEquals(a.inputAmount.token, b.inputAmount.token), 'INPUT_CURRENCY');
    invariant(currencyEquals(a.outputAmount.token, b.outputAmount.token), 'OUTPUT_CURRENCY');
    if (a.outputAmount.equalTo(b.outputAmount)) {
        if (a.inputAmount.equalTo(b.inputAmount)) {
            return 0;
        }
        // trade A requires less input than trade B, so A should come first
        if (a.inputAmount.lessThan(b.inputAmount)) {
            return -1;
        }
        else {
            return 1;
        }
    }
    else {
        // tradeA has less output than trade B, so should come second
        if (a.outputAmount.lessThan(b.outputAmount)) {
            return 1;
        }
        else {
            return -1;
        }
    }
}
// extension of the input output comparator that also considers other dimensions of the trade in ranking them
export function tradeComparator(a, b) {
    const ioComp = inputOutputComparator(a, b);
    if (ioComp !== 0) {
        return ioComp;
    }
    // consider lowest slippage next, since these are less likely to fail
    if (a.priceImpact.lessThan(b.priceImpact)) {
        return -1;
    }
    else if (a.priceImpact.greaterThan(b.priceImpact)) {
        return 1;
    }
    // finally consider the number of hops since each hop costs gas
    return a.route.path.length - b.route.path.length;
}
/**
 * Represents a trade executed against a list of pairs.
 * Does not account for slippage, i.e. trades that front run this trade and move the price.
 */
export class Trade {
    constructor(route, amount, tradeType) {
        const amounts = new Array(route.path.length);
        const nextPairs = new Array(route.pairs.length);
        if (tradeType === TradeType.EXACT_INPUT) {
            invariant(currencyEquals(amount.token, route.input), 'INPUT');
            amounts[0] = amount;
            for (let i = 0; i < route.path.length - 1; i++) {
                const pair = route.pairs[i];
                const [outputAmount, nextPair] = pair.getOutputAmount(amounts[i]);
                amounts[i + 1] = outputAmount;
                nextPairs[i] = nextPair;
            }
        }
        else {
            invariant(currencyEquals(amount.token, route.output), 'OUTPUT');
            amounts[amounts.length - 1] = amount;
            for (let i = route.path.length - 1; i > 0; i--) {
                const pair = route.pairs[i - 1];
                const [inputAmount, nextPair] = pair.getInputAmount(amounts[i]);
                amounts[i - 1] = inputAmount;
                nextPairs[i - 1] = nextPair;
            }
        }
        this.route = route;
        this.tradeType = tradeType;
        this.inputAmount = tradeType === TradeType.EXACT_INPUT ? amount : amounts[0];
        this.outputAmount = tradeType === TradeType.EXACT_OUTPUT ? amount : amounts[amounts.length - 1];
        this.executionPrice = new Price(this.inputAmount.token, this.outputAmount.token, this.inputAmount.raw, this.outputAmount.raw);
        this.nextMidPrice = Price.fromRoute(new Route(nextPairs, route.input));
        this.priceImpact = computePriceImpact(route.midPrice, this.inputAmount, this.outputAmount);
    }
    /**
     * Constructs an exact in trade with the given amount in and route
     * @param route route of the exact in trade
     * @param amountIn the amount being passed in
     */
    static exactIn(route, amountIn) {
        return new Trade(route, amountIn, TradeType.EXACT_INPUT);
    }
    /**
     * Constructs an exact out trade with the given amount out and route
     * @param route route of the exact out trade
     * @param amountOut the amount returned by the trade
     */
    static exactOut(route, amountOut) {
        return new Trade(route, amountOut, TradeType.EXACT_OUTPUT);
    }
    /**
     * Get the minimum amount that must be received from this trade for the given slippage tolerance
     * @param slippageTolerance tolerance of unfavorable slippage from the execution price of this trade
     */
    minimumAmountOut(slippageTolerance) {
        invariant(!slippageTolerance.lessThan(ZERO), 'SLIPPAGE_TOLERANCE');
        if (this.tradeType === TradeType.EXACT_INPUT) {
            return this.outputAmount;
        }
        else {
            const slippageAdjustedAmountOut = new Fraction(ONE)
                .add(slippageTolerance)
                .invert()
                .multiply(this.outputAmount.raw).quotient;
            return new TokenAmount(this.outputAmount.token, slippageAdjustedAmountOut);
        }
    }
    /**
     * Get the maximum amount in that can be spent via this trade for the given slippage tolerance
     * @param slippageTolerance tolerance of unfavorable slippage from the execution price of this trade
     */
    maximumAmountIn(slippageTolerance) {
        invariant(!slippageTolerance.lessThan(ZERO), 'SLIPPAGE_TOLERANCE');
        if (this.tradeType === TradeType.EXACT_INPUT) {
            return this.inputAmount;
        }
        else {
            const slippageAdjustedAmountIn = new Fraction(ONE).add(slippageTolerance).multiply(this.inputAmount.raw).quotient;
            return new TokenAmount(this.inputAmount.token, slippageAdjustedAmountIn);
        }
    }
    /**
     * Given a list of pairs, and a fixed amount in, returns the top `maxNumResults` trades that go from an input token
     * amount to an output token, making at most `maxHops` hops.
     * Note this does not consider aggregation, as routes are linear. It's possible a better route exists by splitting
     * the amount in among multiple routes.
     * @param pairs the pairs to consider in finding the best trade
     * @param TokenAmountIn exact amount of input currency to spend
     * @param currencyOut the desired currency out
     * @param maxNumResults maximum number of results to return
     * @param maxHops maximum number of hops a returned trade can make, e.g. 1 hop goes through a single pair
     * @param currentPairs used in recursion; the current list of pairs
     * @param originalAmountIn used in recursion; the original value of the TokenAmountIn parameter
     * @param bestTrades used in recursion; the current list of best trades
     */
    static bestTradeExactIn(pairs, TokenAmountIn, currencyOut, { maxNumResults = 3, maxHops = 3 } = {}, 
    // used in recursion.
    currentPairs = [], originalAmountIn = TokenAmountIn, bestTrades = []) {
        invariant(pairs.length > 0, 'PAIRS');
        invariant(maxHops > 0, 'MAX_HOPS');
        invariant(originalAmountIn === TokenAmountIn || currentPairs.length > 0, 'INVALID_RECURSION');
        const chainId = TokenAmountIn.token.chainId;
        invariant(chainId !== undefined, 'CHAIN_ID');
        const amountIn = TokenAmountIn;
        const tokenOut = currencyOut;
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            // pair irrelevant
            if (!pair.token0.equals(amountIn.token) && !pair.token1.equals(amountIn.token))
                continue;
            if (pair.reserve0.equalTo(ZERO) || pair.reserve1.equalTo(ZERO))
                continue;
            let amountOut;
            try {
                ;
                [amountOut] = pair.getOutputAmount(amountIn);
            }
            catch (error) {
                // input too low
                if (error.isInsufficientInputAmountError) {
                    continue;
                }
                throw error;
            }
            // we have arrived at the output token, so this is the final trade of one of the paths
            if (amountOut.token.equals(tokenOut)) {
                sortedInsert(bestTrades, new Trade(new Route([...currentPairs, pair], originalAmountIn.token, currencyOut), originalAmountIn, TradeType.EXACT_INPUT), maxNumResults, tradeComparator);
            }
            else if (maxHops > 1 && pairs.length > 1) {
                const pairsExcludingThisPair = pairs.slice(0, i).concat(pairs.slice(i + 1, pairs.length));
                // otherwise, consider all the other paths that lead from this token as long as we have not exceeded maxHops
                Trade.bestTradeExactIn(pairsExcludingThisPair, amountOut, currencyOut, {
                    maxNumResults,
                    maxHops: maxHops - 1
                }, [...currentPairs, pair], originalAmountIn, bestTrades);
            }
        }
        return bestTrades;
    }
    /**
     * similar to the above method but instead targets a fixed output amount
     * given a list of pairs, and a fixed amount out, returns the top `maxNumResults` trades that go from an input token
     * to an output token amount, making at most `maxHops` hops
     * note this does not consider aggregation, as routes are linear. it's possible a better route exists by splitting
     * the amount in among multiple routes.
     * @param pairs the pairs to consider in finding the best trade
     * @param currencyIn the currency to spend
     * @param TokenAmountOut the exact amount of currency out
     * @param maxNumResults maximum number of results to return
     * @param maxHops maximum number of hops a returned trade can make, e.g. 1 hop goes through a single pair
     * @param currentPairs used in recursion; the current list of pairs
     * @param originalAmountOut used in recursion; the original value of the TokenAmountOut parameter
     * @param bestTrades used in recursion; the current list of best trades
     */
    static bestTradeExactOut(pairs, currencyIn, TokenAmountOut, { maxNumResults = 3, maxHops = 3 } = {}, 
    // used in recursion.
    currentPairs = [], originalAmountOut = TokenAmountOut, bestTrades = []) {
        invariant(pairs.length > 0, 'PAIRS');
        invariant(maxHops > 0, 'MAX_HOPS');
        invariant(originalAmountOut === TokenAmountOut || currentPairs.length > 0, 'INVALID_RECURSION');
        const chainId = TokenAmountOut instanceof TokenAmount
            ? TokenAmountOut.token.chainId
            : currencyIn instanceof Token
                ? currencyIn.chainId
                : undefined;
        invariant(chainId !== undefined, 'CHAIN_ID');
        const amountOut = TokenAmountOut;
        const tokenIn = currencyIn;
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            // pair irrelevant
            if (!pair.token0.equals(amountOut.token) && !pair.token1.equals(amountOut.token))
                continue;
            if (pair.reserve0.equalTo(ZERO) || pair.reserve1.equalTo(ZERO))
                continue;
            let amountIn;
            try {
                ;
                [amountIn] = pair.getInputAmount(amountOut);
            }
            catch (error) {
                // not enough liquidity in this pair
                if (error.isInsufficientReservesError) {
                    continue;
                }
                throw error;
            }
            // we have arrived at the input token, so this is the first trade of one of the paths
            if (amountIn.token.equals(tokenIn)) {
                sortedInsert(bestTrades, new Trade(new Route([pair, ...currentPairs], currencyIn, originalAmountOut.token), originalAmountOut, TradeType.EXACT_OUTPUT), maxNumResults, tradeComparator);
            }
            else if (maxHops > 1 && pairs.length > 1) {
                const pairsExcludingThisPair = pairs.slice(0, i).concat(pairs.slice(i + 1, pairs.length));
                // otherwise, consider all the other paths that arrive at this token as long as we have not exceeded maxHops
                Trade.bestTradeExactOut(pairsExcludingThisPair, currencyIn, amountIn, {
                    maxNumResults,
                    maxHops: maxHops - 1
                }, [pair, ...currentPairs], originalAmountOut, bestTrades);
            }
        }
        return bestTrades;
    }
}
//# sourceMappingURL=trade.js.map