import { MixedRouteSDK, Protocol, } from '@uniswap/router-sdk';
import { Route as V2RouteRaw } from '@uniswap/v2-sdk';
import { Route as V3RouteRaw, } from '@uniswap/v3-sdk';
import { Route as V4RouteRaw } from '@uniswap/v4-sdk';
export class V4Route extends V4RouteRaw {
    constructor() {
        super(...arguments);
        this.protocol = Protocol.V4;
    }
}
export class V3Route extends V3RouteRaw {
    constructor() {
        super(...arguments);
        this.protocol = Protocol.V3;
    }
}
export class V2Route extends V2RouteRaw {
    constructor() {
        super(...arguments);
        this.protocol = Protocol.V2;
    }
}
export class MixedRoute extends MixedRouteSDK {
    constructor() {
        super(...arguments);
        this.protocol = Protocol.MIXED;
    }
}
export var SwapToRatioStatus;
(function (SwapToRatioStatus) {
    SwapToRatioStatus[SwapToRatioStatus["SUCCESS"] = 1] = "SUCCESS";
    SwapToRatioStatus[SwapToRatioStatus["NO_ROUTE_FOUND"] = 2] = "NO_ROUTE_FOUND";
    SwapToRatioStatus[SwapToRatioStatus["NO_SWAP_NEEDED"] = 3] = "NO_SWAP_NEEDED";
})(SwapToRatioStatus || (SwapToRatioStatus = {}));
export var SwapType;
(function (SwapType) {
    SwapType[SwapType["UNIVERSAL_ROUTER"] = 0] = "UNIVERSAL_ROUTER";
    SwapType[SwapType["SWAP_ROUTER_02"] = 1] = "SWAP_ROUTER_02";
})(SwapType || (SwapType = {}));
/**
 * Provides functionality for finding optimal swap routes on the Uniswap protocol.
 *
 * @export
 * @abstract
 * @class IRouter
 */
export class IRouter {
}
export class ISwapToRatio {
}
export function cloneV2RouteWithNewPools(originalRoute, newPools) {
    // Reuse the original input and output currencies
    const input = originalRoute.input;
    const output = originalRoute.output;
    // Construct a new Route instance with the new pairs
    return new V2Route(newPools, input, output);
}
export function cloneV3RouteWithNewPools(originalRoute, newPools) {
    // Reuse the original input and output currencies
    const input = originalRoute.input;
    const output = originalRoute.output;
    // Construct a new Route instance with the new pairs
    return new V3Route(newPools, input, output);
}
export function cloneV4RouteWithNewPools(originalRoute, newPools) {
    // Reuse the original input and output currencies
    const input = originalRoute.input;
    const output = originalRoute.output;
    // Construct a new Route instance with the new pairs
    return new V4Route(newPools, input, output);
}
export function cloneMixedRouteWithNewPools(originalRoute, newPools) {
    // Reuse the original input and output currencies
    const input = originalRoute.input;
    const output = originalRoute.output;
    // Construct a new Route instance with the new pairs
    return new MixedRoute(newPools, input, output, /* retainFakePools = */ true);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3JvdXRlcnMvcm91dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFFTCxhQUFhLEVBQ2IsUUFBUSxHQUdULE1BQU0scUJBQXFCLENBQUM7QUFZN0IsT0FBTyxFQUFRLEtBQUssSUFBSSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUM1RCxPQUFPLEVBS0wsS0FBSyxJQUFJLFVBQVUsR0FDcEIsTUFBTSxpQkFBaUIsQ0FBQztBQUN6QixPQUFPLEVBQWtCLEtBQUssSUFBSSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQU90RSxNQUFNLE9BQU8sT0FBUSxTQUFRLFVBQThCO0lBQTNEOztRQUNFLGFBQVEsR0FBZ0IsUUFBUSxDQUFDLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0NBQUE7QUFDRCxNQUFNLE9BQU8sT0FBUSxTQUFRLFVBQXdCO0lBQXJEOztRQUNFLGFBQVEsR0FBZ0IsUUFBUSxDQUFDLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0NBQUE7QUFDRCxNQUFNLE9BQU8sT0FBUSxTQUFRLFVBQXdCO0lBQXJEOztRQUNFLGFBQVEsR0FBZ0IsUUFBUSxDQUFDLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0NBQUE7QUFDRCxNQUFNLE9BQU8sVUFBVyxTQUFRLGFBQWlDO0lBQWpFOztRQUNFLGFBQVEsR0FBbUIsUUFBUSxDQUFDLEtBQUssQ0FBQztJQUM1QyxDQUFDO0NBQUE7QUF3RkQsTUFBTSxDQUFOLElBQVksaUJBSVg7QUFKRCxXQUFZLGlCQUFpQjtJQUMzQiwrREFBVyxDQUFBO0lBQ1gsNkVBQWtCLENBQUE7SUFDbEIsNkVBQWtCLENBQUE7QUFDcEIsQ0FBQyxFQUpXLGlCQUFpQixLQUFqQixpQkFBaUIsUUFJNUI7QUFxQkQsTUFBTSxDQUFOLElBQVksUUFHWDtBQUhELFdBQVksUUFBUTtJQUNsQiwrREFBZ0IsQ0FBQTtJQUNoQiwyREFBYyxDQUFBO0FBQ2hCLENBQUMsRUFIVyxRQUFRLEtBQVIsUUFBUSxRQUduQjtBQTJERDs7Ozs7O0dBTUc7QUFDSCxNQUFNLE9BQWdCLE9BQU87Q0FvQjVCO0FBRUQsTUFBTSxPQUFnQixZQUFZO0NBU2pDO0FBRUQsTUFBTSxVQUFVLHdCQUF3QixDQUN0QyxhQUFzQixFQUN0QixRQUFnQjtJQUVoQixpREFBaUQ7SUFDakQsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQztJQUNsQyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDO0lBRXBDLG9EQUFvRDtJQUNwRCxPQUFPLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQUVELE1BQU0sVUFBVSx3QkFBd0IsQ0FDdEMsYUFBc0IsRUFDdEIsUUFBa0I7SUFFbEIsaURBQWlEO0lBQ2pELE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUM7SUFDbEMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQztJQUVwQyxvREFBb0Q7SUFDcEQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRCxNQUFNLFVBQVUsd0JBQXdCLENBQ3RDLGFBQXNCLEVBQ3RCLFFBQWtCO0lBRWxCLGlEQUFpRDtJQUNqRCxNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDO0lBQ2xDLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUM7SUFFcEMsb0RBQW9EO0lBQ3BELE9BQU8sSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztBQUM5QyxDQUFDO0FBRUQsTUFBTSxVQUFVLDJCQUEyQixDQUN6QyxhQUF5QixFQUN6QixRQUFpQjtJQUVqQixpREFBaUQ7SUFDakQsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQztJQUNsQyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDO0lBRXBDLG9EQUFvRDtJQUNwRCxPQUFPLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQy9FLENBQUMifQ==