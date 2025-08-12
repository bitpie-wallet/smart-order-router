"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V4SubgraphProvider = exports.SUBGRAPH_URL_BY_CHAIN = void 0;
const router_sdk_1 = require("@uniswap/router-sdk");
const globalChainId_1 = require("../../globalChainId");
const subgraph_provider_1 = require("../subgraph-provider");
exports.SUBGRAPH_URL_BY_CHAIN = {
    [globalChainId_1.ChainId.SEPOLIA]: '',
};
class V4SubgraphProvider extends subgraph_provider_1.SubgraphProvider {
    constructor(chainId, retries = 2, timeout = 30000, rollback = true, trackedEthThreshold = 0.01, untrackedUsdThreshold = Number.MAX_VALUE, subgraphUrlOverride, bearerToken) {
        super(router_sdk_1.Protocol.V4, chainId, retries, timeout, rollback, trackedEthThreshold, untrackedUsdThreshold, subgraphUrlOverride !== null && subgraphUrlOverride !== void 0 ? subgraphUrlOverride : exports.SUBGRAPH_URL_BY_CHAIN[chainId], bearerToken);
    }
    mapSubgraphPool(rawPool) {
        return {
            id: rawPool.id,
            feeTier: rawPool.feeTier,
            tickSpacing: rawPool.tickSpacing,
            hooks: rawPool.hooks,
            liquidity: rawPool.liquidity,
            token0: {
                id: rawPool.token0.id,
            },
            token1: {
                id: rawPool.token1.id,
            },
            tvlETH: parseFloat(rawPool.totalValueLockedETH),
            tvlUSD: parseFloat(rawPool.totalValueLockedUSD),
        };
    }
    // Override to include V4-specific fields
    getPoolFields() {
        return `
      id
      token0 {
        symbol
        id
      }
      token1 {
        symbol
        id
      }
      feeTier
      tickSpacing
      hooks
      liquidity
      totalValueLockedUSD
      totalValueLockedETH
    `;
    }
}
exports.V4SubgraphProvider = V4SubgraphProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViZ3JhcGgtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvcHJvdmlkZXJzL3Y0L3N1YmdyYXBoLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9EQUErQztBQUUvQyx1REFBOEM7QUFFOUMsNERBQXdEO0FBcUMzQyxRQUFBLHFCQUFxQixHQUFzQztJQUN0RSxDQUFDLHVCQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRTtDQUN0QixDQUFDO0FBZ0JGLE1BQWEsa0JBQ1gsU0FBUSxvQ0FBbUQ7SUFFM0QsWUFDRSxPQUFnQixFQUNoQixPQUFPLEdBQUcsQ0FBQyxFQUNYLE9BQU8sR0FBRyxLQUFLLEVBQ2YsUUFBUSxHQUFHLElBQUksRUFDZixtQkFBbUIsR0FBRyxJQUFJLEVBQzFCLHFCQUFxQixHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQ3hDLG1CQUE0QixFQUM1QixXQUFvQjtRQUVwQixLQUFLLENBQ0gscUJBQVEsQ0FBQyxFQUFFLEVBQ1gsT0FBTyxFQUNQLE9BQU8sRUFDUCxPQUFPLEVBQ1AsUUFBUSxFQUNSLG1CQUFtQixFQUNuQixxQkFBcUIsRUFDckIsbUJBQW1CLGFBQW5CLG1CQUFtQixjQUFuQixtQkFBbUIsR0FBSSw2QkFBcUIsQ0FBQyxPQUFPLENBQUMsRUFDckQsV0FBVyxDQUNaLENBQUM7SUFDSixDQUFDO0lBRWtCLGVBQWUsQ0FDaEMsT0FBMEI7UUFFMUIsT0FBTztZQUNMLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtZQUNkLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztZQUN4QixXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7WUFDaEMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO1lBQ3BCLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUztZQUM1QixNQUFNLEVBQUU7Z0JBQ04sRUFBRSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTthQUN0QjtZQUNELE1BQU0sRUFBRTtnQkFDTixFQUFFLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2FBQ3RCO1lBQ0QsTUFBTSxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7WUFDL0MsTUFBTSxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7U0FDaEQsQ0FBQztJQUNKLENBQUM7SUFFRCx5Q0FBeUM7SUFDdEIsYUFBYTtRQUM5QixPQUFPOzs7Ozs7Ozs7Ozs7Ozs7O0tBZ0JOLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFsRUQsZ0RBa0VDIn0=