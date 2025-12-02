"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V3SubgraphProvider = void 0;
const router_sdk_1 = require("@uniswap/router-sdk");
const globalChainId_1 = require("../../globalChainId");
const subgraph_provider_1 = require("../subgraph-provider");
const SUBGRAPH_URL_BY_CHAIN = {
    [globalChainId_1.ChainId.MAINNET]: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    [globalChainId_1.ChainId.OPTIMISM]: 'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis',
    // todo: add once subgraph is live
    [globalChainId_1.ChainId.OPTIMISM_SEPOLIA]: '',
    [globalChainId_1.ChainId.ARBITRUM_ONE]: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal',
    // todo: add once subgraph is live
    [globalChainId_1.ChainId.ARBITRUM_SEPOLIA]: '',
    [globalChainId_1.ChainId.POLYGON]: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
    [globalChainId_1.ChainId.CELO]: 'https://api.thegraph.com/subgraphs/name/jesse-sawa/uniswap-celo',
    [globalChainId_1.ChainId.GOERLI]: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-gorli',
    [globalChainId_1.ChainId.BNB]: 'https://api.thegraph.com/subgraphs/name/ilyamk/uniswap-v3---bnb-chain',
    [globalChainId_1.ChainId.AVALANCHE]: 'https://api.thegraph.com/subgraphs/name/lynnshaoyu/uniswap-v3-avax',
    [globalChainId_1.ChainId.BASE]: 'https://api.studio.thegraph.com/query/48211/uniswap-v3-base/version/latest',
    [globalChainId_1.ChainId.BLAST]: 'https://gateway-arbitrum.network.thegraph.com/api/0ae45f0bf40ae2e73119b44ccd755967/subgraphs/id/2LHovKznvo8YmKC9ZprPjsYAZDCc4K5q4AYz8s3cnQn1',
};
class V3SubgraphProvider extends subgraph_provider_1.SubgraphProvider {
    constructor(chainId, retries = 2, timeout = 30000, rollback = true, trackedEthThreshold = 0.01, untrackedUsdThreshold = Number.MAX_VALUE, subgraphUrlOverride) {
        super(router_sdk_1.Protocol.V3, chainId, retries, timeout, rollback, trackedEthThreshold, untrackedUsdThreshold, subgraphUrlOverride !== null && subgraphUrlOverride !== void 0 ? subgraphUrlOverride : SUBGRAPH_URL_BY_CHAIN[chainId]);
    }
    mapSubgraphPool(rawPool) {
        return {
            id: rawPool.id,
            feeTier: rawPool.feeTier,
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
}
exports.V3SubgraphProvider = V3SubgraphProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViZ3JhcGgtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvcHJvdmlkZXJzL3YzL3N1YmdyYXBoLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9EQUErQztBQUcvQyx1REFBOEM7QUFFOUMsNERBQXdEO0FBaUN4RCxNQUFNLHFCQUFxQixHQUFzQztJQUMvRCxDQUFDLHVCQUFPLENBQUMsT0FBTyxDQUFDLEVBQ2YsNERBQTREO0lBQzlELENBQUMsdUJBQU8sQ0FBQyxRQUFRLENBQUMsRUFDaEIsMkVBQTJFO0lBQzdFLGtDQUFrQztJQUNsQyxDQUFDLHVCQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFO0lBQzlCLENBQUMsdUJBQU8sQ0FBQyxZQUFZLENBQUMsRUFDcEIsb0VBQW9FO0lBQ3RFLGtDQUFrQztJQUNsQyxDQUFDLHVCQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFO0lBQzlCLENBQUMsdUJBQU8sQ0FBQyxPQUFPLENBQUMsRUFDZixzRUFBc0U7SUFDeEUsQ0FBQyx1QkFBTyxDQUFDLElBQUksQ0FBQyxFQUNaLGlFQUFpRTtJQUNuRSxDQUFDLHVCQUFPLENBQUMsTUFBTSxDQUFDLEVBQ2Qsb0VBQW9FO0lBQ3RFLENBQUMsdUJBQU8sQ0FBQyxHQUFHLENBQUMsRUFDWCx1RUFBdUU7SUFDekUsQ0FBQyx1QkFBTyxDQUFDLFNBQVMsQ0FBQyxFQUNqQixvRUFBb0U7SUFDdEUsQ0FBQyx1QkFBTyxDQUFDLElBQUksQ0FBQyxFQUNaLDRFQUE0RTtJQUM5RSxDQUFDLHVCQUFPLENBQUMsS0FBSyxDQUFDLEVBQ2IsOElBQThJO0NBQ2pKLENBQUM7QUFnQkYsTUFBYSxrQkFDWCxTQUFRLG9DQUFtRDtJQUUzRCxZQUNFLE9BQWdCLEVBQ2hCLE9BQU8sR0FBRyxDQUFDLEVBQ1gsT0FBTyxHQUFHLEtBQUssRUFDZixRQUFRLEdBQUcsSUFBSSxFQUNmLG1CQUFtQixHQUFHLElBQUksRUFDMUIscUJBQXFCLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFDeEMsbUJBQTRCO1FBRTVCLEtBQUssQ0FDSCxxQkFBUSxDQUFDLEVBQUUsRUFDWCxPQUFPLEVBQ1AsT0FBTyxFQUNQLE9BQU8sRUFDUCxRQUFRLEVBQ1IsbUJBQW1CLEVBQ25CLHFCQUFxQixFQUNyQixtQkFBbUIsYUFBbkIsbUJBQW1CLGNBQW5CLG1CQUFtQixHQUFJLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUN0RCxDQUFDO0lBQ0osQ0FBQztJQUVrQixlQUFlLENBQ2hDLE9BQTBCO1FBRTFCLE9BQU87WUFDTCxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUU7WUFDZCxPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87WUFDeEIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO1lBQzVCLE1BQU0sRUFBRTtnQkFDTixFQUFFLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2FBQ3RCO1lBQ0QsTUFBTSxFQUFFO2dCQUNOLEVBQUUsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7YUFDdEI7WUFDRCxNQUFNLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztZQUMvQyxNQUFNLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztTQUNoRCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBekNELGdEQXlDQyJ9