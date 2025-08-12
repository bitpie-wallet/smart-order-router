import { Protocol } from '@uniswap/router-sdk';
import { Percent } from '@uniswap/sdk-core';
import { Pair } from '@uniswap/v2-sdk';
import { Pool as V3Pool } from '@uniswap/v3-sdk';
import { Pool as V4Pool } from '@uniswap/v4-sdk';
import _ from 'lodash';
import { V3_CORE_FACTORY_ADDRESSES } from './addresses';
import { CurrencyAmount, V4_ETH_WETH_FAKE_POOL } from '.';
export const routeToTokens = (route) => {
    switch (route.protocol) {
        case Protocol.V4:
            return route.currencyPath;
        case Protocol.V3:
            return route.tokenPath;
        case Protocol.V2:
        case Protocol.MIXED:
            return route.path;
        default:
            throw new Error(`Unsupported route ${JSON.stringify(route)}`);
    }
};
export const routeToPools = (route) => {
    switch (route.protocol) {
        case Protocol.V4:
        case Protocol.V3:
        case Protocol.MIXED:
            return route.pools;
        case Protocol.V2:
            return route.pairs;
        default:
            throw new Error(`Unsupported route ${JSON.stringify(route)}`);
    }
};
export const poolToString = (pool) => {
    if (pool instanceof V4Pool) {
        return ` -- ${pool.fee / 10000}% [${V4Pool.getPoolId(pool.token0, pool.token1, pool.fee, pool.tickSpacing, pool.hooks)}]`;
    }
    else if (pool instanceof V3Pool) {
        return ` -- ${pool.fee / 10000}% [${V3Pool.getAddress(pool.token0, pool.token1, pool.fee, undefined, V3_CORE_FACTORY_ADDRESSES[pool.chainId])}]`;
    }
    else if (pool instanceof Pair) {
        return ` -- [${Pair.getAddress(pool.token0, pool.token1)}]`;
    }
    else {
        throw new Error(`Unsupported pool ${JSON.stringify(pool)}`);
    }
};
export const routeToString = (route) => {
    const routeStr = [];
    const tokens = routeToTokens(route);
    const tokenPath = _.map(tokens, (token) => `${token.symbol}`);
    const pools = routeToPools(route);
    const poolFeePath = _.map(pools, (pool) => {
        if (pool instanceof Pair) {
            return ` -- [${Pair.getAddress(pool.token0, pool.token1)}]`;
        }
        else if (pool instanceof V3Pool) {
            return ` -- ${pool.fee / 10000}% [${V3Pool.getAddress(pool.token0, pool.token1, pool.fee, undefined, V3_CORE_FACTORY_ADDRESSES[pool.chainId])}]`;
        }
        else if (pool instanceof V4Pool) {
            // Special case in the case of ETH/WETH fake pool
            // where we do not want to return the fake pool in the route string as it is not a real pool
            if (pool.tickSpacing ===
                V4_ETH_WETH_FAKE_POOL[pool.chainId].tickSpacing) {
                return ' --  ';
            }
            return ` -- ${pool.fee / 10000}% [${V4Pool.getPoolId(pool.token0, pool.token1, pool.fee, pool.tickSpacing, pool.hooks)}]`;
        }
        else {
            throw new Error(`Unsupported pool ${JSON.stringify(pool)}`);
        }
        return `${poolToString(pool)} --> `;
    });
    for (let i = 0; i < tokenPath.length; i++) {
        routeStr.push(tokenPath[i]);
        if (i < poolFeePath.length) {
            routeStr.push(poolFeePath[i]);
        }
    }
    return routeStr.join('');
};
export const routeAmountsToString = (routeAmounts) => {
    const total = _.reduce(routeAmounts, (total, cur) => {
        return total.add(cur.amount);
    }, CurrencyAmount.fromRawAmount(routeAmounts[0].amount.currency, 0));
    const routeStrings = _.map(routeAmounts, ({ protocol, route, amount }) => {
        const portion = amount.divide(total);
        const percent = new Percent(portion.numerator, portion.denominator);
        /// @dev special case for MIXED routes we want to show user friendly V2+V3 instead
        return `[${protocol == Protocol.MIXED ? 'V2 + V3 + V4' : protocol}] ${percent.toFixed(2)}% = ${routeToString(route)}`;
    });
    return _.join(routeStrings, ', ');
};
export function shouldWipeoutCachedRoutes(cachedRoutes, routingConfig) {
    // We want to roll out the mixed route with UR v1_2 with percent control,
    // along with the cached routes so that we can test the performance of the mixed route with UR v1_2ss
    if ((routingConfig === null || routingConfig === void 0 ? void 0 : routingConfig.enableMixedRouteWithUR1_2) &&
        (
        // In case of optimisticCachedRoutes, we don't want to wipe out the cache
        // This is because the upstream client will indicate that it's a perf sensitive (likely online) request,
        // such that we should still use the cached routes.
        // In case of routing-api,
        // when intent=quote, optimisticCachedRoutes will be true, it means it's an online quote request, and we should use the cached routes.
        // when intent=caching, optimisticCachedRoutes will be false, it means it's an async routing lambda invocation for the benefit of
        // non-perf-sensitive, so that we can nullify the retrieved cached routes, if certain condition meets.
        routingConfig === null || routingConfig === void 0 ? void 0 : routingConfig.optimisticCachedRoutes)) {
        return false;
    }
    const containsExcludedProtocolPools = cachedRoutes === null || cachedRoutes === void 0 ? void 0 : cachedRoutes.routes.find((route) => {
        switch (route.protocol) {
            case Protocol.MIXED:
                return (route.route.pools.filter((pool) => {
                    return poolIsInExcludedProtocols(pool, routingConfig === null || routingConfig === void 0 ? void 0 : routingConfig.excludedProtocolsFromMixed);
                }).length > 0);
            default:
                return false;
        }
    });
    return containsExcludedProtocolPools !== undefined;
}
function poolIsInExcludedProtocols(pool, excludedProtocolsFromMixed) {
    var _a, _b, _c;
    if (pool instanceof V4Pool) {
        return (_a = excludedProtocolsFromMixed === null || excludedProtocolsFromMixed === void 0 ? void 0 : excludedProtocolsFromMixed.includes(Protocol.V4)) !== null && _a !== void 0 ? _a : false;
    }
    else if (pool instanceof V3Pool) {
        return (_b = excludedProtocolsFromMixed === null || excludedProtocolsFromMixed === void 0 ? void 0 : excludedProtocolsFromMixed.includes(Protocol.V3)) !== null && _b !== void 0 ? _b : false;
    }
    else if (pool instanceof Pair) {
        return (_c = excludedProtocolsFromMixed === null || excludedProtocolsFromMixed === void 0 ? void 0 : excludedProtocolsFromMixed.includes(Protocol.V2)) !== null && _c !== void 0 ? _c : false;
    }
    else {
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3V0aWwvcm91dGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxPQUFPLEVBQVksT0FBTyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDdEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxJQUFJLElBQUksTUFBTSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDakQsT0FBTyxFQUFFLElBQUksSUFBSSxNQUFNLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNqRCxPQUFPLENBQUMsTUFBTSxRQUFRLENBQUM7QUFVdkIsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXhELE9BQU8sRUFBRSxjQUFjLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxHQUFHLENBQUM7QUFHMUQsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLENBQUMsS0FBc0IsRUFBYyxFQUFFO0lBQ2xFLFFBQVEsS0FBSyxDQUFDLFFBQVEsRUFBRTtRQUN0QixLQUFLLFFBQVEsQ0FBQyxFQUFFO1lBQ2QsT0FBTyxLQUFLLENBQUMsWUFBWSxDQUFDO1FBQzVCLEtBQUssUUFBUSxDQUFDLEVBQUU7WUFDZCxPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUM7UUFDekIsS0FBSyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQ2pCLEtBQUssUUFBUSxDQUFDLEtBQUs7WUFDakIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3BCO1lBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDakU7QUFDSCxDQUFDLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxLQUFz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