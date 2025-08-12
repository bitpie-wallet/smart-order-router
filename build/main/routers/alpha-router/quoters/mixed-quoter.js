"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MixedQuoter = void 0;
const router_sdk_1 = require("@uniswap/router-sdk");
const sdk_core_1 = require("@uniswap/sdk-core");
const universal_router_sdk_1 = require("@uniswap/universal-router-sdk");
const lodash_1 = __importDefault(require("lodash"));
const providers_1 = require("../../../providers");
const util_1 = require("../../../util");
const mixedRouteFilterOutV4Pools_1 = require("../../../util/mixedRouteFilterOutV4Pools");
const entities_1 = require("../entities");
const compute_all_routes_1 = require("../functions/compute-all-routes");
const get_candidate_pools_1 = require("../functions/get-candidate-pools");
const base_quoter_1 = require("./base-quoter");
class MixedQuoter extends base_quoter_1.BaseQuoter {
    constructor(v4SubgraphProvider, v4PoolProvider, v3SubgraphProvider, v3PoolProvider, v2SubgraphProvider, v2PoolProvider, onChainQuoteProvider, tokenProvider, chainId, blockedTokenListProvider, tokenValidatorProvider) {
        super(tokenProvider, chainId, router_sdk_1.Protocol.MIXED, blockedTokenListProvider, tokenValidatorProvider);
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
        if (tradeType != sdk_core_1.TradeType.EXACT_INPUT) {
            throw new Error('Mixed route quotes are not supported for EXACT_OUTPUT');
        }
        const [v4CandidatePools, v3CandidatePools, v2CandidatePools, crossLiquidityPools,] = v4v3v2candidatePools;
        const { V2poolAccessor, V3poolAccessor, V4poolAccessor, candidatePools: mixedRouteCandidatePools, } = await (0, get_candidate_pools_1.getMixedRouteCandidatePools)({
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
        if (!((_a = routingConfig.excludedProtocolsFromMixed) === null || _a === void 0 ? void 0 : _a.includes(router_sdk_1.Protocol.V4))) {
            poolsRaw.push(...V4poolsRaw);
        }
        if (!((_b = routingConfig.excludedProtocolsFromMixed) === null || _b === void 0 ? void 0 : _b.includes(router_sdk_1.Protocol.V3))) {
            poolsRaw.push(...V3poolsRaw);
        }
        if (!((_c = routingConfig.excludedProtocolsFromMixed) === null || _c === void 0 ? void 0 : _c.includes(router_sdk_1.Protocol.V2))) {
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
            if (tokenValidation == providers_1.TokenValidationResult.STF &&
                (token.equals(currencyIn) || token.equals(currencyOut))) {
                return false;
            }
            return (tokenValidation == providers_1.TokenValidationResult.FOT ||
                tokenValidation == providers_1.TokenValidationResult.STF);
        });
        const { maxSwapsPerPath } = routingConfig;
        let routes = (0, compute_all_routes_1.computeAllMixedRoutes)(currencyIn, currencyOut, pools, maxSwapsPerPath, routingConfig.shouldEnableMixedRouteEthWeth, routingConfig.hooksOptions);
        if (routingConfig.universalRouterVersion === universal_router_sdk_1.UniversalRouterVersion.V1_2 ||
            !((_d = routingConfig.protocols) === null || _d === void 0 ? void 0 : _d.includes(router_sdk_1.Protocol.V4))) {
            routes = (0, mixedRouteFilterOutV4Pools_1.mixedRouteFilterOutV4Pools)(routes);
        }
        util_1.metric.putMetric('MixedGetRoutesLoad', Date.now() - beforeGetRoutes, util_1.MetricLoggerUnit.Milliseconds);
        util_1.metric.putMetric(`MixedGetRoutesLoad_Chain${this.chainId}`, Date.now() - beforeGetRoutes, util_1.MetricLoggerUnit.Milliseconds);
        return {
            routes: routes,
            candidatePools,
        };
    }
    async getQuotes(routes, amounts, percents, quoteCurrency, tradeType, routingConfig, candidatePools, gasModel) {
        const beforeGetQuotes = Date.now();
        util_1.log.info('Starting to get mixed quotes');
        if (gasModel === undefined) {
            throw new Error('GasModel for MixedRouteWithValidQuote is required to getQuotes');
        }
        if (routes.length == 0) {
            return { routesWithValidQuotes: [], candidatePools };
        }
        // For all our routes, and all the fractional amounts, fetch quotes on-chain.
        const quoteFn = this.onChainQuoteProvider.getQuotesManyExactIn.bind(this.onChainQuoteProvider);
        const beforeQuotes = Date.now();
        util_1.log.info(`Getting quotes for mixed for ${routes.length} routes with ${amounts.length} amounts per route.`);
        const { routesWithQuotes } = await quoteFn(amounts, routes, routingConfig);
        util_1.metric.putMetric('MixedQuotesLoad', Date.now() - beforeQuotes, util_1.MetricLoggerUnit.Milliseconds);
        util_1.metric.putMetric('MixedQuotesFetched', (0, lodash_1.default)(routesWithQuotes)
            .map(([, quotes]) => quotes.length)
            .sum(), util_1.MetricLoggerUnit.Count);
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
                    util_1.log.debug({
                        route: (0, util_1.routeToString)(route),
                        amountQuote,
                    }, 'Dropping a null mixed quote for route.');
                    continue;
                }
                const routeWithValidQuote = new entities_1.MixedRouteWithValidQuote({
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
        util_1.metric.putMetric('MixedGetQuotesLoad', Date.now() - beforeGetQuotes, util_1.MetricLoggerUnit.Milliseconds);
        return {
            routesWithValidQuotes,
            candidatePools,
        };
    }
}
exports.MixedQuoter = MixedQuoter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWl4ZWQtcXVvdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3JvdXRlcnMvYWxwaGEtcm91dGVyL3F1b3RlcnMvbWl4ZWQtcXVvdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLG9EQUErQztBQUMvQyxnREFBd0Q7QUFDeEQsd0VBQXVFO0FBQ3ZFLG9EQUF1QjtBQUd2QixrREFZNEI7QUFDNUIsd0NBTXVCO0FBQ3ZCLHlGQUFzRjtBQUd0RiwwQ0FBdUQ7QUFDdkQsd0VBQXdFO0FBQ3hFLDBFQU8wQztBQUkxQywrQ0FBMkM7QUFHM0MsTUFBYSxXQUFZLFNBQVEsd0JBU2hDO0lBU0MsWUFDRSxrQkFBdUMsRUFDdkMsY0FBK0IsRUFDL0Isa0JBQXVDLEVBQ3ZDLGNBQStCLEVBQy9CLGtCQUF1QyxFQUN2QyxjQUErQixFQUMvQixvQkFBMkMsRUFDM0MsYUFBNkIsRUFDN0IsT0FBZ0IsRUFDaEIsd0JBQTZDLEVBQzdDLHNCQUFnRDtRQUVoRCxLQUFLLENBQ0gsYUFBYSxFQUNiLE9BQU8sRUFDUCxxQkFBUSxDQUFDLEtBQUssRUFDZCx3QkFBd0IsRUFDeEIsc0JBQXNCLENBQ3ZCLENBQUM7UUFDRixJQUFJLENBQUMsa0JBQWtCLEdBQUcsa0JBQWtCLENBQUM7UUFDN0MsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFDckMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDO1FBQzdDLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQztRQUM3QyxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUNyQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsb0JBQW9CLENBQUM7SUFDbkQsQ0FBQztJQUVTLEtBQUssQ0FBQyxTQUFTLENBQ3ZCLFVBQW9CLEVBQ3BCLFdBQXFCLEVBQ3JCLG9CQUtDLEVBQ0Qs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