import { BigNumber } from '@ethersproject/bignumber';
import { encodeMixedRouteToPath, MixedRouteSDK, Protocol, } from '@uniswap/router-sdk';
import { encodeRouteToPath as encodeV3RouteToPath } from '@uniswap/v3-sdk';
import { encodeRouteToPath as encodeV4RouteToPath, Pool as V4Pool, } from '@uniswap/v4-sdk';
import retry from 'async-retry';
import _ from 'lodash';
import stats from 'stats-lite';
import { ChainId } from '../globalChainId';
import { V2Route, } from '../routers/router';
import { IMixedRouteQuoterV1__factory } from '../types/other/factories/IMixedRouteQuoterV1__factory';
import { MixedRouteQuoterV2__factory } from '../types/other/factories/MixedRouteQuoterV2__factory';
import { V4Quoter__factory } from '../types/other/factories/V4Quoter__factory';
import { IQuoterV2__factory } from '../types/v3/factories/IQuoterV2__factory';
import { getAddress, ID_TO_NETWORK_NAME, metric, MetricLoggerUnit, MIXED_ROUTE_QUOTER_V1_ADDRESSES, MIXED_ROUTE_QUOTER_V2_ADDRESSES, NEW_QUOTER_V2_ADDRESSES, PROTOCOL_V4_QUOTER_ADDRESSES, } from '../util';
import { log } from '../util/log';
import { DEFAULT_BLOCK_NUMBER_CONFIGS, DEFAULT_SUCCESS_RATE_FAILURE_OVERRIDES, } from '../util/onchainQuoteProviderConfigs';
import { routeToString } from '../util/routes';
export class BlockConflictError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'BlockConflictError';
    }
}
export class SuccessRateError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'SuccessRateError';
    }
}
export class ProviderBlockHeaderError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'ProviderBlockHeaderError';
    }
}
export class ProviderTimeoutError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'ProviderTimeoutError';
    }
}
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
export class ProviderGasError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'ProviderGasError';
    }
}
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
export class OnChainQuoteProvider {
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
        return DEFAULT_SUCCESS_RATE_FAILURE_OVERRIDES;
    }, blockNumberConfig = (_protocol) => {
        return DEFAULT_BLOCK_NUMBER_CONFIGS;
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
                ? MIXED_ROUTE_QUOTER_V2_ADDRESSES[this.chainId]
                : MIXED_ROUTE_QUOTER_V1_ADDRESSES[this.chainId]
            : protocol === Protocol.V3
                ? NEW_QUOTER_V2_ADDRESSES[this.chainId]
                : PROTOCOL_V4_QUOTER_ADDRESSES[this.chainId];
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
            case Protocol.V3:
                return encodeV3RouteToPath(route, functionName == 'quoteExactOutput' // For exactOut must be true to ensure the routes are reversed.
                );
            case Protocol.V4:
                return encodeV4RouteToPath(route, functionName == 'quoteExactOutput');
            // We don't have onchain V2 quoter, but we do have a mixed quoter that can quote against v2 routes onchain
            // Hence in case of V2 or mixed, we explicitly encode into mixed routes.
            case Protocol.V2:
            case Protocol.MIXED:
                // we need to retain the fake pool data for the mixed route
                return encodeMixedRouteToPath(route instanceof V2Route
                    ? new MixedRouteSDK(route.pairs, route.input, route.output, true)
                    : route, mixedRouteContainsV4Pool);
            default:
                throw new Error(`Unsupported protocol for the route: ${JSON.stringify(route)}`);
        }
    }
    getContractInterface(useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol) {
        if (useMixedRouteQuoter) {
            if (mixedRouteContainsV4Pool) {
                return MixedRouteQuoterV2__factory.createInterface();
            }
            else {
                return IMixedRouteQuoterV1__factory.createInterface();
            }
        }
        switch (protocol) {
            case Protocol.V3:
                return IQuoterV2__factory.createInterface();
            case Protocol.V4:
                return V4Quoter__factory.createInterface();
            default:
                throw new Error(`Unsupported protocol: ${protocol}`);
        }
    }
    async getQuotesForChain(useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, functionName, inputs, providerConfig, gasLimitOverride) {
        if (this.chainId === ChainId.TRON) {
            return this.getTronQuotes(functionName, inputs, providerConfig, gasLimitOverride);
        }
        return this.consolidateResults(protocol, useMixedRouteQuoter, mixedRouteContainsV4Pool, functionName, inputs, providerConfig, gasLimitOverride);
    }
    async getTronQuotes(functionName, inputs, _providerConfig, _gasLimitOverride) {
        const { Interface } = await import('@ethersproject/abi');
        const { Contract } = await import('@ethersproject/contracts');
        const sunswapQuoterInterface = new Interface([
            'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
            'function quoteExactInput(bytes path, uint256 amountIn) external returns (uint256 amountOut)',
            'function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn)',
            'function quoteExactOutput(bytes path, uint256 amountOut) external returns (uint256 amountIn)'
        ]);
        try {
            const quoterContract = new Contract(this.getQuoterAddress(false, false, Protocol.V3), sunswapQuoterInterface, this.provider);
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
                                BigNumber.from(0)
                            ]
                        };
                    }
                    return {
                        success: false,
                        error: result.error,
                        returnData: '0x'
                    };
                }),
                blockNumber: BigNumber.from(0),
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
        if ((protocol === Protocol.MIXED && mixedRouteContainsV4Pool) ||
            protocol === Protocol.V4) {
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
        const useMixedRouteQuoter = routes.some((route) => route.protocol === Protocol.V2) ||
            routes.some((route) => route.protocol === Protocol.MIXED);
        const useV4RouteQuoter = routes.some((route) => route.protocol === Protocol.V4) &&
            !useMixedRouteQuoter;
        const mixedRouteContainsV4Pool = useMixedRouteQuoter
            ? routes.some((route) => route.protocol === Protocol.MIXED &&
                route.pools.some((pool) => pool instanceof V4Pool))
            : false;
        const protocol = useMixedRouteQuoter
            ? Protocol.MIXED
            : useV4RouteQuoter
                ? Protocol.V4
                : Protocol.V3;
        const optimisticCachedRoutes = (_a = _providerConfig === null || _providerConfig === void 0 ? void 0 : _providerConfig.optimisticCachedRoutes) !== null && _a !== void 0 ? _a : false;
        /// Validate that there are no incorrect routes / function combinations
        this.validateRoutes(routes, functionName, useMixedRouteQuoter);
        let multicallChunk = this.batchParams(optimisticCachedRoutes, protocol).multicallChunk;
        let gasLimitOverride = this.batchParams(optimisticCachedRoutes, protocol).gasLimitPerCall;
        const { baseBlockOffset, rollback } = this.blockNumberConfig(protocol);
        // Apply the base block offset if provided
        const originalBlockNumber = await this.provider.getBlockNumber();
        const providerConfig = {
            ..._providerConfig,
            blockNumber: (_b = _providerConfig === null || _providerConfig === void 0 ? void 0 : _providerConfig.blockNumber) !== null && _b !== void 0 ? _b : originalBlockNumber + baseBlockOffset,
        };
        const inputs = _(routes)
            .flatMap((route) => {
            const encodedRoute = this.encodeRouteToPath(route, functionName, mixedRouteContainsV4Pool);
            const routeInputs = amounts.map((amount) => {
                switch (route.protocol) {
                    case Protocol.V4:
                        return [
                            {
                                exactCurrency: getAddress(amount.currency),
                                path: encodedRoute,
                                exactAmount: amount.quotient.toString(),
                            },
                        ];
                    case Protocol.MIXED:
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
        const inputsChunked = _.chunk(inputs, normalizedChunk);
        let quoteStates = _.map(inputsChunked, (inputChunk) => {
            return {
                status: 'pending',
                inputs: inputChunk,
            };
        });
        log.info(`About to get ${inputs.length} quotes in chunks of ${normalizedChunk} [${_.map(inputsChunked, (i) => i.length).join(',')}] ${gasLimitOverride
            ? `with a gas limit override of ${gasLimitOverride}`
            : ''} and block number: ${await providerConfig.blockNumber} [Original before offset: ${originalBlockNumber}].`);
        metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteBatchSize`, inputs.length, MetricLoggerUnit.Count);
        metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteBatchSize_${ID_TO_NETWORK_NAME(this.chainId)}`, inputs.length, MetricLoggerUnit.Count);
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
        const { results: quoteResults, blockNumber, approxGasUsedPerSuccessCall, } = await retry(async (_bail, attemptNumber) => {
            haveIncrementedBlockHeaderFailureCounter = false;
            finalAttemptNumber = attemptNumber;
            const [success, failed, pending] = this.partitionQuotes(quoteStates);
            log.info(`Starting attempt: ${attemptNumber}.
          Currently ${success.length} success, ${failed.length} failed, ${pending.length} pending.
          Gas limit override: ${gasLimitOverride} Block number override: ${providerConfig.blockNumber}.`);
            quoteStates = await Promise.all(_.map(quoteStates, async (quoteState, idx) => {
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
            const reasonForFailureStr = _.map(failedQuoteStates, (failedQuoteState) => failedQuoteState.reason.name).join(', ');
            if (failedQuoteStates.length > 0) {
                log.info(`On attempt ${attemptNumber}: ${failedQuoteStates.length}/${quoteStates.length} quotes failed. Reasons: ${reasonForFailureStr}`);
                for (const failedQuoteState of failedQuoteStates) {
                    const { reason: error } = failedQuoteState;
                    log.info({ error }, `[QuoteFetchError] Attempt ${attemptNumber}. ${error.message}`);
                    if (error instanceof BlockConflictError) {
                        if (!haveRetriedForBlockConflictError) {
                            metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteBlockConflictErrorRetry`, 1, MetricLoggerUnit.Count);
                            haveRetriedForBlockConflictError = true;
                        }
                        retryAll = true;
                    }
                    else if (error instanceof ProviderBlockHeaderError) {
                        if (!haveRetriedForBlockHeader) {
                            metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteBlockHeaderNotFoundRetry`, 1, MetricLoggerUnit.Count);
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
                                log.info(`Attempt ${attemptNumber}. Have failed due to block header ${blockHeaderRetryAttemptNumber - 1} times. Rolling back block number by ${rollbackBlockOffset} for next retry`);
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
                            metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteTimeoutRetry`, 1, MetricLoggerUnit.Count);
                            haveRetriedForTimeout = true;
                        }
                    }
                    else if (error instanceof ProviderGasError) {
                        if (!haveRetriedForOutOfGas) {
                            metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteOutOfGasExceptionRetry`, 1, MetricLoggerUnit.Count);
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
                            metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteSuccessRateRetry`, 1, MetricLoggerUnit.Count);
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
                            metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteUnknownReasonRetry`, 1, MetricLoggerUnit.Count);
                            haveRetriedForUnknownReason = true;
                        }
                    }
                }
            }
            if (retryAll) {
                log.info(`Attempt ${attemptNumber}. Resetting all requests to pending for next attempt.`);
                const normalizedChunk = Math.ceil(inputs.length / Math.ceil(inputs.length / multicallChunk));
                const inputsChunked = _.chunk(inputs, normalizedChunk);
                quoteStates = _.map(inputsChunked, (inputChunk) => {
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
                if ((this.chainId == ChainId.ARBITRUM_ONE ||
                    this.chainId == ChainId.ARBITRUM_GOERLI) &&
                    _.every(failedQuoteStates, (failedQuoteState) => failedQuoteState.reason instanceof ProviderGasError) &&
                    attemptNumber == this.retryOptions.retries) {
                    log.error(`Failed to get quotes on Arbitrum due to provider gas error issue. Overriding error to return 0 quotes.`);
                    return {
                        results: [],
                        blockNumber: BigNumber.from(0),
                        approxGasUsedPerSuccessCall: 0,
                    };
                }
                throw new Error(`Failed to get ${failedQuoteStates.length} quotes. Reasons: ${reasonForFailureStr}`);
            }
            const callResults = _.map(successfulQuoteStates, (quoteState) => quoteState.results);
            return {
                results: _.flatMap(callResults, (result) => result.results),
                blockNumber: BigNumber.from(callResults[0].blockNumber),
                approxGasUsedPerSuccessCall: stats.percentile(_.map(callResults, (result) => result.approxGasUsedPerSuccessCall), 100),
            };
        }, {
            retries: DEFAULT_BATCH_RETRIES,
            ...this.retryOptions,
        });
        const routesQuotes = this.processQuoteResults(quoteResults, routes, amounts, BigNumber.from(gasLimitOverride));
        const endTime = Date.now();
        metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteLatency`, endTime - startTime, MetricLoggerUnit.Milliseconds);
        metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteApproxGasUsedPerSuccessfulCall`, approxGasUsedPerSuccessCall, MetricLoggerUnit.Count);
        metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteNumRetryLoops`, finalAttemptNumber - 1, MetricLoggerUnit.Count);
        metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteTotalCallsToProvider`, totalCallsMade, MetricLoggerUnit.Count);
        metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteExpectedCallsToProvider`, expectedCallsMade, MetricLoggerUnit.Count);
        metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteNumRetriedCalls`, totalCallsMade - expectedCallsMade, MetricLoggerUnit.Count);
        const [successfulQuotes, failedQuotes] = _(routesQuotes)
            .flatMap((routeWithQuotes) => routeWithQuotes[1])
            .partition((quote) => quote.quote != null)
            .value();
        log.info(`Got ${successfulQuotes.length} successful quotes, ${failedQuotes.length} failed quotes. Took ${finalAttemptNumber - 1} attempt loops. Total calls made to provider: ${totalCallsMade}. Have retried for timeout: ${haveRetriedForTimeout}`);
        // Log total routes
        metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}RoutesLength`, routesQuotes.length, MetricLoggerUnit.Count);
        // Log total quotes
        metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}RoutesQuotesLength`, successfulQuotes.length + failedQuotes.length, MetricLoggerUnit.Count);
        // log successful quotes
        metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}RoutesSuccessfulQuotesLength`, successfulQuotes.length, MetricLoggerUnit.Count);
        // log failed quotes
        metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}RoutesFailedQuotesLength`, failedQuotes.length, MetricLoggerUnit.Count);
        return {
            routesWithQuotes: routesQuotes,
            blockNumber,
        };
    }
    partitionQuotes(quoteStates) {
        const successfulQuoteStates = _.filter(quoteStates, (quoteState) => quoteState.status == 'success');
        const failedQuoteStates = _.filter(quoteStates, (quoteState) => quoteState.status == 'failed');
        const pendingQuoteStates = _.filter(quoteStates, (quoteState) => quoteState.status == 'pending');
        return [successfulQuoteStates, failedQuoteStates, pendingQuoteStates];
    }
    processQuoteResults(quoteResults, routes, amounts, gasLimit) {
        const routesQuotes = [];
        const quotesResultsByRoute = _.chunk(quoteResults, amounts.length);
        const debugFailedQuotes = [];
        for (let i = 0; i < quotesResultsByRoute.length; i++) {
            const route = routes[i];
            const quoteResults = quotesResultsByRoute[i];
            const quotes = _.map(quoteResults, (quoteResult, index) => {
                var _a;
                const amount = amounts[index];
                if (!quoteResult.success) {
                    const percent = (100 / amounts.length) * (index + 1);
                    const amountStr = amount.toFixed(Math.min(amount.currency.decimals, 2));
                    const routeStr = routeToString(route);
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
        _.forEach(_.chunk(debugFailedQuotes, debugChunk), (quotes, idx) => {
            const failedQuotesByRoute = _.groupBy(quotes, (q) => q.route);
            const failedFlat = _.mapValues(failedQuotesByRoute, (f) => _(f)
                .map((f) => `${f.percent}%[${f.amount}]`)
                .join(','));
            log.info({
                failedQuotes: _.map(failedFlat, (amounts, routeStr) => `${routeStr} : ${amounts}`),
            }, `Failed on chain quotes for routes Part ${idx}/${Math.ceil(debugFailedQuotes.length / debugChunk)}`);
        });
        return routesQuotes;
    }
    validateBlockNumbers(successfulQuoteStates, totalCalls, gasLimitOverride) {
        if (successfulQuoteStates.length <= 1) {
            return null;
        }
        const results = _.map(successfulQuoteStates, (quoteState) => quoteState.results);
        const blockNumbers = _.map(results, (result) => result.blockNumber);
        const uniqBlocks = _(blockNumbers)
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
                log.info(`Quote success rate still below threshold despite retry. Continuing. ${quoteMinSuccessRate}: ${successRate}`);
                metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteRetriedSuccessRateLow`, successRate, MetricLoggerUnit.Percent);
                return;
            }
            metric.putMetric(`${this.metricsPrefix(this.chainId, useMixedRouteQuoter, mixedRouteContainsV4Pool, protocol, optimisticCachedRoutes)}QuoteSuccessRateLow`, successRate, MetricLoggerUnit.Percent);
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
        if (routes.some((route) => route.protocol === Protocol.V3) &&
            useMixedRouteQuoter) {
            throw new Error(`Cannot use mixed route quoter with V3 routes`);
        }
        /// We cannot call quoteExactOutput with V2 or Mixed routes
        if (functionName === 'quoteExactOutput' && useMixedRouteQuoter) {
            throw new Error('Cannot call quoteExactOutput with V2 or Mixed routes');
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib24tY2hhaW4tcXVvdGUtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvcHJvdmlkZXJzL29uLWNoYWluLXF1b3RlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxTQUFTLEVBQWdCLE1BQU0sMEJBQTBCLENBQUM7QUFHbkUsT0FBTyxFQUNMLHNCQUFzQixFQUN0QixhQUFhLEVBQ2IsUUFBUSxHQUNULE1BQU0scUJBQXFCLENBQUM7QUFDN0IsT0FBTyxFQUFFLGlCQUFpQixJQUFJLG1CQUFtQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0UsT0FBTyxFQUNMLGlCQUFpQixJQUFJLG1CQUFtQixFQUN4QyxJQUFJLElBQUksTUFBTSxHQUNmLE1BQU0saUJBQWlCLENBQUM7QUFDekIsT0FBTyxLQUFrQyxNQUFNLGFBQWEsQ0FBQztBQUM3RCxPQUFPLENBQUMsTUFBTSxRQUFRLENBQUM7QUFDdkIsT0FBTyxLQUFLLE1BQU0sWUFBWSxDQUFDO0FBRS9CLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMzQyxPQUFPLEVBR0wsT0FBTyxHQUdSLE1BQU0sbUJBQW1CLENBQUM7QUFDM0IsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDckcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDOUUsT0FBTyxFQUNMLFVBQVUsRUFDVixrQkFBa0IsRUFDbEIsTUFBTSxFQUNOLGdCQUFnQixFQUNoQiwrQkFBK0IsRUFDL0IsK0JBQStCLEVBQy9CLHVCQUF1QixFQUN2Qiw0QkFBNEIsR0FDN0IsTUFBTSxTQUFTLENBQUM7QUFFakIsT0FBTyxFQUFF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