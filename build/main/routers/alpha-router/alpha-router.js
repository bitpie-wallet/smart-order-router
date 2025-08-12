"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlphaRouter = exports.LowerCaseStringArray = exports.MapWithLowerCaseKey = void 0;
const bignumber_1 = require("@ethersproject/bignumber");
const providers_1 = require("@ethersproject/providers");
const default_token_list_1 = __importDefault(require("@uniswap/default-token-list"));
const router_sdk_1 = require("@uniswap/router-sdk");
const sdk_core_1 = require("@uniswap/sdk-core");
const universal_router_sdk_1 = require("@uniswap/universal-router-sdk");
const v2_sdk_1 = require("@uniswap/v2-sdk");
const v3_sdk_1 = require("@uniswap/v3-sdk");
const v4_sdk_1 = require("@uniswap/v4-sdk");
const async_retry_1 = __importDefault(require("async-retry"));
const jsbi_1 = __importDefault(require("jsbi"));
const lodash_1 = __importDefault(require("lodash"));
const node_cache_1 = __importDefault(require("node-cache"));
const globalChainId_1 = require("../../globalChainId");
const providers_2 = require("../../providers");
const caching_token_list_provider_1 = require("../../providers/caching-token-list-provider");
const portion_provider_1 = require("../../providers/portion-provider");
const token_fee_fetcher_1 = require("../../providers/token-fee-fetcher");
const token_provider_1 = require("../../providers/token-provider");
const token_validator_provider_1 = require("../../providers/token-validator-provider");
const pool_provider_1 = require("../../providers/v2/pool-provider");
const gas_data_provider_1 = require("../../providers/v3/gas-data-provider");
const pool_provider_2 = require("../../providers/v3/pool-provider");
const caching_pool_provider_1 = require("../../providers/v4/caching-pool-provider");
const pool_provider_3 = require("../../providers/v4/pool-provider");
const Erc20__factory_1 = require("../../types/other/factories/Erc20__factory");
const util_1 = require("../../util");
const amounts_1 = require("../../util/amounts");
const chains_1 = require("../../util/chains");
const defaultBlocksToLive_1 = require("../../util/defaultBlocksToLive");
const gas_factory_helpers_1 = require("../../util/gas-factory-helpers");
const intent_1 = require("../../util/intent");
const log_1 = require("../../util/log");
const methodParameters_1 = require("../../util/methodParameters");
const metric_1 = require("../../util/metric");
const onchainQuoteProviderConfigs_1 = require("../../util/onchainQuoteProviderConfigs");
const serializeRouteIds_1 = require("../../util/serializeRouteIds");
const unsupported_tokens_1 = require("../../util/unsupported-tokens");
const router_1 = require("../router");
const config_1 = require("./config");
const best_swap_route_1 = require("./functions/best-swap-route");
const calculate_ratio_amount_in_1 = require("./functions/calculate-ratio-amount-in");
const get_candidate_pools_1 = require("./functions/get-candidate-pools");
const gas_costs_1 = require("./gas-models/gas-costs");
const mixed_route_heuristic_gas_model_1 = require("./gas-models/mixedRoute/mixed-route-heuristic-gas-model");
const v2_heuristic_gas_model_1 = require("./gas-models/v2/v2-heuristic-gas-model");
const v3_heuristic_gas_model_1 = require("./gas-models/v3/v3-heuristic-gas-model");
const v4_heuristic_gas_model_1 = require("./gas-models/v4/v4-heuristic-gas-model");
const quoters_1 = require("./quoters");
const v4_quoter_1 = require("./quoters/v4-quoter");
class MapWithLowerCaseKey extends Map {
    set(key, value) {
        return super.set(key.toLowerCase(), value);
    }
}
exports.MapWithLowerCaseKey = MapWithLowerCaseKey;
class LowerCaseStringArray extends Array {
    constructor(...items) {
        // Convert all items to lowercase before calling the parent constructor
        super(...items.map((item) => item.toLowerCase()));
    }
}
exports.LowerCaseStringArray = LowerCaseStringArray;
class AlphaRouter {
    constructor({ chainId, provider, multicall2Provider, v4SubgraphProvider, v4PoolProvider, v3PoolProvider, onChainQuoteProvider, v2PoolProvider, v2QuoteProvider, v2SubgraphProvider, tokenProvider, blockedTokenListProvider, v3SubgraphProvider, gasPriceProvider, v4GasModelFactory, v3GasModelFactory, v2GasModelFactory, mixedRouteGasModelFactory, swapRouterProvider, tokenValidatorProvider, arbitrumGasDataProvider, simulator, routeCachingProvider, tokenPropertiesProvider, portionProvider, v2Supported, v4Supported, mixedSupported, v4PoolParams, cachedRoutesCacheInvalidationFixRolloutPercentage, deleteCacheEnabledChains, }) {
        this.chainId = chainId;
        this.provider = provider;
        this.multicall2Provider =
            multicall2Provider !== null && multicall2Provider !== void 0 ? multicall2Provider : new providers_2.UniswapMulticallProvider(chainId, provider, 375000);
        this.v4PoolProvider =
            v4PoolProvider !== null && v4PoolProvider !== void 0 ? v4PoolProvider : new caching_pool_provider_1.CachingV4PoolProvider(this.chainId, new pool_provider_3.V4PoolProvider((0, chains_1.ID_TO_CHAIN_ID)(chainId), this.multicall2Provider), new providers_2.NodeJSCache(new node_cache_1.default({ stdTTL: 360, useClones: false })));
        this.v3PoolProvider =
            v3PoolProvider !== null && v3PoolProvider !== void 0 ? v3PoolProvider : new providers_2.CachingV3PoolProvider(this.chainId, new pool_provider_2.V3PoolProvider((0, chains_1.ID_TO_CHAIN_ID)(chainId), this.multicall2Provider), new providers_2.NodeJSCache(new node_cache_1.default({ stdTTL: 360, useClones: false })));
        this.simulator = simulator;
        this.routeCachingProvider = routeCachingProvider;
        if (onChainQuoteProvider) {
            this.onChainQuoteProvider = onChainQuoteProvider;
        }
        else {
            switch (chainId) {
                case globalChainId_1.ChainId.OPTIMISM:
                case globalChainId_1.ChainId.OPTIMISM_GOERLI:
                case globalChainId_1.ChainId.OPTIMISM_SEPOLIA:
                    this.onChainQuoteProvider = new providers_2.OnChainQuoteProvider(chainId, provider, this.multicall2Provider, {
                        retries: 2,
                        minTimeout: 100,
                        maxTimeout: 1000,
                    }, (_) => {
                        return {
                            multicallChunk: 110,
                            gasLimitPerCall: 1200000,
                            quoteMinSuccessRate: 0.1,
                        };
                    }, (_) => {
                        return {
                            gasLimitOverride: 3000000,
                            multicallChunk: 45,
                        };
                    }, (_) => {
                        return {
                            gasLimitOverride: 3000000,
                            multicallChunk: 45,
                        };
                    }, (_) => {
                        return {
                            baseBlockOffset: -10,
                            rollback: {
                                enabled: true,
                                attemptsBeforeRollback: 1,
                                rollbackBlockOffset: -10,
                            },
                        };
                    });
                    break;
                case globalChainId_1.ChainId.BASE:
                case globalChainId_1.ChainId.BLAST:
                case globalChainId_1.ChainId.ZORA:
                case globalChainId_1.ChainId.WORLDCHAIN:
                case globalChainId_1.ChainId.UNICHAIN_SEPOLIA:
                case globalChainId_1.ChainId.MONAD_TESTNET:
                case globalChainId_1.ChainId.BASE_SEPOLIA:
                case globalChainId_1.ChainId.UNICHAIN:
                case globalChainId_1.ChainId.BASE_GOERLI:
                case globalChainId_1.ChainId.SONEIUM:
                    this.onChainQuoteProvider = new providers_2.OnChainQuoteProvider(chainId, provider, this.multicall2Provider, {
                        retries: 2,
                        minTimeout: 100,
                        maxTimeout: 1000,
                    }, (_) => {
                        return {
                            multicallChunk: 80,
                            gasLimitPerCall: 1200000,
                            quoteMinSuccessRate: 0.1,
                        };
                    }, (_) => {
                        return {
                            gasLimitOverride: 3000000,
                            multicallChunk: 45,
                        };
                    }, (_) => {
                        return {
                            gasLimitOverride: 3000000,
                            multicallChunk: 45,
                        };
                    }, (_) => {
                        return {
                            baseBlockOffset: -10,
                            rollback: {
                                enabled: true,
                                attemptsBeforeRollback: 1,
                                rollbackBlockOffset: -10,
                            },
                        };
                    });
                    break;
                case globalChainId_1.ChainId.ZKSYNC:
                    this.onChainQuoteProvider = new providers_2.OnChainQuoteProvider(chainId, provider, this.multicall2Provider, {
                        retries: 2,
                        minTimeout: 100,
                        maxTimeout: 1000,
                    }, (_) => {
                        return {
                            multicallChunk: 27,
                            gasLimitPerCall: 3000000,
                            quoteMinSuccessRate: 0.1,
                        };
                    }, (_) => {
                        return {
                            gasLimitOverride: 6000000,
                            multicallChunk: 13,
                        };
                    }, (_) => {
                        return {
                            gasLimitOverride: 6000000,
                            multicallChunk: 13,
                        };
                    }, (_) => {
                        return {
                            baseBlockOffset: -10,
                            rollback: {
                                enabled: true,
                                attemptsBeforeRollback: 1,
                                rollbackBlockOffset: -10,
                            },
                        };
                    });
                    break;
                case globalChainId_1.ChainId.ARBITRUM_ONE:
                case globalChainId_1.ChainId.ARBITRUM_GOERLI:
                case globalChainId_1.ChainId.ARBITRUM_SEPOLIA:
                    this.onChainQuoteProvider = new providers_2.OnChainQuoteProvider(chainId, provider, this.multicall2Provider, {
                        retries: 2,
                        minTimeout: 100,
                        maxTimeout: 1000,
                    }, (_) => {
                        return {
                            multicallChunk: 10,
                            gasLimitPerCall: 12000000,
                            quoteMinSuccessRate: 0.1,
                        };
                    }, (_) => {
                        return {
                            gasLimitOverride: 30000000,
                            multicallChunk: 6,
                        };
                    }, (_) => {
                        return {
                            gasLimitOverride: 30000000,
                            multicallChunk: 6,
                        };
                    });
                    break;
                case globalChainId_1.ChainId.CELO:
                case globalChainId_1.ChainId.CELO_ALFAJORES:
                    this.onChainQuoteProvider = new providers_2.OnChainQuoteProvider(chainId, provider, this.multicall2Provider, {
                        retries: 2,
                        minTimeout: 100,
                        maxTimeout: 1000,
                    }, (_) => {
                        return {
                            multicallChunk: 10,
                            gasLimitPerCall: 5000000,
                            quoteMinSuccessRate: 0.1,
                        };
                    }, (_) => {
                        return {
                            gasLimitOverride: 5000000,
                            multicallChunk: 5,
                        };
                    }, (_) => {
                        return {
                            gasLimitOverride: 6250000,
                            multicallChunk: 4,
                        };
                    });
                    break;
                case globalChainId_1.ChainId.POLYGON_MUMBAI:
                case globalChainId_1.ChainId.SEPOLIA:
                case globalChainId_1.ChainId.MAINNET:
                case globalChainId_1.ChainId.POLYGON:
                    this.onChainQuoteProvider = new providers_2.OnChainQuoteProvider(chainId, provider, this.multicall2Provider, onchainQuoteProviderConfigs_1.RETRY_OPTIONS[chainId], (_) => onchainQuoteProviderConfigs_1.BATCH_PARAMS[chainId], (_) => onchainQuoteProviderConfigs_1.GAS_ERROR_FAILURE_OVERRIDES[chainId], (_) => onchainQuoteProviderConfigs_1.SUCCESS_RATE_FAILURE_OVERRIDES[chainId], (_) => onchainQuoteProviderConfigs_1.BLOCK_NUMBER_CONFIGS[chainId]);
                    break;
                default:
                    this.onChainQuoteProvider = new providers_2.OnChainQuoteProvider(chainId, provider, this.multicall2Provider, onchainQuoteProviderConfigs_1.DEFAULT_RETRY_OPTIONS, (_) => onchainQuoteProviderConfigs_1.DEFAULT_BATCH_PARAMS, (_) => onchainQuoteProviderConfigs_1.DEFAULT_GAS_ERROR_FAILURE_OVERRIDES, (_) => onchainQuoteProviderConfigs_1.DEFAULT_SUCCESS_RATE_FAILURE_OVERRIDES, (_) => onchainQuoteProviderConfigs_1.DEFAULT_BLOCK_NUMBER_CONFIGS);
                    break;
            }
        }
        if (tokenValidatorProvider) {
            this.tokenValidatorProvider = tokenValidatorProvider;
        }
        else if (this.chainId === globalChainId_1.ChainId.MAINNET) {
            this.tokenValidatorProvider = new token_validator_provider_1.TokenValidatorProvider(this.chainId, this.multicall2Provider, new providers_2.NodeJSCache(new node_cache_1.default({ stdTTL: 30000, useClones: false })));
        }
        if (tokenPropertiesProvider) {
            this.tokenPropertiesProvider = tokenPropertiesProvider;
        }
        else {
            this.tokenPropertiesProvider = new providers_2.TokenPropertiesProvider(this.chainId, new providers_2.NodeJSCache(new node_cache_1.default({ stdTTL: 86400, useClones: false })), new token_fee_fetcher_1.OnChainTokenFeeFetcher(this.chainId, provider));
        }
        this.v2PoolProvider =
            v2PoolProvider !== null && v2PoolProvider !== void 0 ? v2PoolProvider : new providers_2.CachingV2PoolProvider(chainId, new pool_provider_1.V2PoolProvider(chainId, this.multicall2Provider, this.tokenPropertiesProvider), new providers_2.NodeJSCache(new node_cache_1.default({ stdTTL: 60, useClones: false })));
        this.v2QuoteProvider = v2QuoteProvider !== null && v2QuoteProvider !== void 0 ? v2QuoteProvider : new providers_2.V2QuoteProvider();
        this.blockedTokenListProvider =
            blockedTokenListProvider !== null && blockedTokenListProvider !== void 0 ? blockedTokenListProvider : new caching_token_list_provider_1.CachingTokenListProvider(chainId, unsupported_tokens_1.UNSUPPORTED_TOKENS, new providers_2.NodeJSCache(new node_cache_1.default({ stdTTL: 3600, useClones: false })));
        this.tokenProvider =
            tokenProvider !== null && tokenProvider !== void 0 ? tokenProvider : new providers_2.CachingTokenProviderWithFallback(chainId, new providers_2.NodeJSCache(new node_cache_1.default({ stdTTL: 3600, useClones: false })), new caching_token_list_provider_1.CachingTokenListProvider(chainId, default_token_list_1.default, new providers_2.NodeJSCache(new node_cache_1.default({ stdTTL: 3600, useClones: false }))), new token_provider_1.TokenProvider(chainId, this.multicall2Provider));
        this.portionProvider = portionProvider !== null && portionProvider !== void 0 ? portionProvider : new portion_provider_1.PortionProvider();
        const chainName = (0, chains_1.ID_TO_NETWORK_NAME)(chainId);
        // ipfs urls in the following format: `https://cloudflare-ipfs.com/ipns/api.uniswap.org/v1/pools/${protocol}/${chainName}.json`;
        if (v2SubgraphProvider) {
            this.v2SubgraphProvider = v2SubgraphProvider;
        }
        else {
            this.v2SubgraphProvider = new providers_2.V2SubgraphProviderWithFallBacks([
                new providers_2.CachingV2SubgraphProvider(chainId, new providers_2.URISubgraphProvider(chainId, `https://cloudflare-ipfs.com/ipns/api.uniswap.org/v1/pools/v2/${chainName}.json`, undefined, 0), new providers_2.NodeJSCache(new node_cache_1.default({ stdTTL: 300, useClones: false }))),
                new providers_2.StaticV2SubgraphProvider(chainId),
            ]);
        }
        if (v3SubgraphProvider) {
            this.v3SubgraphProvider = v3SubgraphProvider;
        }
        else {
            this.v3SubgraphProvider = new providers_2.V3SubgraphProviderWithFallBacks([
                new providers_2.CachingV3SubgraphProvider(chainId, new providers_2.URISubgraphProvider(chainId, `https://cloudflare-ipfs.com/ipns/api.uniswap.org/v1/pools/v3/${chainName}.json`, undefined, 0), new providers_2.NodeJSCache(new node_cache_1.default({ stdTTL: 300, useClones: false }))),
                new providers_2.StaticV3SubgraphProvider(chainId, this.v3PoolProvider),
            ]);
        }
        this.v4PoolParams =
            v4PoolParams !== null && v4PoolParams !== void 0 ? v4PoolParams : (0, util_1.getApplicableV4FeesTickspacingsHooks)(chainId);
        if (v4SubgraphProvider) {
            this.v4SubgraphProvider = v4SubgraphProvider;
        }
        else {
            this.v4SubgraphProvider = new providers_2.V4SubgraphProviderWithFallBacks([
                new providers_2.CachingV4SubgraphProvider(chainId, new providers_2.URISubgraphProvider(chainId, `https://cloudflare-ipfs.com/ipns/api.uniswap.org/v1/pools/v4/${chainName}.json`, undefined, 0), new providers_2.NodeJSCache(new node_cache_1.default({ stdTTL: 300, useClones: false }))),
                new providers_2.StaticV4SubgraphProvider(chainId, this.v4PoolProvider, this.v4PoolParams),
            ]);
        }
        let gasPriceProviderInstance;
        if (providers_1.JsonRpcProvider.isProvider(this.provider)) {
            gasPriceProviderInstance = new providers_2.OnChainGasPriceProvider(chainId, new providers_2.EIP1559GasPriceProvider(this.provider), new providers_2.LegacyGasPriceProvider(this.provider));
        }
        else {
            gasPriceProviderInstance = new providers_2.ETHGasStationInfoProvider(config_1.ETH_GAS_STATION_API_URL);
        }
        this.gasPriceProvider =
            gasPriceProvider !== null && gasPriceProvider !== void 0 ? gasPriceProvider : new providers_2.CachingGasStationProvider(chainId, gasPriceProviderInstance, new providers_2.NodeJSCache(new node_cache_1.default({ stdTTL: 7, useClones: false })));
        this.v4GasModelFactory =
            v4GasModelFactory !== null && v4GasModelFactory !== void 0 ? v4GasModelFactory : new v4_heuristic_gas_model_1.V4HeuristicGasModelFactory(this.provider);
        this.v3GasModelFactory =
            v3GasModelFactory !== null && v3GasModelFactory !== void 0 ? v3GasModelFactory : new v3_heuristic_gas_model_1.V3HeuristicGasModelFactory(this.provider);
        this.v2GasModelFactory =
            v2GasModelFactory !== null && v2GasModelFactory !== void 0 ? v2GasModelFactory : new v2_heuristic_gas_model_1.V2HeuristicGasModelFactory(this.provider);
        this.mixedRouteGasModelFactory =
            mixedRouteGasModelFactory !== null && mixedRouteGasModelFactory !== void 0 ? mixedRouteGasModelFactory : new mixed_route_heuristic_gas_model_1.MixedRouteHeuristicGasModelFactory();
        this.swapRouterProvider =
            swapRouterProvider !== null && swapRouterProvider !== void 0 ? swapRouterProvider : new providers_2.SwapRouterProvider(this.multicall2Provider, this.chainId);
        if (chainId === globalChainId_1.ChainId.ARBITRUM_ONE ||
            chainId === globalChainId_1.ChainId.ARBITRUM_GOERLI) {
            this.l2GasDataProvider =
                arbitrumGasDataProvider !== null && arbitrumGasDataProvider !== void 0 ? arbitrumGasDataProvider : new gas_data_provider_1.ArbitrumGasDataProvider(chainId, this.provider);
        }
        // Initialize the Quoters.
        // Quoters are an abstraction encapsulating the business logic of fetching routes and quotes.
        this.v2Quoter = new quoters_1.V2Quoter(this.v2SubgraphProvider, this.v2PoolProvider, this.v2QuoteProvider, this.v2GasModelFactory, this.tokenProvider, this.chainId, this.blockedTokenListProvider, this.tokenValidatorProvider, this.l2GasDataProvider);
        this.v3Quoter = new quoters_1.V3Quoter(this.v3SubgraphProvider, this.v3PoolProvider, this.onChainQuoteProvider, this.tokenProvider, this.chainId, this.blockedTokenListProvider, this.tokenValidatorProvider);
        this.v4Quoter = new v4_quoter_1.V4Quoter(this.v4SubgraphProvider, this.v4PoolProvider, this.onChainQuoteProvider, this.tokenProvider, this.chainId, this.blockedTokenListProvider, this.tokenValidatorProvider);
        this.mixedQuoter = new quoters_1.MixedQuoter(this.v4SubgraphProvider, this.v4PoolProvider, this.v3SubgraphProvider, this.v3PoolProvider, this.v2SubgraphProvider, this.v2PoolProvider, this.onChainQuoteProvider, this.tokenProvider, this.chainId, this.blockedTokenListProvider, this.tokenValidatorProvider);
        this.v2Supported = v2Supported !== null && v2Supported !== void 0 ? v2Supported : chains_1.V2_SUPPORTED;
        this.v4Supported = v4Supported !== null && v4Supported !== void 0 ? v4Supported : util_1.V4_SUPPORTED;
        this.mixedSupported = mixedSupported !== null && mixedSupported !== void 0 ? mixedSupported : util_1.MIXED_SUPPORTED;
        this.cachedRoutesCacheInvalidationFixRolloutPercentage =
            cachedRoutesCacheInvalidationFixRolloutPercentage;
        // https://linear.app/uniswap/issue/ROUTE-467/tenderly-simulation-during-caching-lambda
        this.deleteCacheEnabledChains = deleteCacheEnabledChains;
    }
    async routeToRatio(token0Balance, token1Balance, position, swapAndAddConfig, swapAndAddOptions, routingConfig = (0, config_1.DEFAULT_ROUTING_CONFIG_BY_CHAIN)(this.chainId)) {
        if (token1Balance.currency.wrapped.sortsBefore(token0Balance.currency.wrapped)) {
            [token0Balance, token1Balance] = [token1Balance, token0Balance];
        }
        let preSwapOptimalRatio = this.calculateOptimalRatio(position, position.pool.sqrtRatioX96, true);
        // set up parameters according to which token will be swapped
        let zeroForOne;
        if (position.pool.tickCurrent > position.tickUpper) {
            zeroForOne = true;
        }
        else if (position.pool.tickCurrent < position.tickLower) {
            zeroForOne = false;
        }
        else {
            zeroForOne = new sdk_core_1.Fraction(token0Balance.quotient, token1Balance.quotient).greaterThan(preSwapOptimalRatio);
            if (!zeroForOne)
                preSwapOptimalRatio = preSwapOptimalRatio.invert();
        }
        const [inputBalance, outputBalance] = zeroForOne
            ? [token0Balance, token1Balance]
            : [token1Balance, token0Balance];
        let optimalRatio = preSwapOptimalRatio;
        let postSwapTargetPool = position.pool;
        let exchangeRate = zeroForOne
            ? position.pool.token0Price
            : position.pool.token1Price;
        let swap = null;
        let ratioAchieved = false;
        let n = 0;
        // iterate until we find a swap with a sufficient ratio or return null
        while (!ratioAchieved) {
            n++;
            if (n > swapAndAddConfig.maxIterations) {
                log_1.log.info('max iterations exceeded');
                return {
                    status: router_1.SwapToRatioStatus.NO_ROUTE_FOUND,
                    error: 'max iterations exceeded',
                };
            }
            const amountToSwap = (0, calculate_ratio_amount_in_1.calculateRatioAmountIn)(optimalRatio, exchangeRate, inputBalance, outputBalance);
            if (amountToSwap.equalTo(0)) {
                log_1.log.info(`no swap needed: amountToSwap = 0`);
                return {
                    status: router_1.SwapToRatioStatus.NO_SWAP_NEEDED,
                };
            }
            swap = await this.route(amountToSwap, outputBalance.currency, sdk_core_1.TradeType.EXACT_INPUT, undefined, Object.assign(Object.assign(Object.assign({}, (0, config_1.DEFAULT_ROUTING_CONFIG_BY_CHAIN)(this.chainId)), routingConfig), { 
                /// @dev We do not want to query for mixedRoutes for routeToRatio as they are not supported
                /// [Protocol.V3, Protocol.V2] will make sure we only query for V3 and V2
                protocols: [router_sdk_1.Protocol.V3, router_sdk_1.Protocol.V2] }));
            if (!swap) {
                log_1.log.info('no route found from this.route()');
                return {
                    status: router_1.SwapToRatioStatus.NO_ROUTE_FOUND,
                    error: 'no route found',
                };
            }
            const inputBalanceUpdated = inputBalance.subtract(swap.trade.inputAmount);
            const outputBalanceUpdated = outputBalance.add(swap.trade.outputAmount);
            const newRatio = inputBalanceUpdated.divide(outputBalanceUpdated);
            let targetPoolPriceUpdate;
            swap.route.forEach((route) => {
                if (route.protocol === router_sdk_1.Protocol.V3) {
                    const v3Route = route;
                    v3Route.route.pools.forEach((pool, i) => {
                        if (pool.token0.equals(position.pool.token0) &&
                            pool.token1.equals(position.pool.token1) &&
                            pool.fee === position.pool.fee) {
                            targetPoolPriceUpdate = jsbi_1.default.BigInt(v3Route.sqrtPriceX96AfterList[i].toString());
                            optimalRatio = this.calculateOptimalRatio(position, jsbi_1.default.BigInt(targetPoolPriceUpdate.toString()), zeroForOne);
                        }
                    });
                }
            });
            if (!targetPoolPriceUpdate) {
                optimalRatio = preSwapOptimalRatio;
            }
            ratioAchieved =
                newRatio.equalTo(optimalRatio) ||
                    this.absoluteValue(newRatio.asFraction.divide(optimalRatio).subtract(1)).lessThan(swapAndAddConfig.ratioErrorTolerance);
            if (ratioAchieved && targetPoolPriceUpdate) {
                postSwapTargetPool = new v3_sdk_1.Pool(position.pool.token0, position.pool.token1, position.pool.fee, targetPoolPriceUpdate, position.pool.liquidity, v3_sdk_1.TickMath.getTickAtSqrtRatio(targetPoolPriceUpdate), position.pool.tickDataProvider);
            }
            exchangeRate = swap.trade.outputAmount.divide(swap.trade.inputAmount);
            log_1.log.info({
                exchangeRate: exchangeRate.asFraction.toFixed(18),
                optimalRatio: optimalRatio.asFraction.toFixed(18),
                newRatio: newRatio.asFraction.toFixed(18),
                inputBalanceUpdated: inputBalanceUpdated.asFraction.toFixed(18),
                outputBalanceUpdated: outputBalanceUpdated.asFraction.toFixed(18),
                ratioErrorTolerance: swapAndAddConfig.ratioErrorTolerance.toFixed(18),
                iterationN: n.toString(),
            }, 'QuoteToRatio Iteration Parameters');
            if (exchangeRate.equalTo(0)) {
                log_1.log.info('exchangeRate to 0');
                return {
                    status: router_1.SwapToRatioStatus.NO_ROUTE_FOUND,
                    error: 'insufficient liquidity to swap to optimal ratio',
                };
            }
        }
        if (!swap) {
            return {
                status: router_1.SwapToRatioStatus.NO_ROUTE_FOUND,
                error: 'no route found',
            };
        }
        let methodParameters;
        if (swapAndAddOptions) {
            methodParameters = await this.buildSwapAndAddMethodParameters(swap.trade, swapAndAddOptions, {
                initialBalanceTokenIn: inputBalance,
                initialBalanceTokenOut: outputBalance,
                preLiquidityPosition: position,
            });
        }
        return {
            status: router_1.SwapToRatioStatus.SUCCESS,
            result: Object.assign(Object.assign({}, swap), { methodParameters, optimalRatio, postSwapTargetPool }),
        };
    }
    /**
     * @inheritdoc IRouter
     */
    async route(amount, quoteCurrency, tradeType, swapConfig, partialRoutingConfig = {}) {
        var _a, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
        const originalAmount = amount;
        const { currencyIn, currencyOut } = this.determineCurrencyInOutFromTradeType(tradeType, amount, quoteCurrency);
        const tokenOutProperties = await this.tokenPropertiesProvider.getTokensProperties([currencyOut], partialRoutingConfig);
        const feeTakenOnTransfer = (_c = (_a = tokenOutProperties[(0, util_1.getAddressLowerCase)(currencyOut)]) === null || _a === void 0 ? void 0 : _a.tokenFeeResult) === null || _c === void 0 ? void 0 : _c.feeTakenOnTransfer;
        const externalTransferFailed = (_e = (_d = tokenOutProperties[(0, util_1.getAddressLowerCase)(currencyOut)]) === null || _d === void 0 ? void 0 : _d.tokenFeeResult) === null || _e === void 0 ? void 0 : _e.externalTransferFailed;
        // We want to log the fee on transfer output tokens that we are taking fee or not
        // Ideally the trade size (normalized in USD) would be ideal to log here, but we don't have spot price of output tokens here.
        // We have to make sure token out is FOT with either buy/sell fee bps > 0
        if (((_h = (_g = (_f = tokenOutProperties[(0, util_1.getAddressLowerCase)(currencyOut)]) === null || _f === void 0 ? void 0 : _f.tokenFeeResult) === null || _g === void 0 ? void 0 : _g.buyFeeBps) === null || _h === void 0 ? void 0 : _h.gt(0)) ||
            ((_l = (_k = (_j = tokenOutProperties[(0, util_1.getAddressLowerCase)(currencyOut)]) === null || _j === void 0 ? void 0 : _j.tokenFeeResult) === null || _k === void 0 ? void 0 : _k.sellFeeBps) === null || _l === void 0 ? void 0 : _l.gt(0))) {
            if (feeTakenOnTransfer || externalTransferFailed) {
                // also to be extra safe, in case of FOT with feeTakenOnTransfer or externalTransferFailed,
                // we nullify the fee and flat fee to avoid any potential issues.
                // although neither web nor wallet should use the calldata returned from routing/SOR
                if ((swapConfig === null || swapConfig === void 0 ? void 0 : swapConfig.type) === router_1.SwapType.UNIVERSAL_ROUTER) {
                    swapConfig.fee = undefined;
                    swapConfig.flatFee = undefined;
                }
                metric_1.metric.putMetric('TokenOutFeeOnTransferNotTakingFee', 1, metric_1.MetricLoggerUnit.Count);
            }
            else {
                metric_1.metric.putMetric('TokenOutFeeOnTransferTakingFee', 1, metric_1.MetricLoggerUnit.Count);
            }
        }
        if (tradeType === sdk_core_1.TradeType.EXACT_OUTPUT) {
            const portionAmount = this.portionProvider.getPortionAmount(amount, tradeType, feeTakenOnTransfer, externalTransferFailed, swapConfig);
            if (portionAmount && portionAmount.greaterThan(router_sdk_1.ZERO)) {
                // In case of exact out swap, before we route, we need to make sure that the
                // token out amount accounts for flat portion, and token in amount after the best swap route contains the token in equivalent of portion.
                // In other words, in case a pool's LP fee bps is lower than the portion bps (0.01%/0.05% for v3), a pool can go insolvency.
                // This is because instead of the swapper being responsible for the portion,
                // the pool instead gets responsible for the portion.
                // The addition below avoids that situation.
                amount = amount.add(portionAmount);
            }
        }
        metric_1.metric.setProperty('chainId', this.chainId);
        metric_1.metric.setProperty('pair', `${currencyIn.symbol}/${currencyOut.symbol}`);
        metric_1.metric.setProperty('tokenIn', (0, util_1.getAddress)(currencyIn));
        metric_1.metric.setProperty('tokenOut', (0, util_1.getAddress)(currencyOut));
        metric_1.metric.setProperty('tradeType', tradeType === sdk_core_1.TradeType.EXACT_INPUT ? 'ExactIn' : 'ExactOut');
        metric_1.metric.putMetric(`QuoteRequestedForChain${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
        // Get a block number to specify in all our calls. Ensures data we fetch from chain is
        // from the same block.
        const blockNumber = (_m = partialRoutingConfig.blockNumber) !== null && _m !== void 0 ? _m : this.getBlockNumberPromise();
        const routingConfig = lodash_1.default.merge({
            // These settings could be changed by the partialRoutingConfig
            useCachedRoutes: true,
            writeToCachedRoutes: true,
            optimisticCachedRoutes: false,
        }, (0, config_1.DEFAULT_ROUTING_CONFIG_BY_CHAIN)(this.chainId), partialRoutingConfig, { blockNumber });
        if (routingConfig.debugRouting) {
            log_1.log.warn(`Finalized routing config is ${JSON.stringify(routingConfig)}`);
        }
        const gasPriceWei = await this.getGasPriceWei(await blockNumber, await partialRoutingConfig.blockNumber);
        // const gasTokenAccessor = await this.tokenProvider.getTokens([routingConfig.gasToken!]);
        const gasToken = routingConfig.gasToken
            ? (await this.tokenProvider.getTokens([routingConfig.gasToken])).getTokenByAddress(routingConfig.gasToken)
            : undefined;
        const providerConfig = Object.assign(Object.assign({}, routingConfig), { blockNumber, additionalGasOverhead: (0, gas_costs_1.NATIVE_OVERHEAD)(this.chainId, amount.currency, quoteCurrency), gasToken,
            externalTransferFailed,
            feeTakenOnTransfer });
        const { v2GasModel: v2GasModel, v3GasModel: v3GasModel, v4GasModel: v4GasModel, mixedRouteGasModel: mixedRouteGasModel, } = await this.getGasModels(gasPriceWei, amount.currency.wrapped, quoteCurrency.wrapped, providerConfig);
        // Create a Set to sanitize the protocols input, a Set of undefined becomes an empty set,
        // Then create an Array from the values of that Set.
        const protocols = Array.from(new Set(routingConfig.protocols).values());
        const cacheMode = (_o = routingConfig.overwriteCacheMode) !== null && _o !== void 0 ? _o : (await ((_p = this.routeCachingProvider) === null || _p === void 0 ? void 0 : _p.getCacheMode(this.chainId, amount, quoteCurrency, tradeType, protocols)));
        // Fetch CachedRoutes
        let cachedRoutes;
        // Decide whether to use cached routes or not - If |enabledAndRequestedProtocolsMatch| is true we are good to use cached routes.
        // In order to use cached routes, we need to have all enabled protocols specified in the request.
        // By default, all protocols are enabled but for UniversalRouterVersion.V1_2, V4 is not.
        // - ref: https://github.com/Uniswap/routing-api/blob/663b607d80d9249f85e7ab0925a611ec3701da2a/lib/util/supportedProtocolVersions.ts#L15
        // So we take this into account when deciding whether to use cached routes or not.
        // We only want to use cache if all enabled protocols are specified (V2,V3,V4? + MIXED). In any other case, use onchain path.
        // - Cache is optimized for global search, not for specific protocol(s) search.
        // For legacy systems (SWAP_ROUTER_02) or missing swapConfig, follow UniversalRouterVersion.V1_2 logic.
        const availableProtocolsSet = new Set(Object.values(router_sdk_1.Protocol));
        const requestedProtocolsSet = new Set(protocols);
        const swapRouter = !swapConfig ||
            swapConfig.type === router_1.SwapType.SWAP_ROUTER_02 ||
            (swapConfig.type === router_1.SwapType.UNIVERSAL_ROUTER &&
                swapConfig.version === universal_router_sdk_1.UniversalRouterVersion.V1_2);
        if (swapRouter) {
            availableProtocolsSet.delete(router_sdk_1.Protocol.V4);
            if (requestedProtocolsSet.has(router_sdk_1.Protocol.V4)) {
                requestedProtocolsSet.delete(router_sdk_1.Protocol.V4);
            }
        }
        const enabledAndRequestedProtocolsMatch = availableProtocolsSet.size === requestedProtocolsSet.size &&
            [...availableProtocolsSet].every((protocol) => requestedProtocolsSet.has(protocol));
        // If the requested protocols do not match the enabled protocols, we need to set the hooks options to NO_HOOKS.
        if (!requestedProtocolsSet.has(router_sdk_1.Protocol.V4)) {
            routingConfig.hooksOptions = util_1.HooksOptions.NO_HOOKS;
        }
        // If hooksOptions not specified and it's not a swapRouter (i.e. Universal Router it is),
        // we should also set it to HOOKS_INCLUSIVE, as this is default behavior even without hooksOptions.
        if (!routingConfig.hooksOptions) {
            routingConfig.hooksOptions = util_1.HooksOptions.HOOKS_INCLUSIVE;
        }
        log_1.log.debug('UniversalRouterVersion_CacheGate_Check', {
            availableProtocolsSet: Array.from(availableProtocolsSet),
            requestedProtocolsSet: Array.from(requestedProtocolsSet),
            enabledAndRequestedProtocolsMatch,
            swapConfigType: swapConfig === null || swapConfig === void 0 ? void 0 : swapConfig.type,
            swapConfigUniversalRouterVersion: (swapConfig === null || swapConfig === void 0 ? void 0 : swapConfig.type) === router_1.SwapType.UNIVERSAL_ROUTER
                ? swapConfig === null || swapConfig === void 0 ? void 0 : swapConfig.version
                : 'N/A',
        });
        if (routingConfig.useCachedRoutes &&
            cacheMode !== providers_2.CacheMode.Darkmode &&
            AlphaRouter.isAllowedToEnterCachedRoutes(routingConfig.intent, routingConfig.hooksOptions, swapRouter)) {
            if (enabledAndRequestedProtocolsMatch) {
                if (protocols.includes(router_sdk_1.Protocol.V4) &&
                    (currencyIn.isNative || currencyOut.isNative)) {
                    const [wrappedNativeCachedRoutes, nativeCachedRoutes] = await Promise.all([
                        (_q = this.routeCachingProvider) === null || _q === void 0 ? void 0 : _q.getCachedRoute(this.chainId, amounts_1.CurrencyAmount.fromRawAmount(amount.currency.wrapped, amount.quotient), quoteCurrency.wrapped, tradeType, protocols, await blockNumber, routingConfig.optimisticCachedRoutes, routingConfig, swapConfig),
                        (_r = this.routeCachingProvider) === null || _r === void 0 ? void 0 : _r.getCachedRoute(this.chainId, amount, quoteCurrency, tradeType, [router_sdk_1.Protocol.V4], await blockNumber, routingConfig.optimisticCachedRoutes, routingConfig, swapConfig),
                    ]);
                    if ((wrappedNativeCachedRoutes &&
                        (wrappedNativeCachedRoutes === null || wrappedNativeCachedRoutes === void 0 ? void 0 : wrappedNativeCachedRoutes.routes.length) > 0) ||
                        (nativeCachedRoutes && (nativeCachedRoutes === null || nativeCachedRoutes === void 0 ? void 0 : nativeCachedRoutes.routes.length) > 0)) {
                        cachedRoutes = new providers_2.CachedRoutes({
                            routes: [
                                ...((_s = nativeCachedRoutes === null || nativeCachedRoutes === void 0 ? void 0 : nativeCachedRoutes.routes) !== null && _s !== void 0 ? _s : []),
                                ...((_t = wrappedNativeCachedRoutes === null || wrappedNativeCachedRoutes === void 0 ? void 0 : wrappedNativeCachedRoutes.routes) !== null && _t !== void 0 ? _t : []),
                            ],
                            chainId: this.chainId,
                            currencyIn: currencyIn,
                            currencyOut: currencyOut,
                            protocolsCovered: protocols,
                            blockNumber: await blockNumber,
                            tradeType: tradeType,
                            originalAmount: (_v = (_u = wrappedNativeCachedRoutes === null || wrappedNativeCachedRoutes === void 0 ? void 0 : wrappedNativeCachedRoutes.originalAmount) !== null && _u !== void 0 ? _u : nativeCachedRoutes === null || nativeCachedRoutes === void 0 ? void 0 : nativeCachedRoutes.originalAmount) !== null && _v !== void 0 ? _v : amount.quotient.toString(),
                            blocksToLive: (_x = (_w = wrappedNativeCachedRoutes === null || wrappedNativeCachedRoutes === void 0 ? void 0 : wrappedNativeCachedRoutes.blocksToLive) !== null && _w !== void 0 ? _w : nativeCachedRoutes === null || nativeCachedRoutes === void 0 ? void 0 : nativeCachedRoutes.blocksToLive) !== null && _x !== void 0 ? _x : defaultBlocksToLive_1.DEFAULT_BLOCKS_TO_LIVE[this.chainId],
                        });
                    }
                }
                else {
                    cachedRoutes = await ((_y = this.routeCachingProvider) === null || _y === void 0 ? void 0 : _y.getCachedRoute(this.chainId, amount, quoteCurrency, tradeType, protocols, await blockNumber, routingConfig.optimisticCachedRoutes, routingConfig, swapConfig));
                }
            }
        }
        if ((0, util_1.shouldWipeoutCachedRoutes)(cachedRoutes, routingConfig)) {
            cachedRoutes = undefined;
        }
        metric_1.metric.putMetric(routingConfig.useCachedRoutes
            ? 'GetQuoteUsingCachedRoutes'
            : 'GetQuoteNotUsingCachedRoutes', 1, metric_1.MetricLoggerUnit.Count);
        if (cacheMode &&
            routingConfig.useCachedRoutes &&
            cacheMode !== providers_2.CacheMode.Darkmode &&
            !cachedRoutes) {
            metric_1.metric.putMetric(`GetCachedRoute_miss_${cacheMode}`, 1, metric_1.MetricLoggerUnit.Count);
            log_1.log.info({
                currencyIn: currencyIn.symbol,
                currencyInAddress: (0, util_1.getAddress)(currencyIn),
                currencyOut: currencyOut.symbol,
                currencyOutAddress: (0, util_1.getAddress)(currencyOut),
                cacheMode,
                amount: amount.toExact(),
                chainId: this.chainId,
                tradeType: this.tradeTypeStr(tradeType),
            }, `GetCachedRoute miss ${cacheMode} for ${this.tokenPairSymbolTradeTypeChainId(currencyIn, currencyOut, tradeType)}`);
        }
        else if (cachedRoutes && routingConfig.useCachedRoutes) {
            metric_1.metric.putMetric(`GetCachedRoute_hit_${cacheMode}`, 1, metric_1.MetricLoggerUnit.Count);
            log_1.log.info({
                currencyIn: currencyIn.symbol,
                currencyInAddress: (0, util_1.getAddress)(currencyIn),
                currencyOut: currencyOut.symbol,
                currencyOutAddress: (0, util_1.getAddress)(currencyOut),
                cacheMode,
                amount: amount.toExact(),
                chainId: this.chainId,
                tradeType: this.tradeTypeStr(tradeType),
            }, `GetCachedRoute hit ${cacheMode} for ${this.tokenPairSymbolTradeTypeChainId(currencyIn, currencyOut, tradeType)}`);
        }
        let swapRouteFromCachePromise = Promise.resolve(null);
        if (cachedRoutes) {
            swapRouteFromCachePromise = this.getSwapRouteFromCache(currencyIn, currencyOut, cachedRoutes, await blockNumber, amount, quoteCurrency, tradeType, routingConfig, v3GasModel, v4GasModel, mixedRouteGasModel, gasPriceWei, v2GasModel, swapConfig, providerConfig);
        }
        let swapRouteFromChainPromise = Promise.resolve(null);
        if (!cachedRoutes || cacheMode !== providers_2.CacheMode.Livemode) {
            swapRouteFromChainPromise = this.getSwapRouteFromChain(amount, currencyIn, currencyOut, protocols, quoteCurrency, tradeType, routingConfig, v3GasModel, v4GasModel, mixedRouteGasModel, gasPriceWei, v2GasModel, swapConfig, providerConfig);
        }
        const [swapRouteFromCache, swapRouteFromChain] = await Promise.all([
            swapRouteFromCachePromise,
            swapRouteFromChainPromise,
        ]);
        let swapRouteRaw;
        let hitsCachedRoute = false;
        if (cacheMode === providers_2.CacheMode.Livemode && swapRouteFromCache) {
            // offline lambda is never in cache mode
            // refresh pools to avoid stale data
            const beforeRefreshPools = Date.now();
            await this.refreshPools(swapRouteFromCache.routes, routingConfig, this.v2PoolProvider, this.v3PoolProvider, this.v4PoolProvider);
            metric_1.metric.putMetric(`Route_RefreshPools_Latency`, Date.now() - beforeRefreshPools, metric_1.MetricLoggerUnit.Milliseconds);
            log_1.log.info(`CacheMode is ${cacheMode}, and we are using swapRoute from cache`);
            hitsCachedRoute = true;
            swapRouteRaw = swapRouteFromCache;
        }
        else {
            log_1.log.info(`CacheMode is ${cacheMode}, and we are using materialized swapRoute`);
            swapRouteRaw = swapRouteFromChain;
        }
        if (cacheMode === providers_2.CacheMode.Tapcompare &&
            swapRouteFromCache &&
            swapRouteFromChain) {
            const quoteDiff = swapRouteFromChain.quote.subtract(swapRouteFromCache.quote);
            const quoteGasAdjustedDiff = swapRouteFromChain.quoteGasAdjusted.subtract(swapRouteFromCache.quoteGasAdjusted);
            const gasUsedDiff = swapRouteFromChain.estimatedGasUsed.sub(swapRouteFromCache.estimatedGasUsed);
            // Only log if quoteDiff is different from 0, or if quoteGasAdjustedDiff and gasUsedDiff are both different from 0
            if (!quoteDiff.equalTo(0) ||
                !(quoteGasAdjustedDiff.equalTo(0) || gasUsedDiff.eq(0))) {
                try {
                    // Calculates the percentage of the difference with respect to the quoteFromChain (not from cache)
                    const misquotePercent = quoteGasAdjustedDiff
                        .divide(swapRouteFromChain.quoteGasAdjusted)
                        .multiply(100);
                    metric_1.metric.putMetric(`TapcompareCachedRoute_quoteGasAdjustedDiffPercent`, Number(misquotePercent.toExact()), metric_1.MetricLoggerUnit.Percent);
                    log_1.log.warn({
                        quoteFromChain: swapRouteFromChain.quote.toExact(),
                        quoteFromCache: swapRouteFromCache.quote.toExact(),
                        quoteDiff: quoteDiff.toExact(),
                        quoteGasAdjustedFromChain: swapRouteFromChain.quoteGasAdjusted.toExact(),
                        quoteGasAdjustedFromCache: swapRouteFromCache.quoteGasAdjusted.toExact(),
                        quoteGasAdjustedDiff: quoteGasAdjustedDiff.toExact(),
                        gasUsedFromChain: swapRouteFromChain.estimatedGasUsed.toString(),
                        gasUsedFromCache: swapRouteFromCache.estimatedGasUsed.toString(),
                        gasUsedDiff: gasUsedDiff.toString(),
                        routesFromChain: swapRouteFromChain.routes.toString(),
                        routesFromCache: swapRouteFromCache.routes.toString(),
                        amount: amount.toExact(),
                        originalAmount: cachedRoutes === null || cachedRoutes === void 0 ? void 0 : cachedRoutes.originalAmount,
                        pair: this.tokenPairSymbolTradeTypeChainId(currencyIn, currencyOut, tradeType),
                        blockNumber,
                    }, `Comparing quotes between Chain and Cache for ${this.tokenPairSymbolTradeTypeChainId(currencyIn, currencyOut, tradeType)}`);
                }
                catch (error) {
                    // This is in response to the 'division by zero' error
                    // during https://uniswapteam.slack.com/archives/C059TGEC57W/p1723997015399579
                    if (error instanceof RangeError &&
                        error.message.includes('Division by zero')) {
                        log_1.log.error({
                            quoteGasAdjustedDiff: quoteGasAdjustedDiff.toExact(),
                            swapRouteFromChainQuoteGasAdjusted: swapRouteFromChain.quoteGasAdjusted.toExact(),
                        }, 'Error calculating misquote percent');
                        metric_1.metric.putMetric(`TapcompareCachedRoute_quoteGasAdjustedDiffPercent_divzero`, 1, metric_1.MetricLoggerUnit.Count);
                    }
                    // Log but don't throw here - this is only for logging.
                }
            }
        }
        let newSetCachedRoutesPath = false;
        const shouldEnableCachedRoutesCacheInvalidationFix = Math.random() * 100 <
            ((_z = this.cachedRoutesCacheInvalidationFixRolloutPercentage) !== null && _z !== void 0 ? _z : 0);
        // we have to write cached routes right before checking swapRouteRaw is null or not
        // because getCachedRoutes in routing-api do not use the blocks-to-live to filter out the expired routes at all
        // there's a possibility the cachedRoutes is always populated, but swapRouteFromCache is always null, because we don't update cachedRoutes in this case at all,
        // as long as it's within 24 hours sliding window TTL
        if (shouldEnableCachedRoutesCacheInvalidationFix) {
            // theoretically, when routingConfig.intent === INTENT.CACHING, optimisticCachedRoutes should be false
            // so that we can always pass in cachedRoutes?.notExpired(await blockNumber, !routingConfig.optimisticCachedRoutes)
            // but just to be safe, we just hardcode true when checking the cached routes expiry for write update
            // we decide to not check cached routes expiry in the read path anyway
            if (!(cachedRoutes === null || cachedRoutes === void 0 ? void 0 : cachedRoutes.notExpired(await blockNumber, true))) {
                // optimisticCachedRoutes === false means at routing-api level, we only want to set cached routes during intent=caching, not intent=quote
                // this means during the online quote endpoint path, we should not reset cached routes
                if (routingConfig.intent === intent_1.INTENT.CACHING) {
                    // due to fire and forget nature, we already take note that we should set new cached routes during the new path
                    newSetCachedRoutesPath = true;
                    metric_1.metric.putMetric(`SetCachedRoute_NewPath`, 1, metric_1.MetricLoggerUnit.Count);
                    // there's a chance that swapRouteFromChain might be populated already,
                    // when there's no cachedroutes in the dynamo DB.
                    // in that case, we don't try to swap route from chain again
                    const swapRouteFromChainAgain = swapRouteFromChain !== null && swapRouteFromChain !== void 0 ? swapRouteFromChain : 
                    // we have to intentionally await here, because routing-api lambda has a chance to return the swapRoute/swapRouteWithSimulation
                    // before the routing-api quote handler can finish running getSwapRouteFromChain (getSwapRouteFromChain is runtime intensive)
                    (await this.getSwapRouteFromChain(amount, currencyIn, currencyOut, protocols, quoteCurrency, tradeType, routingConfig, v3GasModel, v4GasModel, mixedRouteGasModel, gasPriceWei, v2GasModel, swapConfig, providerConfig));
                    if (swapRouteFromChainAgain) {
                        const routesToCache = providers_2.CachedRoutes.fromRoutesWithValidQuotes(swapRouteFromChainAgain.routes, this.chainId, currencyIn, currencyOut, protocols.sort(), await blockNumber, tradeType, amount.toExact());
                        await this.setCachedRoutesAndLog(amount, currencyIn, currencyOut, tradeType, 'SetCachedRoute_NewPath', routesToCache, routingConfig.cachedRoutesRouteIds);
                    }
                }
            }
        }
        if (!swapRouteRaw) {
            return null;
        }
        const { quote, quoteGasAdjusted, estimatedGasUsed, routes: routeAmounts, estimatedGasUsedQuoteToken, estimatedGasUsedUSD, estimatedGasUsedGasToken, } = swapRouteRaw;
        // we intentionally dont add shouldEnableCachedRoutesCacheInvalidationFix in if condition below
        // because we know cached routes in prod dont filter by blocks-to-live
        // so that we know that swapRouteFromChain is always not populated, because
        // if (!cachedRoutes || cacheMode !== CacheMode.Livemode) above always have the cachedRoutes as populated
        if (this.routeCachingProvider &&
            routingConfig.writeToCachedRoutes &&
            cacheMode !== providers_2.CacheMode.Darkmode &&
            swapRouteFromChain) {
            if (newSetCachedRoutesPath) {
                // SetCachedRoute_NewPath and SetCachedRoute_OldPath metrics might have counts during short timeframe.
                // over time, we should expect to see less SetCachedRoute_OldPath metrics count.
                // in AWS metrics, one can investigate, by:
                // 1) seeing the overall metrics count of SetCachedRoute_NewPath and SetCachedRoute_OldPath. SetCachedRoute_NewPath should steadily go up, while SetCachedRoute_OldPath should go down.
                // 2) using the same requestId, one should see eventually when SetCachedRoute_NewPath metric is logged, SetCachedRoute_OldPath metric should not be called.
                metric_1.metric.putMetric(`SetCachedRoute_OldPath_INTENT_${routingConfig.intent}`, 1, metric_1.MetricLoggerUnit.Count);
            }
            // Generate the object to be cached
            const routesToCache = providers_2.CachedRoutes.fromRoutesWithValidQuotes(swapRouteFromChain.routes, this.chainId, currencyIn, currencyOut, protocols.sort(), await blockNumber, tradeType, amount.toExact());
            await this.setCachedRoutesAndLog(amount, currencyIn, currencyOut, tradeType, 'SetCachedRoute_OldPath', routesToCache, routingConfig.cachedRoutesRouteIds);
        }
        metric_1.metric.putMetric(`QuoteFoundForChain${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
        // Build Trade object that represents the optimal swap.
        const trade = (0, methodParameters_1.buildTrade)(currencyIn, currencyOut, tradeType, routeAmounts);
        let methodParameters;
        // If user provided recipient, deadline etc. we also generate the calldata required to execute
        // the swap and return it too.
        if (swapConfig) {
            methodParameters = (0, methodParameters_1.buildSwapMethodParameters)(trade, swapConfig, this.chainId);
        }
        const tokenOutAmount = tradeType === sdk_core_1.TradeType.EXACT_OUTPUT
            ? originalAmount // we need to pass in originalAmount instead of amount, because amount already added portionAmount in case of exact out swap
            : quote;
        const portionAmount = this.portionProvider.getPortionAmount(tokenOutAmount, tradeType, feeTakenOnTransfer, externalTransferFailed, swapConfig);
        const portionQuoteAmount = this.portionProvider.getPortionQuoteAmount(tradeType, quote, amount, // we need to pass in amount instead of originalAmount here, because amount here needs to add the portion for exact out
        portionAmount);
        // we need to correct quote and quote gas adjusted for exact output when portion is part of the exact out swap
        const correctedQuote = this.portionProvider.getQuote(tradeType, quote, portionQuoteAmount);
        const correctedQuoteGasAdjusted = this.portionProvider.getQuoteGasAdjusted(tradeType, quoteGasAdjusted, portionQuoteAmount);
        const quoteGasAndPortionAdjusted = this.portionProvider.getQuoteGasAndPortionAdjusted(tradeType, quoteGasAdjusted, portionAmount);
        const swapRoute = {
            quote: correctedQuote,
            quoteGasAdjusted: correctedQuoteGasAdjusted,
            estimatedGasUsed,
            estimatedGasUsedQuoteToken,
            estimatedGasUsedUSD,
            estimatedGasUsedGasToken,
            gasPriceWei,
            route: routeAmounts,
            trade,
            methodParameters,
            blockNumber: bignumber_1.BigNumber.from(await blockNumber),
            hitsCachedRoute: hitsCachedRoute,
            portionAmount: portionAmount,
            quoteGasAndPortionAdjusted: quoteGasAndPortionAdjusted,
        };
        if (swapConfig &&
            swapConfig.simulate &&
            methodParameters &&
            methodParameters.calldata) {
            if (!this.simulator) {
                throw new Error('Simulator not initialized!');
            }
            log_1.log.info(JSON.stringify({ swapConfig, methodParameters, providerConfig }, null, 2), `Starting simulation`);
            const fromAddress = swapConfig.simulate.fromAddress;
            const beforeSimulate = Date.now();
            const swapRouteWithSimulation = await this.simulator.simulate(fromAddress, swapConfig, swapRoute, amount, 
            // Quote will be in WETH even if quoteCurrency is ETH
            // So we init a new CurrencyAmount object here
            amounts_1.CurrencyAmount.fromRawAmount(quoteCurrency, quote.quotient.toString()), providerConfig);
            if (((_0 = this.deleteCacheEnabledChains) === null || _0 === void 0 ? void 0 : _0.includes(this.chainId)) &&
                swapRouteWithSimulation.simulationStatus === providers_2.SimulationStatus.Failed) {
                // invalidate cached route if simulation failed
                log_1.log.info({
                    simulationStatus: swapRouteWithSimulation.simulationStatus,
                    swapRoute: swapRouteWithSimulation,
                }, `Simulation failed - detailed failure information: CacheInvalidationCount_${this.chainId}`);
                metric_1.metric.putMetric(`CacheInvalidationCount_${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
                // Generate the object to be cached
                const routesToCache = providers_2.CachedRoutes.fromRoutesWithValidQuotes(swapRouteWithSimulation.route, this.chainId, currencyIn, currencyOut, protocols.sort(), await blockNumber, tradeType, amount.toExact());
                if (!routesToCache) {
                    log_1.log.error({ swapRouteWithSimulation }, 'Failed to generate cached routes after simulation failure');
                }
                else {
                    try {
                        await ((_1 = this.routeCachingProvider) === null || _1 === void 0 ? void 0 : _1.deleteCachedRoute(routesToCache));
                    }
                    catch (err) {
                        log_1.log.error({ err, routesToCache }, 'Failed to delete cached route after simulation failure');
                    }
                }
            }
            metric_1.metric.putMetric('SimulateTransaction', Date.now() - beforeSimulate, metric_1.MetricLoggerUnit.Milliseconds);
            return swapRouteWithSimulation;
        }
        return swapRoute;
    }
    /**
     * Refreshes the pools for the given routes.
     *
     * @param routes the routes to refresh the pools for
     * @param routingConfig the routing config
     */
    async refreshPools(routes, routingConfig, v2PoolProvider, v3PoolProvider, v4PoolProvider) {
        for (const route of routes) {
            switch (route.protocol) {
                case router_sdk_1.Protocol.V2:
                    route.route = await AlphaRouter.refreshV2Pools(route.route, routingConfig, v2PoolProvider);
                    break;
                case router_sdk_1.Protocol.V3:
                    route.route = await AlphaRouter.refreshV3Pools(route.route, routingConfig, v3PoolProvider);
                    break;
                case router_sdk_1.Protocol.V4:
                    route.route = await AlphaRouter.refreshV4Pools(route.route, routingConfig, v4PoolProvider);
                    break;
                case router_sdk_1.Protocol.MIXED:
                    route.route = await AlphaRouter.refreshMixedPools(route.route, routingConfig, v2PoolProvider, v3PoolProvider, v4PoolProvider);
                    break;
                default:
                    throw new Error(`Unknown protocol: ${route.protocol}`);
            }
        }
    }
    /**
     * Refreshes the V2 pools for the given route.
     *
     * @param route the route to refresh the V2 pools for
     * @param config the routing config
     * @param v2PoolProvider the V2 pool provider
     * @returns the refreshed route
     */
    static async refreshV2Pools(route, config, v2PoolProvider) {
        const refreshedPairs = [];
        for (const pair of route.pairs) {
            const v2Pools = await v2PoolProvider.getPools([[pair.token0, pair.token1]], config);
            const refreshed = v2Pools.getPool(pair.token0, pair.token1);
            if (refreshed)
                refreshedPairs.push(refreshed);
            else {
                // if the pool is not found, we need to log the error and add the original pool back in
                AlphaRouter.logV2PoolRefreshError(pair);
                refreshedPairs.push(pair);
            }
        }
        return (0, router_1.cloneV2RouteWithNewPools)(route, refreshedPairs);
    }
    /**
     * Refreshes the V3 pools for the given route.
     *
     * @param route the route to refresh the V3 pools for
     * @param config the routing config
     * @param v3PoolProvider the V3 pool provider
     * @returns the refreshed route
     */
    static async refreshV3Pools(route, config, v3PoolProvider) {
        const refreshedPools = [];
        for (const pool of route.pools) {
            const v3Pools = await v3PoolProvider.getPools([[pool.token0, pool.token1, pool.fee]], config);
            const refreshed = v3Pools.getPool(pool.token0, pool.token1, pool.fee);
            if (refreshed)
                refreshedPools.push(refreshed);
            else {
                // if the pool is not found, we need to log the error and add the original pool back in
                AlphaRouter.logV3PoolRefreshError(pool);
                refreshedPools.push(pool);
            }
        }
        return (0, router_1.cloneV3RouteWithNewPools)(route, refreshedPools);
    }
    /**
     * Refreshes the V4 pools for the given route.
     *
     * @param route the route to refresh the V4 pools for
     * @param config the routing config
     * @param v4PoolProvider the V4 pool provider
     * @returns the refreshed route
     */
    static async refreshV4Pools(route, config, v4PoolProvider) {
        const refreshedPools = [];
        for (const pool of route.pools) {
            const v4Pools = await v4PoolProvider.getPools([
                [
                    pool.currency0,
                    pool.currency1,
                    pool.fee,
                    pool.tickSpacing,
                    pool.hooks,
                ],
            ], config);
            const refreshed = v4Pools.getPool(pool.currency0, pool.currency1, pool.fee, pool.tickSpacing, pool.hooks);
            if (refreshed)
                refreshedPools.push(refreshed);
            else {
                // if the pool is not found, we need to log the error and add the original pool back in
                AlphaRouter.logV4PoolRefreshError(pool);
                refreshedPools.push(pool);
            }
        }
        return (0, router_1.cloneV4RouteWithNewPools)(route, refreshedPools);
    }
    /**
     * Refreshes the mixed pools for the given route.
     *
     * @param route the route to refresh the mixed pools for
     * @param config the routing config
     * @param v2PoolProvider the V2 pool provider
     * @param v3PoolProvider the V3 pool provider
     * @param v4PoolProvider the V4 pool provider
     * @returns the refreshed route
     */
    static async refreshMixedPools(route, config, v2PoolProvider, v3PoolProvider, v4PoolProvider) {
        const refreshedPools = [];
        for (const pool of route.pools) {
            if (pool instanceof v2_sdk_1.Pair) {
                const v2Pools = await v2PoolProvider.getPools([[pool.token0, pool.token1]], config);
                const refreshed = v2Pools.getPool(pool.token0, pool.token1);
                if (refreshed)
                    refreshedPools.push(refreshed);
                else {
                    // if the pool is not found, we need to log the error and add the original pool back in
                    AlphaRouter.logV2PoolRefreshError(pool);
                    refreshedPools.push(pool);
                }
            }
            else if (pool instanceof v3_sdk_1.Pool) {
                const v3Pools = await v3PoolProvider.getPools([[pool.token0, pool.token1, pool.fee]], config);
                const refreshed = v3Pools.getPool(pool.token0, pool.token1, pool.fee);
                if (refreshed)
                    refreshedPools.push(refreshed);
                else {
                    // if the pool is not found, we need to log the error and add the original pool back in
                    AlphaRouter.logV3PoolRefreshError(pool);
                    refreshedPools.push(pool);
                }
            }
            else if (pool instanceof v4_sdk_1.Pool) {
                const v4Pools = await v4PoolProvider.getPools([
                    [
                        pool.currency0,
                        pool.currency1,
                        pool.fee,
                        pool.tickSpacing,
                        pool.hooks,
                    ],
                ], config);
                const refreshed = v4Pools.getPool(pool.currency0, pool.currency1, pool.fee, pool.tickSpacing, pool.hooks);
                if (refreshed)
                    refreshedPools.push(refreshed);
                else {
                    // if the pool is not found, we need to log the error and add the original pool back in
                    AlphaRouter.logV4PoolRefreshError(pool);
                    refreshedPools.push(pool);
                }
            }
            else {
                throw new Error('Unknown pool type in mixed route');
            }
        }
        return (0, router_1.cloneMixedRouteWithNewPools)(route, refreshedPools);
    }
    static logV2PoolRefreshError(v2Pool) {
        log_1.log.error({
            token0: v2Pool.token0,
            token1: v2Pool.token1,
        }, 'Failed to refresh V2 pool');
    }
    static logV3PoolRefreshError(v3Pool) {
        log_1.log.error({
            token0: v3Pool.token0,
            token1: v3Pool.token1,
            fee: v3Pool.fee,
        }, 'Failed to refresh V3 pool');
    }
    static logV4PoolRefreshError(v4Pool) {
        log_1.log.error({
            token0: v4Pool.currency0,
            token1: v4Pool.currency1,
            fee: v4Pool.fee,
            tickSpacing: v4Pool.tickSpacing,
            hooks: v4Pool.hooks,
        }, 'Failed to refresh V4 pool');
    }
    async setCachedRoutesAndLog(amount, currencyIn, currencyOut, tradeType, metricsPrefix, routesToCache, cachedRoutesRouteIds) {
        var _a;
        if (routesToCache) {
            const cachedRoutesChanged = cachedRoutesRouteIds !== undefined &&
                // it's possible that top cached routes may be split routes,
                // so that we always serialize all the top 8 retrieved cached routes vs the top routes.
                !cachedRoutesRouteIds.startsWith((0, serializeRouteIds_1.serializeRouteIds)(routesToCache.routes.map((r) => r.routeId)));
            if (cachedRoutesChanged) {
                metric_1.metric.putMetric('cachedRoutesChanged', 1, metric_1.MetricLoggerUnit.Count);
                metric_1.metric.putMetric(`cachedRoutesChanged_chainId${currencyIn.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
                metric_1.metric.putMetric(`cachedRoutesChanged_chainId${currencyOut.chainId}_pair${currencyIn.symbol}${currencyOut.symbol}`, 1, metric_1.MetricLoggerUnit.Count);
            }
            else {
                metric_1.metric.putMetric('cachedRoutesNotChanged', 1, metric_1.MetricLoggerUnit.Count);
                metric_1.metric.putMetric(`cachedRoutesNotChanged_chainId${currencyIn.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
                metric_1.metric.putMetric(`cachedRoutesNotChanged_chainId${currencyOut.chainId}_pair${currencyIn.symbol}${currencyOut.symbol}`, 1, metric_1.MetricLoggerUnit.Count);
            }
            await ((_a = this.routeCachingProvider) === null || _a === void 0 ? void 0 : _a.setCachedRoute(routesToCache, amount).then((success) => {
                const status = success ? 'success' : 'rejected';
                metric_1.metric.putMetric(`${metricsPrefix}_${status}`, 1, metric_1.MetricLoggerUnit.Count);
            }).catch((reason) => {
                log_1.log.error({
                    reason: reason,
                    tokenPair: this.tokenPairSymbolTradeTypeChainId(currencyIn, currencyOut, tradeType),
                }, `SetCachedRoute failure`);
                metric_1.metric.putMetric(`${metricsPrefix}_failure`, 1, metric_1.MetricLoggerUnit.Count);
            }));
        }
        else {
            metric_1.metric.putMetric(`${metricsPrefix}_unnecessary`, 1, metric_1.MetricLoggerUnit.Count);
        }
    }
    async getSwapRouteFromCache(currencyIn, currencyOut, cachedRoutes, blockNumber, amount, quoteCurrency, tradeType, routingConfig, v3GasModel, v4GasModel, mixedRouteGasModel, gasPriceWei, v2GasModel, swapConfig, providerConfig) {
        var _a, _c, _d, _e, _f, _g;
        const tokenPairProperties = await this.tokenPropertiesProvider.getTokensProperties([currencyIn, currencyOut], providerConfig);
        const sellTokenIsFot = (_d = (_c = (_a = tokenPairProperties[(0, util_1.getAddressLowerCase)(currencyIn)]) === null || _a === void 0 ? void 0 : _a.tokenFeeResult) === null || _c === void 0 ? void 0 : _c.sellFeeBps) === null || _d === void 0 ? void 0 : _d.gt(0);
        const buyTokenIsFot = (_g = (_f = (_e = tokenPairProperties[(0, util_1.getAddressLowerCase)(currencyOut)]) === null || _e === void 0 ? void 0 : _e.tokenFeeResult) === null || _f === void 0 ? void 0 : _f.buyFeeBps) === null || _g === void 0 ? void 0 : _g.gt(0);
        const fotInDirectSwap = sellTokenIsFot || buyTokenIsFot;
        log_1.log.info({
            protocols: cachedRoutes.protocolsCovered,
            tradeType: cachedRoutes.tradeType,
            cachedBlockNumber: cachedRoutes.blockNumber,
            quoteBlockNumber: blockNumber,
        }, 'Routing across CachedRoute');
        const quotePromises = [];
        const v4Routes = cachedRoutes.routes.filter((route) => route.protocol === router_sdk_1.Protocol.V4);
        const v3Routes = cachedRoutes.routes.filter((route) => route.protocol === router_sdk_1.Protocol.V3);
        const v2Routes = cachedRoutes.routes.filter((route) => route.protocol === router_sdk_1.Protocol.V2);
        const mixedRoutes = cachedRoutes.routes.filter((route) => route.protocol === router_sdk_1.Protocol.MIXED);
        let percents;
        let amounts;
        if (cachedRoutes.routes.length > 1) {
            // If we have more than 1 route, we will quote the different percents for it, following the regular process
            [percents, amounts] = this.getAmountDistribution(amount, routingConfig);
        }
        else if (cachedRoutes.routes.length == 1) {
            [percents, amounts] = [[100], [amount]];
        }
        else {
            // In this case this means that there's no route, so we return null
            return Promise.resolve(null);
        }
        if (v4Routes.length > 0) {
            const v4RoutesFromCache = v4Routes.map((cachedRoute) => cachedRoute.route);
            metric_1.metric.putMetric('SwapRouteFromCache_V4_GetQuotes_Request', 1, metric_1.MetricLoggerUnit.Count);
            const beforeGetQuotes = Date.now();
            quotePromises.push(this.v4Quoter
                .getQuotes(v4RoutesFromCache, amounts, percents, quoteCurrency, tradeType, routingConfig, undefined, v4GasModel)
                .then((result) => {
                metric_1.metric.putMetric(`SwapRouteFromCache_V4_GetQuotes_Load`, Date.now() - beforeGetQuotes, metric_1.MetricLoggerUnit.Milliseconds);
                return result;
            }));
        }
        if (!fotInDirectSwap) {
            if (v3Routes.length > 0) {
                const v3RoutesFromCache = v3Routes.map((cachedRoute) => cachedRoute.route);
                metric_1.metric.putMetric('SwapRouteFromCache_V3_GetQuotes_Request', 1, metric_1.MetricLoggerUnit.Count);
                const beforeGetQuotes = Date.now();
                quotePromises.push(this.v3Quoter
                    .getQuotes(v3RoutesFromCache, amounts, percents, quoteCurrency.wrapped, tradeType, routingConfig, undefined, v3GasModel)
                    .then((result) => {
                    metric_1.metric.putMetric(`SwapRouteFromCache_V3_GetQuotes_Load`, Date.now() - beforeGetQuotes, metric_1.MetricLoggerUnit.Milliseconds);
                    return result;
                }));
            }
        }
        if (v2Routes.length > 0) {
            const v2RoutesFromCache = v2Routes.map((cachedRoute) => cachedRoute.route);
            metric_1.metric.putMetric('SwapRouteFromCache_V2_GetQuotes_Request', 1, metric_1.MetricLoggerUnit.Count);
            const beforeGetQuotes = Date.now();
            quotePromises.push(this.v2Quoter
                .refreshRoutesThenGetQuotes(cachedRoutes.currencyIn.wrapped, cachedRoutes.currencyOut.wrapped, v2RoutesFromCache, amounts, percents, quoteCurrency.wrapped, tradeType, routingConfig, gasPriceWei)
                .then((result) => {
                metric_1.metric.putMetric(`SwapRouteFromCache_V2_GetQuotes_Load`, Date.now() - beforeGetQuotes, metric_1.MetricLoggerUnit.Milliseconds);
                return result;
            }));
        }
        if (!fotInDirectSwap) {
            if (mixedRoutes.length > 0) {
                const mixedRoutesFromCache = mixedRoutes.map((cachedRoute) => cachedRoute.route);
                metric_1.metric.putMetric('SwapRouteFromCache_Mixed_GetQuotes_Request', 1, metric_1.MetricLoggerUnit.Count);
                const beforeGetQuotes = Date.now();
                quotePromises.push(this.mixedQuoter
                    .getQuotes(mixedRoutesFromCache, amounts, percents, quoteCurrency.wrapped, tradeType, routingConfig, undefined, mixedRouteGasModel)
                    .then((result) => {
                    metric_1.metric.putMetric(`SwapRouteFromCache_Mixed_GetQuotes_Load`, Date.now() - beforeGetQuotes, metric_1.MetricLoggerUnit.Milliseconds);
                    return result;
                }));
            }
        }
        const getQuotesResults = await Promise.all(quotePromises);
        const allRoutesWithValidQuotes = lodash_1.default.flatMap(getQuotesResults, (quoteResult) => quoteResult.routesWithValidQuotes);
        return (0, best_swap_route_1.getBestSwapRoute)(amount, percents, allRoutesWithValidQuotes, tradeType, this.chainId, routingConfig, this.portionProvider, v2GasModel, v3GasModel, v4GasModel, swapConfig, providerConfig);
    }
    async getSwapRouteFromChain(amount, currencyIn, currencyOut, protocols, quoteCurrency, tradeType, routingConfig, v3GasModel, v4GasModel, mixedRouteGasModel, gasPriceWei, v2GasModel, swapConfig, providerConfig) {
        var _a, _c, _d, _e, _f, _g, _h, _j, _k;
        const tokenPairProperties = await this.tokenPropertiesProvider.getTokensProperties([currencyIn, currencyOut], providerConfig);
        const sellTokenIsFot = (_d = (_c = (_a = tokenPairProperties[(0, util_1.getAddressLowerCase)(currencyIn)]) === null || _a === void 0 ? void 0 : _a.tokenFeeResult) === null || _c === void 0 ? void 0 : _c.sellFeeBps) === null || _d === void 0 ? void 0 : _d.gt(0);
        const buyTokenIsFot = (_g = (_f = (_e = tokenPairProperties[(0, util_1.getAddressLowerCase)(currencyOut)]) === null || _e === void 0 ? void 0 : _e.tokenFeeResult) === null || _f === void 0 ? void 0 : _f.buyFeeBps) === null || _g === void 0 ? void 0 : _g.gt(0);
        const fotInDirectSwap = sellTokenIsFot || buyTokenIsFot;
        // Generate our distribution of amounts, i.e. fractions of the input amount.
        // We will get quotes for fractions of the input amount for different routes, then
        // combine to generate split routes.
        const [percents, amounts] = this.getAmountDistribution(amount, routingConfig);
        const noProtocolsSpecified = protocols.length === 0;
        const v4ProtocolSpecified = protocols.includes(router_sdk_1.Protocol.V4);
        const v3ProtocolSpecified = protocols.includes(router_sdk_1.Protocol.V3);
        const v2ProtocolSpecified = protocols.includes(router_sdk_1.Protocol.V2);
        const v2SupportedInChain = (_h = this.v2Supported) === null || _h === void 0 ? void 0 : _h.includes(this.chainId);
        const v4SupportedInChain = (_j = this.v4Supported) === null || _j === void 0 ? void 0 : _j.includes(this.chainId);
        const shouldQueryMixedProtocol = protocols.includes(router_sdk_1.Protocol.MIXED) ||
            (noProtocolsSpecified && v2SupportedInChain && v4SupportedInChain);
        const mixedProtocolAllowed = ((_k = this.mixedSupported) === null || _k === void 0 ? void 0 : _k.includes(this.chainId)) &&
            tradeType === sdk_core_1.TradeType.EXACT_INPUT;
        const beforeGetCandidates = Date.now();
        let v4CandidatePoolsPromise = Promise.resolve(undefined);
        // we are explicitly requiring people to specify v4 for now
        if (v4SupportedInChain && (v4ProtocolSpecified || noProtocolsSpecified)) {
            // if (v4ProtocolSpecified || noProtocolsSpecified) {
            v4CandidatePoolsPromise = (0, get_candidate_pools_1.getV4CandidatePools)({
                currencyIn: currencyIn,
                currencyOut: currencyOut,
                tokenProvider: this.tokenProvider,
                blockedTokenListProvider: this.blockedTokenListProvider,
                poolProvider: this.v4PoolProvider,
                routeType: tradeType,
                subgraphProvider: this.v4SubgraphProvider,
                routingConfig,
                chainId: this.chainId,
                v4PoolParams: this.v4PoolParams,
            }).then((candidatePools) => {
                metric_1.metric.putMetric('GetV4CandidatePools', Date.now() - beforeGetCandidates, metric_1.MetricLoggerUnit.Milliseconds);
                return candidatePools;
            });
        }
        let v3CandidatePoolsPromise = Promise.resolve(undefined);
        if (!fotInDirectSwap) {
            if (v3ProtocolSpecified || noProtocolsSpecified) {
                const tokenIn = currencyIn.wrapped;
                const tokenOut = currencyOut.wrapped;
                v3CandidatePoolsPromise = (0, get_candidate_pools_1.getV3CandidatePools)({
                    tokenIn,
                    tokenOut,
                    tokenProvider: this.tokenProvider,
                    blockedTokenListProvider: this.blockedTokenListProvider,
                    poolProvider: this.v3PoolProvider,
                    routeType: tradeType,
                    subgraphProvider: this.v3SubgraphProvider,
                    routingConfig,
                    chainId: this.chainId,
                }).then((candidatePools) => {
                    metric_1.metric.putMetric('GetV3CandidatePools', Date.now() - beforeGetCandidates, metric_1.MetricLoggerUnit.Milliseconds);
                    return candidatePools;
                });
            }
        }
        let v2CandidatePoolsPromise = Promise.resolve(undefined);
        if (v2SupportedInChain && (v2ProtocolSpecified || noProtocolsSpecified)) {
            const tokenIn = currencyIn.wrapped;
            const tokenOut = currencyOut.wrapped;
            // Fetch all the pools that we will consider routing via. There are thousands
            // of pools, so we filter them to a set of candidate pools that we expect will
            // result in good prices.
            v2CandidatePoolsPromise = (0, get_candidate_pools_1.getV2CandidatePools)({
                tokenIn,
                tokenOut,
                tokenProvider: this.tokenProvider,
                blockedTokenListProvider: this.blockedTokenListProvider,
                poolProvider: this.v2PoolProvider,
                routeType: tradeType,
                subgraphProvider: this.v2SubgraphProvider,
                routingConfig,
                chainId: this.chainId,
            }).then((candidatePools) => {
                metric_1.metric.putMetric('GetV2CandidatePools', Date.now() - beforeGetCandidates, metric_1.MetricLoggerUnit.Milliseconds);
                return candidatePools;
            });
        }
        const quotePromises = [];
        // for v4, for now we explicitly require people to specify
        if (v4SupportedInChain && v4ProtocolSpecified) {
            log_1.log.info({ protocols, tradeType }, 'Routing across V4');
            metric_1.metric.putMetric('SwapRouteFromChain_V4_GetRoutesThenQuotes_Request', 1, metric_1.MetricLoggerUnit.Count);
            const beforeGetRoutesThenQuotes = Date.now();
            quotePromises.push(v4CandidatePoolsPromise.then((v4CandidatePools) => this.v4Quoter
                .getRoutesThenQuotes(currencyIn, currencyOut, amount, amounts, percents, quoteCurrency, v4CandidatePools, tradeType, routingConfig, v4GasModel)
                .then((result) => {
                metric_1.metric.putMetric(`SwapRouteFromChain_V4_GetRoutesThenQuotes_Load`, Date.now() - beforeGetRoutesThenQuotes, metric_1.MetricLoggerUnit.Milliseconds);
                return result;
            })));
        }
        if (!fotInDirectSwap) {
            // Maybe Quote V3 - if V3 is specified, or no protocol is specified
            if (v3ProtocolSpecified || noProtocolsSpecified) {
                log_1.log.info({ protocols, tradeType }, 'Routing across V3');
                metric_1.metric.putMetric('SwapRouteFromChain_V3_GetRoutesThenQuotes_Request', 1, metric_1.MetricLoggerUnit.Count);
                const beforeGetRoutesThenQuotes = Date.now();
                const tokenIn = currencyIn.wrapped;
                const tokenOut = currencyOut.wrapped;
                quotePromises.push(v3CandidatePoolsPromise.then((v3CandidatePools) => this.v3Quoter
                    .getRoutesThenQuotes(tokenIn, tokenOut, amount, amounts, percents, quoteCurrency.wrapped, v3CandidatePools, tradeType, routingConfig, v3GasModel)
                    .then((result) => {
                    metric_1.metric.putMetric(`SwapRouteFromChain_V3_GetRoutesThenQuotes_Load`, Date.now() - beforeGetRoutesThenQuotes, metric_1.MetricLoggerUnit.Milliseconds);
                    return result;
                })));
            }
        }
        // Maybe Quote V2 - if V2 is specified, or no protocol is specified AND v2 is supported in this chain
        if (v2SupportedInChain && (v2ProtocolSpecified || noProtocolsSpecified)) {
            log_1.log.info({ protocols, tradeType }, 'Routing across V2');
            metric_1.metric.putMetric('SwapRouteFromChain_V2_GetRoutesThenQuotes_Request', 1, metric_1.MetricLoggerUnit.Count);
            const beforeGetRoutesThenQuotes = Date.now();
            const tokenIn = currencyIn.wrapped;
            const tokenOut = currencyOut.wrapped;
            quotePromises.push(v2CandidatePoolsPromise.then((v2CandidatePools) => this.v2Quoter
                .getRoutesThenQuotes(tokenIn, tokenOut, amount, amounts, percents, quoteCurrency.wrapped, v2CandidatePools, tradeType, routingConfig, v2GasModel, gasPriceWei)
                .then((result) => {
                metric_1.metric.putMetric(`SwapRouteFromChain_V2_GetRoutesThenQuotes_Load`, Date.now() - beforeGetRoutesThenQuotes, metric_1.MetricLoggerUnit.Milliseconds);
                return result;
            })));
        }
        if (!fotInDirectSwap) {
            // Maybe Quote mixed routes
            // if MixedProtocol is specified or no protocol is specified and v2 is supported AND tradeType is ExactIn
            // AND is Mainnet or Gorli
            // Also make sure there are at least 2 protocols provided besides MIXED, before entering mixed quoter
            if (shouldQueryMixedProtocol &&
                mixedProtocolAllowed &&
                protocols.filter((protocol) => protocol !== router_sdk_1.Protocol.MIXED).length >= 2) {
                log_1.log.info({ protocols, tradeType }, 'Routing across MixedRoutes');
                metric_1.metric.putMetric('SwapRouteFromChain_Mixed_GetRoutesThenQuotes_Request', 1, metric_1.MetricLoggerUnit.Count);
                const beforeGetRoutesThenQuotes = Date.now();
                quotePromises.push(Promise.all([
                    v4CandidatePoolsPromise,
                    v3CandidatePoolsPromise,
                    v2CandidatePoolsPromise,
                ]).then(async ([v4CandidatePools, v3CandidatePools, v2CandidatePools]) => {
                    const tokenIn = currencyIn.wrapped;
                    const tokenOut = currencyOut.wrapped;
                    const crossLiquidityPools = await (0, get_candidate_pools_1.getMixedCrossLiquidityCandidatePools)({
                        tokenIn,
                        tokenOut,
                        blockNumber: routingConfig.blockNumber,
                        v2SubgraphProvider: this.v2SubgraphProvider,
                        v3SubgraphProvider: this.v3SubgraphProvider,
                        v2Candidates: v2CandidatePools,
                        v3Candidates: v3CandidatePools,
                        v4Candidates: v4CandidatePools,
                    });
                    return this.mixedQuoter
                        .getRoutesThenQuotes(currencyIn, currencyOut, amount, amounts, percents, quoteCurrency.wrapped, [
                        v4CandidatePools,
                        v3CandidatePools,
                        v2CandidatePools,
                        crossLiquidityPools,
                    ], tradeType, routingConfig, mixedRouteGasModel)
                        .then((result) => {
                        metric_1.metric.putMetric(`SwapRouteFromChain_Mixed_GetRoutesThenQuotes_Load`, Date.now() - beforeGetRoutesThenQuotes, metric_1.MetricLoggerUnit.Milliseconds);
                        return result;
                    });
                }));
            }
        }
        const getQuotesResults = await Promise.all(quotePromises);
        const allRoutesWithValidQuotes = [];
        const allCandidatePools = [];
        getQuotesResults.forEach((getQuoteResult) => {
            allRoutesWithValidQuotes.push(...getQuoteResult.routesWithValidQuotes);
            if (getQuoteResult.candidatePools) {
                allCandidatePools.push(getQuoteResult.candidatePools);
            }
        });
        if (allRoutesWithValidQuotes.length === 0) {
            log_1.log.info({ allRoutesWithValidQuotes }, 'Received no valid quotes');
            return null;
        }
        // Given all the quotes for all the amounts for all the routes, find the best combination.
        const bestSwapRoute = await (0, best_swap_route_1.getBestSwapRoute)(amount, percents, allRoutesWithValidQuotes, tradeType, this.chainId, routingConfig, this.portionProvider, v2GasModel, v3GasModel, v4GasModel, swapConfig, providerConfig);
        if (bestSwapRoute) {
            this.emitPoolSelectionMetrics(bestSwapRoute, allCandidatePools, currencyIn, currencyOut);
        }
        return bestSwapRoute;
    }
    tradeTypeStr(tradeType) {
        return tradeType === sdk_core_1.TradeType.EXACT_INPUT ? 'ExactIn' : 'ExactOut';
    }
    tokenPairSymbolTradeTypeChainId(currencyIn, currencyOut, tradeType) {
        return `${currencyIn.symbol}/${currencyOut.symbol}/${this.tradeTypeStr(tradeType)}/${this.chainId}`;
    }
    determineCurrencyInOutFromTradeType(tradeType, amount, quoteCurrency) {
        if (tradeType === sdk_core_1.TradeType.EXACT_INPUT) {
            return {
                currencyIn: amount.currency,
                currencyOut: quoteCurrency,
            };
        }
        else {
            return {
                currencyIn: quoteCurrency,
                currencyOut: amount.currency,
            };
        }
    }
    async getGasPriceWei(latestBlockNumber, requestBlockNumber) {
        // Track how long it takes to resolve this async call.
        const beforeGasTimestamp = Date.now();
        // Get an estimate of the gas price to use when estimating gas cost of different routes.
        const { gasPriceWei } = await this.gasPriceProvider.getGasPrice(latestBlockNumber, requestBlockNumber);
        metric_1.metric.putMetric('GasPriceLoad', Date.now() - beforeGasTimestamp, metric_1.MetricLoggerUnit.Milliseconds);
        return gasPriceWei;
    }
    async getGasModels(gasPriceWei, amountToken, quoteToken, providerConfig) {
        var _a;
        const beforeGasModel = Date.now();
        if (this.chainId === globalChainId_1.ChainId.TRON) {
            log_1.log.info('Using fixed gas cost for Tron chain');
            const tronFixedGasCost = amounts_1.CurrencyAmount.fromRawAmount(quoteToken, '0');
            const tronGasModel = {
                estimateGasCost: () => ({
                    gasEstimate: bignumber_1.BigNumber.from(0),
                    gasCostInToken: tronFixedGasCost,
                    gasCostInUSD: tronFixedGasCost,
                    gasCostInGasToken: undefined,
                }),
                calculateL1GasFees: async () => ({
                    gasUsedL1: bignumber_1.BigNumber.from(0),
                    gasUsedL1OnL2: bignumber_1.BigNumber.from(0),
                    gasCostL1USD: tronFixedGasCost,
                    gasCostL1QuoteToken: tronFixedGasCost,
                }),
                calculateL1GasFee: async () => bignumber_1.BigNumber.from(0),
                estimateGasCostInToken: async () => tronFixedGasCost,
                estimateGasCostInUSD: async () => tronFixedGasCost,
            };
            metric_1.metric.putMetric('GasModelCreation', Date.now() - beforeGasModel, metric_1.MetricLoggerUnit.Milliseconds);
            return {
                v2GasModel: tronGasModel,
                v3GasModel: tronGasModel,
                v4GasModel: tronGasModel,
                mixedRouteGasModel: tronGasModel,
            };
        }
        const usdPoolPromise = (0, gas_factory_helpers_1.getHighestLiquidityV3USDPool)(this.chainId, this.v3PoolProvider, providerConfig);
        const nativeCurrency = util_1.WRAPPED_NATIVE_CURRENCY[this.chainId];
        const nativeAndQuoteTokenV3PoolPromise = !quoteToken.equals(nativeCurrency)
            ? (0, gas_factory_helpers_1.getHighestLiquidityV3NativePool)(quoteToken, this.v3PoolProvider, providerConfig)
            : Promise.resolve(null);
        const nativeAndAmountTokenV3PoolPromise = !amountToken.equals(nativeCurrency)
            ? (0, gas_factory_helpers_1.getHighestLiquidityV3NativePool)(amountToken, this.v3PoolProvider, providerConfig)
            : Promise.resolve(null);
        // If a specific gas token is specified in the provider config
        // fetch the highest liq V3 pool with it and the native currency
        const nativeAndSpecifiedGasTokenV3PoolPromise = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.gasToken) &&
            !(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.gasToken.equals(nativeCurrency))
            ? (0, gas_factory_helpers_1.getHighestLiquidityV3NativePool)(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.gasToken, this.v3PoolProvider, providerConfig)
            : Promise.resolve(null);
        const [usdPool, nativeAndQuoteTokenV3Pool, nativeAndAmountTokenV3Pool, nativeAndSpecifiedGasTokenV3Pool,] = await Promise.all([
            usdPoolPromise,
            nativeAndQuoteTokenV3PoolPromise,
            nativeAndAmountTokenV3PoolPromise,
            nativeAndSpecifiedGasTokenV3PoolPromise,
        ]);
        const pools = {
            usdPool: usdPool,
            nativeAndQuoteTokenV3Pool: nativeAndQuoteTokenV3Pool,
            nativeAndAmountTokenV3Pool: nativeAndAmountTokenV3Pool,
            nativeAndSpecifiedGasTokenV3Pool: nativeAndSpecifiedGasTokenV3Pool,
        };
        const v2GasModelPromise = ((_a = this.v2Supported) === null || _a === void 0 ? void 0 : _a.includes(this.chainId))
            ? this.v2GasModelFactory
                .buildGasModel({
                chainId: this.chainId,
                gasPriceWei,
                poolProvider: this.v2PoolProvider,
                token: quoteToken,
                l2GasDataProvider: this.l2GasDataProvider,
                providerConfig: providerConfig,
            })
                .catch((_) => undefined) // If v2 model throws uncaught exception, we return undefined v2 gas model, so there's a chance v3 route can go through
            : Promise.resolve(undefined);
        const v3GasModelPromise = this.v3GasModelFactory.buildGasModel({
            chainId: this.chainId,
            gasPriceWei,
            pools,
            amountToken,
            quoteToken,
            v2poolProvider: this.v2PoolProvider,
            l2GasDataProvider: this.l2GasDataProvider,
            providerConfig: providerConfig,
        });
        const v4GasModelPromise = this.v4GasModelFactory.buildGasModel({
            chainId: this.chainId,
            gasPriceWei,
            pools,
            amountToken,
            quoteToken,
            v2poolProvider: this.v2PoolProvider,
            l2GasDataProvider: this.l2GasDataProvider,
            providerConfig: providerConfig,
        });
        const mixedRouteGasModelPromise = this.mixedRouteGasModelFactory.buildGasModel({
            chainId: this.chainId,
            gasPriceWei,
            pools,
            amountToken,
            quoteToken,
            v2poolProvider: this.v2PoolProvider,
            providerConfig: providerConfig,
        });
        const [v2GasModel, v3GasModel, V4GasModel, mixedRouteGasModel] = await Promise.all([
            v2GasModelPromise,
            v3GasModelPromise,
            v4GasModelPromise,
            mixedRouteGasModelPromise,
        ]);
        metric_1.metric.putMetric('GasModelCreation', Date.now() - beforeGasModel, metric_1.MetricLoggerUnit.Milliseconds);
        return {
            v2GasModel: v2GasModel,
            v3GasModel: v3GasModel,
            v4GasModel: V4GasModel,
            mixedRouteGasModel: mixedRouteGasModel,
        };
    }
    // Note multiplications here can result in a loss of precision in the amounts (e.g. taking 50% of 101)
    // This is reconcilled at the end of the algorithm by adding any lost precision to one of
    // the splits in the route.
    getAmountDistribution(amount, routingConfig) {
        const { distributionPercent } = routingConfig;
        const percents = [];
        const amounts = [];
        for (let i = 1; i <= 100 / distributionPercent; i++) {
            percents.push(i * distributionPercent);
            amounts.push(amount.multiply(new sdk_core_1.Fraction(i * distributionPercent, 100)));
        }
        return [percents, amounts];
    }
    async buildSwapAndAddMethodParameters(trade, swapAndAddOptions, swapAndAddParameters) {
        const { swapOptions: { recipient, slippageTolerance, deadline, inputTokenPermit }, addLiquidityOptions: addLiquidityConfig, } = swapAndAddOptions;
        const preLiquidityPosition = swapAndAddParameters.preLiquidityPosition;
        const finalBalanceTokenIn = swapAndAddParameters.initialBalanceTokenIn.subtract(trade.inputAmount);
        const finalBalanceTokenOut = swapAndAddParameters.initialBalanceTokenOut.add(trade.outputAmount);
        const approvalTypes = await this.swapRouterProvider.getApprovalType(finalBalanceTokenIn, finalBalanceTokenOut);
        const zeroForOne = finalBalanceTokenIn.currency.wrapped.sortsBefore(finalBalanceTokenOut.currency.wrapped);
        return Object.assign(Object.assign({}, router_sdk_1.SwapRouter.swapAndAddCallParameters(trade, {
            recipient,
            slippageTolerance,
            deadlineOrPreviousBlockhash: deadline,
            inputTokenPermit,
        }, v3_sdk_1.Position.fromAmounts({
            pool: preLiquidityPosition.pool,
            tickLower: preLiquidityPosition.tickLower,
            tickUpper: preLiquidityPosition.tickUpper,
            amount0: zeroForOne
                ? finalBalanceTokenIn.quotient.toString()
                : finalBalanceTokenOut.quotient.toString(),
            amount1: zeroForOne
                ? finalBalanceTokenOut.quotient.toString()
                : finalBalanceTokenIn.quotient.toString(),
            useFullPrecision: false,
        }), addLiquidityConfig, approvalTypes.approvalTokenIn, approvalTypes.approvalTokenOut)), { to: (0, util_1.SWAP_ROUTER_02_ADDRESSES)(this.chainId) });
    }
    emitPoolSelectionMetrics(swapRouteRaw, allPoolsBySelection, currencyIn, currencyOut) {
        const poolAddressesUsed = new Set();
        const { routes: routeAmounts } = swapRouteRaw;
        (0, lodash_1.default)(routeAmounts)
            .flatMap((routeAmount) => {
            const { poolIdentifiers: poolAddresses } = routeAmount;
            return poolAddresses;
        })
            .forEach((address) => {
            poolAddressesUsed.add(address.toLowerCase());
        });
        for (const poolsBySelection of allPoolsBySelection) {
            const { protocol } = poolsBySelection;
            lodash_1.default.forIn(poolsBySelection.selections, (pools, topNSelection) => {
                const topNUsed = lodash_1.default.findLastIndex(pools, (pool) => poolAddressesUsed.has(pool.id.toLowerCase())) + 1;
                metric_1.metric.putMetric(lodash_1.default.capitalize(`${protocol}${topNSelection}`), topNUsed, metric_1.MetricLoggerUnit.Count);
            });
        }
        let hasV4Route = false;
        let hasV3Route = false;
        let hasV2Route = false;
        let hasMixedRoute = false;
        for (const routeAmount of routeAmounts) {
            if (routeAmount.protocol === router_sdk_1.Protocol.V4) {
                hasV4Route = true;
            }
            if (routeAmount.protocol === router_sdk_1.Protocol.V3) {
                hasV3Route = true;
            }
            if (routeAmount.protocol === router_sdk_1.Protocol.V2) {
                hasV2Route = true;
            }
            if (routeAmount.protocol === router_sdk_1.Protocol.MIXED) {
                hasMixedRoute = true;
            }
        }
        if (hasMixedRoute && (hasV4Route || hasV3Route || hasV2Route)) {
            let metricsPrefix = 'Mixed';
            if (hasV4Route) {
                metricsPrefix += 'AndV4';
            }
            if (hasV3Route) {
                metricsPrefix += 'AndV3';
            }
            if (hasV2Route) {
                metricsPrefix += 'AndV2';
            }
            metric_1.metric.putMetric(`${metricsPrefix}SplitRoute`, 1, metric_1.MetricLoggerUnit.Count);
            metric_1.metric.putMetric(`${metricsPrefix}SplitRouteForChain${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
            if (hasV4Route && (currencyIn.isNative || currencyOut.isNative)) {
                // Keep track of this edge case https://linear.app/uniswap/issue/ROUTE-303/tech-debt-split-route-can-have-different-ethweth-input-or-output#comment-bba53758
                metric_1.metric.putMetric(`${metricsPrefix}SplitRouteWithNativeToken`, 1, metric_1.MetricLoggerUnit.Count);
                metric_1.metric.putMetric(`${metricsPrefix}SplitRouteWithNativeTokenForChain${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
            }
        }
        else if (hasV4Route && hasV3Route && hasV2Route) {
            metric_1.metric.putMetric(`V4AndV3AndV2SplitRoute`, 1, metric_1.MetricLoggerUnit.Count);
            metric_1.metric.putMetric(`V4AndV3AndV2SplitRouteForChain${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
            if (currencyIn.isNative || currencyOut.isNative) {
                // Keep track of this edge case https://linear.app/uniswap/issue/ROUTE-303/tech-debt-split-route-can-have-different-ethweth-input-or-output#comment-bba53758
                metric_1.metric.putMetric(`V4AndV3AndV2SplitRouteWithNativeToken`, 1, metric_1.MetricLoggerUnit.Count);
                metric_1.metric.putMetric(`V4AndV3AndV2SplitRouteWithNativeTokenForChain${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
            }
        }
        else if (hasMixedRoute) {
            if (routeAmounts.length > 1) {
                metric_1.metric.putMetric(`MixedSplitRoute`, 1, metric_1.MetricLoggerUnit.Count);
                metric_1.metric.putMetric(`MixedSplitRouteForChain${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
            }
            else {
                metric_1.metric.putMetric(`MixedRoute`, 1, metric_1.MetricLoggerUnit.Count);
                metric_1.metric.putMetric(`MixedRouteForChain${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
            }
        }
        else if (hasV4Route) {
            if (routeAmounts.length > 1) {
                metric_1.metric.putMetric(`V4SplitRoute`, 1, metric_1.MetricLoggerUnit.Count);
                metric_1.metric.putMetric(`V4SplitRouteForChain${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
            }
        }
        else if (hasV3Route) {
            if (routeAmounts.length > 1) {
                metric_1.metric.putMetric(`V3SplitRoute`, 1, metric_1.MetricLoggerUnit.Count);
                metric_1.metric.putMetric(`V3SplitRouteForChain${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
            }
            else {
                metric_1.metric.putMetric(`V3Route`, 1, metric_1.MetricLoggerUnit.Count);
                metric_1.metric.putMetric(`V3RouteForChain${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
            }
        }
        else if (hasV2Route) {
            if (routeAmounts.length > 1) {
                metric_1.metric.putMetric(`V2SplitRoute`, 1, metric_1.MetricLoggerUnit.Count);
                metric_1.metric.putMetric(`V2SplitRouteForChain${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
            }
            else {
                metric_1.metric.putMetric(`V2Route`, 1, metric_1.MetricLoggerUnit.Count);
                metric_1.metric.putMetric(`V2RouteForChain${this.chainId}`, 1, metric_1.MetricLoggerUnit.Count);
            }
        }
    }
    calculateOptimalRatio(position, sqrtRatioX96, zeroForOne) {
        const upperSqrtRatioX96 = v3_sdk_1.TickMath.getSqrtRatioAtTick(position.tickUpper);
        const lowerSqrtRatioX96 = v3_sdk_1.TickMath.getSqrtRatioAtTick(position.tickLower);
        // returns Fraction(0, 1) for any out of range position regardless of zeroForOne. Implication: function
        // cannot be used to determine the trading direction of out of range positions.
        if (jsbi_1.default.greaterThan(sqrtRatioX96, upperSqrtRatioX96) ||
            jsbi_1.default.lessThan(sqrtRatioX96, lowerSqrtRatioX96)) {
            return new sdk_core_1.Fraction(0, 1);
        }
        const precision = jsbi_1.default.BigInt('1' + '0'.repeat(18));
        let optimalRatio = new sdk_core_1.Fraction(v3_sdk_1.SqrtPriceMath.getAmount0Delta(sqrtRatioX96, upperSqrtRatioX96, precision, true), v3_sdk_1.SqrtPriceMath.getAmount1Delta(sqrtRatioX96, lowerSqrtRatioX96, precision, true));
        if (!zeroForOne)
            optimalRatio = optimalRatio.invert();
        return optimalRatio;
    }
    async userHasSufficientBalance(fromAddress, tradeType, amount, quote) {
        try {
            const neededBalance = tradeType === sdk_core_1.TradeType.EXACT_INPUT ? amount : quote;
            let balance;
            if (neededBalance.currency.isNative) {
                balance = await this.provider.getBalance(fromAddress);
            }
            else {
                const tokenContract = Erc20__factory_1.Erc20__factory.connect(neededBalance.currency.address, this.provider);
                balance = await tokenContract.balanceOf(fromAddress);
            }
            return balance.gte(bignumber_1.BigNumber.from(neededBalance.quotient.toString()));
        }
        catch (e) {
            log_1.log.error(e, 'Error while checking user balance');
            return false;
        }
    }
    absoluteValue(fraction) {
        const numeratorAbs = jsbi_1.default.lessThan(fraction.numerator, jsbi_1.default.BigInt(0))
            ? jsbi_1.default.unaryMinus(fraction.numerator)
            : fraction.numerator;
        const denominatorAbs = jsbi_1.default.lessThan(fraction.denominator, jsbi_1.default.BigInt(0))
            ? jsbi_1.default.unaryMinus(fraction.denominator)
            : fraction.denominator;
        return new sdk_core_1.Fraction(numeratorAbs, denominatorAbs);
    }
    getBlockNumberPromise() {
        return (0, async_retry_1.default)(async (_b, attempt) => {
            if (attempt > 1) {
                log_1.log.info(`Get block number attempt ${attempt}`);
            }
            return this.provider.getBlockNumber();
        }, {
            retries: 2,
            minTimeout: 100,
            maxTimeout: 1000,
        });
    }
    // If we are requesting URv1.2, we need to keep entering cache
    // We want to skip cached routes access whenever "intent === INTENT.CACHING" or "hooksOption !== HooksOption.HOOKS_INCLUSIVE"
    // We keep this method as we might want to add more conditions in the future.
    static isAllowedToEnterCachedRoutes(intent, hooksOptions, swapRouter) {
        // intent takes highest precedence, as we need to ensure during caching intent, we do not enter cache no matter what
        if (intent !== undefined && intent === intent_1.INTENT.CACHING) {
            return false;
        }
        // in case we have URv1.2 request during QUOTE intent, we assume cached routes correctly returns mixed route w/o v4, if mixed is best
        // or v2/v3 is the best.
        // implicitly it means hooksOptions no longer matters for URv1.2
        // swapRouter has higher precedence than hooksOptions, because in case of URv1.2, we set hooksOptions = NO_HOOKS as default,
        // but swapRouter does not have any v4 pool for routing, so swapRouter should always use caching during QUOTE intent.
        if (swapRouter) {
            return true;
        }
        // in case we have URv2.0, and we are in QUOTE intent, we only want to enter cache when hooksOptions is default, HOOKS_INCLUSIVE
        if (hooksOptions !== undefined &&
            hooksOptions !== util_1.HooksOptions.HOOKS_INCLUSIVE) {
            return false;
        }
        return true;
    }
}
exports.AlphaRouter = AlphaRouter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxwaGEtcm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3JvdXRlcnMvYWxwaGEtcm91dGVyL2FscGhhLXJvdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx3REFBcUQ7QUFDckQsd0RBQXlFO0FBQ3pFLHFGQUE2RDtBQUM3RCxvREFNNkI7QUFDN0IsZ0RBSzJCO0FBRTNCLHdFQUF1RTtBQUN2RSw0Q0FBaUQ7QUFDakQsNENBTXlCO0FBQ3pCLDRDQUFpRDtBQUNqRCw4REFBZ0M7QUFDaEMsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2Qiw0REFBbUM7QUFFbkMsdURBQThDO0FBQzlDLCtDQW9DeUI7QUFDekIsNkZBR3FEO0FBS3JELHVFQUcwQztBQUUxQyx5RUFBMkU7QUFDM0UsbUVBQStFO0FBQy9FLHVGQUdrRDtBQUNsRCxvRUFHMEM7QUFDMUMsNEVBSThDO0FBQzlDLG9FQUcwQztBQUUxQyxvRkFBaUY7QUFDakYsb0VBRzBDO0FBQzFDLCtFQUE0RTtBQUM1RSxxQ0FVb0I7QUFDcEIsZ0RBQW9EO0FBQ3BELDhDQUkyQjtBQUMzQix3RUFBd0U7QUFDeEUsd0VBR3dDO0FBQ3hDLDhDQUEyQztBQUMzQyx3Q0FBcUM7QUFDckMsa0VBR3FDO0FBQ3JDLDhDQUE2RDtBQUM3RCx3RkFXZ0Q7QUFDaEQsb0VBQWlFO0FBQ2pFLHNFQUFtRTtBQUNuRSxzQ0FvQm1CO0FBRW5CLHFDQUdrQjtBQVFsQixpRUFBOEU7QUFDOUUscUZBQStFO0FBQy9FLHlFQVV5QztBQUN6QyxzREFBeUQ7QUFTekQsNkdBQTZHO0FBQzdHLG1GQUFvRjtBQUNwRixtRkFBb0Y7QUFDcEYsbUZBQW9GO0FBQ3BGLHVDQUE2RTtBQUM3RSxtREFBK0M7QUE0Si9DLE1BQWEsbUJBQXVCLFNBQVEsR0FBYztJQUMvQyxHQUFHLENBQUMsR0FBVyxFQUFFLEtBQVE7UUFDaEMsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FB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