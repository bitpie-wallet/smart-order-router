import { Protocol } from '@uniswap/router-sdk';
import { ChainId } from '../../globalChainId';
import { SubgraphProvider } from '../subgraph-provider';
export const SUBGRAPH_URL_BY_CHAIN = {
    [ChainId.SEPOLIA]: '',
};
export class V4SubgraphProvider extends SubgraphProvider {
    constructor(chainId, retries = 2, timeout = 30000, rollback = true, trackedEthThreshold = 0.01, untrackedUsdThreshold = Number.MAX_VALUE, subgraphUrlOverride, bearerToken) {
        super(Protocol.V4, chainId, retries, timeout, rollback, trackedEthThreshold, untrackedUsdThreshold, subgraphUrlOverride !== null && subgraphUrlOverride !== void 0 ? subgraphUrlOverride : SUBGRAPH_URL_BY_CHAIN[chainId], bearerToken);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViZ3JhcGgtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvcHJvdmlkZXJzL3Y0L3N1YmdyYXBoLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFOUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFxQ3hELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFzQztJQUN0RSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFO0NBQ3RCLENBQUM7QUFnQkYsTUFBTSxPQUFPLGtCQUNYLFNBQVEsZ0JBQW1EO0lBRTNELFlBQ0UsT0FBZ0IsRUFDaEIsT0FBTyxHQUFHLENBQUMsRUFDWCxPQUFPLEdBQUcsS0FBSyxFQUNmLFFBQVEsR0FBRyxJQUFJLEVBQ2YsbUJBQW1CLEdBQUcsSUFBSSxFQUMxQixxQkFBcUIsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUN4QyxtQkFBNEIsRUFDNUIsV0FBb0I7UUFFcEIsS0FBSyxDQUNILFFBQVEsQ0FBQyxFQUFFLEVBQ1gsT0FBTyxFQUNQLE9BQU8sRUFDUCxPQUFPLEVBQ1AsUUFBUSxFQUNSLG1CQUFtQixFQUNuQixxQkFBcUIsRUFDckIsbUJBQW1CLGFBQW5CLG1CQUFtQixjQUFuQixtQkFBbUIsR0FBSSxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsRUFDckQsV0FBVyxDQUNaLENBQUM7SUFDSixDQUFDO0lBRWtCLGVBQWUsQ0FDaEMsT0FBMEI7UUFFMUIsT0FBTztZQUNMLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtZQUNkLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztZQUN4QixXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7WUFDaEMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO1lBQ3BCLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUztZQUM1QixNQUFNLEVBQUU7Z0JBQ04sRUFBRSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTthQUN0QjtZQUNELE1BQU0sRUFBRTtnQkFDTixFQUFFLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2FBQ3RCO1lBQ0QsTUFBTSxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7WUFDL0MsTUFBTSxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7U0FDaEQsQ0FBQztJQUNKLENBQUM7SUFFRCx5Q0FBeUM7SUFDdEIsYUFBYTtRQUM5QixPQUFPOzs7Ozs7Ozs7Ozs7Ozs7O0tBZ0JOLENBQUM7SUFDSixDQUFDO0NBQ0YifQ==