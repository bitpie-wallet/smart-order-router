import { BigNumber } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import DEFAULT_TOKEN_LIST from '@uniswap/default-token-list';
import { Protocol, SwapRouter, ZERO, } from '@uniswap/router-sdk';
import { Fraction, TradeType, } from '@uniswap/sdk-core';
import { UniversalRouterVersion } from '@uniswap/universal-router-sdk';
import { Pair as V2Pool } from '@uniswap/v2-sdk';
import { Pool, Position, SqrtPriceMath, TickMath, Pool as V3Pool, } from '@uniswap/v3-sdk';
import { Pool as V4Pool } from '@uniswap/v4-sdk';
import retry from 'async-retry';
import JSBI from 'jsbi';
import _ from 'lodash';
import NodeCache from 'node-cache';
import { ChainId } from '../../globalChainId';
import { CachedRoutes, CacheMode, CachingGasStationProvider, CachingTokenProviderWithFallback, CachingV2PoolProvider, CachingV2SubgraphProvider, CachingV3PoolProvider, CachingV3SubgraphProvider, CachingV4SubgraphProvider, EIP1559GasPriceProvider, ETHGasStationInfoProvider, LegacyGasPriceProvider, NodeJSCache, OnChainGasPriceProvider, OnChainQuoteProvider, SimulationStatus, StaticV2SubgraphProvider, StaticV3SubgraphProvider, StaticV4SubgraphProvider, SwapRouterProvider, TokenPropertiesProvider, UniswapMulticallProvider, URISubgraphProvider, V2QuoteProvider, V2SubgraphProviderWithFallBacks, V3SubgraphProviderWithFallBacks, V4SubgraphProviderWithFallBacks, } from '../../providers';
import { CachingTokenListProvider, } from '../../providers/caching-token-list-provider';
import { PortionProvider, } from '../../providers/portion-provider';
import { OnChainTokenFeeFetcher } from '../../providers/token-fee-fetcher';
import { TokenProvider } from '../../providers/token-provider';
import { TokenValidatorProvider, } from '../../providers/token-validator-provider';
import { V2PoolProvider, } from '../../providers/v2/pool-provider';
import { ArbitrumGasDataProvider, } from '../../providers/v3/gas-data-provider';
import { V3PoolProvider, } from '../../providers/v3/pool-provider';
import { CachingV4PoolProvider } from '../../providers/v4/caching-pool-provider';
import { V4PoolProvider, } from '../../providers/v4/pool-provider';
import { Erc20__factory } from '../../types/other/factories/Erc20__factory';
import { getAddress, getAddressLowerCase, getApplicableV4FeesTickspacingsHooks, HooksOptions, MIXED_SUPPORTED, shouldWipeoutCachedRoutes, SWAP_ROUTER_02_ADDRESSES, V4_SUPPORTED, WRAPPED_NATIVE_CURRENCY, } from '../../util';
import { CurrencyAmount } from '../../util/amounts';
import { ID_TO_CHAIN_ID, ID_TO_NETWORK_NAME, V2_SUPPORTED, } from '../../util/chains';
import { DEFAULT_BLOCKS_TO_LIVE } from '../../util/defaultBlocksToLive';
import { getHighestLiquidityV3NativePool, getHighestLiquidityV3USDPool, } from '../../util/gas-factory-helpers';
import { INTENT } from '../../util/intent';
import { log } from '../../util/log';
import { buildSwapMethodParameters, buildTrade, } from '../../util/methodParameters';
import { metric, MetricLoggerUnit } from '../../util/metric';
import { BATCH_PARAMS, BLOCK_NUMBER_CONFIGS, DEFAULT_BATCH_PARAMS, DEFAULT_BLOCK_NUMBER_CONFIGS, DEFAULT_GAS_ERROR_FAILURE_OVERRIDES, DEFAULT_RETRY_OPTIONS, DEFAULT_SUCCESS_RATE_FAILURE_OVERRIDES, GAS_ERROR_FAILURE_OVERRIDES, RETRY_OPTIONS, SUCCESS_RATE_FAILURE_OVERRIDES, } from '../../util/onchainQuoteProviderConfigs';
import { serializeRouteIds } from '../../util/serializeRouteIds';
import { UNSUPPORTED_TOKENS } from '../../util/unsupported-tokens';
import { cloneMixedRouteWithNewPools, cloneV2RouteWithNewPools, cloneV3RouteWithNewPools, cloneV4RouteWithNewPools, SwapToRatioStatus, SwapType, } from '../router';
import { DEFAULT_ROUTING_CONFIG_BY_CHAIN, ETH_GAS_STATION_API_URL, } from './config';
import { getBestSwapRoute } from './functions/best-swap-route';
import { calculateRatioAmountIn } from './functions/calculate-ratio-amount-in';
import { getMixedCrossLiquidityCandidatePools, getV2CandidatePools, getV3CandidatePools, getV4CandidatePools, } from './functions/get-candidate-pools';
import { NATIVE_OVERHEAD } from './gas-models/gas-costs';
import { MixedRouteHeuristicGasModelFactory } from './gas-models/mixedRoute/mixed-route-heuristic-gas-model';
import { V2HeuristicGasModelFactory } from './gas-models/v2/v2-heuristic-gas-model';
import { V3HeuristicGasModelFactory } from './gas-models/v3/v3-heuristic-gas-model';
import { V4HeuristicGasModelFactory } from './gas-models/v4/v4-heuristic-gas-model';
import { MixedQuoter, V2Quoter, V3Quoter } from './quoters';
import { V4Quoter } from './quoters/v4-quoter';
export class MapWithLowerCaseKey extends Map {
    set(key, value) {
        return super.set(key.toLowerCase(), value);
    }
}
export class LowerCaseStringArray extends Array {
    constructor(...items) {
        // Convert all items to lowercase before calling the parent constructor
        super(...items.map((item) => item.toLowerCase()));
    }
}
export class AlphaRouter {
    constructor({ chainId, provider, multicall2Provider, v4SubgraphProvider, v4PoolProvider, v3PoolProvider, onChainQuoteProvider, v2PoolProvider, v2QuoteProvider, v2SubgraphProvider, tokenProvider, blockedTokenListProvider, v3SubgraphProvider, gasPriceProvider, v4GasModelFactory, v3GasModelFactory, v2GasModelFactory, mixedRouteGasModelFactory, swapRouterProvider, tokenValidatorProvider, arbitrumGasDataProvider, simulator, routeCachingProvider, tokenPropertiesProvider, portionProvider, v2Supported, v4Supported, mixedSupported, v4PoolParams, cachedRoutesCacheInvalidationFixRolloutPercentage, deleteCacheEnabledChains, }) {
        this.chainId = chainId;
        this.provider = provider;
        this.multicall2Provider =
            multicall2Provider !== null && multicall2Provider !== void 0 ? multicall2Provider : new UniswapMulticallProvider(chainId, provider, 375000);
        this.v4PoolProvider =
            v4PoolProvider !== null && v4PoolProvider !== void 0 ? v4PoolProvider : new CachingV4PoolProvider(this.chainId, new V4PoolProvider(ID_TO_CHAIN_ID(chainId), this.multicall2Provider), new NodeJSCache(new NodeCache({ stdTTL: 360, useClones: false })));
        this.v3PoolProvider =
            v3PoolProvider !== null && v3PoolProvider !== void 0 ? v3PoolProvider : new CachingV3PoolProvider(this.chainId, new V3PoolProvider(ID_TO_CHAIN_ID(chainId), this.multicall2Provider), new NodeJSCache(new NodeCache({ stdTTL: 360, useClones: false })));
        this.simulator = simulator;
        this.routeCachingProvider = routeCachingProvider;
        if (onChainQuoteProvider) {
            this.onChainQuoteProvider = onChainQuoteProvider;
        }
        else {
            switch (chainId) {
                case ChainId.OPTIMISM:
                case ChainId.OPTIMISM_GOERLI:
                case ChainId.OPTIMISM_SEPOLIA:
                    this.onChainQuoteProvider = new OnChainQuoteProvider(chainId, provider, this.multicall2Provider, {
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
                case ChainId.BASE:
                case ChainId.BLAST:
                case ChainId.ZORA:
                case ChainId.WORLDCHAIN:
                case ChainId.UNICHAIN_SEPOLIA:
                case ChainId.MONAD_TESTNET:
                case ChainId.BASE_SEPOLIA:
                case ChainId.UNICHAIN:
                case ChainId.BASE_GOERLI:
                case ChainId.SONEIUM:
                    this.onChainQuoteProvider = new OnChainQuoteProvider(chainId, provider, this.multicall2Provider, {
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
                case ChainId.ZKSYNC:
                    this.onChainQuoteProvider = new OnChainQuoteProvider(chainId, provider, this.multicall2Provider, {
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
                case ChainId.ARBITRUM_ONE:
                case ChainId.ARBITRUM_GOERLI:
                case ChainId.ARBITRUM_SEPOLIA:
                    this.onChainQuoteProvider = new OnChainQuoteProvider(chainId, provider, this.multicall2Provider, {
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
                case ChainId.CELO:
                case ChainId.CELO_ALFAJORES:
                    this.onChainQuoteProvider = new OnChainQuoteProvider(chainId, provider, this.multicall2Provider, {
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
                case ChainId.POLYGON_MUMBAI:
                case ChainId.SEPOLIA:
                case ChainId.MAINNET:
                case ChainId.POLYGON:
                    this.onChainQuoteProvider = new OnChainQuoteProvider(chainId, provider, this.multicall2Provider, RETRY_OPTIONS[chainId], (_) => BATCH_PARAMS[chainId], (_) => GAS_ERROR_FAILURE_OVERRIDES[chainId], (_) => SUCCESS_RATE_FAILURE_OVERRIDES[chainId], (_) => BLOCK_NUMBER_CONFIGS[chainId]);
                    break;
                default:
                    this.onChainQuoteProvider = new OnChainQuoteProvider(chainId, provider, this.multicall2Provider, DEFAULT_RETRY_OPTIONS, (_) => DEFAULT_BATCH_PARAMS, (_) => DEFAULT_GAS_ERROR_FAILURE_OVERRIDES, (_) => DEFAULT_SUCCESS_RATE_FAILURE_OVERRIDES, (_) => DEFAULT_BLOCK_NUMBER_CONFIGS);
                    break;
            }
        }
        if (tokenValidatorProvider) {
            this.tokenValidatorProvider = tokenValidatorProvider;
        }
        else if (this.chainId === ChainId.MAINNET) {
            this.tokenValidatorProvider = new TokenValidatorProvider(this.chainId, this.multicall2Provider, new NodeJSCache(new NodeCache({ stdTTL: 30000, useClones: false })));
        }
        if (tokenPropertiesProvider) {
            this.tokenPropertiesProvider = tokenPropertiesProvider;
        }
        else {
            this.tokenPropertiesProvider = new TokenPropertiesProvider(this.chainId, new NodeJSCache(new NodeCache({ stdTTL: 86400, useClones: false })), new OnChainTokenFeeFetcher(this.chainId, provider));
        }
        this.v2PoolProvider =
            v2PoolProvider !== null && v2PoolProvider !== void 0 ? v2PoolProvider : new CachingV2PoolProvider(chainId, new V2PoolProvider(chainId, this.multicall2Provider, this.tokenPropertiesProvider), new NodeJSCache(new NodeCache({ stdTTL: 60, useClones: false })));
        this.v2QuoteProvider = v2QuoteProvider !== null && v2QuoteProvider !== void 0 ? v2QuoteProvider : new V2QuoteProvider();
        this.blockedTokenListProvider =
            blockedTokenListProvider !== null && blockedTokenListProvider !== void 0 ? blockedTokenListProvider : new CachingTokenListProvider(chainId, UNSUPPORTED_TOKENS, new NodeJSCache(new NodeCache({ stdTTL: 3600, useClones: false })));
        this.tokenProvider =
            tokenProvider !== null && tokenProvider !== void 0 ? tokenProvider : new CachingTokenProviderWithFallback(chainId, new NodeJSCache(new NodeCache({ stdTTL: 3600, useClones: false })), new CachingTokenListProvider(chainId, DEFAULT_TOKEN_LIST, new NodeJSCache(new NodeCache({ stdTTL: 3600, useClones: false }))), new TokenProvider(chainId, this.multicall2Provider));
        this.portionProvider = portionProvider !== null && portionProvider !== void 0 ? portionProvider : new PortionProvider();
        const chainName = ID_TO_NETWORK_NAME(chainId);
        // ipfs urls in the following format: `https://cloudflare-ipfs.com/ipns/api.uniswap.org/v1/pools/${protocol}/${chainName}.json`;
        if (v2SubgraphProvider) {
            this.v2SubgraphProvider = v2SubgraphProvider;
        }
        else {
            this.v2SubgraphProvider = new V2SubgraphProviderWithFallBacks([
                new CachingV2SubgraphProvider(chainId, new URISubgraphProvider(chainId, `https://cloudflare-ipfs.com/ipns/api.uniswap.org/v1/pools/v2/${chainName}.json`, undefined, 0), new NodeJSCache(new NodeCache({ stdTTL: 300, useClones: false }))),
                new StaticV2SubgraphProvider(chainId),
            ]);
        }
        if (v3SubgraphProvider) {
            this.v3SubgraphProvider = v3SubgraphProvider;
        }
        else {
            this.v3SubgraphProvider = new V3SubgraphProviderWithFallBacks([
                new CachingV3SubgraphProvider(chainId, new URISubgraphProvider(chainId, `https://cloudflare-ipfs.com/ipns/api.uniswap.org/v1/pools/v3/${chainName}.json`, undefined, 0), new NodeJSCache(new NodeCache({ stdTTL: 300, useClones: false }))),
                new StaticV3SubgraphProvider(chainId, this.v3PoolProvider),
            ]);
        }
        this.v4PoolParams =
            v4PoolParams !== null && v4PoolParams !== void 0 ? v4PoolParams : getApplicableV4FeesTickspacingsHooks(chainId);
        if (v4SubgraphProvider) {
            this.v4SubgraphProvider = v4SubgraphProvider;
        }
        else {
            this.v4SubgraphProvider = new V4SubgraphProviderWithFallBacks([
                new CachingV4SubgraphProvider(chainId, new URISubgraphProvider(chainId, `https://cloudflare-ipfs.com/ipns/api.uniswap.org/v1/pools/v4/${chainName}.json`, undefined, 0), new NodeJSCache(new NodeCache({ stdTTL: 300, useClones: false }))),
                new StaticV4SubgraphProvider(chainId, this.v4PoolProvider, this.v4PoolParams),
            ]);
        }
        let gasPriceProviderInstance;
        if (JsonRpcProvider.isProvider(this.provider)) {
            gasPriceProviderInstance = new OnChainGasPriceProvider(chainId, new EIP1559GasPriceProvider(this.provider), new LegacyGasPriceProvider(this.provider));
        }
        else {
            gasPriceProviderInstance = new ETHGasStationInfoProvider(ETH_GAS_STATION_API_URL);
        }
        this.gasPriceProvider =
            gasPriceProvider !== null && gasPriceProvider !== void 0 ? gasPriceProvider : new CachingGasStationProvider(chainId, gasPriceProviderInstance, new NodeJSCache(new NodeCache({ stdTTL: 7, useClones: false })));
        this.v4GasModelFactory =
            v4GasModelFactory !== null && v4GasModelFactory !== void 0 ? v4GasModelFactory : new V4HeuristicGasModelFactory(this.provider);
        this.v3GasModelFactory =
            v3GasModelFactory !== null && v3GasModelFactory !== void 0 ? v3GasModelFactory : new V3HeuristicGasModelFactory(this.provider);
        this.v2GasModelFactory =
            v2GasModelFactory !== null && v2GasModelFactory !== void 0 ? v2GasModelFactory : new V2HeuristicGasModelFactory(this.provider);
        this.mixedRouteGasModelFactory =
            mixedRouteGasModelFactory !== null && mixedRouteGasModelFactory !== void 0 ? mixedRouteGasModelFactory : new MixedRouteHeuristicGasModelFactory();
        this.swapRouterProvider =
            swapRouterProvider !== null && swapRouterProvider !== void 0 ? swapRouterProvider : new SwapRouterProvider(this.multicall2Provider, this.chainId);
        if (chainId === ChainId.ARBITRUM_ONE ||
            chainId === ChainId.ARBITRUM_GOERLI) {
            this.l2GasDataProvider =
                arbitrumGasDataProvider !== null && arbitrumGasDataProvider !== void 0 ? arbitrumGasDataProvider : new ArbitrumGasDataProvider(chainId, this.provider);
        }
        // Initialize the Quoters.
        // Quoters are an abstraction encapsulating the business logic of fetching routes and quotes.
        this.v2Quoter = new V2Quoter(this.v2SubgraphProvider, this.v2PoolProvider, this.v2QuoteProvider, this.v2GasModelFactory, this.tokenProvider, this.chainId, this.blockedTokenListProvider, this.tokenValidatorProvider, this.l2GasDataProvider);
        this.v3Quoter = new V3Quoter(this.v3SubgraphProvider, this.v3PoolProvider, this.onChainQuoteProvider, this.tokenProvider, this.chainId, this.blockedTokenListProvider, this.tokenValidatorProvider);
        this.v4Quoter = new V4Quoter(this.v4SubgraphProvider, this.v4PoolProvider, this.onChainQuoteProvider, this.tokenProvider, this.chainId, this.blockedTokenListProvider, this.tokenValidatorProvider);
        this.mixedQuoter = new MixedQuoter(this.v4SubgraphProvider, this.v4PoolProvider, this.v3SubgraphProvider, this.v3PoolProvider, this.v2SubgraphProvider, this.v2PoolProvider, this.onChainQuoteProvider, this.tokenProvider, this.chainId, this.blockedTokenListProvider, this.tokenValidatorProvider);
        this.v2Supported = v2Supported !== null && v2Supported !== void 0 ? v2Supported : V2_SUPPORTED;
        this.v4Supported = v4Supported !== null && v4Supported !== void 0 ? v4Supported : V4_SUPPORTED;
        this.mixedSupported = mixedSupported !== null && mixedSupported !== void 0 ? mixedSupported : MIXED_SUPPORTED;
        this.cachedRoutesCacheInvalidationFixRolloutPercentage =
            cachedRoutesCacheInvalidationFixRolloutPercentage;
        // https://linear.app/uniswap/issue/ROUTE-467/tenderly-simulation-during-caching-lambda
        this.deleteCacheEnabledChains = deleteCacheEnabledChains;
    }
    async routeToRatio(token0Balance, token1Balance, position, swapAndAddConfig, swapAndAddOptions, routingConfig = DEFAULT_ROUTING_CONFIG_BY_CHAIN(this.chainId)) {
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
            zeroForOne = new Fraction(token0Balance.quotient, token1Balance.quotient).greaterThan(preSwapOptimalRatio);
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
                log.info('max iterations exceeded');
                return {
                    status: SwapToRatioStatus.NO_ROUTE_FOUND,
                    error: 'max iterations exceeded',
                };
            }
            const amountToSwap = calculateRatioAmountIn(optimalRatio, exchangeRate, inputBalance, outputBalance);
            if (amountToSwap.equalTo(0)) {
                log.info(`no swap needed: amountToSwap = 0`);
                return {
                    status: SwapToRatioStatus.NO_SWAP_NEEDED,
                };
            }
            swap = await this.route(amountToSwap, outputBalance.currency, TradeType.EXACT_INPUT, undefined, {
                ...DEFAULT_ROUTING_CONFIG_BY_CHAIN(this.chainId),
                ...routingConfig,
                /// @dev We do not want to query for mixedRoutes for routeToRatio as they are not supported
                /// [Protocol.V3, Protocol.V2] will make sure we only query for V3 and V2
                protocols: [Protocol.V3, Protocol.V2],
            });
            if (!swap) {
                log.info('no route found from this.route()');
                return {
                    status: SwapToRatioStatus.NO_ROUTE_FOUND,
                    error: 'no route found',
                };
            }
            const inputBalanceUpdated = inputBalance.subtract(swap.trade.inputAmount);
            const outputBalanceUpdated = outputBalance.add(swap.trade.outputAmount);
            const newRatio = inputBalanceUpdated.divide(outputBalanceUpdated);
            let targetPoolPriceUpdate;
            swap.route.forEach((route) => {
                if (route.protocol === Protocol.V3) {
                    const v3Route = route;
                    v3Route.route.pools.forEach((pool, i) => {
                        if (pool.token0.equals(position.pool.token0) &&
                            pool.token1.equals(position.pool.token1) &&
                            pool.fee === position.pool.fee) {
                            targetPoolPriceUpdate = JSBI.BigInt(v3Route.sqrtPriceX96AfterList[i].toString());
                            optimalRatio = this.calculateOptimalRatio(position, JSBI.BigInt(targetPoolPriceUpdate.toString()), zeroForOne);
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
                postSwapTargetPool = new Pool(position.pool.token0, position.pool.token1, position.pool.fee, targetPoolPriceUpdate, position.pool.liquidity, TickMath.getTickAtSqrtRatio(targetPoolPriceUpdate), position.pool.tickDataProvider);
            }
            exchangeRate = swap.trade.outputAmount.divide(swap.trade.inputAmount);
            log.info({
                exchangeRate: exchangeRate.asFraction.toFixed(18),
                optimalRatio: optimalRatio.asFraction.toFixed(18),
                newRatio: newRatio.asFraction.toFixed(18),
                inputBalanceUpdated: inputBalanceUpdated.asFraction.toFixed(18),
                outputBalanceUpdated: outputBalanceUpdated.asFraction.toFixed(18),
                ratioErrorTolerance: swapAndAddConfig.ratioErrorTolerance.toFixed(18),
                iterationN: n.toString(),
            }, 'QuoteToRatio Iteration Parameters');
            if (exchangeRate.equalTo(0)) {
                log.info('exchangeRate to 0');
                return {
                    status: SwapToRatioStatus.NO_ROUTE_FOUND,
                    error: 'insufficient liquidity to swap to optimal ratio',
                };
            }
        }
        if (!swap) {
            return {
                status: SwapToRatioStatus.NO_ROUTE_FOUND,
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
            status: SwapToRatioStatus.SUCCESS,
            result: { ...swap, methodParameters, optimalRatio, postSwapTargetPool },
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
        const feeTakenOnTransfer = (_c = (_a = tokenOutProperties[getAddressLowerCase(currencyOut)]) === null || _a === void 0 ? void 0 : _a.tokenFeeResult) === null || _c === void 0 ? void 0 : _c.feeTakenOnTransfer;
        const externalTransferFailed = (_e = (_d = tokenOutProperties[getAddressLowerCase(currencyOut)]) === null || _d === void 0 ? void 0 : _d.tokenFeeResult) === null || _e === void 0 ? void 0 : _e.externalTransferFailed;
        // We want to log the fee on transfer output tokens that we are taking fee or not
        // Ideally the trade size (normalized in USD) would be ideal to log here, but we don't have spot price of output tokens here.
        // We have to make sure token out is FOT with either buy/sell fee bps > 0
        if (((_h = (_g = (_f = tokenOutProperties[getAddressLowerCase(currencyOut)]) === null || _f === void 0 ? void 0 : _f.tokenFeeResult) === null || _g === void 0 ? void 0 : _g.buyFeeBps) === null || _h === void 0 ? void 0 : _h.gt(0)) ||
            ((_l = (_k = (_j = tokenOutProperties[getAddressLowerCase(currencyOut)]) === null || _j === void 0 ? void 0 : _j.tokenFeeResult) === null || _k === void 0 ? void 0 : _k.sellFeeBps) === null || _l === void 0 ? void 0 : _l.gt(0))) {
            if (feeTakenOnTransfer || externalTransferFailed) {
                // also to be extra safe, in case of FOT with feeTakenOnTransfer or externalTransferFailed,
                // we nullify the fee and flat fee to avoid any potential issues.
                // although neither web nor wallet should use the calldata returned from routing/SOR
                if ((swapConfig === null || swapConfig === void 0 ? void 0 : swapConfig.type) === SwapType.UNIVERSAL_ROUTER) {
                    swapConfig.fee = undefined;
                    swapConfig.flatFee = undefined;
                }
                metric.putMetric('TokenOutFeeOnTransferNotTakingFee', 1, MetricLoggerUnit.Count);
            }
            else {
                metric.putMetric('TokenOutFeeOnTransferTakingFee', 1, MetricLoggerUnit.Count);
            }
        }
        if (tradeType === TradeType.EXACT_OUTPUT) {
            const portionAmount = this.portionProvider.getPortionAmount(amount, tradeType, feeTakenOnTransfer, externalTransferFailed, swapConfig);
            if (portionAmount && portionAmount.greaterThan(ZERO)) {
                // In case of exact out swap, before we route, we need to make sure that the
                // token out amount accounts for flat portion, and token in amount after the best swap route contains the token in equivalent of portion.
                // In other words, in case a pool's LP fee bps is lower than the portion bps (0.01%/0.05% for v3), a pool can go insolvency.
                // This is because instead of the swapper being responsible for the portion,
                // the pool instead gets responsible for the portion.
                // The addition below avoids that situation.
                amount = amount.add(portionAmount);
            }
        }
        metric.setProperty('chainId', this.chainId);
        metric.setProperty('pair', `${currencyIn.symbol}/${currencyOut.symbol}`);
        metric.setProperty('tokenIn', getAddress(currencyIn));
        metric.setProperty('tokenOut', getAddress(currencyOut));
        metric.setProperty('tradeType', tradeType === TradeType.EXACT_INPUT ? 'ExactIn' : 'ExactOut');
        metric.putMetric(`QuoteRequestedForChain${this.chainId}`, 1, MetricLoggerUnit.Count);
        // Get a block number to specify in all our calls. Ensures data we fetch from chain is
        // from the same block.
        const blockNumber = (_m = partialRoutingConfig.blockNumber) !== null && _m !== void 0 ? _m : this.getBlockNumberPromise();
        const routingConfig = _.merge({
            // These settings could be changed by the partialRoutingConfig
            useCachedRoutes: true,
            writeToCachedRoutes: true,
            optimisticCachedRoutes: false,
        }, DEFAULT_ROUTING_CONFIG_BY_CHAIN(this.chainId), partialRoutingConfig, { blockNumber });
        if (routingConfig.debugRouting) {
            log.warn(`Finalized routing config is ${JSON.stringify(routingConfig)}`);
        }
        const gasPriceWei = await this.getGasPriceWei(await blockNumber, await partialRoutingConfig.blockNumber);
        // const gasTokenAccessor = await this.tokenProvider.getTokens([routingConfig.gasToken!]);
        const gasToken = routingConfig.gasToken
            ? (await this.tokenProvider.getTokens([routingConfig.gasToken])).getTokenByAddress(routingConfig.gasToken)
            : undefined;
        const providerConfig = {
            ...routingConfig,
            blockNumber,
            additionalGasOverhead: NATIVE_OVERHEAD(this.chainId, amount.currency, quoteCurrency),
            gasToken,
            externalTransferFailed,
            feeTakenOnTransfer,
        };
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
        const availableProtocolsSet = new Set(Object.values(Protocol));
        const requestedProtocolsSet = new Set(protocols);
        const swapRouter = !swapConfig ||
            swapConfig.type === SwapType.SWAP_ROUTER_02 ||
            (swapConfig.type === SwapType.UNIVERSAL_ROUTER &&
                swapConfig.version === UniversalRouterVersion.V1_2);
        if (swapRouter) {
            availableProtocolsSet.delete(Protocol.V4);
            if (requestedProtocolsSet.has(Protocol.V4)) {
                requestedProtocolsSet.delete(Protocol.V4);
            }
        }
        const enabledAndRequestedProtocolsMatch = availableProtocolsSet.size === requestedProtocolsSet.size &&
            [...availableProtocolsSet].every((protocol) => requestedProtocolsSet.has(protocol));
        // If the requested protocols do not match the enabled protocols, we need to set the hooks options to NO_HOOKS.
        if (!requestedProtocolsSet.has(Protocol.V4)) {
            routingConfig.hooksOptions = HooksOptions.NO_HOOKS;
        }
        // If hooksOptions not specified and it's not a swapRouter (i.e. Universal Router it is),
        // we should also set it to HOOKS_INCLUSIVE, as this is default behavior even without hooksOptions.
        if (!routingConfig.hooksOptions) {
            routingConfig.hooksOptions = HooksOptions.HOOKS_INCLUSIVE;
        }
        log.debug('UniversalRouterVersion_CacheGate_Check', {
            availableProtocolsSet: Array.from(availableProtocolsSet),
            requestedProtocolsSet: Array.from(requestedProtocolsSet),
            enabledAndRequestedProtocolsMatch,
            swapConfigType: swapConfig === null || swapConfig === void 0 ? void 0 : swapConfig.type,
            swapConfigUniversalRouterVersion: (swapConfig === null || swapConfig === void 0 ? void 0 : swapConfig.type) === SwapType.UNIVERSAL_ROUTER
                ? swapConfig === null || swapConfig === void 0 ? void 0 : swapConfig.version
                : 'N/A',
        });
        if (routingConfig.useCachedRoutes &&
            cacheMode !== CacheMode.Darkmode &&
            AlphaRouter.isAllowedToEnterCachedRoutes(routingConfig.intent, routingConfig.hooksOptions, swapRouter)) {
            if (enabledAndRequestedProtocolsMatch) {
                if (protocols.includes(Protocol.V4) &&
                    (currencyIn.isNative || currencyOut.isNative)) {
                    const [wrappedNativeCachedRoutes, nativeCachedRoutes] = await Promise.all([
                        (_q = this.routeCachingProvider) === null || _q === void 0 ? void 0 : _q.getCachedRoute(this.chainId, CurrencyAmount.fromRawAmount(amount.currency.wrapped, amount.quotient), quoteCurrency.wrapped, tradeType, protocols, await blockNumber, routingConfig.optimisticCachedRoutes, routingConfig, swapConfig),
                        (_r = this.routeCachingProvider) === null || _r === void 0 ? void 0 : _r.getCachedRoute(this.chainId, amount, quoteCurrency, tradeType, [Protocol.V4], await blockNumber, routingConfig.optimisticCachedRoutes, routingConfig, swapConfig),
                    ]);
                    if ((wrappedNativeCachedRoutes &&
                        (wrappedNativeCachedRoutes === null || wrappedNativeCachedRoutes === void 0 ? void 0 : wrappedNativeCachedRoutes.routes.length) > 0) ||
                        (nativeCachedRoutes && (nativeCachedRoutes === null || nativeCachedRoutes === void 0 ? void 0 : nativeCachedRoutes.routes.length) > 0)) {
                        cachedRoutes = new CachedRoutes({
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
                            blocksToLive: (_x = (_w = wrappedNativeCachedRoutes === null || wrappedNativeCachedRoutes === void 0 ? void 0 : wrappedNativeCachedRoutes.blocksToLive) !== null && _w !== void 0 ? _w : nativeCachedRoutes === null || nativeCachedRoutes === void 0 ? void 0 : nativeCachedRoutes.blocksToLive) !== null && _x !== void 0 ? _x : DEFAULT_BLOCKS_TO_LIVE[this.chainId],
                        });
                    }
                }
                else {
                    cachedRoutes = await ((_y = this.routeCachingProvider) === null || _y === void 0 ? void 0 : _y.getCachedRoute(this.chainId, amount, quoteCurrency, tradeType, protocols, await blockNumber, routingConfig.optimisticCachedRoutes, routingConfig, swapConfig));
                }
            }
        }
        if (shouldWipeoutCachedRoutes(cachedRoutes, routingConfig)) {
            cachedRoutes = undefined;
        }
        metric.putMetric(routingConfig.useCachedRoutes
            ? 'GetQuoteUsingCachedRoutes'
            : 'GetQuoteNotUsingCachedRoutes', 1, MetricLoggerUnit.Count);
        if (cacheMode &&
            routingConfig.useCachedRoutes &&
            cacheMode !== CacheMode.Darkmode &&
            !cachedRoutes) {
            metric.putMetric(`GetCachedRoute_miss_${cacheMode}`, 1, MetricLoggerUnit.Count);
            log.info({
                currencyIn: currencyIn.symbol,
                currencyInAddress: getAddress(currencyIn),
                currencyOut: currencyOut.symbol,
                currencyOutAddress: getAddress(currencyOut),
                cacheMode,
                amount: amount.toExact(),
                chainId: this.chainId,
                tradeType: this.tradeTypeStr(tradeType),
            }, `GetCachedRoute miss ${cacheMode} for ${this.tokenPairSymbolTradeTypeChainId(currencyIn, currencyOut, tradeType)}`);
        }
        else if (cachedRoutes && routingConfig.useCachedRoutes) {
            metric.putMetric(`GetCachedRoute_hit_${cacheMode}`, 1, MetricLoggerUnit.Count);
            log.info({
                currencyIn: currencyIn.symbol,
                currencyInAddress: getAddress(currencyIn),
                currencyOut: currencyOut.symbol,
                currencyOutAddress: getAddress(currencyOut),
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
        if (!cachedRoutes || cacheMode !== CacheMode.Livemode) {
            swapRouteFromChainPromise = this.getSwapRouteFromChain(amount, currencyIn, currencyOut, protocols, quoteCurrency, tradeType, routingConfig, v3GasModel, v4GasModel, mixedRouteGasModel, gasPriceWei, v2GasModel, swapConfig, providerConfig);
        }
        const [swapRouteFromCache, swapRouteFromChain] = await Promise.all([
            swapRouteFromCachePromise,
            swapRouteFromChainPromise,
        ]);
        let swapRouteRaw;
        let hitsCachedRoute = false;
        if (cacheMode === CacheMode.Livemode && swapRouteFromCache) {
            // offline lambda is never in cache mode
            // refresh pools to avoid stale data
            const beforeRefreshPools = Date.now();
            await this.refreshPools(swapRouteFromCache.routes, routingConfig, this.v2PoolProvider, this.v3PoolProvider, this.v4PoolProvider);
            metric.putMetric(`Route_RefreshPools_Latency`, Date.now() - beforeRefreshPools, MetricLoggerUnit.Milliseconds);
            log.info(`CacheMode is ${cacheMode}, and we are using swapRoute from cache`);
            hitsCachedRoute = true;
            swapRouteRaw = swapRouteFromCache;
        }
        else {
            log.info(`CacheMode is ${cacheMode}, and we are using materialized swapRoute`);
            swapRouteRaw = swapRouteFromChain;
        }
        if (cacheMode === CacheMode.Tapcompare &&
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
                    metric.putMetric(`TapcompareCachedRoute_quoteGasAdjustedDiffPercent`, Number(misquotePercent.toExact()), MetricLoggerUnit.Percent);
                    log.warn({
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
                        log.error({
                            quoteGasAdjustedDiff: quoteGasAdjustedDiff.toExact(),
                            swapRouteFromChainQuoteGasAdjusted: swapRouteFromChain.quoteGasAdjusted.toExact(),
                        }, 'Error calculating misquote percent');
                        metric.putMetric(`TapcompareCachedRoute_quoteGasAdjustedDiffPercent_divzero`, 1, MetricLoggerUnit.Count);
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
                if (routingConfig.intent === INTENT.CACHING) {
                    // due to fire and forget nature, we already take note that we should set new cached routes during the new path
                    newSetCachedRoutesPath = true;
                    metric.putMetric(`SetCachedRoute_NewPath`, 1, MetricLoggerUnit.Count);
                    // there's a chance that swapRouteFromChain might be populated already,
                    // when there's no cachedroutes in the dynamo DB.
                    // in that case, we don't try to swap route from chain again
                    const swapRouteFromChainAgain = swapRouteFromChain !== null && swapRouteFromChain !== void 0 ? swapRouteFromChain : 
                    // we have to intentionally await here, because routing-api lambda has a chance to return the swapRoute/swapRouteWithSimulation
                    // before the routing-api quote handler can finish running getSwapRouteFromChain (getSwapRouteFromChain is runtime intensive)
                    (await this.getSwapRouteFromChain(amount, currencyIn, currencyOut, protocols, quoteCurrency, tradeType, routingConfig, v3GasModel, v4GasModel, mixedRouteGasModel, gasPriceWei, v2GasModel, swapConfig, providerConfig));
                    if (swapRouteFromChainAgain) {
                        const routesToCache = CachedRoutes.fromRoutesWithValidQuotes(swapRouteFromChainAgain.routes, this.chainId, currencyIn, currencyOut, protocols.sort(), await blockNumber, tradeType, amount.toExact());
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
            cacheMode !== CacheMode.Darkmode &&
            swapRouteFromChain) {
            if (newSetCachedRoutesPath) {
                // SetCachedRoute_NewPath and SetCachedRoute_OldPath metrics might have counts during short timeframe.
                // over time, we should expect to see less SetCachedRoute_OldPath metrics count.
                // in AWS metrics, one can investigate, by:
                // 1) seeing the overall metrics count of SetCachedRoute_NewPath and SetCachedRoute_OldPath. SetCachedRoute_NewPath should steadily go up, while SetCachedRoute_OldPath should go down.
                // 2) using the same requestId, one should see eventually when SetCachedRoute_NewPath metric is logged, SetCachedRoute_OldPath metric should not be called.
                metric.putMetric(`SetCachedRoute_OldPath_INTENT_${routingConfig.intent}`, 1, MetricLoggerUnit.Count);
            }
            // Generate the object to be cached
            const routesToCache = CachedRoutes.fromRoutesWithValidQuotes(swapRouteFromChain.routes, this.chainId, currencyIn, currencyOut, protocols.sort(), await blockNumber, tradeType, amount.toExact());
            await this.setCachedRoutesAndLog(amount, currencyIn, currencyOut, tradeType, 'SetCachedRoute_OldPath', routesToCache, routingConfig.cachedRoutesRouteIds);
        }
        metric.putMetric(`QuoteFoundForChain${this.chainId}`, 1, MetricLoggerUnit.Count);
        // Build Trade object that represents the optimal swap.
        const trade = buildTrade(currencyIn, currencyOut, tradeType, routeAmounts);
        let methodParameters;
        // If user provided recipient, deadline etc. we also generate the calldata required to execute
        // the swap and return it too.
        if (swapConfig) {
            methodParameters = buildSwapMethodParameters(trade, swapConfig, this.chainId);
        }
        const tokenOutAmount = tradeType === TradeType.EXACT_OUTPUT
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
            blockNumber: BigNumber.from(await blockNumber),
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
            log.info(JSON.stringify({ swapConfig, methodParameters, providerConfig }, null, 2), `Starting simulation`);
            const fromAddress = swapConfig.simulate.fromAddress;
            const beforeSimulate = Date.now();
            const swapRouteWithSimulation = await this.simulator.simulate(fromAddress, swapConfig, swapRoute, amount, 
            // Quote will be in WETH even if quoteCurrency is ETH
            // So we init a new CurrencyAmount object here
            CurrencyAmount.fromRawAmount(quoteCurrency, quote.quotient.toString()), providerConfig);
            if (((_0 = this.deleteCacheEnabledChains) === null || _0 === void 0 ? void 0 : _0.includes(this.chainId)) &&
                swapRouteWithSimulation.simulationStatus === SimulationStatus.Failed) {
                // invalidate cached route if simulation failed
                log.info({
                    simulationStatus: swapRouteWithSimulation.simulationStatus,
                    swapRoute: swapRouteWithSimulation,
                }, `Simulation failed - detailed failure information: CacheInvalidationCount_${this.chainId}`);
                metric.putMetric(`CacheInvalidationCount_${this.chainId}`, 1, MetricLoggerUnit.Count);
                // Generate the object to be cached
                const routesToCache = CachedRoutes.fromRoutesWithValidQuotes(swapRouteWithSimulation.route, this.chainId, currencyIn, currencyOut, protocols.sort(), await blockNumber, tradeType, amount.toExact());
                if (!routesToCache) {
                    log.error({ swapRouteWithSimulation }, 'Failed to generate cached routes after simulation failure');
                }
                else {
                    try {
                        await ((_1 = this.routeCachingProvider) === null || _1 === void 0 ? void 0 : _1.deleteCachedRoute(routesToCache));
                    }
                    catch (err) {
                        log.error({ err, routesToCache }, 'Failed to delete cached route after simulation failure');
                    }
                }
            }
            metric.putMetric('SimulateTransaction', Date.now() - beforeSimulate, MetricLoggerUnit.Milliseconds);
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
                case Protocol.V2:
                    route.route = await AlphaRouter.refreshV2Pools(route.route, routingConfig, v2PoolProvider);
                    break;
                case Protocol.V3:
                    route.route = await AlphaRouter.refreshV3Pools(route.route, routingConfig, v3PoolProvider);
                    break;
                case Protocol.V4:
                    route.route = await AlphaRouter.refreshV4Pools(route.route, routingConfig, v4PoolProvider);
                    break;
                case Protocol.MIXED:
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
        return cloneV2RouteWithNewPools(route, refreshedPairs);
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
        return cloneV3RouteWithNewPools(route, refreshedPools);
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
        return cloneV4RouteWithNewPools(route, refreshedPools);
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
            if (pool instanceof V2Pool) {
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
            else if (pool instanceof V3Pool) {
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
            else if (pool instanceof V4Pool) {
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
        return cloneMixedRouteWithNewPools(route, refreshedPools);
    }
    static logV2PoolRefreshError(v2Pool) {
        log.error({
            token0: v2Pool.token0,
            token1: v2Pool.token1,
        }, 'Failed to refresh V2 pool');
    }
    static logV3PoolRefreshError(v3Pool) {
        log.error({
            token0: v3Pool.token0,
            token1: v3Pool.token1,
            fee: v3Pool.fee,
        }, 'Failed to refresh V3 pool');
    }
    static logV4PoolRefreshError(v4Pool) {
        log.error({
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
                !cachedRoutesRouteIds.startsWith(serializeRouteIds(routesToCache.routes.map((r) => r.routeId)));
            if (cachedRoutesChanged) {
                metric.putMetric('cachedRoutesChanged', 1, MetricLoggerUnit.Count);
                metric.putMetric(`cachedRoutesChanged_chainId${currencyIn.chainId}`, 1, MetricLoggerUnit.Count);
                metric.putMetric(`cachedRoutesChanged_chainId${currencyOut.chainId}_pair${currencyIn.symbol}${currencyOut.symbol}`, 1, MetricLoggerUnit.Count);
            }
            else {
                metric.putMetric('cachedRoutesNotChanged', 1, MetricLoggerUnit.Count);
                metric.putMetric(`cachedRoutesNotChanged_chainId${currencyIn.chainId}`, 1, MetricLoggerUnit.Count);
                metric.putMetric(`cachedRoutesNotChanged_chainId${currencyOut.chainId}_pair${currencyIn.symbol}${currencyOut.symbol}`, 1, MetricLoggerUnit.Count);
            }
            await ((_a = this.routeCachingProvider) === null || _a === void 0 ? void 0 : _a.setCachedRoute(routesToCache, amount).then((success) => {
                const status = success ? 'success' : 'rejected';
                metric.putMetric(`${metricsPrefix}_${status}`, 1, MetricLoggerUnit.Count);
            }).catch((reason) => {
                log.error({
                    reason: reason,
                    tokenPair: this.tokenPairSymbolTradeTypeChainId(currencyIn, currencyOut, tradeType),
                }, `SetCachedRoute failure`);
                metric.putMetric(`${metricsPrefix}_failure`, 1, MetricLoggerUnit.Count);
            }));
        }
        else {
            metric.putMetric(`${metricsPrefix}_unnecessary`, 1, MetricLoggerUnit.Count);
        }
    }
    async getSwapRouteFromCache(currencyIn, currencyOut, cachedRoutes, blockNumber, amount, quoteCurrency, tradeType, routingConfig, v3GasModel, v4GasModel, mixedRouteGasModel, gasPriceWei, v2GasModel, swapConfig, providerConfig) {
        var _a, _c, _d, _e, _f, _g;
        const tokenPairProperties = await this.tokenPropertiesProvider.getTokensProperties([currencyIn, currencyOut], providerConfig);
        const sellTokenIsFot = (_d = (_c = (_a = tokenPairProperties[getAddressLowerCase(currencyIn)]) === null || _a === void 0 ? void 0 : _a.tokenFeeResult) === null || _c === void 0 ? void 0 : _c.sellFeeBps) === null || _d === void 0 ? void 0 : _d.gt(0);
        const buyTokenIsFot = (_g = (_f = (_e = tokenPairProperties[getAddressLowerCase(currencyOut)]) === null || _e === void 0 ? void 0 : _e.tokenFeeResult) === null || _f === void 0 ? void 0 : _f.buyFeeBps) === null || _g === void 0 ? void 0 : _g.gt(0);
        const fotInDirectSwap = sellTokenIsFot || buyTokenIsFot;
        log.info({
            protocols: cachedRoutes.protocolsCovered,
            tradeType: cachedRoutes.tradeType,
            cachedBlockNumber: cachedRoutes.blockNumber,
            quoteBlockNumber: blockNumber,
        }, 'Routing across CachedRoute');
        const quotePromises = [];
        const v4Routes = cachedRoutes.routes.filter((route) => route.protocol === Protocol.V4);
        const v3Routes = cachedRoutes.routes.filter((route) => route.protocol === Protocol.V3);
        const v2Routes = cachedRoutes.routes.filter((route) => route.protocol === Protocol.V2);
        const mixedRoutes = cachedRoutes.routes.filter((route) => route.protocol === Protocol.MIXED);
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
            metric.putMetric('SwapRouteFromCache_V4_GetQuotes_Request', 1, MetricLoggerUnit.Count);
            const beforeGetQuotes = Date.now();
            quotePromises.push(this.v4Quoter
                .getQuotes(v4RoutesFromCache, amounts, percents, quoteCurrency, tradeType, routingConfig, undefined, v4GasModel)
                .then((result) => {
                metric.putMetric(`SwapRouteFromCache_V4_GetQuotes_Load`, Date.now() - beforeGetQuotes, MetricLoggerUnit.Milliseconds);
                return result;
            }));
        }
        if (!fotInDirectSwap) {
            if (v3Routes.length > 0) {
                const v3RoutesFromCache = v3Routes.map((cachedRoute) => cachedRoute.route);
                metric.putMetric('SwapRouteFromCache_V3_GetQuotes_Request', 1, MetricLoggerUnit.Count);
                const beforeGetQuotes = Date.now();
                quotePromises.push(this.v3Quoter
                    .getQuotes(v3RoutesFromCache, amounts, percents, quoteCurrency.wrapped, tradeType, routingConfig, undefined, v3GasModel)
                    .then((result) => {
                    metric.putMetric(`SwapRouteFromCache_V3_GetQuotes_Load`, Date.now() - beforeGetQuotes, MetricLoggerUnit.Milliseconds);
                    return result;
                }));
            }
        }
        if (v2Routes.length > 0) {
            const v2RoutesFromCache = v2Routes.map((cachedRoute) => cachedRoute.route);
            metric.putMetric('SwapRouteFromCache_V2_GetQuotes_Request', 1, MetricLoggerUnit.Count);
            const beforeGetQuotes = Date.now();
            quotePromises.push(this.v2Quoter
                .refreshRoutesThenGetQuotes(cachedRoutes.currencyIn.wrapped, cachedRoutes.currencyOut.wrapped, v2RoutesFromCache, amounts, percents, quoteCurrency.wrapped, tradeType, routingConfig, gasPriceWei)
                .then((result) => {
                metric.putMetric(`SwapRouteFromCache_V2_GetQuotes_Load`, Date.now() - beforeGetQuotes, MetricLoggerUnit.Milliseconds);
                return result;
            }));
        }
        if (!fotInDirectSwap) {
            if (mixedRoutes.length > 0) {
                const mixedRoutesFromCache = mixedRoutes.map((cachedRoute) => cachedRoute.route);
                metric.putMetric('SwapRouteFromCache_Mixed_GetQuotes_Request', 1, MetricLoggerUnit.Count);
                const beforeGetQuotes = Date.now();
                quotePromises.push(this.mixedQuoter
                    .getQuotes(mixedRoutesFromCache, amounts, percents, quoteCurrency.wrapped, tradeType, routingConfig, undefined, mixedRouteGasModel)
                    .then((result) => {
                    metric.putMetric(`SwapRouteFromCache_Mixed_GetQuotes_Load`, Date.now() - beforeGetQuotes, MetricLoggerUnit.Milliseconds);
                    return result;
                }));
            }
        }
        const getQuotesResults = await Promise.all(quotePromises);
        const allRoutesWithValidQuotes = _.flatMap(getQuotesResults, (quoteResult) => quoteResult.routesWithValidQuotes);
        return getBestSwapRoute(amount, percents, allRoutesWithValidQuotes, tradeType, this.chainId, routingConfig, this.portionProvider, v2GasModel, v3GasModel, v4GasModel, swapConfig, providerConfig);
    }
    async getSwapRouteFromChain(amount, currencyIn, currencyOut, protocols, quoteCurrency, tradeType, routingConfig, v3GasModel, v4GasModel, mixedRouteGasModel, gasPriceWei, v2GasModel, swapConfig, providerConfig) {
        var _a, _c, _d, _e, _f, _g, _h, _j, _k;
        const tokenPairProperties = await this.tokenPropertiesProvider.getTokensProperties([currencyIn, currencyOut], providerConfig);
        const sellTokenIsFot = (_d = (_c = (_a = tokenPairProperties[getAddressLowerCase(currencyIn)]) === null || _a === void 0 ? void 0 : _a.tokenFeeResult) === null || _c === void 0 ? void 0 : _c.sellFeeBps) === null || _d === void 0 ? void 0 : _d.gt(0);
        const buyTokenIsFot = (_g = (_f = (_e = tokenPairProperties[getAddressLowerCase(currencyOut)]) === null || _e === void 0 ? void 0 : _e.tokenFeeResult) === null || _f === void 0 ? void 0 : _f.buyFeeBps) === null || _g === void 0 ? void 0 : _g.gt(0);
        const fotInDirectSwap = sellTokenIsFot || buyTokenIsFot;
        // Generate our distribution of amounts, i.e. fractions of the input amount.
        // We will get quotes for fractions of the input amount for different routes, then
        // combine to generate split routes.
        const [percents, amounts] = this.getAmountDistribution(amount, routingConfig);
        const noProtocolsSpecified = protocols.length === 0;
        const v4ProtocolSpecified = protocols.includes(Protocol.V4);
        const v3ProtocolSpecified = protocols.includes(Protocol.V3);
        const v2ProtocolSpecified = protocols.includes(Protocol.V2);
        const v2SupportedInChain = (_h = this.v2Supported) === null || _h === void 0 ? void 0 : _h.includes(this.chainId);
        const v4SupportedInChain = (_j = this.v4Supported) === null || _j === void 0 ? void 0 : _j.includes(this.chainId);
        const shouldQueryMixedProtocol = protocols.includes(Protocol.MIXED) ||
            (noProtocolsSpecified && v2SupportedInChain && v4SupportedInChain);
        const mixedProtocolAllowed = ((_k = this.mixedSupported) === null || _k === void 0 ? void 0 : _k.includes(this.chainId)) &&
            tradeType === TradeType.EXACT_INPUT;
        const beforeGetCandidates = Date.now();
        let v4CandidatePoolsPromise = Promise.resolve(undefined);
        // we are explicitly requiring people to specify v4 for now
        if (v4SupportedInChain && (v4ProtocolSpecified || noProtocolsSpecified)) {
            // if (v4ProtocolSpecified || noProtocolsSpecified) {
            v4CandidatePoolsPromise = getV4CandidatePools({
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
                metric.putMetric('GetV4CandidatePools', Date.now() - beforeGetCandidates, MetricLoggerUnit.Milliseconds);
                return candidatePools;
            });
        }
        let v3CandidatePoolsPromise = Promise.resolve(undefined);
        if (!fotInDirectSwap) {
            if (v3ProtocolSpecified || noProtocolsSpecified) {
                const tokenIn = currencyIn.wrapped;
                const tokenOut = currencyOut.wrapped;
                v3CandidatePoolsPromise = getV3CandidatePools({
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
                    metric.putMetric('GetV3CandidatePools', Date.now() - beforeGetCandidates, MetricLoggerUnit.Milliseconds);
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
            v2CandidatePoolsPromise = getV2CandidatePools({
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
                metric.putMetric('GetV2CandidatePools', Date.now() - beforeGetCandidates, MetricLoggerUnit.Milliseconds);
                return candidatePools;
            });
        }
        const quotePromises = [];
        // for v4, for now we explicitly require people to specify
        if (v4SupportedInChain && v4ProtocolSpecified) {
            log.info({ protocols, tradeType }, 'Routing across V4');
            metric.putMetric('SwapRouteFromChain_V4_GetRoutesThenQuotes_Request', 1, MetricLoggerUnit.Count);
            const beforeGetRoutesThenQuotes = Date.now();
            quotePromises.push(v4CandidatePoolsPromise.then((v4CandidatePools) => this.v4Quoter
                .getRoutesThenQuotes(currencyIn, currencyOut, amount, amounts, percents, quoteCurrency, v4CandidatePools, tradeType, routingConfig, v4GasModel)
                .then((result) => {
                metric.putMetric(`SwapRouteFromChain_V4_GetRoutesThenQuotes_Load`, Date.now() - beforeGetRoutesThenQuotes, MetricLoggerUnit.Milliseconds);
                return result;
            })));
        }
        if (!fotInDirectSwap) {
            // Maybe Quote V3 - if V3 is specified, or no protocol is specified
            if (v3ProtocolSpecified || noProtocolsSpecified) {
                log.info({ protocols, tradeType }, 'Routing across V3');
                metric.putMetric('SwapRouteFromChain_V3_GetRoutesThenQuotes_Request', 1, MetricLoggerUnit.Count);
                const beforeGetRoutesThenQuotes = Date.now();
                const tokenIn = currencyIn.wrapped;
                const tokenOut = currencyOut.wrapped;
                quotePromises.push(v3CandidatePoolsPromise.then((v3CandidatePools) => this.v3Quoter
                    .getRoutesThenQuotes(tokenIn, tokenOut, amount, amounts, percents, quoteCurrency.wrapped, v3CandidatePools, tradeType, routingConfig, v3GasModel)
                    .then((result) => {
                    metric.putMetric(`SwapRouteFromChain_V3_GetRoutesThenQuotes_Load`, Date.now() - beforeGetRoutesThenQuotes, MetricLoggerUnit.Milliseconds);
                    return result;
                })));
            }
        }
        // Maybe Quote V2 - if V2 is specified, or no protocol is specified AND v2 is supported in this chain
        if (v2SupportedInChain && (v2ProtocolSpecified || noProtocolsSpecified)) {
            log.info({ protocols, tradeType }, 'Routing across V2');
            metric.putMetric('SwapRouteFromChain_V2_GetRoutesThenQuotes_Request', 1, MetricLoggerUnit.Count);
            const beforeGetRoutesThenQuotes = Date.now();
            const tokenIn = currencyIn.wrapped;
            const tokenOut = currencyOut.wrapped;
            quotePromises.push(v2CandidatePoolsPromise.then((v2CandidatePools) => this.v2Quoter
                .getRoutesThenQuotes(tokenIn, tokenOut, amount, amounts, percents, quoteCurrency.wrapped, v2CandidatePools, tradeType, routingConfig, v2GasModel, gasPriceWei)
                .then((result) => {
                metric.putMetric(`SwapRouteFromChain_V2_GetRoutesThenQuotes_Load`, Date.now() - beforeGetRoutesThenQuotes, MetricLoggerUnit.Milliseconds);
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
                protocols.filter((protocol) => protocol !== Protocol.MIXED).length >= 2) {
                log.info({ protocols, tradeType }, 'Routing across MixedRoutes');
                metric.putMetric('SwapRouteFromChain_Mixed_GetRoutesThenQuotes_Request', 1, MetricLoggerUnit.Count);
                const beforeGetRoutesThenQuotes = Date.now();
                quotePromises.push(Promise.all([
                    v4CandidatePoolsPromise,
                    v3CandidatePoolsPromise,
                    v2CandidatePoolsPromise,
                ]).then(async ([v4CandidatePools, v3CandidatePools, v2CandidatePools]) => {
                    const tokenIn = currencyIn.wrapped;
                    const tokenOut = currencyOut.wrapped;
                    const crossLiquidityPools = await getMixedCrossLiquidityCandidatePools({
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
                        metric.putMetric(`SwapRouteFromChain_Mixed_GetRoutesThenQuotes_Load`, Date.now() - beforeGetRoutesThenQuotes, MetricLoggerUnit.Milliseconds);
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
            log.info({ allRoutesWithValidQuotes }, 'Received no valid quotes');
            return null;
        }
        // Given all the quotes for all the amounts for all the routes, find the best combination.
        const bestSwapRoute = await getBestSwapRoute(amount, percents, allRoutesWithValidQuotes, tradeType, this.chainId, routingConfig, this.portionProvider, v2GasModel, v3GasModel, v4GasModel, swapConfig, providerConfig);
        if (bestSwapRoute) {
            this.emitPoolSelectionMetrics(bestSwapRoute, allCandidatePools, currencyIn, currencyOut);
        }
        return bestSwapRoute;
    }
    tradeTypeStr(tradeType) {
        return tradeType === TradeType.EXACT_INPUT ? 'ExactIn' : 'ExactOut';
    }
    tokenPairSymbolTradeTypeChainId(currencyIn, currencyOut, tradeType) {
        return `${currencyIn.symbol}/${currencyOut.symbol}/${this.tradeTypeStr(tradeType)}/${this.chainId}`;
    }
    determineCurrencyInOutFromTradeType(tradeType, amount, quoteCurrency) {
        if (tradeType === TradeType.EXACT_INPUT) {
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
        metric.putMetric('GasPriceLoad', Date.now() - beforeGasTimestamp, MetricLoggerUnit.Milliseconds);
        return gasPriceWei;
    }
    async getGasModels(gasPriceWei, amountToken, quoteToken, providerConfig) {
        var _a;
        const beforeGasModel = Date.now();
        if (this.chainId === ChainId.TRON) {
            log.info('Using fixed gas cost for Tron chain');
            const tronFixedGasCost = CurrencyAmount.fromRawAmount(quoteToken, '0');
            const tronGasModel = {
                estimateGasCost: () => ({
                    gasEstimate: BigNumber.from(0),
                    gasCostInToken: tronFixedGasCost,
                    gasCostInUSD: tronFixedGasCost,
                    gasCostInGasToken: undefined,
                }),
                calculateL1GasFees: async () => ({
                    gasUsedL1: BigNumber.from(0),
                    gasUsedL1OnL2: BigNumber.from(0),
                    gasCostL1USD: tronFixedGasCost,
                    gasCostL1QuoteToken: tronFixedGasCost,
                }),
                calculateL1GasFee: async () => BigNumber.from(0),
                estimateGasCostInToken: async () => tronFixedGasCost,
                estimateGasCostInUSD: async () => tronFixedGasCost,
            };
            metric.putMetric('GasModelCreation', Date.now() - beforeGasModel, MetricLoggerUnit.Milliseconds);
            return {
                v2GasModel: tronGasModel,
                v3GasModel: tronGasModel,
                v4GasModel: tronGasModel,
                mixedRouteGasModel: tronGasModel,
            };
        }
        const usdPoolPromise = getHighestLiquidityV3USDPool(this.chainId, this.v3PoolProvider, providerConfig);
        const nativeCurrency = WRAPPED_NATIVE_CURRENCY[this.chainId];
        const nativeAndQuoteTokenV3PoolPromise = !quoteToken.equals(nativeCurrency)
            ? getHighestLiquidityV3NativePool(quoteToken, this.v3PoolProvider, providerConfig)
            : Promise.resolve(null);
        const nativeAndAmountTokenV3PoolPromise = !amountToken.equals(nativeCurrency)
            ? getHighestLiquidityV3NativePool(amountToken, this.v3PoolProvider, providerConfig)
            : Promise.resolve(null);
        // If a specific gas token is specified in the provider config
        // fetch the highest liq V3 pool with it and the native currency
        const nativeAndSpecifiedGasTokenV3PoolPromise = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.gasToken) &&
            !(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.gasToken.equals(nativeCurrency))
            ? getHighestLiquidityV3NativePool(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.gasToken, this.v3PoolProvider, providerConfig)
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
        metric.putMetric('GasModelCreation', Date.now() - beforeGasModel, MetricLoggerUnit.Milliseconds);
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
            amounts.push(amount.multiply(new Fraction(i * distributionPercent, 100)));
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
        return {
            ...SwapRouter.swapAndAddCallParameters(trade, {
                recipient,
                slippageTolerance,
                deadlineOrPreviousBlockhash: deadline,
                inputTokenPermit,
            }, Position.fromAmounts({
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
            }), addLiquidityConfig, approvalTypes.approvalTokenIn, approvalTypes.approvalTokenOut),
            to: SWAP_ROUTER_02_ADDRESSES(this.chainId),
        };
    }
    emitPoolSelectionMetrics(swapRouteRaw, allPoolsBySelection, currencyIn, currencyOut) {
        const poolAddressesUsed = new Set();
        const { routes: routeAmounts } = swapRouteRaw;
        _(routeAmounts)
            .flatMap((routeAmount) => {
            const { poolIdentifiers: poolAddresses } = routeAmount;
            return poolAddresses;
        })
            .forEach((address) => {
            poolAddressesUsed.add(address.toLowerCase());
        });
        for (const poolsBySelection of allPoolsBySelection) {
            const { protocol } = poolsBySelection;
            _.forIn(poolsBySelection.selections, (pools, topNSelection) => {
                const topNUsed = _.findLastIndex(pools, (pool) => poolAddressesUsed.has(pool.id.toLowerCase())) + 1;
                metric.putMetric(_.capitalize(`${protocol}${topNSelection}`), topNUsed, MetricLoggerUnit.Count);
            });
        }
        let hasV4Route = false;
        let hasV3Route = false;
        let hasV2Route = false;
        let hasMixedRoute = false;
        for (const routeAmount of routeAmounts) {
            if (routeAmount.protocol === Protocol.V4) {
                hasV4Route = true;
            }
            if (routeAmount.protocol === Protocol.V3) {
                hasV3Route = true;
            }
            if (routeAmount.protocol === Protocol.V2) {
                hasV2Route = true;
            }
            if (routeAmount.protocol === Protocol.MIXED) {
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
            metric.putMetric(`${metricsPrefix}SplitRoute`, 1, MetricLoggerUnit.Count);
            metric.putMetric(`${metricsPrefix}SplitRouteForChain${this.chainId}`, 1, MetricLoggerUnit.Count);
            if (hasV4Route && (currencyIn.isNative || currencyOut.isNative)) {
                // Keep track of this edge case https://linear.app/uniswap/issue/ROUTE-303/tech-debt-split-route-can-have-different-ethweth-input-or-output#comment-bba53758
                metric.putMetric(`${metricsPrefix}SplitRouteWithNativeToken`, 1, MetricLoggerUnit.Count);
                metric.putMetric(`${metricsPrefix}SplitRouteWithNativeTokenForChain${this.chainId}`, 1, MetricLoggerUnit.Count);
            }
        }
        else if (hasV4Route && hasV3Route && hasV2Route) {
            metric.putMetric(`V4AndV3AndV2SplitRoute`, 1, MetricLoggerUnit.Count);
            metric.putMetric(`V4AndV3AndV2SplitRouteForChain${this.chainId}`, 1, MetricLoggerUnit.Count);
            if (currencyIn.isNative || currencyOut.isNative) {
                // Keep track of this edge case https://linear.app/uniswap/issue/ROUTE-303/tech-debt-split-route-can-have-different-ethweth-input-or-output#comment-bba53758
                metric.putMetric(`V4AndV3AndV2SplitRouteWithNativeToken`, 1, MetricLoggerUnit.Count);
                metric.putMetric(`V4AndV3AndV2SplitRouteWithNativeTokenForChain${this.chainId}`, 1, MetricLoggerUnit.Count);
            }
        }
        else if (hasMixedRoute) {
            if (routeAmounts.length > 1) {
                metric.putMetric(`MixedSplitRoute`, 1, MetricLoggerUnit.Count);
                metric.putMetric(`MixedSplitRouteForChain${this.chainId}`, 1, MetricLoggerUnit.Count);
            }
            else {
                metric.putMetric(`MixedRoute`, 1, MetricLoggerUnit.Count);
                metric.putMetric(`MixedRouteForChain${this.chainId}`, 1, MetricLoggerUnit.Count);
            }
        }
        else if (hasV4Route) {
            if (routeAmounts.length > 1) {
                metric.putMetric(`V4SplitRoute`, 1, MetricLoggerUnit.Count);
                metric.putMetric(`V4SplitRouteForChain${this.chainId}`, 1, MetricLoggerUnit.Count);
            }
        }
        else if (hasV3Route) {
            if (routeAmounts.length > 1) {
                metric.putMetric(`V3SplitRoute`, 1, MetricLoggerUnit.Count);
                metric.putMetric(`V3SplitRouteForChain${this.chainId}`, 1, MetricLoggerUnit.Count);
            }
            else {
                metric.putMetric(`V3Route`, 1, MetricLoggerUnit.Count);
                metric.putMetric(`V3RouteForChain${this.chainId}`, 1, MetricLoggerUnit.Count);
            }
        }
        else if (hasV2Route) {
            if (routeAmounts.length > 1) {
                metric.putMetric(`V2SplitRoute`, 1, MetricLoggerUnit.Count);
                metric.putMetric(`V2SplitRouteForChain${this.chainId}`, 1, MetricLoggerUnit.Count);
            }
            else {
                metric.putMetric(`V2Route`, 1, MetricLoggerUnit.Count);
                metric.putMetric(`V2RouteForChain${this.chainId}`, 1, MetricLoggerUnit.Count);
            }
        }
    }
    calculateOptimalRatio(position, sqrtRatioX96, zeroForOne) {
        const upperSqrtRatioX96 = TickMath.getSqrtRatioAtTick(position.tickUpper);
        const lowerSqrtRatioX96 = TickMath.getSqrtRatioAtTick(position.tickLower);
        // returns Fraction(0, 1) for any out of range position regardless of zeroForOne. Implication: function
        // cannot be used to determine the trading direction of out of range positions.
        if (JSBI.greaterThan(sqrtRatioX96, upperSqrtRatioX96) ||
            JSBI.lessThan(sqrtRatioX96, lowerSqrtRatioX96)) {
            return new Fraction(0, 1);
        }
        const precision = JSBI.BigInt('1' + '0'.repeat(18));
        let optimalRatio = new Fraction(SqrtPriceMath.getAmount0Delta(sqrtRatioX96, upperSqrtRatioX96, precision, true), SqrtPriceMath.getAmount1Delta(sqrtRatioX96, lowerSqrtRatioX96, precision, true));
        if (!zeroForOne)
            optimalRatio = optimalRatio.invert();
        return optimalRatio;
    }
    async userHasSufficientBalance(fromAddress, tradeType, amount, quote) {
        try {
            const neededBalance = tradeType === TradeType.EXACT_INPUT ? amount : quote;
            let balance;
            if (neededBalance.currency.isNative) {
                balance = await this.provider.getBalance(fromAddress);
            }
            else {
                const tokenContract = Erc20__factory.connect(neededBalance.currency.address, this.provider);
                balance = await tokenContract.balanceOf(fromAddress);
            }
            return balance.gte(BigNumber.from(neededBalance.quotient.toString()));
        }
        catch (e) {
            log.error(e, 'Error while checking user balance');
            return false;
        }
    }
    absoluteValue(fraction) {
        const numeratorAbs = JSBI.lessThan(fraction.numerator, JSBI.BigInt(0))
            ? JSBI.unaryMinus(fraction.numerator)
            : fraction.numerator;
        const denominatorAbs = JSBI.lessThan(fraction.denominator, JSBI.BigInt(0))
            ? JSBI.unaryMinus(fraction.denominator)
            : fraction.denominator;
        return new Fraction(numeratorAbs, denominatorAbs);
    }
    getBlockNumberPromise() {
        return retry(async (_b, attempt) => {
            if (attempt > 1) {
                log.info(`Get block number attempt ${attempt}`);
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
        if (intent !== undefined && intent === INTENT.CACHING) {
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
            hooksOptions !== HooksOptions.HOOKS_INCLUSIVE) {
            return false;
        }
        return true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxwaGEtcm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3JvdXRlcnMvYWxwaGEtcm91dGVyL2FscGhhLXJvdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDckQsT0FBTyxFQUFnQixlQUFlLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RSxPQUFPLGtCQUFrQixNQUFNLDZCQUE2QixDQUFDO0FBQzdELE9BQU8sRUFFTCxRQUFRLEVBQ1IsVUFBVSxFQUVWLElBQUksR0FDTCxNQUFNLHFCQUFxQixDQUFDO0FBQzdCLE9BQU8sRUFFTCxRQUFRLEVBRVIsU0FBUyxHQUNWLE1BQU0sbUJBQW1CLENBQUM7QUFFM0IsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdkUsT0FBTyxFQUFFLElBQUksSUFBSSxNQUFNLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNqRCxPQUFPLEVBQ0wsSUFBSSxFQUNKLFFBQVEsRUFDUixhQUFhLEVBQ2IsUUFBUSxFQUNSLElBQUksSUFBSSxNQUFNLEdBQ2YsTUFBTSxpQkFBaUIsQ0FBQztBQUN6QixPQUFPLEVBQUUsSUFBSSxJQUFJLE1BQU0sRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ2pELE9BQU8sS0FBSyxNQUFNLGFBQWEsQ0FBQztBQUNoQyxPQUFPLElBQUksTUFBTSxNQUFNLENBQUM7QUFDeEIsT0FBTyxDQUFDLE1BQU0sUUFBUSxDQUFDO0FBQ3ZCLE9BQU8sU0FBUyxNQUFNLFlBQVksQ0FBQztBQUVuQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDOUMsT0FBTyxFQUNMLFlBQVksRUFDWixTQUFTLEVBQ1QseUJBQXlCLEVBQ3pCLGdDQUFnQyxFQUNoQyxxQkFBcUIsRUFDckIseUJBQXlCLEVBQ3pCLHFCQUFxQixFQUNyQix5QkFBeUIs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