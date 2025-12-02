"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAllRoutes = exports.computeAllMixedRoutes = exports.computeAllV2Routes = exports.computeAllV3Routes = exports.computeAllV4Routes = void 0;
const router_sdk_1 = require("@uniswap/router-sdk");
const v2_sdk_1 = require("@uniswap/v2-sdk");
const v3_sdk_1 = require("@uniswap/v3-sdk");
const v4_sdk_1 = require("@uniswap/v4-sdk");
const util_1 = require("../../../util");
const hooksOptions_1 = require("../../../util/hooksOptions");
const log_1 = require("../../../util/log");
const routes_1 = require("../../../util/routes");
const router_1 = require("../../router");
function computeAllV4Routes(currencyIn, currencyOut, pools, maxHops, hooksOptions) {
    let filteredPools = pools;
    if (hooksOptions === hooksOptions_1.HooksOptions.HOOKS_ONLY) {
        filteredPools = pools.filter((pool) => pool.hooks !== router_sdk_1.ADDRESS_ZERO);
    }
    if (hooksOptions === hooksOptions_1.HooksOptions.NO_HOOKS) {
        filteredPools = pools.filter((pool) => pool.hooks === router_sdk_1.ADDRESS_ZERO);
    }
    return computeAllRoutes(currencyIn, currencyOut, (route, currencyIn, currencyOut) => {
        return new router_1.V4Route(route, currencyIn, currencyOut);
    }, (pool, currency) => pool.involvesToken(currency), filteredPools, maxHops);
}
exports.computeAllV4Routes = computeAllV4Routes;
function computeAllV3Routes(tokenIn, tokenOut, pools, maxHops) {
    return computeAllRoutes(tokenIn, tokenOut, (route, tokenIn, tokenOut) => {
        return new router_1.V3Route(route, tokenIn, tokenOut);
    }, (pool, token) => pool.involvesToken(token), pools, maxHops);
}
exports.computeAllV3Routes = computeAllV3Routes;
function computeAllV2Routes(tokenIn, tokenOut, pools, maxHops) {
    return computeAllRoutes(tokenIn, tokenOut, (route, tokenIn, tokenOut) => {
        return new router_1.V2Route(route, tokenIn, tokenOut);
    }, (pool, token) => pool.involvesToken(token), pools, maxHops);
}
exports.computeAllV2Routes = computeAllV2Routes;
function computeAllMixedRoutes(currencyIn, currencyOut, parts, maxHops, shouldEnableMixedRouteEthWeth, hooksOptions) {
    // first we need to filter non v4-pools
    const filteredPools = !hooksOptions || hooksOptions === hooksOptions_1.HooksOptions.HOOKS_INCLUSIVE
        ? parts
        : parts.filter((pool) => !(pool instanceof v4_sdk_1.Pool));
    if (hooksOptions === hooksOptions_1.HooksOptions.HOOKS_ONLY) {
        // we need to filter out v4-pools with hooks
        // then concat the v4-pools with hooks
        const v4HookslessPools = parts.filter((pool) => pool instanceof v4_sdk_1.Pool && pool.hooks !== router_sdk_1.ADDRESS_ZERO);
        parts = filteredPools.concat(v4HookslessPools);
    }
    if (hooksOptions === hooksOptions_1.HooksOptions.NO_HOOKS) {
        // we need to filter out v4-pools without hooks
        // then concat the v4-pools without hooks
        const v4HookfulPools = parts.filter((pool) => pool instanceof v4_sdk_1.Pool && pool.hooks === router_sdk_1.ADDRESS_ZERO);
        parts = filteredPools.concat(v4HookfulPools);
    }
    // only add fake v4 pool, if we see there's a native v4 pool in the candidate pool
    const containsV4NativePools = parts.filter((pool) => pool instanceof v4_sdk_1.Pool &&
        pool.v4InvolvesToken((0, util_1.nativeOnChain)(currencyIn.chainId))).length > 0;
    const amendedPools = containsV4NativePools && shouldEnableMixedRouteEthWeth
        ? parts.concat(util_1.V4_ETH_WETH_FAKE_POOL[currencyIn.chainId])
        : parts;
    // NOTE: we added a fake v4 pool, in order for mixed route to connect the v3 weth pool with v4 eth pool
    const routesRaw = computeAllRoutes(currencyIn, currencyOut, (route, currencyIn, currencyOut) => {
        // we only retake the fake v4 pool if the route contains a native v4 pool
        return new router_1.MixedRoute(route, currencyIn, currencyOut, containsV4NativePools);
    }, (pool, currency) => currency.isNative
        ? pool.involvesToken(currency)
        : pool.involvesToken(currency), amendedPools, maxHops);
    /// filter out pure v4 and v3 and v2 routes
    return routesRaw.filter((route) => {
        return (!route.pools.every((pool) => pool instanceof v4_sdk_1.Pool) &&
            !route.pools.every((pool) => pool instanceof v3_sdk_1.Pool) &&
            !route.pools.every((pool) => pool instanceof v2_sdk_1.Pair));
    });
}
exports.computeAllMixedRoutes = computeAllMixedRoutes;
function computeAllRoutes(tokenIn, tokenOut, buildRoute, involvesToken, pools, maxHops) {
    var _a;
    const poolsUsed = Array(pools.length).fill(false);
    const routes = [];
    const computeRoutes = (tokenIn, tokenOut, currentRoute, poolsUsed, tokensVisited, _previousTokenOut) => {
        const currentRouteContainsFakeV4Pool = currentRoute.filter((pool) => pool instanceof v4_sdk_1.Pool &&
            pool.tickSpacing ===
                util_1.V4_ETH_WETH_FAKE_POOL[tokenIn.chainId].tickSpacing).length > 0;
        const amendedMaxHops = currentRouteContainsFakeV4Pool
            ? maxHops + 1
            : maxHops;
        // amendedMaxHops is the maxHops + 1 if the current route contains a fake v4 pool
        // b/c we want to allow the route to go through the fake v4 pool
        // also gas wise, if a route goes through the fake v4 pool, mixed quoter will add the wrap/unwrap gas cost:
        // https://github.com/Uniswap/mixed-quoter/pull/41/files#diff-a4d1289f264d1da22aac20cc55a9d01c8ba9cccd76ce1af8f952ec9034e7e1aaR189
        // and SOR will use the gas cost from the mixed quoter:
        // https://github.com/Uniswap/smart-order-router/blob/17da523f1af050e6430afb866d96681346c8fb8b/src/routers/alpha-router/gas-models/mixedRoute/mixed-route-heuristic-gas-model.ts#L222
        if (currentRoute.length > amendedMaxHops) {
            return;
        }
        if (currentRoute.length > 0 &&
            involvesToken(currentRoute[currentRoute.length - 1], tokenOut)) {
            routes.push(buildRoute([...currentRoute], tokenIn, tokenOut));
            return;
        }
        for (let i = 0; i < pools.length; i++) {
            if (poolsUsed[i]) {
                continue;
            }
            const curPool = pools[i];
            const previousTokenOut = _previousTokenOut ? _previousTokenOut : tokenIn;
            if (!involvesToken(curPool, previousTokenOut)) {
                continue;
            }
            const currentTokenOut = curPool.token0.equals(previousTokenOut)
                ? curPool.token1
                : curPool.token0;
            if (tokensVisited.has((0, util_1.getAddressLowerCase)(currentTokenOut))) {
                continue;
            }
            tokensVisited.add((0, util_1.getAddressLowerCase)(currentTokenOut));
            currentRoute.push(curPool);
            poolsUsed[i] = true;
            computeRoutes(tokenIn, tokenOut, currentRoute, poolsUsed, tokensVisited, currentTokenOut);
            poolsUsed[i] = false;
            currentRoute.pop();
            tokensVisited.delete((0, util_1.getAddressLowerCase)(currentTokenOut));
        }
    };
    computeRoutes(tokenIn, tokenOut, [], poolsUsed, new Set([(0, util_1.getAddressLowerCase)(tokenIn)]));
    log_1.log.info({
        routes: routes.map(routes_1.routeToString),
        pools: pools.map(routes_1.poolToString),
    }, `Computed ${routes.length} possible routes for type ${(_a = routes[0]) === null || _a === void 0 ? void 0 : _a.protocol}.`);
    return routes;
}
exports.computeAllRoutes = computeAllRoutes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZS1hbGwtcm91dGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3JvdXRlcnMvYWxwaGEtcm91dGVyL2Z1bmN0aW9ucy9jb21wdXRlLWFsbC1yb3V0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0RBQTBEO0FBRTFELDRDQUF1QztBQUN2Qyw0Q0FBaUQ7QUFDakQsNENBQWlEO0FBR2pELHdDQUl1QjtBQUN2Qiw2REFBMEQ7QUFDMUQsMkNBQXdDO0FBQ3hDLGlEQUFtRTtBQUNuRSx5Q0FNc0I7QUFFdEIsU0FBZ0Isa0JBQWtCLENBQ2hDLFVBQW9CLEVBQ3BCLFdBQXFCLEVBQ3JCLEtBQWUsRUFDZixPQUFlLEVBQ2YsWUFBMkI7SUFFM0IsSUFBSSxhQUFhLEdBQWEsS0FBSyxDQUFDO0lBRXBDLElBQUksWUFBWSxLQUFLLDJCQUFZLENBQUMsVUFBVSxFQUFFO1FBQzVDLGFBQWEsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLHlCQUFZLENBQUMsQ0FBQztLQUNyRTtJQUVELElBQUksWUFBWSxLQUFLLDJCQUFZLENBQUMsUUFBUSxFQUFFO1FBQzFDLGFBQWEsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLHlCQUFZLENBQUMsQ0FBQztLQUNyRTtJQUVELE9BQU8sZ0JBQWdCLENBQ3JCLFVBQVUsRUFDVixXQUFXLEVBQ1gsQ0FBQyxLQUFlLEVBQUUsVUFBb0IsRUFBRSxXQUFxQixFQUFFLEVBQUU7UUFDL0QsT0FBTyxJQUFJLGdCQUFPLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNyRCxDQUFDLEVBQ0QsQ0FBQyxJQUFZLEVBQUUsUUFBa0IsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FB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