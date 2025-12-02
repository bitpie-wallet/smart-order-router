import { ADDRESS_ZERO } from '@uniswap/router-sdk';
import { Pair } from '@uniswap/v2-sdk';
import { Pool as V3Pool } from '@uniswap/v3-sdk';
import { Pool as V4Pool } from '@uniswap/v4-sdk';
import { getAddressLowerCase, nativeOnChain, V4_ETH_WETH_FAKE_POOL, } from '../../../util';
import { HooksOptions } from '../../../util/hooksOptions';
import { log } from '../../../util/log';
import { poolToString, routeToString } from '../../../util/routes';
import { MixedRoute, V2Route, V3Route, V4Route, } from '../../router';
export function computeAllV4Routes(currencyIn, currencyOut, pools, maxHops, hooksOptions) {
    let filteredPools = pools;
    if (hooksOptions === HooksOptions.HOOKS_ONLY) {
        filteredPools = pools.filter((pool) => pool.hooks !== ADDRESS_ZERO);
    }
    if (hooksOptions === HooksOptions.NO_HOOKS) {
        filteredPools = pools.filter((pool) => pool.hooks === ADDRESS_ZERO);
    }
    return computeAllRoutes(currencyIn, currencyOut, (route, currencyIn, currencyOut) => {
        return new V4Route(route, currencyIn, currencyOut);
    }, (pool, currency) => pool.involvesToken(currency), filteredPools, maxHops);
}
export function computeAllV3Routes(tokenIn, tokenOut, pools, maxHops) {
    return computeAllRoutes(tokenIn, tokenOut, (route, tokenIn, tokenOut) => {
        return new V3Route(route, tokenIn, tokenOut);
    }, (pool, token) => pool.involvesToken(token), pools, maxHops);
}
export function computeAllV2Routes(tokenIn, tokenOut, pools, maxHops) {
    return computeAllRoutes(tokenIn, tokenOut, (route, tokenIn, tokenOut) => {
        return new V2Route(route, tokenIn, tokenOut);
    }, (pool, token) => pool.involvesToken(token), pools, maxHops);
}
export function computeAllMixedRoutes(currencyIn, currencyOut, parts, maxHops, shouldEnableMixedRouteEthWeth, hooksOptions) {
    // first we need to filter non v4-pools
    const filteredPools = !hooksOptions || hooksOptions === HooksOptions.HOOKS_INCLUSIVE
        ? parts
        : parts.filter((pool) => !(pool instanceof V4Pool));
    if (hooksOptions === HooksOptions.HOOKS_ONLY) {
        // we need to filter out v4-pools with hooks
        // then concat the v4-pools with hooks
        const v4HookslessPools = parts.filter((pool) => pool instanceof V4Pool && pool.hooks !== ADDRESS_ZERO);
        parts = filteredPools.concat(v4HookslessPools);
    }
    if (hooksOptions === HooksOptions.NO_HOOKS) {
        // we need to filter out v4-pools without hooks
        // then concat the v4-pools without hooks
        const v4HookfulPools = parts.filter((pool) => pool instanceof V4Pool && pool.hooks === ADDRESS_ZERO);
        parts = filteredPools.concat(v4HookfulPools);
    }
    // only add fake v4 pool, if we see there's a native v4 pool in the candidate pool
    const containsV4NativePools = parts.filter((pool) => pool instanceof V4Pool &&
        pool.v4InvolvesToken(nativeOnChain(currencyIn.chainId))).length > 0;
    const amendedPools = containsV4NativePools && shouldEnableMixedRouteEthWeth
        ? parts.concat(V4_ETH_WETH_FAKE_POOL[currencyIn.chainId])
        : parts;
    // NOTE: we added a fake v4 pool, in order for mixed route to connect the v3 weth pool with v4 eth pool
    const routesRaw = computeAllRoutes(currencyIn, currencyOut, (route, currencyIn, currencyOut) => {
        // we only retake the fake v4 pool if the route contains a native v4 pool
        return new MixedRoute(route, currencyIn, currencyOut, containsV4NativePools);
    }, (pool, currency) => currency.isNative
        ? pool.involvesToken(currency)
        : pool.involvesToken(currency), amendedPools, maxHops);
    /// filter out pure v4 and v3 and v2 routes
    return routesRaw.filter((route) => {
        return (!route.pools.every((pool) => pool instanceof V4Pool) &&
            !route.pools.every((pool) => pool instanceof V3Pool) &&
            !route.pools.every((pool) => pool instanceof Pair));
    });
}
export function computeAllRoutes(tokenIn, tokenOut, buildRoute, involvesToken, pools, maxHops) {
    var _a;
    const poolsUsed = Array(pools.length).fill(false);
    const routes = [];
    const computeRoutes = (tokenIn, tokenOut, currentRoute, poolsUsed, tokensVisited, _previousTokenOut) => {
        const currentRouteContainsFakeV4Pool = currentRoute.filter((pool) => pool instanceof V4Pool &&
            pool.tickSpacing ===
                V4_ETH_WETH_FAKE_POOL[tokenIn.chainId].tickSpacing).length > 0;
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
            if (tokensVisited.has(getAddressLowerCase(currentTokenOut))) {
                continue;
            }
            tokensVisited.add(getAddressLowerCase(currentTokenOut));
            currentRoute.push(curPool);
            poolsUsed[i] = true;
            computeRoutes(tokenIn, tokenOut, currentRoute, poolsUsed, tokensVisited, currentTokenOut);
            poolsUsed[i] = false;
            currentRoute.pop();
            tokensVisited.delete(getAddressLowerCase(currentTokenOut));
        }
    };
    computeRoutes(tokenIn, tokenOut, [], poolsUsed, new Set([getAddressLowerCase(tokenIn)]));
    log.info({
        routes: routes.map(routeToString),
        pools: pools.map(poolToString),
    }, `Computed ${routes.length} possible routes for type ${(_a = routes[0]) === null || _a === void 0 ? void 0 : _a.protocol}.`);
    return routes;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZS1hbGwtcm91dGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3JvdXRlcnMvYWxwaGEtcm91dGVyL2Z1bmN0aW9ucy9jb21wdXRlLWFsbC1yb3V0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFlBQVksRUFBUyxNQUFNLHFCQUFxQixDQUFDO0FBRTFELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEVBQUUsSUFBSSxJQUFJLE1BQU0sRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxJQUFJLElBQUksTUFBTSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFHakQsT0FBTyxFQUNMLG1CQUFtQixFQUNuQixhQUFhLEVBQ2IscUJBQXFCLEdBQ3RCLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDeEMsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUNuRSxPQUFPLEVBQ0wsVUFBVSxFQUVWLE9BQU8sRUFDUCxPQUFPLEVBQ1AsT0FBTyxHQUNSLE1BQU0sY0FBYyxDQUFDO0FBRXRCLE1BQU0sVUFBVSxrQkFBa0IsQ0FDaEMsVUFBb0IsRUFDcEIsV0FBcUIsRUFDckIsS0FBZSxFQUNmLE9BQWUsRUFDZixZQUEyQjtJQUUzQixJQUFJLGFBQWEsR0FBYSxLQUFLLENBQUM7SUFFcEMsSUFBSSxZQUFZLEtBQUssWUFBWSxDQUFDLFVBQVUsRUFBRTtRQUM1QyxhQUFhLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxZQUFZLENBQUMsQ0FBQztLQUNyRTtJQUVELElBQUks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