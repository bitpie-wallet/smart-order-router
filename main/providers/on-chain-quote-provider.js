"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnChainQuoteProvider = exports.ProviderGasError = exports.ProviderTimeoutError = exports.ProviderBlockHeaderError = exports.SuccessRateError = exports.BlockConflictError = void 0;
const bignumber_1 = require("@ethersproject/bignumber");
const router_sdk_1 = require("@uniswap/router-sdk");
const v3_sdk_1 = require("@uniswap/v3-sdk");
const v4_sdk_1 = require("@uniswap/v4-sdk");
const async_retry_1 = __importDefault(require("async-retry"));
const lodash_1 = __importDefault(require("lodash"));
const stats_lite_1 = __importDefault(require("stats-lite"));
const globalChainId_1 = require("../globalChainId");
const router_1 = require("../routers/router");
const IMixedRouteQuoterV1__factory_1 = require("../types/other/factories/IMixedRouteQuoterV1__factory");
const MixedRouteQuoterV2__factory_1 = require("../types/other/factories/MixedRouteQuoterV2__factory");
const V4Quoter__factory_1 = require("../types/other/factories/V4Quoter__factory");
const IQuoterV2__factory_1 = require("../types/v3/factories/IQuoterV2__factory");
const util_1 = require("../util");
const log_1 = require("../util/log");
const onchainQuoteProviderConfigs_1 = require("../util/onchainQuoteProviderConfigs");
const routes_1 = require("../util/routes");
class BlockConflictError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'BlockConflictError';
    }
}
exports.BlockConflictError = BlockConflictError;
class SuccessRateError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'SuccessRateError';
    }
}
exports.SuccessRateError = SuccessRateError;
class ProviderBlockHeaderError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'ProviderBlockHeaderError';
    }
}
exports.ProviderBlockHeaderError = ProviderBlockHeaderError;
class ProviderTimeoutError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'ProviderTimeoutError';
    }
}
exports.ProviderTimeoutError = ProviderTimeoutError;
/**
 * This error typically means that the gas used by the multicall has
 * exceeded the total call gas limit set by the node provider.
 *
 * This can be resolved by modifying BatchParams to request fewer
 * quotes per call, or to set a lower gas limit per quote.
 *
 * @export
 * @class ProviderGasError
 */
class ProviderGasError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'ProviderGasError';
    }
}
exports.ProviderGasError = ProviderGasError;
const DEFAULT_BATCH_RETRIES = 2;
/**
 * Computes on chain quotes for swaps. For pure V3 routes, quotes are computed on-chain using
 * the 'QuoterV2' smart contract. For exactIn mixed and V2 routes, quotes are computed using the 'MixedRouteQuoterV1' contract
 * This is because computing quotes off-chain would require fetching all the tick data for each pool, which is a lot of data.
 *
 * To minimize the number of requests for quotes we use a Multicall contract. Generally
 * the number of quotes to fetch exceeds the maximum we can fit in a single multicall
 * while staying under gas limits, so we also batch these quotes across multiple multicalls.
 *
 * The biggest challenge with the quote provider is dealing with various gas limits.
 * Each provider sets a limit on the amount of gas a call can consume (on Infura this
 * is approximately 10x the block max size), so we must ensure each multicall does not
 * exceed this limit. Additionally, each quote on V3 can consume a large number of gas if
 * the pool lacks liquidity and the swap would cause all the ticks to be traversed.
 *
 * To ensure we don't exceed the node's call limit, we limit the gas used by each quote to
 * a specific value, and we limit the number of quotes in each multicall request. Users of this
 * class should set BatchParams such that multicallChunk * gasLimitPerCall is less than their node
 * providers total gas limit per call.
 *
 * @export
 * @class OnChainQuoteProvider
 */
