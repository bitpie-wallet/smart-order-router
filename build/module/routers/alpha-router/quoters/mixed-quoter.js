import { Protocol } from '@uniswap/router-sdk';
import { TradeType } from '@uniswap/sdk-core';
import { UniversalRouterVersion } from '@uniswap/universal-router-sdk';
import _ from 'lodash';
import { TokenValidationResult, } from '../../../providers';
import { log, metric, MetricLoggerUnit, routeToString, } from '../../../util';
import { mixedRouteFilterOutV4Pools } from '../../../util/mixedRouteFilterOutV4Pools';
import { MixedRouteWithValidQuote } from '../entities';
import { computeAllMixedRoutes } from '../functions/compute-all-routes';
import { getMixedRouteCandidatePools, } from '../functions/get-candidate-pools';
import { BaseQuoter } from './base-quoter';
export class MixedQuoter extends BaseQuoter {
    constructor(v4SubgraphProvider, v4PoolProvider, v3SubgraphProvider, v3PoolProvider, v2SubgraphProvider, v2PoolProvider, onChainQuoteProvider, tokenProvider, chainId, blockedTokenListProvider, tokenValidatorProvider) {
        super(tokenProvider, chainId, Protocol.MIXED, blockedTokenListProvider, tokenValidatorProvider);
        this.v4SubgraphProvider = v4SubgraphProvider;
        this.v4PoolProvider = v4PoolProvider;
        this.v3SubgraphProvider = v3SubgraphProvider;
        this.v3PoolProvider = v3PoolProvider;
        this.v2SubgraphProvider = v2SubgraphProvider;
        this.v2PoolProvider = v2PoolProvider;
        this.onChainQuoteProvider = onChainQuoteProvider;
    }
    async getRoutes(currencyIn, currencyOut, v4v3v2candidatePools, tradeType, routingConfig) {
        var _a, _b, _c, _d;
        const beforeGetRoutes = Date.now();
        if (tradeType != TradeType.EXACT_INPUT) {
            throw new Error('Mixed route quotes are not supported for EXACT_OUTPUT');
        }
        const [v4CandidatePools, v3CandidatePools, v2CandidatePools, crossLiquidityPools,] = v4v3v2candidatePools;
        const { V2poolAccessor, V3poolAccessor, V4poolAccessor, candidatePools: mixedRouteCandidatePools, } = await getMixedRouteCandidatePools({
            v4CandidatePools,
            v3CandidatePools,
            v2CandidatePools,
            crossLiquidityPools,
            tokenProvider: this.tokenProvider,
            v4PoolProvider: this.v4PoolProvider,
            v3poolProvider: this.v3PoolProvider,
            v2poolProvider: this.v2PoolProvider,
            routingConfig,
            chainId: this.chainId,
        });
        const V4poolsRaw = V4poolAccessor.getAllPools();
        const V3poolsRaw = V3poolAccessor.getAllPools();
        const V2poolsRaw = V2poolAccessor.getAllPools();
        const poolsRaw = [];
        if (!((_a = routingConfig.excludedProtocolsFromMixed) === null || _a === void 0 ? void 0 : _a.includes(Protocol.V4))) {
            poolsRaw.push(...V4poolsRaw);
        }
        if (!((_b = routingConfig.excludedProtocolsFromMixed) === null || _b === void 0 ? void 0 : _b.includes(Protocol.V3))) {
            poolsRaw.push(...V3poolsRaw);
        }
        if (!((_c = routingConfig.excludedProtocolsFromMixed) === null || _c === void 0 ? void 0 : _c.includes(Protocol.V2))) {
            poolsRaw.push(...V2poolsRaw);
        }
        const candidatePools = mixedRouteCandidatePools;
        // Drop any pools that contain fee on transfer tokens (not supported by v3) or have issues with being transferred.
        const pools = await this.applyTokenValidatorToPools(poolsRaw, (token, tokenValidation) => {
            // If there is no available validation result we assume the token is fine.
            if (!tokenValidation) {
                return false;
            }
            // Only filters out *intermediate* pools that involve tokens that we detect
            // cant be transferred. This prevents us trying to route through tokens that may
            // not be transferrable, but allows users to still swap those tokens if they
            // specify.
            //
            if (tokenValidation == TokenValidationResult.STF &&
                (token.equals(currencyIn) || token.equals(currencyOut))) {
                return false;
            }
            return (tokenValidation == TokenValidationResult.FOT ||
                tokenValidation == TokenValidationResult.STF);
        });
        const { maxSwapsPerPath } = routingConfig;
        let routes = computeAllMixedRoutes(currencyIn, currencyOut, pools, maxSwapsPerPath, routingConfig.shouldEnableMixedRouteEthWeth, routingConfig.hooksOptions);
        if (routingConfig.universalRouterVersion === UniversalRouterVersion.V1_2 ||
            !((_d = routingConfig.protocols) === null || _d === void 0 ? void 0 : _d.includes(Protocol.V4))) {
            routes = mixedRouteFilterOutV4Pools(routes);
        }
        metric.putMetric('MixedGetRoutesLoad', Date.now() - beforeGetRoutes, MetricLoggerUnit.Milliseconds);
        metric.putMetric(`MixedGetRoutesLoad_Chain${this.chainId}`, Date.now() - beforeGetRoutes, MetricLoggerUnit.Milliseconds);
        return {
            routes: routes,
            candidatePools,
        };
    }
    async getQuotes(routes, amounts, percents, quoteCurrency, tradeType, routingConfig, candidatePools, gasModel) {
        const beforeGetQuotes = Date.now();
        log.info('Starting to get mixed quotes');
        if (gasModel === undefined) {
            throw new Error('GasModel for MixedRouteWithValidQuote is required to getQuotes');
        }
        if (routes.length == 0) {
            return { routesWithValidQuotes: [], candidatePools };
        }
        // For all our routes, and all the fractional amounts, fetch quotes on-chain.
        const quoteFn = this.onChainQuoteProvider.getQuotesManyExactIn.bind(this.onChainQuoteProvider);
        const beforeQuotes = Date.now();
        log.info(`Getting quotes for mixed for ${routes.length} routes with ${amounts.length} amounts per route.`);
        const { routesWithQuotes } = await quoteFn(amounts, routes, routingConfig);
        metric.putMetric('MixedQuotesLoad', Date.now() - beforeQuotes, MetricLoggerUnit.Milliseconds);
        metric.putMetric('MixedQuotesFetched', _(routesWithQuotes)
            .map(([, quotes]) => quotes.length)
            .sum(), MetricLoggerUnit.Count);
        const routesWithValidQuotes = [];
        for (const routeWithQuote of routesWithQuotes) {
            const [route, quotes] = routeWithQuote;
            for (let i = 0; i < quotes.length; i++) {
                const percent = percents[i];
                const amountQuote = quotes[i];
                const { quote, amount, sqrtPriceX96AfterList, initializedTicksCrossedList, gasEstimate, } = amountQuote;
                if (!quote ||
                    !sqrtPriceX96AfterList ||
                    !initializedTicksCrossedList ||
                    !gasEstimate) {
                    log.debug({
                        route: routeToString(route),
                        amountQuote,
                    }, 'Dropping a null mixed quote for route.');
                    continue;
                }
                const routeWithValidQuote = new MixedRouteWithValidQuote({
                    route,
                    rawQuote: quote,
                    amount,
                    percent,
                    sqrtPriceX96AfterList,
                    initializedTicksCrossedList,
                    quoterGasEstimate: gasEstimate,
                    mixedRouteGasModel: gasModel,
                    quoteToken: quoteCurrency.wrapped,
                    tradeType,
                    v4PoolProvider: this.v4PoolProvider,
                    v3PoolProvider: this.v3PoolProvider,
                    v2PoolProvider: this.v2PoolProvider,
                });
                routesWithValidQuotes.push(routeWithValidQuote);
            }
        }
        metric.putMetric('MixedGetQuotesLoad', Date.now() - beforeGetQuotes, MetricLoggerUnit.Milliseconds);
        return {
            routesWithValidQuotes,
            candidatePools,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWl4ZWQtcXVvdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3JvdXRlcnMvYWxwaGEtcm91dGVyL3F1b3RlcnMvbWl4ZWQtcXVvdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQVksU0FBUyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDeEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdkUsT0FBTyxDQUFDLE1BQU0sUUFBUSxDQUFDO0FBR3ZCLE9BQU8sRUFXTCxxQkFBcUIsR0FDdEIsTUFBTSxvQkFBb0IsQ0FBQztBQUM1QixPQUFPLEVBRUwsR0FBRyxFQUNILE1BQU0sRUFDTixnQkFBZ0IsRUFDaEIsYUFBYSxHQUNkLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR3RGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RSxPQUFPLEVBR0wsMkJBQTJCLEdBSTVCLE1BQU0sa0NBQWtDLENBQUM7QUFJMUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUczQyxNQUFNLE9BQU8sV0FBWSxTQUFRLFVBU2hDO0lBU0MsWUFDRSxrQkFBdUMsRUFDdkMsY0FBK0IsRUFDL0Isa0JBQXVDLEVBQ3ZDLGNBQStCLEVBQy9CLGtCQUF1QyxFQUN2QyxjQUErQixFQUMvQixvQkFBMkMsRUFDM0MsYUFBNkIsRUFDN0IsT0FBZ0IsRUFDaEIsd0JBQTZDLEVBQzdDLHNCQUFnRDtRQUVoRCxLQUFLLENBQ0gsYUFBYSxFQUNiLE9BQU8sRUFDUCxRQUFRLENBQUMsS0FBSyxFQUNkLHdCQUF3QixFQUN4Qixz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