"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mixedRouteFilterOutV4Pools = exports.mixedRouteContainsV4Pools = void 0;
const v4_sdk_1 = require("@uniswap/v4-sdk");
function mixedRouteContainsV4Pools(route) {
    return route.pools.some((pool) => {
        return pool instanceof v4_sdk_1.Pool;
    });
}
exports.mixedRouteContainsV4Pools = mixedRouteContainsV4Pools;
function mixedRouteFilterOutV4Pools(routes) {
    return routes.filter((route) => {
        return !mixedRouteContainsV4Pools(route);
    });
}
exports.mixedRouteFilterOutV4Pools = mixedRouteFilterOutV4Pools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWl4ZWRSb3V0ZUZpbHRlck91dFY0UG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvdXRpbC9taXhlZFJvdXRlRmlsdGVyT3V0VjRQb29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0Q0FBaUQ7QUFJakQsU0FBZ0IseUJBQXlCLENBQUMsS0FBaUI7SUFDekQsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQy9CLE9BQU8sSUFBSSxZQUFZLGFBQU0sQ0FBQztJQUNoQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFKRCw4REFJQztBQUVELFNBQWdCLDBCQUEwQixDQUFDLE1BQW9CO0lBQzdELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1FBQzdCLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFKRCxnRUFJQyJ9