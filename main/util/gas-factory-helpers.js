"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logGasEstimationVsSimulationMetrics = exports.calculateL1GasFeesHelper = exports.initSwapRouteFromExisting = exports.calculateGasUsed = exports.getL2ToL1GasUsed = exports.calculateOptimismToL1FeeFromCalldata = exports.calculateArbitrumToL1FeeFromCalldata = exports.getArbitrumBytes = exports.getGasCostInNativeCurrency = exports.getHighestLiquidityV3USDPool = exports.getHighestLiquidityV3NativePool = exports.getV2NativePool = void 0;
const sdk_1 = require("@eth-optimism/sdk");
const bignumber_1 = require("@ethersproject/bignumber");
const router_sdk_1 = require("@uniswap/router-sdk");
const sdk_core_1 = require("@uniswap/sdk-core");
const universal_router_sdk_1 = require("@uniswap/universal-router-sdk");
const v3_sdk_1 = require("@uniswap/v3-sdk");
const brotli_1 = __importDefault(require("brotli"));
const jsbi_1 = __importDefault(require("jsbi"));
const lodash_1 = __importDefault(require("lodash"));
const globalChainId_1 = require("../globalChainId");
const routers_1 = require("../routers");
const util_1 = require("../util");
const l2FeeChains_1 = require("./l2FeeChains");
const methodParameters_1 = require("./methodParameters");
async function getV2NativePool(token, poolProvider, providerConfig) {
    const chainId = token.chainId;
    const weth = util_1.WRAPPED_NATIVE_CURRENCY[chainId];
    const poolAccessor = await poolProvider.getPools([[weth, token]], providerConfig);
    const pool = poolAccessor.getPool(weth, token);
    if (!pool || pool.reserve0.equalTo(0) || pool.reserve1.equalTo(0)) {
        util_1.log.error({
            weth,
            token,
            reserve0: pool === null || pool === void 0 ? void 0 : pool.reserve0.toExact(),
            reserve1: pool === null || pool === void 0 ? void 0 : pool.reserve1.toExact(),
        }, `Could not find a valid WETH V2 pool with ${token.symbol} for computing gas costs.`);
        return null;
    }
    return pool;
}
exports.getV2NativePool = getV2NativePool;
async function getHighestLiquidityV3NativePool(token, poolProvider, providerConfig) {
    const nativeCurrency = util_1.WRAPPED_NATIVE_CURRENCY[token.chainId];
    const feeAmounts = (0, util_1.getApplicableV3FeeAmounts)(token.chainId);
    const nativePools = (0, lodash_1.default)(feeAmounts)
        .map((feeAmount) => {
        return [nativeCurrency, token, feeAmount];
    })
        .value();
    const poolAccessor = await poolProvider.getPools(nativePools, providerConfig);
    const pools = (0, lodash_1.default)(feeAmounts)
        .map((feeAmount) => {
        return poolAccessor.getPool(nativeCurrency, token, feeAmount);
    })
        .compact()
        .value();
    if (pools.length == 0) {
        util_1.log.error({ pools }, `Could not find a ${nativeCurrency.symbol} pool with ${token.symbol} for computing gas costs.`);
        return null;
    }
    const maxPool = pools.reduce((prev, current) => {
        return jsbi_1.default.greaterThan(prev.liquidity, current.liquidity) ? prev : current;
    });
    return maxPool;
}
exports.getHighestLiquidityV3NativePool = getHighestLiquidityV3NativePool;
async function getHighestLiquidityV3USDPool(chainId, poolProvider, providerConfig) {
    const usdTokens = routers_1.usdGasTokensByChain[chainId];
    const wrappedCurrency = util_1.WRAPPED_NATIVE_CURRENCY[chainId];
    if (!usdTokens) {
        throw new Error(`Could not find a USD token for computing gas costs on ${chainId}`);
    }
    const sdkChainId = chainId;
    const feeAmounts = (0, util_1.getApplicableV3FeeAmounts)(sdkChainId);
    const usdPools = (0, lodash_1.default)(feeAmounts)
        .flatMap((feeAmount) => {
        return lodash_1.default.map(usdTokens, (usdToken) => [
            wrappedCurrency,
            usdToken,
            feeAmount,
        ]);
    })
        .value();
    const poolAccessor = await poolProvider.getPools(usdPools, providerConfig);
    const pools = (0, lodash_1.default)(feeAmounts)
        .flatMap((feeAmount) => {
        const pools = [];
        for (const usdToken of usdTokens) {
            const pool = poolAccessor.getPool(wrappedCurrency, usdToken, feeAmount);
            if (pool) {
                pools.push(pool);
            }
        }
        return pools;
    })
        .compact()
        .value();
    if (pools.length == 0) {
        if (chainId === globalChainId_1.ChainId.TRON) {
            util_1.log.warn(`No USD/${wrappedCurrency.symbol} pools found on Tron chain. Using default gas cost calculation.`);
            const defaultPool = new v3_sdk_1.Pool(wrappedCurrency, usdTokens[0], v3_sdk_1.FeeAmount.MEDIUM, '0x1000000000000000000000000', '1000000000000000000000000', 0);
            return defaultPool;
        }
        const message = `Could not find a USD/${wrappedCurrency.symbol} pool for computing gas costs.`;
        util_1.log.error({ pools }, message);
        throw new Error(message);
    }
    const maxPool = pools.reduce((prev, current) => {
        return jsbi_1.default.greaterThan(prev.liquidity, current.liquidity) ? prev : current;
    });
    return maxPool;
}
exports.getHighestLiquidityV3USDPool = getHighestLiquidityV3USDPool;
function getGasCostInNativeCurrency(nativeCurrency, gasCostInWei) {
    // wrap fee to native currency
    const costNativeCurrency = util_1.CurrencyAmount.fromRawAmount(nativeCurrency, gasCostInWei.toString());
    return costNativeCurrency;
}
exports.getGasCostInNativeCurrency = getGasCostInNativeCurrency;
function getArbitrumBytes(data) {
    if (data == '')
        return bignumber_1.BigNumber.from(0);
    const compressed = brotli_1.default.compress(Buffer.from(data.replace('0x', ''), 'hex'), {
        mode: 0,
        quality: 1,
        lgwin: 22,
    });
    // TODO: This is a rough estimate of the compressed size
    // Brotli 0 should be used, but this brotli library doesn't support it
    // https://github.com/foliojs/brotli.js/issues/38
    // There are other brotli libraries that do support it, but require async
    // We workaround by using Brotli 1 with a 20% bump in size
    return bignumber_1.BigNumber.from(compressed.length).mul(120).div(100);
}
exports.getArbitrumBytes = getArbitrumBytes;
function calculateArbitrumToL1FeeFromCalldata(calldata, gasData, chainId) {
    const { perL2TxFee, perL1CalldataFee, perArbGasTotal } = gasData;
    // calculates gas amounts based on bytes of calldata, use 0 as overhead.
    const l1GasUsed = getL2ToL1GasUsed(calldata, chainId);
    // multiply by the fee per calldata and add the flat l2 fee
    const l1Fee = l1GasUsed.mul(perL1CalldataFee).add(perL2TxFee);
    const gasUsedL1OnL2 = l1Fee.div(perArbGasTotal);
    return [l1GasUsed, l1Fee, gasUsedL1OnL2];
}
exports.calculateArbitrumToL1FeeFromCalldata = calculateArbitrumToL1FeeFromCalldata;
async function calculateOptimismToL1FeeFromCalldata(calldata, chainId, provider) {
    const tx = {
        data: calldata,
        chainId: chainId,
        type: 2, // sign the transaction as EIP-1559, otherwise it will fail at maxFeePerGas
    };
    const [l1GasUsed, l1GasCost] = await Promise.all([
        (0, sdk_1.estimateL1Gas)(provider, tx),
        (0, sdk_1.estimateL1GasCost)(provider, tx),
    ]);
    return [l1GasUsed, l1GasCost];
}
exports.calculateOptimismToL1FeeFromCalldata = calculateOptimismToL1FeeFromCalldata;
function getL2ToL1GasUsed(data, chainId) {
    switch (chainId) {
        case globalChainId_1.ChainId.ARBITRUM_ONE:
        case globalChainId_1.ChainId.ARBITRUM_GOERLI: {
            // calculates bytes of compressed calldata
            const l1ByteUsed = getArbitrumBytes(data);
            return l1ByteUsed.mul(16);
        }
        default:
            return bignumber_1.BigNumber.from(0);
    }
}
exports.getL2ToL1GasUsed = getL2ToL1GasUsed;
async function calculateGasUsed(chainId, route, simulatedGasUsed, v2PoolProvider, v3PoolProvider, provider, providerConfig) {
    const quoteToken = route.quote.currency.wrapped;
    const gasPriceWei = route.gasPriceWei;
    // calculate L2 to L1 security fee if relevant
    let l2toL1FeeInWei = bignumber_1.BigNumber.from(0);
    // Arbitrum charges L2 gas for L1 calldata posting costs.
    // See https://github.com/Uniswap/smart-order-router/pull/464/files#r1441376802
    const sdkChainId = chainId;
    if (l2FeeChains_1.opStackChains.includes(sdkChainId)) {
        l2toL1FeeInWei = (await calculateOptimismToL1FeeFromCalldata(route.methodParameters.calldata, chainId, provider))[1];
    }
    // add l2 to l1 fee and wrap fee to native currency
    const gasCostInWei = gasPriceWei.mul(simulatedGasUsed).add(l2toL1FeeInWei);
    const nativeCurrency = util_1.WRAPPED_NATIVE_CURRENCY[chainId];
    const costNativeCurrency = getGasCostInNativeCurrency(nativeCurrency, gasCostInWei);
    const usdPool = await getHighestLiquidityV3USDPool(chainId, v3PoolProvider, providerConfig);
    /** ------ MARK: USD logic  -------- */
    const gasCostUSD = (0, routers_1.getQuoteThroughNativePool)(chainId, costNativeCurrency, usdPool);
    /** ------ MARK: Conditional logic run if gasToken is specified  -------- */
    let gasCostInTermsOfGasToken = undefined;
    if (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.gasToken) {
        if (providerConfig.gasToken.equals(nativeCurrency)) {
            gasCostInTermsOfGasToken = costNativeCurrency;
        }
        else {
            const nativeAndSpecifiedGasTokenPool = await getHighestLiquidityV3NativePool(providerConfig.gasToken, v3PoolProvider, providerConfig);
            if (nativeAndSpecifiedGasTokenPool) {
                gasCostInTermsOfGasToken = (0, routers_1.getQuoteThroughNativePool)(chainId, costNativeCurrency, nativeAndSpecifiedGasTokenPool);
            }
            else {
                util_1.log.info(`Could not find a V3 pool for gas token ${providerConfig.gasToken.symbol}`);
            }
        }
    }
    /** ------ MARK: Main gas logic in terms of quote token -------- */
    let gasCostQuoteToken = undefined;
    // shortcut if quote token is native currency
    if (quoteToken.equals(nativeCurrency)) {
        gasCostQuoteToken = costNativeCurrency;
    }
    // get fee in terms of quote token
    else {
        const nativePools = await Promise.all([
            getHighestLiquidityV3NativePool(quoteToken, v3PoolProvider, providerConfig),
            getV2NativePool(quoteToken, v2PoolProvider, providerConfig),
        ]);
        const nativePool = nativePools.find((pool) => pool !== null);
        if (!nativePool) {
            util_1.log.info('Could not find any V2 or V3 pools to convert the cost into the quote token');
            gasCostQuoteToken = util_1.CurrencyAmount.fromRawAmount(quoteToken, 0);
        }
        else {
            gasCostQuoteToken = (0, routers_1.getQuoteThroughNativePool)(chainId, costNativeCurrency, nativePool);
        }
    }
    // Adjust quote for gas fees
    let quoteGasAdjusted;
    if (route.trade.tradeType == sdk_core_1.TradeType.EXACT_OUTPUT) {
        // Exact output - need more of tokenIn to get the desired amount of tokenOut
        quoteGasAdjusted = route.quote.add(gasCostQuoteToken);
    }
    else {
        // Exact input - can get less of tokenOut due to fees
        quoteGasAdjusted = route.quote.subtract(gasCostQuoteToken);
    }
    return {
        estimatedGasUsedUSD: gasCostUSD,
        estimatedGasUsedQuoteToken: gasCostQuoteToken,
        estimatedGasUsedGasToken: gasCostInTermsOfGasToken,
        quoteGasAdjusted: quoteGasAdjusted,
    };
}
exports.calculateGasUsed = calculateGasUsed;
function initSwapRouteFromExisting(swapRoute, v2PoolProvider, v3PoolProvider, v4PoolProvider, portionProvider, quoteGasAdjusted, estimatedGasUsed, estimatedGasUsedQuoteToken, estimatedGasUsedUSD, swapOptions, estimatedGasUsedGasToken, providerConfig) {
    const currencyIn = swapRoute.trade.inputAmount.currency;
    const currencyOut = swapRoute.trade.outputAmount.currency;
    const tradeType = swapRoute.trade.tradeType.valueOf()
        ? sdk_core_1.TradeType.EXACT_OUTPUT
        : sdk_core_1.TradeType.EXACT_INPUT;
    const routesWithValidQuote = swapRoute.route.map((route) => {
        switch (route.protocol) {
            case router_sdk_1.Protocol.V4:
                return new routers_1.V4RouteWithValidQuote({
                    amount: util_1.CurrencyAmount.fromFractionalAmount(route.amount.currency, route.amount.numerator, route.amount.denominator),
                    rawQuote: bignumber_1.BigNumber.from(route.rawQuote),
                    sqrtPriceX96AfterList: route.sqrtPriceX96AfterList.map((num) => bignumber_1.BigNumber.from(num)),
                    initializedTicksCrossedList: [...route.initializedTicksCrossedList],
                    quoterGasEstimate: bignumber_1.BigNumber.from(route.gasEstimate),
                    percent: route.percent,
                    route: route.route,
                    gasModel: route.gasModel,
                    quoteToken: new sdk_core_1.Token(currencyIn.chainId, route.quoteToken.address, route.quoteToken.decimals, route.quoteToken.symbol, route.quoteToken.name),
                    tradeType: tradeType,
                    v4PoolProvider: v4PoolProvider,
                });
            case router_sdk_1.Protocol.V3:
                return new routers_1.V3RouteWithValidQuote({
                    amount: util_1.CurrencyAmount.fromFractionalAmount(route.amount.currency, route.amount.numerator, route.amount.denominator),
                    rawQuote: bignumber_1.BigNumber.from(route.rawQuote),
                    sqrtPriceX96AfterList: route.sqrtPriceX96AfterList.map((num) => bignumber_1.BigNumber.from(num)),
                    initializedTicksCrossedList: [...route.initializedTicksCrossedList],
                    quoterGasEstimate: bignumber_1.BigNumber.from(route.gasEstimate),
                    percent: route.percent,
                    route: route.route,
                    gasModel: route.gasModel,
                    quoteToken: new sdk_core_1.Token(currencyIn.chainId, route.quoteToken.address, route.quoteToken.decimals, route.quoteToken.symbol, route.quoteToken.name),
                    tradeType: tradeType,
                    v3PoolProvider: v3PoolProvider,
                });
            case router_sdk_1.Protocol.V2:
                return new routers_1.V2RouteWithValidQuote({
                    amount: util_1.CurrencyAmount.fromFractionalAmount(route.amount.currency, route.amount.numerator, route.amount.denominator),
                    rawQuote: bignumber_1.BigNumber.from(route.rawQuote),
                    percent: route.percent,
                    route: route.route,
                    gasModel: route.gasModel,
                    quoteToken: new sdk_core_1.Token(currencyIn.chainId, route.quoteToken.address, route.quoteToken.decimals, route.quoteToken.symbol, route.quoteToken.name),
                    tradeType: tradeType,
                    v2PoolProvider: v2PoolProvider,
                });
            case router_sdk_1.Protocol.MIXED:
                return new routers_1.MixedRouteWithValidQuote({
                    amount: util_1.CurrencyAmount.fromFractionalAmount(route.amount.currency, route.amount.numerator, route.amount.denominator),
                    rawQuote: bignumber_1.BigNumber.from(route.rawQuote),
                    sqrtPriceX96AfterList: route.sqrtPriceX96AfterList.map((num) => bignumber_1.BigNumber.from(num)),
                    initializedTicksCrossedList: [...route.initializedTicksCrossedList],
                    quoterGasEstimate: bignumber_1.BigNumber.from(route.gasEstimate),
                    percent: route.percent,
                    route: route.route,
                    mixedRouteGasModel: route.gasModel,
                    v2PoolProvider,
                    quoteToken: new sdk_core_1.Token(currencyIn.chainId, route.quoteToken.address, route.quoteToken.decimals, route.quoteToken.symbol, route.quoteToken.name),
                    tradeType: tradeType,
                    v3PoolProvider: v3PoolProvider,
                    v4PoolProvider: v4PoolProvider,
                });
            default:
                throw new Error('Invalid protocol');
        }
    });
    const trade = (0, methodParameters_1.buildTrade)(currencyIn, currencyOut, tradeType, routesWithValidQuote);
    const quoteGasAndPortionAdjusted = swapRoute.portionAmount
        ? portionProvider.getQuoteGasAndPortionAdjusted(swapRoute.trade.tradeType, quoteGasAdjusted, swapRoute.portionAmount)
        : undefined;
    const routesWithValidQuotePortionAdjusted = portionProvider.getRouteWithQuotePortionAdjusted(swapRoute.trade.tradeType, routesWithValidQuote, swapOptions, providerConfig);
    return {
        quote: swapRoute.quote,
        quoteGasAdjusted,
        quoteGasAndPortionAdjusted,
        estimatedGasUsed,
        estimatedGasUsedQuoteToken,
        estimatedGasUsedGasToken,
        estimatedGasUsedUSD,
        gasPriceWei: bignumber_1.BigNumber.from(swapRoute.gasPriceWei),
        trade,
        route: routesWithValidQuotePortionAdjusted,
        blockNumber: bignumber_1.BigNumber.from(swapRoute.blockNumber),
        methodParameters: swapRoute.methodParameters
            ? {
                calldata: swapRoute.methodParameters.calldata,
                value: swapRoute.methodParameters.value,
                to: swapRoute.methodParameters.to,
            }
            : undefined,
        simulationStatus: swapRoute.simulationStatus,
        portionAmount: swapRoute.portionAmount,
        hitsCachedRoute: swapRoute.hitsCachedRoute,
    };
}
exports.initSwapRouteFromExisting = initSwapRouteFromExisting;
const calculateL1GasFeesHelper = async (route, chainId, usdPool, quoteToken, nativePool, provider, l2GasData, providerConfig) => {
    var _a;
    const swapOptions = {
        type: routers_1.SwapType.UNIVERSAL_ROUTER,
        version: (_a = providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.universalRouterVersion) !== null && _a !== void 0 ? _a : universal_router_sdk_1.UniversalRouterVersion.V1_2,
        recipient: '0x0000000000000000000000000000000000000001',
        deadlineOrPreviousBlockhash: 100,
        slippageTolerance: new sdk_core_1.Percent(5, 10000),
    };
    let mainnetGasUsed = bignumber_1.BigNumber.from(0);
    let mainnetFeeInWei = bignumber_1.BigNumber.from(0);
    let gasUsedL1OnL2 = bignumber_1.BigNumber.from(0);
    if (l2FeeChains_1.opStackChains.includes(chainId)) {
        [mainnetGasUsed, mainnetFeeInWei] = await calculateOptimismToL1SecurityFee(route, swapOptions, chainId, provider);
    }
    else if (chainId == globalChainId_1.ChainId.ARBITRUM_ONE ||
        chainId == globalChainId_1.ChainId.ARBITRUM_GOERLI) {
        [mainnetGasUsed, mainnetFeeInWei, gasUsedL1OnL2] =
            calculateArbitrumToL1SecurityFee(route, swapOptions, l2GasData, chainId);
    }
    // wrap fee to native currency
    const nativeCurrency = util_1.WRAPPED_NATIVE_CURRENCY[chainId];
    const costNativeCurrency = util_1.CurrencyAmount.fromRawAmount(nativeCurrency, mainnetFeeInWei.toString());
    // convert fee into usd
    const gasCostL1USD = (0, routers_1.getQuoteThroughNativePool)(chainId, costNativeCurrency, usdPool);
    let gasCostL1QuoteToken = costNativeCurrency;
    // if the inputted token is not in the native currency, quote a native/quote token pool to get the gas cost in terms of the quote token
    if (!quoteToken.equals(nativeCurrency)) {
        if (!nativePool) {
            util_1.log.info('Could not find a pool to convert the cost into the quote token');
            gasCostL1QuoteToken = util_1.CurrencyAmount.fromRawAmount(quoteToken, 0);
        }
        else {
            const nativeTokenPrice = nativePool.token0.address == nativeCurrency.address
                ? nativePool.token0Price
                : nativePool.token1Price;
            gasCostL1QuoteToken = nativeTokenPrice.quote(costNativeCurrency);
        }
    }
    // gasUsedL1 is the gas units used calculated from the bytes of the calldata
    // gasCostL1USD and gasCostL1QuoteToken is the cost of gas in each of those tokens
    return {
        gasUsedL1: mainnetGasUsed,
        gasUsedL1OnL2,
        gasCostL1USD,
        gasCostL1QuoteToken,
    };
    /**
     * To avoid having a call to optimism's L1 security fee contract for every route and amount combination,
     * we replicate the gas cost accounting here.
     */
    async function calculateOptimismToL1SecurityFee(routes, swapConfig, chainId, provider) {
        const route = routes[0];
        const amountToken = route.tradeType == sdk_core_1.TradeType.EXACT_INPUT
            ? route.amount.currency
            : route.quote.currency;
        const outputToken = route.tradeType == sdk_core_1.TradeType.EXACT_INPUT
            ? route.quote.currency
            : route.amount.currency;
        // build trade for swap calldata
        const trade = (0, methodParameters_1.buildTrade)(amountToken, outputToken, route.tradeType, routes);
        const data = (0, methodParameters_1.buildSwapMethodParameters)(trade, swapConfig, globalChainId_1.ChainId.OPTIMISM).calldata;
        const [l1GasUsed, l1GasCost] = await calculateOptimismToL1FeeFromCalldata(data, chainId, provider);
        return [l1GasUsed, l1GasCost];
    }
    function calculateArbitrumToL1SecurityFee(routes, swapConfig, gasData, chainId) {
        const route = routes[0];
        const amountToken = route.tradeType == sdk_core_1.TradeType.EXACT_INPUT
            ? route.amount.currency
            : route.quote.currency;
        const outputToken = route.tradeType == sdk_core_1.TradeType.EXACT_INPUT
            ? route.quote.currency
            : route.amount.currency;
        // build trade for swap calldata
        const trade = (0, methodParameters_1.buildTrade)(amountToken, outputToken, route.tradeType, routes);
        const data = (0, methodParameters_1.buildSwapMethodParameters)(trade, swapConfig, globalChainId_1.ChainId.ARBITRUM_ONE).calldata;
        return calculateArbitrumToL1FeeFromCalldata(data, gasData, chainId);
    }
};
exports.calculateL1GasFeesHelper = calculateL1GasFeesHelper;
// Logs metrics about the diff between original estimatedGasUsed based on heuristics and the simulated gas used.
// This will help us track the quality of our gas estimation quality per chain.
const logGasEstimationVsSimulationMetrics = (route, simulationGasUsed, chainId) => {
    try {
        // Log the diff between original estimatedGasUsed and the simulated gas used
        const estimatedGasUsed = route.estimatedGasUsed.toNumber();
        const simulatedGasUsed = simulationGasUsed.toNumber();
        const diff = estimatedGasUsed - simulatedGasUsed;
        const absDiff = Math.abs(estimatedGasUsed - simulatedGasUsed);
        const misEstimatePercent = (diff / estimatedGasUsed) * 100;
        const misEstimateAbsPercent = (absDiff / estimatedGasUsed) * 100;
        util_1.log.info({
            estimatedGasUsed: estimatedGasUsed,
            simulatedGasUsed: simulatedGasUsed,
            absDiff: absDiff,
            diff: diff,
        }, 'Gas used diff between estimatedGasUsed and simulatedGasUsed');
        util_1.log.info({
            misEstimateAbsPercent: misEstimateAbsPercent,
        }, 'Gas used mis-estimate percent');
        routers_1.metric.putMetric(`TenderlySimulationGasUsed_AbsDiff_Chain_${chainId}`, absDiff, routers_1.MetricLoggerUnit.Count);
        routers_1.metric.putMetric(`TenderlySimulationGasUsed_MisEstimateAbsPercent_Chain_${chainId}`, misEstimateAbsPercent, routers_1.MetricLoggerUnit.Count);
        const label = diff >= 0 ? 'OverEstimate' : 'UnderEstimate';
        routers_1.metric.putMetric(`TenderlySimulationGasUsed_${label}Percent_Chain_${chainId}`, misEstimatePercent, routers_1.MetricLoggerUnit.Count);
    }
    catch (err) {
        util_1.log.error({ err: err }, 'Failed to log diff between original estimatedGasUsed and the simulated gas used');
    }
};
exports.logGasEstimationVsSimulationMetrics = logGasEstimationVsSimulationMetrics;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FzLWZhY3RvcnktaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy91dGlsL2dhcy1mYWN0b3J5LWhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsMkNBQXFFO0FBQ3JFLHdEQUFxRDtBQUVyRCxvREFBK0M7QUFDL0MsZ0RBQThEO0FBQzlELHdFQUF1RTtBQUV2RSw0Q0FBa0Q7QUFDbEQsb0RBQTRCO0FBQzVCLGdEQUF3QjtBQUN4QixvREFBdUI7QUFFdkIsb0RBQTJDO0FBTTNDLHdDQWdCb0I7QUFDcEIsa0NBS2lCO0FBRWpCLCtDQUE4QztBQUM5Qyx5REFBMkU7QUFHcEUsS0FBSyxVQUFVLGVBQWUsQ0FDbkMsS0FBWSxFQUNaLFlBQTZCLEVBQzdCLGNBQXVDO0lBRXZDLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFrQixDQUFDO0lBQ3pDLE1BQU0sSUFBSSxHQUFHLDhCQUF1QixDQUFDLE9BQU8sQ0FBRSxDQUFDO0lBRS9DLE1BQU0sWUFBWSxHQUFHLE1BQU0sWUFBWSxDQUFDLFFBQVEsQ0FDOUMsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUNmLGNBQWMsQ0FDZixDQUFDO0lBQ0YsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFL0MsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNqRSxVQUFHLENBQUMsS0FBSyxDQUNQO1lBQ0UsSUFBSTtZQUNKLEtBQUs7WUFDTCxRQUFRLEVBQUUsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUU7WUFDbEMsUUFBUSxFQUFFLElBQUksYUFBSixJQUFJLHVC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