class OnChainQuoteProvider {
    /**
     * Creates an instance of OnChainQuoteProvider.
     *
     * @param chainId The chain to get quotes for.
     * @param provider The web 3 provider.
     * @param multicall2Provider The multicall provider to use to get the quotes on-chain.
     * Only supports the Uniswap Multicall contract as it needs the gas limitting functionality.
     * @param retryOptions The retry options for each call to the multicall.
     * @param batchParams The parameters for each batched call to the multicall.
     * @param gasErrorFailureOverride The gas and chunk parameters to use when retrying a batch that failed due to out of gas.
     * @param successRateFailureOverrides The parameters for retries when we fail to get quotes.
     * @param blockNumberConfig Parameters for adjusting which block we get quotes from, and how to handle block header not found errors.
     * @param [quoterAddressOverride] Overrides the address of the quoter contract to use.
     * @param metricsPrefix metrics prefix to differentiate between different instances of the quote provider.
     */
    constructor(chainId, provider, 
    // Only supports Uniswap Multicall as it needs the gas limitting functionality.
    multicall2Provider, 
    // retryOptions, batchParams, and gasErrorFailureOverride are always override in alpha-router
    // so below default values are always not going to be picked up in prod.
    // So we will not extract out below default values into constants.
    retryOptions = {
        retries: DEFAULT_BATCH_RETRIES,
        minTimeout: 25,
        maxTimeout: 250,
    }, batchParams = (_optimisticCachedRoutes, _protocol) => {
        return {
            multicallChunk: 150,
            gasLimitPerCall: 1000000,
            quoteMinSuccessRate: 0.2,
        };
    }, gasErrorFailureOverride = (_protocol) => {
        return {
            gasLimitOverride: 1500000,
            multicallChunk: 100,
        };
    }, 
    // successRateFailureOverrides and blockNumberConfig are not always override in alpha-router.
    // So we will extract out below default values into constants.
    // In alpha-router default case, we will also define the constants with same values as below.
    successRateFailureOverrides = (_protocol) => {
        return onchainQuoteProviderConfigs_1.DEFAULT_SUCCESS_RATE_FAILURE_OVERRIDES;
    }, blockNumberConfig = (_protocol) => {
        return onchainQuoteProviderConfigs_1.DEFAULT_BLOCK_NUMBER_CONFIGS;
    }, quoterAddressOverride, metricsPrefix = (chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes) => useMixedRouteQuoter
        ? `ChainId_${chainId}_${protocol}RouteQuoter${mixedRouteContainsV4Pool ? 'V2' : 'V1'}_OptimisticCachedRoutes${optimisticCachedRoutes}_`
        : `ChainId_${chainId}_${protocol}Quoter_OptimisticCachedRoutes${optimisticCachedRoutes}_`) {
        this.chainId = chainId;
        this.provider = provider;
        this.multicall2Provider = multicall2Provider;
        this.retryOptions = retryOptions;
        this.batchParams = batchParams;
        this.gasErrorFailureOverride = gasErrorFailureOverride;
        this.successRateFailureOverrides = successRateFailureOverrides;
        this.blockNumberConfig = blockNumberConfig;
        this.quoterAddressOverride = quoterAddressOverride;
        this.metricsPrefix = metricsPrefix;
    }
    getQuoterAddress(useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol) {
        if (this.quoterAddressOverride) {
            const quoterAddress = this.quoterAddressOverride(useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol);
            if (!quoterAddress) {
                throw new Error(`No address for the quoter contract on chain id: ${this.chainId} ${useMixedRouteQuoter} ${mixedRouteContainsV4Pool} ${protocol}`);
            }
            return quoterAddress;
        }
        const quoterAddress = useMixedRouteQuoter
            ? mixedRouteContainsV4Pool
                ? util_1.MIXED_ROUTE_QUOTER_V2_ADDRESSES[this.chainId]
                : util_1.MIXED_ROUTE_QUOTER_V1_ADDRESSES[this.chainId]
            : protocol === router_sdk_1.Protocol.V3
                ? util_1.NEW_QUOTER_V2_ADDRESSES[this.chainId]
                : util_1.PROTOCOL_V4_QUOTER_ADDRESSES[this.chainId];
        if (!quoterAddress) {
            throw new Error(`No address for the quoter contract on chain id: ${this.chainId}`);
        }
        return quoterAddress;
    }
    async getQuotesManyExactIn(amountIns, routes, providerConfig) {
        return this.getQuotesManyData(amountIns, routes, 'quoteExactInput', providerConfig);
    }
    async getQuotesManyExactOut(amountOuts, routes, providerConfig) {
        return this.getQuotesManyData(amountOuts, routes, 'quoteExactOutput', providerConfig);
    }
    encodeRouteToPath(route, functionName, mixedRouteContainsV4Pool) {
        switch (route.protocol) {
            case router_sdk_1.Protocol.V3:
                return (0, v3_sdk_1.encodeRouteToPath)(route, functionName == 'quoteExactOutput' // For exactOut must be true to ensure the routes are reversed.
                );
            case router_sdk_1.Protocol.V4:
                return (0, v4_sdk_1.encodeRouteToPath)(route, functionName == 'quoteExactOutput');
            // We don't have onchain V2 quoter, but we do have a mixed quoter that can quote against v2 routes onchain
            // Hence in case of V2 or mixed, we explicitly encode into mixed routes.
            case router_sdk_1.Protocol.V2:
            case router_sdk_1.Protocol.MIXED:
                // we need to retain the fake pool data for the mixed route
                return (0, router_sdk_1.encodeMixedRouteToPath)(route instanceof router_1.V2Route
                    ? new router_sdk_1.MixedRouteSDK(route.pairs, route.input, route.output, true)
                    : route, mixedRouteContainsV4Pool);
            default:
                throw new Error(`Unsupported protocol for the route: ${JSON.stringify(route)}`);
        }
    }
    getContractInterface(useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol) {
        if (useMixedRouteQuoter) {
            if (mixedRouteContainsV4Pool) {
                return MixedRouteQuoterV2__factory_1.MixedRouteQuoterV2__factory.createInterface();
            }
            else {
                return IMixedRouteQuoterV1__factory_1.IMixedRouteQuoterV1__factory.createInterface();
            }
        }
        switch (protocol) {
            case router_sdk_1.Protocol.V3:
                return IQuoterV2__factory_1.IQuoterV2__factory.createInterface();
            case router_sdk_1.Protocol.V4:
                return V4Quoter__factory_1.V4Quoter__factory.createInterface();
            default:
                throw new Error(`Unsupported protocol: ${protocol}`);
        }
    }
    async getQuotesForChain(useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, functionName, inputs, providerConfig, gasLimitOverride) {
        if (this.chainId === globalChainId_1.ChainId.TRON) {
            return this.getTronQuotes(functionName, inputs, providerConfig, gasLimitOverride);
        }
        return this.consolidateResults(protocol, useMixedRouteQuoter, mixedRouteContainsV4Pool, functionName, inputs, providerConfig, gasLimitOverride);
    }
    async getTronQuotes(functionName, inputs, _providerConfig, _gasLimitOverride) {
        const { Interface } = await Promise.resolve().then(() => __importStar(require('@ethersproject/abi')));
        const { Contract } = await Promise.resolve().then(() => __importStar(require('@ethersproject/contracts')));
        const sunswapQuoterInterface = new Interface([
            'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
            'function quoteExactInput(bytes path, uint256 amountIn) external returns (uint256 amountOut)',
            'function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn)',
            'function quoteExactOutput(bytes path, uint256 amountOut) external returns (uint256 amountIn)'
        ]);
        try {
            const quoterContract = new Contract(this.getQuoterAddress(false, false, router_sdk_1.Protocol.V3), sunswapQuoterInterface, this.provider);
            const results = await Promise.all(inputs.map(async (input) => {
                try {
                    let encodedPath;
                    let amount;
                    if (Array.isArray(input) && input.length === 2) {
                        [encodedPath, amount] = input;
                    }
                    else {
                        throw new Error(`不支持的输入格式: ${JSON.stringify(input)}`);
                    }
                    const callStatic = quoterContract.callStatic;
                    let result;
                    if (functionName === 'quoteExactInput') {
                        if (this.isSingleHopPath(encodedPath)) {
                            const { tokenIn, tokenOut, fee } = this.parseV3Path(encodedPath);
                            result = await callStatic.quoteExactInputSingle(tokenIn, tokenOut, fee, amount, 0);
                        }
                        else {
                            result = await callStatic.quoteExactInput(encodedPath, amount);
                        }
                    }
                    else {
                        if (this.isSingleHopPath(encodedPath)) {
                            const reversedPath = this.reverseV3Path(encodedPath);
                            const { tokenIn, tokenOut, fee } = this.parseV3Path(reversedPath);
                            result = await callStatic.quoteExactOutputSingle(tokenIn, tokenOut, fee, amount, 0);
                        }
                        else {
                            result = await callStatic.quoteExactOutput(encodedPath, amount);
                        }
                    }
                    return {
                        success: true,
                        result: [result]
                    };
                }
                catch (error) {
                    return {
                        success: false,
                        error: error instanceof Error ? error : new Error(String(error)),
                        returnData: '0x'
                    };
                }
            }));
            const convertedResults = {
                results: results.map((result) => {
                    if (result.success) {
                        return {
                            success: true,
                            result: [
                                result.result[0],
                                [],
                                [],
                                bignumber_1.BigNumber.from(0)
                            ]
                        };
                    }
                    return {
                        success: false,
                        error: result.error,
                        returnData: '0x'
                    };
                }),
                blockNumber: bignumber_1.BigNumber.from(0),
                approxGasUsedPerSuccessCall: 0
            };
            return convertedResults;
        }
        catch (error) {
            console.error(`❌ TRON Quoter 调用异常:`, error);
            throw error;
        }
    }
    isSingleHopPath(encodedPath) {
        const path = encodedPath.startsWith('0x') ? encodedPath.slice(2) : encodedPath;
        return path.length === 86;
    }
    reverseV3Path(encodedPath) {
        const path = encodedPath.startsWith('0x') ? encodedPath.slice(2) : encodedPath;
        const tokens = [];
        const fees = [];
        let offset = 0;
        while (offset < path.length) {
            tokens.push(path.slice(offset, offset + 40));
            offset += 40;
            if (offset < path.length) {
                fees.push(path.slice(offset, offset + 6));
                offset += 6;
            }
        }
        tokens.reverse();
        let reversedPath = '';
        for (let i = 0; i < tokens.length; i++) {
            reversedPath += tokens[i];
            if (i < fees.length) {
                reversedPath += fees[fees.length - 1 - i];
            }
        }
        return '0x' + reversedPath;
    }
    parseV3Path(encodedPath) {
        const path = encodedPath.startsWith('0x') ? encodedPath.slice(2) : encodedPath;
        if (path.length === 86) {
            const tokenIn = '0x' + path.slice(0, 40);
            const feeHex = path.slice(40, 46);
            const fee = parseInt(feeHex, 16);
            const tokenOut = '0x' + path.slice(46, 86);
            return { tokenIn, tokenOut, fee };
        }
        else {
            const tokenIn = '0x' + path.slice(0, 40);
            const tokenOut = '0x' + path.slice(path.length - 40);
            const fee = parseInt(path.slice(40, 46), 16);
            return { tokenIn, tokenOut, fee };
        }
    }
    async consolidateResults(protocol, useMixedRouteQuoter, mixedRouteContainsV4Pool, functionName, inputs, providerConfig, gasLimitOverride) {
        if ((protocol === router_sdk_1.Protocol.MIXED && mixedRouteContainsV4Pool) ||
            protocol === router_sdk_1.Protocol.V4) {
            const mixedQuote = await this.multicall2Provider.callSameFunctionOnContractWithMultipleParams({
                address: this.getQuoterAddress(useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol),
                contractInterface: this.getContractInterface(useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol),
                functionName,
                functionParams: inputs,
                providerConfig,
                additionalConfig: {
                    gasLimitPerCallOverride: gasLimitOverride,
                },
            });
            return {
                blockNumber: mixedQuote.blockNumber,
                approxGasUsedPerSuccessCall: mixedQuote.approxGasUsedPerSuccessCall,
                results: mixedQuote.results.map((result) => {
                    if (result.success) {
                        switch (functionName) {
                            case 'quoteExactInput':
                            case 'quoteExactOutput':
                                return {
                                    success: true,
                                    result: [
                                        result.result[0],
                                        Array(inputs.length),
                                        Array(inputs.length),
                                        result.result[1],
                                    ],
                                };
                            default:
                                throw new Error(`Unsupported function name: ${functionName}`);
                        }
                    }
                    else {
                        return result;
                    }
                }),
            };
        }
        else {
            return await this.multicall2Provider.callSameFunctionOnContractWithMultipleParams({
                address: this.getQuoterAddress(useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol),
                contractInterface: this.getContractInterface(useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol),
                functionName,
                functionParams: inputs,
                providerConfig,
                additionalConfig: {
                    gasLimitPerCallOverride: gasLimitOverride,
                },
            });
        }
    }
    async getQuotesManyData(amounts, routes, functionName, _providerConfig) {
        var _a, _b;
        const useMixedRouteQuoter = routes.some((route) => route.protocol === router_sdk_1.Protocol.V2) ||
            routes.some((route) => route.protocol === router_sdk_1.Protocol.MIXED);
        const useV4RouteQuoter = routes.some((route) => route.protocol === router_sdk_1.Protocol.V4) &&
            !useMixedRouteQuoter;
        const mixedRouteContainsV4Pool = useMixedRouteQuoter
            ? routes.some((route) => route.protocol === router_sdk_1.Protocol.MIXED &&
                route.pools.some((pool) => pool instanceof v4_sdk_1.Pool))
            : false;
        const protocol = useMixedRouteQuoter
            ? router_sdk_1.Protocol.MIXED
            : useV4RouteQuoter
                ? router_sdk_1.Protocol.V4
                : router_sdk_1.Protocol.V3;
        const optimisticCachedRoutes = (_a = _providerConfig === null || _providerConfig === void 0 ? void 0 : _providerConfig.optimisticCachedRoutes) !== null && _a !== void 0 ? _a : false;
        /// Validate that there are no incorrect routes / function combinations
        this.validateRoutes(routes, functionName, useMixedRouteQuoter);
        let multicallChunk = this.batchParams(optimisticCachedRoutes, protocol).multicallChunk;
        let gasLimitOverride = this.batchParams(optimisticCachedRoutes, protocol).gasLimitPerCall;
        const { baseBlockOffset, rollback } = this.blockNumberConfig(protocol);
        // Apply the base block offset if provided
        const originalBlockNumber = await this.provider.getBlockNumber();
        const providerConfig = Object.assign(Object.assign({}, _providerConfig), { blockNumber: (_b = _providerConfig === null || _providerConfig === void 0 ? void 0 : _providerConfig.blockNumber) !== null && _b !== void 0 ? _b : originalBlockNumber + baseBlockOffset });
        const inputs = (0, lodash_1.default)(routes)
            .flatMap((route) => {
            const encodedRoute = this.encodeRouteToPath(route, functionName, mixedRouteContainsV4Pool);
            const routeInputs = amounts.map((amount) => {
                switch (route.protocol) {
                    case router_sdk_1.Protocol.V4:
                        return [
                            {
                                exactCurrency: (0, util_1.getAddress)(amount.currency),
                                path: encodedRoute,
                                exactAmount: amount.quotient.toString(),
                            },
                        ];
                    case router_sdk_1.Protocol.MIXED:
                        if (mixedRouteContainsV4Pool) {
                            return [
                                encodedRoute,
                                {
                                    nonEncodableData: route.pools.map((_) => {
                                        return {
                                            hookData: '0x',
                                        };
                                    }),
                                },
                                amount.quotient.toString(),
                            ];
                        }
                        else {
                            return [encodedRoute, amount.quotient.toString()];
                        }
                    default:
                        return [
                            encodedRoute,
                            `0x${amount.quotient.toString(16)}`,
                        ];
                }
            });
            return routeInputs;
        })
            .value();
        const normalizedChunk = Math.ceil(inputs.length / Math.ceil(inputs.length / multicallChunk));
        const inputsChunked = lodash_1.default.chunk(inputs, normalizedChunk);
        let quoteStates = lodash_1.default.map(inputsChunked, (inputChunk) => {
            return {
                status: 'pending',
                inputs: inputChunk,
            };
        });
        log_1.log.info(`About to get ${inputs.length} quotes in chunks of ${normalizedChunk} [${lodash_1.default.map(inputsChunked, (i) => i.length).join(',')}] ${gasLimitOverride
            ? `with a gas limit override of ${gasLimitOverride}`
            : ''} and block number: ${await providerConfig.blockNumber} [Original before offset: ${originalBlockNumber}].`);
        util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteBatchSize`, inputs.length, util_1.MetricLoggerUnit.Count);
        util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteBatchSize_${(0, util_1.ID_TO_NETWORK_NAME)(this.chainId)}`, inputs.length, util_1.MetricLoggerUnit.Count);
        const startTime = Date.now();
        let haveRetriedForSuccessRate = false;
        let haveRetriedForBlockHeader = false;
        let blockHeaderRetryAttemptNumber = 0;
        let haveIncrementedBlockHeaderFailureCounter = false;
        let blockHeaderRolledBack = false;
        let haveRetriedForBlockConflictError = false;
        let haveRetriedForOutOfGas = false;
        let haveRetriedForTimeout = false;
        let haveRetriedForUnknownReason = false;
        let finalAttemptNumber = 1;
        const expectedCallsMade = quoteStates.length;
        let totalCallsMade = 0;
        const { results: quoteResults, blockNumber, approxGasUsedPerSuccessCall, } = await (0, async_retry_1.default)(async (_bail, attemptNumber) => {
            haveIncrementedBlockHeaderFailureCounter = false;
            finalAttemptNumber = attemptNumber;
            const [success, failed, pending] = this.partitionQuotes(quoteStates);
            log_1.log.info(`Starting attempt: ${attemptNumber}.
          Currently ${success.length} success, ${failed.length} failed, ${pending.length} pending.
          Gas limit override: ${gasLimitOverride} Block number override: ${providerConfig.blockNumber}.`);
            quoteStates = await Promise.all(lodash_1.default.map(quoteStates, async (quoteState, idx) => {
                if (quoteState.status == 'success') {
                    return quoteState;
                }
                // QuoteChunk is pending or failed, so we try again
                const { inputs } = quoteState;
                try {
                    totalCallsMade = totalCallsMade + 1;
                    const results = await this.getQuotesForChain(useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, functionName, inputs, providerConfig, gasLimitOverride);
                    const successRateError = this.validateSuccessRate(results.results, haveRetriedForSuccessRate, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes);
                    if (successRateError) {
                        return {
                            status: 'failed',
                            inputs,
                            reason: successRateError,
                            results,
                        };
                    }
                    return {
                        status: 'success',
                        inputs,
                        results,
                    };
                }
                catch (err) {
                    // Error from providers have huge messages that include all the calldata and fill the logs.
                    // Catch them and rethrow with shorter message.
                    if (err.message.includes('header not found')) {
                        return {
                            status: 'failed',
                            inputs,
                            reason: new ProviderBlockHeaderError(err.message.slice(0, 500)),
                        };
                    }
                    if (err.message.includes('timeout')) {
                        return {
                            status: 'failed',
                            inputs,
                            reason: new ProviderTimeoutError(`Req ${idx}/${quoteStates.length}. Request had ${inputs.length} inputs. ${err.message.slice(0, 500)}`),
                        };
                    }
                    if (err.message.includes('out of gas')) {
                        return {
                            status: 'failed',
                            inputs,
                            reason: new ProviderGasError(err.message.slice(0, 500)),
                        };
                    }
                    return {
                        status: 'failed',
                        inputs,
                        reason: new Error(`Unknown error from provider: ${err.message.slice(0, 500)}`),
                    };
                }
            }));
            const [successfulQuoteStates, failedQuoteStates, pendingQuoteStates] = this.partitionQuotes(quoteStates);
            if (pendingQuoteStates.length > 0) {
                throw new Error('Pending quote after waiting for all promises.');
            }
            let retryAll = false;
            const blockNumberError = this.validateBlockNumbers(successfulQuoteStates, inputsChunked.length, gasLimitOverride);
            // If there is a block number conflict we retry all the quotes.
            if (blockNumberError) {
                retryAll = true;
            }
            const reasonForFailureStr = lodash_1.default.map(failedQuoteStates, (failedQuoteState) => failedQuoteState.reason.name).join(', ');
            if (failedQuoteStates.length > 0) {
                log_1.log.info(`On attempt ${attemptNumber}: ${failedQuoteStates.length}/${quoteStates.length} quotes failed. Reasons: ${reasonForFailureStr}`);
                for (const failedQuoteState of failedQuoteStates) {
                    const { reason: error } = failedQuoteState;
                    log_1.log.info({ error }, `[QuoteFetchError] Attempt ${attemptNumber}. ${error.message}`);
                    if (error instanceof BlockConflictError) {
                        if (!haveRetriedForBlockConflictError) {
                            util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteBlockConflictErrorRetry`, 1, util_1.MetricLoggerUnit.Count);
                            haveRetriedForBlockConflictError = true;
                        }
                        retryAll = true;
                    }
                    else if (error instanceof ProviderBlockHeaderError) {
                        if (!haveRetriedForBlockHeader) {
                            util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteBlockHeaderNotFoundRetry`, 1, util_1.MetricLoggerUnit.Count);
                            haveRetriedForBlockHeader = true;
                        }
                        // Ensure that if multiple calls fail due to block header in the current pending batch,
                        // we only count once.
                        if (!haveIncrementedBlockHeaderFailureCounter) {
                            blockHeaderRetryAttemptNumber =
                                blockHeaderRetryAttemptNumber + 1;
                            haveIncrementedBlockHeaderFailureCounter = true;
                        }
                        if (rollback.enabled) {
                            const { rollbackBlockOffset, attemptsBeforeRollback } = rollback;
                            if (blockHeaderRetryAttemptNumber >= attemptsBeforeRollback &&
                                !blockHeaderRolledBack) {
                                log_1.log.info(`Attempt ${attemptNumber}. Have failed due to block header ${blockHeaderRetryAttemptNumber - 1} times. Rolling back block number by ${rollbackBlockOffset} for next retry`);
                                providerConfig.blockNumber = providerConfig.blockNumber
                                    ? (await providerConfig.blockNumber) + rollbackBlockOffset
                                    : (await this.provider.getBlockNumber()) +
                                        rollbackBlockOffset;
                                retryAll = true;
                                blockHeaderRolledBack = true;
                            }
                        }
                    }
                    else if (error instanceof ProviderTimeoutError) {
                        if (!haveRetriedForTimeout) {
                            util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteTimeoutRetry`, 1, util_1.MetricLoggerUnit.Count);
                            haveRetriedForTimeout = true;
                        }
                    }
                    else if (error instanceof ProviderGasError) {
                        if (!haveRetriedForOutOfGas) {
                            util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteOutOfGasExceptionRetry`, 1, util_1.MetricLoggerUnit.Count);
                            haveRetriedForOutOfGas = true;
                        }
                        gasLimitOverride =
                            this.gasErrorFailureOverride(protocol).gasLimitOverride;
                        multicallChunk =
                            this.gasErrorFailureOverride(protocol).multicallChunk;
                        retryAll = true;
                    }
                    else if (error instanceof SuccessRateError) {
                        if (!haveRetriedForSuccessRate) {
                            util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteSuccessRateRetry`, 1, util_1.MetricLoggerUnit.Count);
                            haveRetriedForSuccessRate = true;
                            // Low success rate can indicate too little gas given to each call.
                            gasLimitOverride =
                                this.successRateFailureOverrides(protocol).gasLimitOverride;
                            multicallChunk =
                                this.successRateFailureOverrides(protocol).multicallChunk;
                            retryAll = true;
                        }
                    }
                    else {
                        if (!haveRetriedForUnknownReason) {
                            util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteUnknownReasonRetry`, 1, util_1.MetricLoggerUnit.Count);
                            haveRetriedForUnknownReason = true;
                        }
                    }
                }
            }
            if (retryAll) {
                log_1.log.info(`Attempt ${attemptNumber}. Resetting all requests to pending for next attempt.`);
                const normalizedChunk = Math.ceil(inputs.length / Math.ceil(inputs.length / multicallChunk));
                const inputsChunked = lodash_1.default.chunk(inputs, normalizedChunk);
                quoteStates = lodash_1.default.map(inputsChunked, (inputChunk) => {
                    return {
                        status: 'pending',
                        inputs: inputChunk,
                    };
                });
            }
            if (failedQuoteStates.length > 0) {
                // TODO: Work with Arbitrum to find a solution for making large multicalls with gas limits that always
                // successfully.
                //
                // On Arbitrum we can not set a gas limit for every call in the multicall and guarantee that
                // we will not run out of gas on the node. This is because they have a different way of accounting
                // for gas, that seperates storage and compute gas costs, and we can not cover both in a single limit.
                //
                // To work around this and avoid throwing errors when really we just couldn't get a quote, we catch this
                // case and return 0 quotes found.
                if ((this.chainId == globalChainId_1.ChainId.ARBITRUM_ONE ||
                    this.chainId == globalChainId_1.ChainId.ARBITRUM_GOERLI) &&
                    lodash_1.default.every(failedQuoteStates, (failedQuoteState) => failedQuoteState.reason instanceof ProviderGasError) &&
                    attemptNumber == this.retryOptions.retries) {
                    log_1.log.error(`Failed to get quotes on Arbitrum due to provider gas error issue. Overriding error to return 0 quotes.`);
                    return {
                        results: [],
                        blockNumber: bignumber_1.BigNumber.from(0),
                        approxGasUsedPerSuccessCall: 0,
                    };
                }
                throw new Error(`Failed to get ${failedQuoteStates.length} quotes. Reasons: ${reasonForFailureStr}`);
            }
            const callResults = lodash_1.default.map(successfulQuoteStates, (quoteState) => quoteState.results);
            return {
                results: lodash_1.default.flatMap(callResults, (result) => result.results),
                blockNumber: bignumber_1.BigNumber.from(callResults[0].blockNumber),
                approxGasUsedPerSuccessCall: stats_lite_1.default.percentile(lodash_1.default.map(callResults, (result) => result.approxGasUsedPerSuccessCall), 100),
            };
        }, Object.assign({ retries: DEFAULT_BATCH_RETRIES }, this.retryOptions));
        const routesQuotes = this.processQuoteResults(quoteResults, routes, amounts, bignumber_1.BigNumber.from(gasLimitOverride));
        const endTime = Date.now();
        util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteLatency`, endTime - startTime, util_1.MetricLoggerUnit.Milliseconds);
        util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteApproxGasUsedPerSuccessfulCall`, approxGasUsedPerSuccessCall, util_1.MetricLoggerUnit.Count);
        util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteNumRetryLoops`, finalAttemptNumber - 1, util_1.MetricLoggerUnit.Count);
        util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteTotalCallsToProvider`, totalCallsMade, util_1.MetricLoggerUnit.Count);
        util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteExpectedCallsToProvider`, expectedCallsMade, util_1.MetricLoggerUnit.Count);
        util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteNumRetriedCalls`, totalCallsMade - expectedCallsMade, util_1.MetricLoggerUnit.Count);
        const [successfulQuotes, failedQuotes] = (0, lodash_1.default)(routesQuotes)
            .flatMap((routeWithQuotes) => routeWithQuotes[1])
            .partition((quote) => quote.quote != null)
            .value();
        log_1.log.info(`Got ${successfulQuotes.length} successful quotes, ${failedQuotes.length} failed quotes. Took ${finalAttemptNumber - 1} attempt loops. Total calls made to provider: ${totalCallsMade}. Have retried for timeout: ${haveRetriedForTimeout}`);
        // Log total routes
        util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}RoutesLength`, routesQuotes.length, util_1.MetricLoggerUnit.Count);
        // Log total quotes
        util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}RoutesQuotesLength`, successfulQuotes.length + failedQuotes.length, util_1.MetricLoggerUnit.Count);
        // log successful quotes
        util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}RoutesSuccessfulQuotesLength`, successfulQuotes.length, util_1.MetricLoggerUnit.Count);
        // log failed quotes
        util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}RoutesFailedQuotesLength`, failedQuotes.length, util_1.MetricLoggerUnit.Count);
        return {
            routesWithQuotes: routesQuotes,
            blockNumber,
        };
    }
    partitionQuotes(quoteStates) {
        const successfulQuoteStates = lodash_1.default.filter(quoteStates, (quoteState) => quoteState.status == 'success');
        const failedQuoteStates = lodash_1.default.filter(quoteStates, (quoteState) => quoteState.status == 'failed');
        const pendingQuoteStates = lodash_1.default.filter(quoteStates, (quoteState) => quoteState.status == 'pending');
        return [successfulQuoteStates, failedQuoteStates, pendingQuoteStates];
    }
    processQuoteResults(quoteResults, routes, amounts, gasLimit) {
        const routesQuotes = [];
        const quotesResultsByRoute = lodash_1.default.chunk(quoteResults, amounts.length);
        const debugFailedQuotes = [];
        for (let i = 0; i < quotesResultsByRoute.length; i++) {
            const route = routes[i];
            const quoteResults = quotesResultsByRoute[i];
            const quotes = lodash_1.default.map(quoteResults, (quoteResult, index) => {
                var _a;
                const amount = amounts[index];
                if (!quoteResult.success) {
                    const percent = (100 / amounts.length) * (index + 1);
                    const amountStr = amount.toFixed(Math.min(amount.currency.decimals, 2));
                    const routeStr = (0, routes_1.routeToString)(route);
                    debugFailedQuotes.push({
                        route: routeStr,
                        percent,
                        amount: amountStr,
                    });
                    return {
                        amount,
                        quote: null,
                        sqrtPriceX96AfterList: null,
                        gasEstimate: (_a = quoteResult.gasUsed) !== null && _a !== void 0 ? _a : null,
                        gasLimit: gasLimit,
                        initializedTicksCrossedList: null,
                    };
                }
                return {
                    amount,
                    quote: quoteResult.result[0],
                    sqrtPriceX96AfterList: quoteResult.result[1],
                    initializedTicksCrossedList: quoteResult.result[2],
                    gasEstimate: quoteResult.result[3],
                    gasLimit: gasLimit,
                };
            });
            routesQuotes.push([route, quotes]);
        }
        // For routes and amounts that we failed to get a quote for, group them by route
        // and batch them together before logging to minimize number of logs.
        const debugChunk = 80;
        lodash_1.default.forEach(lodash_1.default.chunk(debugFailedQuotes, debugChunk), (quotes, idx) => {
            const failedQuotesByRoute = lodash_1.default.groupBy(quotes, (q) => q.route);
            const failedFlat = lodash_1.default.mapValues(failedQuotesByRoute, (f) => (0, lodash_1.default)(f)
                .map((f) => `${f.percent}%[${f.amount}]`)
                .join(','));
            log_1.log.info({
                failedQuotes: lodash_1.default.map(failedFlat, (amounts, routeStr) => `${routeStr} : ${amounts}`),
            }, `Failed on chain quotes for routes Part ${idx}/${Math.ceil(debugFailedQuotes.length / debugChunk)}`);
        });
        return routesQuotes;
    }
    validateBlockNumbers(successfulQuoteStates, totalCalls, gasLimitOverride) {
        if (successfulQuoteStates.length <= 1) {
            return null;
        }
        const results = lodash_1.default.map(successfulQuoteStates, (quoteState) => quoteState.results);
        const blockNumbers = lodash_1.default.map(results, (result) => result.blockNumber);
        const uniqBlocks = (0, lodash_1.default)(blockNumbers)
            .map((blockNumber) => blockNumber.toNumber())
            .uniq()
            .value();
        if (uniqBlocks.length == 1) {
            return null;
        }
        /* if (
          uniqBlocks.length == 2 &&
          Math.abs(uniqBlocks[0]! - uniqBlocks[1]!) <= 1
        ) {
          return null;
        } */
        return new BlockConflictError(`Quotes returned from different blocks. ${uniqBlocks}. ${totalCalls} calls were made with gas limit ${gasLimitOverride}`);
    }
    validateSuccessRate(allResults, haveRetriedForSuccessRate, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes) {
        const numResults = allResults.length;
        const numSuccessResults = allResults.filter((result) => result.success).length;
        const successRate = (1.0 * numSuccessResults) / numResults;
        const { quoteMinSuccessRate } = this.batchParams(optimisticCachedRoutes, protocol);
        if (successRate < quoteMinSuccessRate) {
            if (haveRetriedForSuccessRate) {
                log_1.log.info(`Quote success rate still below threshold despite retry. Continuing. ${quoteMinSuccessRate}: ${successRate}`);
                util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteRetriedSuccessRateLow`, successRate, util_1.MetricLoggerUnit.Percent);
                return;
            }
            util_1.metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteSuccessRateLow`, successRate, util_1.MetricLoggerUnit.Percent);
            return new SuccessRateError(`Quote success rate below threshold of ${quoteMinSuccessRate}: ${successRate}`);
        }
    }
    /**
     * Throw an error for incorrect routes / function combinations
     * @param routes Any combination of V3, V2, and Mixed routes.
     * @param functionName
     * @param useMixedRouteQuoter true if there are ANY V2Routes or MixedRoutes in the routes parameter
     */
    validateRoutes(routes, functionName, useMixedRouteQuoter) {
        /// We do not send any V3Routes to new qutoer becuase it is not deployed on chains besides mainnet
        if (routes.some((route) => route.protocol === router_sdk_1.Protocol.V3) &&
            useMixedRouteQuoter) {
            throw new Error(`Cannot use mixed route quoter with V3 routes`);
        }
        /// We cannot call quoteExactOutput with V2 or Mixed routes
        if (functionName === 'quoteExactOutput' && useMixedRouteQuoter) {
            throw new Error('Cannot call quoteExactOutput with V2 or Mixed routes');
        }
    }
}
exports.OnChainQuoteProvider = OnChainQuoteProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib24tY2hhaW4tcXVvdGUtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvcHJvdmlkZXJzL29uLWNoYWluLXF1b3RlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esd0RBQW1FO0FBR25FLG9EQUk2QjtBQUM3Qiw0Q0FBMkU7QUFDM0UsNENBR3lCO0FBQ3pCLDhEQUE2RDtBQUM3RCxvREFBdUI7QUFDdkIsNERBQStCO0FBRS9CLG9EQUEyQztBQUMzQyw4Q0FNMkI7QUFDM0Isd0dBQXFHO0FBQ3JHLHNHQUFtRztBQUNuRyxrRkFBK0U7QUFDL0UsaUZBQThFO0FBQzlFLGtDQVNpQjtBQUVqQixxQ0FBa0M7QUFDbEMscUZBRzZDO0FBQzdDLDJDQUErQztBQXFFL0MsTUFBYSxrQkFBbUIsU0FBUSxLQUFLO0lBQTdDOztRQUNTLFNBQUksR0FBRyxvQkFBb0IsQ0FBQztJQUNyQyxDQUFDO0NBQUE7QUFGRCxnREFFQztBQUVELE1BQWEsZ0JBQWlCLFNBQVEsS0FBSztJQUEzQzs7UUFDUyxTQUFJLEdBQUcsa0JBQWtCLENBQUM7SUFDbkMsQ0FBQztDQUFBO0FBRkQsNENBRUM7QUFFRCxNQUFhLHdCQUF5QixTQUFRLEtBQUs7SUFBbkQ7O1FBQ1MsU0FBSSxHQUFHLDBCQUEwQixDQUFDO0lBQzNDLENBQUM7Q0FBQTtBQUZELDREQUVDO0FBRUQsTUFBYSxvQkFBcUIsU0FBUSxLQUFLO0lBQS9DOztRQUNTLFNBQUksR0FBRyxzQkFBc0IsQ0FBQztJQUN2QyxDQUFDO0NBQUE7QUFGRCxvREFFQztBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILE1BQWEsZ0JBQWlCLFNBQVEsS0FBSztJQUEzQzs7UUFDUyxTQUFJLEdBQUcsa0JBQWtCLENBQUM7SUFDbkMsQ0FBQztDQUFBO0FBRkQsNENBRUM7QUF3SkQsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLENBQUM7QUFFaEM7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