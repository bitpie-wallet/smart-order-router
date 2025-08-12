"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubgraphProvider = exports.PAGE_SIZE = void 0;
const router_sdk_1 = require("@uniswap/router-sdk");
const async_retry_1 = __importDefault(require("async-retry"));
const await_timeout_1 = __importDefault(require("await-timeout"));
const graphql_request_1 = require("graphql-request");
const lodash_1 = __importDefault(require("lodash"));
const util_1 = require("../util");
exports.PAGE_SIZE = 1000; // 1k is max possible query size from subgraph.
class SubgraphProvider {
    constructor(protocol, chainId, retries = 2, timeout = 30000, rollback = true, trackedEthThreshold = 0.01, 
    // @ts-expect-error - kept for backward compatibility
    untrackedUsdThreshold = Number.MAX_VALUE, subgraphUrl, bearerToken) {
        this.protocol = protocol;
        this.chainId = chainId;
        this.retries = retries;
        this.timeout = timeout;
        this.rollback = rollback;
        this.trackedEthThreshold = trackedEthThreshold;
        this.untrackedUsdThreshold = untrackedUsdThreshold;
        this.subgraphUrl = subgraphUrl;
        this.bearerToken = bearerToken;
        this.protocol = protocol;
        if (!this.subgraphUrl) {
            throw new Error(`No subgraph url for chain id: ${this.chainId}`);
        }
        if (this.bearerToken) {
            this.client = new graphql_request_1.GraphQLClient(this.subgraphUrl, {
                headers: {
                    authorization: `Bearer ${this.bearerToken}`
                },
            });
        }
        else {
            this.client = new graphql_request_1.GraphQLClient(this.subgraphUrl);
        }
    }
    async getPools(_currencyIn, _currencyOut, providerConfig) {
        const beforeAll = Date.now();
        let blockNumber = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? await providerConfig.blockNumber
            : undefined;
        util_1.log.info(`Getting ${this.protocol} pools from the subgraph with page size ${exports.PAGE_SIZE}${(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? ` as of block ${providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber}`
            : ''}.`);
        // Define separate queries for each filtering condition
        const queries = [
            // 1. Pools with high tracked ETH (for both V3 and V4)
            {
                name: 'High tracked ETH pools',
                query: (0, graphql_request_1.gql) `
          query getHighTrackedETHPools($pageSize: Int!, $id: String, $threshold: String!) {
            pools(
              first: $pageSize
              ${blockNumber ? `block: { number: ${blockNumber} }` : ``}
              where: {
                id_gt: $id,
                totalValueLockedETH_gt: $threshold
              }
            ) {
              ${this.getPoolFields()}
            }
          }
        `,
                variables: { threshold: this.trackedEthThreshold.toString() },
            },
            // 2. V4: Pools with liquidity > 0 (separate condition for V4)
            ...(this.protocol === router_sdk_1.Protocol.V4
                ? [
                    {
                        name: 'V4 high liquidity pools',
                        query: (0, graphql_request_1.gql) `
          query getV4HighLiquidityPools($pageSize: Int!, $id: String) {
            pools(
              first: $pageSize
              ${blockNumber ? `block: { number: ${blockNumber} }` : ``}
              where: {
                id_gt: $id,
                liquidity_gt: "0"
              }
            ) {
              ${this.getPoolFields()}
            }
          }
        `,
                        variables: {},
                    },
                ]
                : []),
            // 3. V3: Pools with liquidity > 0 AND totalValueLockedETH = 0 (special V3 condition)
            ...(this.protocol === router_sdk_1.Protocol.V3
                ? [
                    {
                        name: 'V3 zero ETH pools',
                        query: (0, graphql_request_1.gql) `
          query getV3ZeroETHPools($pageSize: Int!, $id: String) {
            pools(
              first: $pageSize
              ${blockNumber ? `block: { number: ${blockNumber} }` : ``}
              where: {
                id_gt: $id,
                liquidity_gt: "0",
                totalValueLockedETH: "0"
              }
            ) {
              ${this.getPoolFields()}
            }
          }
        `,
                        variables: {},
                    },
                ]
                : []),
        ];
        let allPools = [];
        let retries = 0;
        await (0, async_retry_1.default)(async () => {
            const timeout = new await_timeout_1.default();
            const fetchPoolsForQuery = async (queryConfig) => {
                let lastId = '';
                let pools = [];
                let poolsPage = [];
                let totalPages = 0;
                do {
                    totalPages += 1;
                    const start = Date.now();
                    util_1.log.info(`Starting fetching for ${queryConfig.name} page ${totalPages} with page size ${exports.PAGE_SIZE}`);
                    const poolsResult = await this.client.request(queryConfig.query, Object.assign({ pageSize: exports.PAGE_SIZE, id: lastId }, queryConfig.variables));
                    poolsPage = poolsResult.pools;
                    pools = pools.concat(poolsPage);
                    if (pools.length > 0) {
                        lastId = pools[pools.length - 1].id;
                    }
                    util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                        .replace(/\s+/g, '_')
                        .toLowerCase()}.paginate.pageSize`, poolsPage.length);
                    util_1.log.info(`Fetched ${poolsPage.length} pools for ${queryConfig.name} in ${Date.now() - start}ms`);
                } while (poolsPage.length > 0);
                util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                    .replace(/\s+/g, '_')
                    .toLowerCase()}.paginate`, totalPages);
                util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                    .replace(/\s+/g, '_')
                    .toLowerCase()}.pools.length`, pools.length);
                return pools;
            };
            try {
                // Fetch pools for each query in parallel
                const poolPromises = queries.map((queryConfig) => fetchPoolsForQuery(queryConfig));
                const allPoolsArrays = await Promise.all(poolPromises);
                // Merge all results and deduplicate by pool ID
                const poolMap = new Map();
                allPoolsArrays.forEach((pools) => {
                    pools.forEach((pool) => {
                        poolMap.set(pool.id, pool);
                    });
                });
                allPools = Array.from(poolMap.values());
                const getPoolsPromise = Promise.resolve(allPools);
                const timerPromise = timeout.set(this.timeout).then(() => {
                    throw new Error(`Timed out getting pools from subgraph: ${this.timeout}`);
                });
                allPools = await Promise.race([getPoolsPromise, timerPromise]);
                return;
            }
            catch (err) {
                util_1.log.error({ err }, `Error fetching ${this.protocol} Subgraph Pools.`);
                throw err;
            }
            finally {
                timeout.clear();
            }
        }, {
            retries: this.retries,
            onRetry: (err, retry) => {
                retries += 1;
                if (this.rollback &&
                    blockNumber &&
                    lodash_1.default.includes(err.message, 'indexed up to')) {
                    util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.indexError`, 1);
                    blockNumber = blockNumber - 10;
                    util_1.log.info(`Detected subgraph indexing error. Rolled back block number to: ${blockNumber}`);
                }
                util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.timeout`, 1);
                allPools = [];
                util_1.log.info({ err }, `Failed to get pools from subgraph. Retry attempt: ${retry}`);
            },
        });
        util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.retries`, retries);
        const beforeFilter = Date.now();
        let poolsSanitized = [];
        if (this.protocol === router_sdk_1.Protocol.V3) {
            // Special treatment for all V3 pools in order to reduce latency due to thousands of pools with very low TVL locked
            // - Include "parseFloat(pool.totalValueLockedETH) === 0" as in certain occasions we have no way of calculating derivedETH so this is 0
            poolsSanitized = allPools
                .filter((pool) => (parseInt(pool.liquidity) > 0 &&
                parseFloat(pool.totalValueLockedETH) === 0) ||
                parseFloat(pool.totalValueLockedETH) > this.trackedEthThreshold)
                .map((pool) => {
                return this.mapSubgraphPool(pool);
            });
        }
        else {
            poolsSanitized = allPools
                .filter((pool) => parseInt(pool.liquidity) > 0 ||
                parseFloat(pool.totalValueLockedETH) > this.trackedEthThreshold)
                .map((pool) => {
                return this.mapSubgraphPool(pool);
            });
        }
        util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.filter.latency`, Date.now() - beforeFilter);
        util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.filter.length`, poolsSanitized.length);
        util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.filter.percent`, (poolsSanitized.length / allPools.length) * 100);
        util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools`, 1);
        util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.latency`, Date.now() - beforeAll);
        util_1.log.info(`Got ${allPools.length} ${this.protocol} pools from the subgraph (after deduplication). ${poolsSanitized.length} after filtering`);
        return poolsSanitized;
    }
    // Helper method to get the pool fields for GraphQL queries
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
      liquidity
      totalValueLockedUSD
      totalValueLockedETH
    `;
    }
}
exports.SubgraphProvider = SubgraphProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViZ3JhcGgtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvcHJvdmlkZXJzL3N1YmdyYXBoLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLG9EQUErQztBQUUvQyw4REFBZ0M7QUFDaEMsa0VBQW9DO0FBQ3BDLHFEQUFxRDtBQUNyRCxvREFBdUI7QUFHdkIsa0NBQXNDO0FBYXpCLFFBQUEsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLCtDQUErQztBQWlDOUUsTUFBc0IsZ0JBQWdCO0lBTXBDLFlBQ1UsUUFBa0IsRUFDbEIsT0FBZ0IsRUFDaEIsVUFBVSxDQUFDLEVBQ1gsVUFBVSxLQUFLLEVBQ2YsV0FBVyxJQUFJLEVBQ2Ysc0JBQXNCLElBQUk7SUFDbEMscURBQXFEO0lBQzdDLHdCQUF3QixNQUFNLENBQUMsU0FBUyxFQUN4QyxXQUFvQixFQUNwQixXQUFvQjtRQVRwQixhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ2xCLFlBQU8sR0FBUCxPQUFPLENBQVM7UUFDaEIsWUFBTyxHQUFQLE9BQU8sQ0FBSTtRQUNYLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixhQUFRLEdBQVIsUUFBUSxDQUFPO1FBQ2Ysd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFPO1FBRTFCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBbUI7UUFDeEMsZ0JBQVcsR0FBWCxXQUFXLENBQVM7UUFDcEIsZ0JBQVcsR0FBWCxXQUFXLENBQVM7UUFFNUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7U0FDbEU7UUFDRCxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDcEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLCtCQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDaEQsT0FBTyxFQUFFO29CQUNQLGFBQWEsRUFBRSxVQUFVLElBQUksQ0FBQyxXQUFXLEVBQUU7aUJBQzVDO2FBQ0YsQ0FBQyxDQUFDO1NBQ0o7YUFBTTtZQUNMLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSwrQkFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUNuRDtJQUNILENBQUM7SUFFTSxLQUFLLENBQUMsUUFBUSxDQUNuQixXQUFzQixFQUN0QixZQUF1QixFQUN2QixjQUErQjtRQUUvQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDN0IsSUFBSSxXQUFXLEdBQUcsQ0FBQSxjQUFjLGFBQWQsY0FBYyx1QkFBZCxjQUFjLENBQUUsV0FBVztZQUMzQyxDQUFDLENBQUMsTUFBTSxjQUFjLENBQUMsV0FBVztZQUNsQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRWQsVUFBRyxDQUFDLElBQUksQ0FDTixXQUFXLElBQUksQ0FBQyxRQUNoQiwyQ0FBMkMsaUJBQVMsR0FBRyxDQUFBLGNBQWMsYUFBZCxjQUFjLHVCQUFkLGNBQWMsQ0FBRSxXQUFXO1lBQ2hGLENBQUMsQ0FBQyxnQkFBZ0IsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLFdBQVcsRUFBRTtZQUMvQyxDQUFDLENBQUMsRUFDSixHQUFHLENBQ0osQ0FBQztRQUVGLHVEQUF1RDtRQUN2RCxNQUFNLE9BQU8sR0FBRztZQUNkLHNEQUFzRDtZQUN0RDtnQkFDRSxJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixLQUFLLEVBQUUsSUFBQSxxQkFBRyxFQUFBOzs7O2dCQUlGLFdBQVcsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLFdBQVcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFOzs7Ozs7Z0JBTXRELElBQUksQ0FBQyxhQUFhLEVBQUU7OztTQUczQjtnQkFDRCxTQUFTLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxFQUFFO2FBQzlEO1lBQ0QsOERBQThEO1lBQzlELEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLHFCQUFRLENBQUMsRUFBRTtnQkFDL0IsQ0FBQyxDQUFDO29CQUNBO3dCQUNFLElBQUksRUFBRSx5QkFBeUI7d0JBQy9CLEtBQUssRUFBRSxJQUFBLHFCQUFHLEVBQUE7Ozs7Z0JBSU4sV0FBVyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsV0FBVyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7Ozs7OztnQkFNdEQsSUFBSSxDQUFDLGFBQWEsRUFBRTs7O1NBRzNCO3dCQUNHLFNBQVMsRUFBRSxFQUFFO3FCQUNkO2lCQUNGO2dCQUNELENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDUCxxRkFBcUY7WUFDckYsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUsscUJBQVEsQ0FBQyxFQUFFO2dCQUMvQixDQUFDLENBQUM7b0JBQ0E7d0JBQ0UsSUFBSSxFQUFFLG1CQUFtQjt3QkFDekIsS0FBSyxFQUFFLElBQUEscUJBQUcsRUFBQTs7OztnQkFJTixXQUFXLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixXQUFXLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTs7Ozs7OztnQkFPdEQsSUFBSSxDQUFDLGFBQWEsRUFBRTs7O1NBRzNCO3dCQUNHLFNBQVMsRUFBRSxFQUFFO3FCQUNkO2lCQUNGO2dCQUNELENBQUMsQ0FBQyxFQUFFLENBQUM7U0FDUixDQUFDO1FBRUYsSUFBSSxRQUFRLEdBQXVCLEVBQUUsQ0FBQztRQUN0QyxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFFaEIsTUFBTSxJQUFBLHFCQUFLLEVBQ1QsS0FBSyxJQUFJLEVBQUU7WUFDVCxNQUFNLE9BQU8sR0FBRyxJQUFJLHVCQUFPLEVBQUUsQ0FBQztZQUU5QixNQUFNLGtCQUFrQixHQUFHLEtBQUssRUFDOUIsV0FBZ0IsRUFDYSxFQUFFO2dCQUMvQixJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7Z0JBQ2hCLElBQUksS0FBSyxHQUF1QixFQUFFLENBQUM7Z0JBQ25DLElBQUksU0FBUyxHQUF1QixFQUFFLENBQUM7Z0JBQ3ZDLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztnQkFFbkIsR0FBRztvQkFDRCxVQUFVLElBQUksQ0FBQyxDQUFDO29CQUVoQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQ3pCLFVBQUcsQ0FBQyxJQUFJLENBQ04seUJBQXlCLFdBQVcsQ0FBQyxJQUFJLFNBQVMsVUFBVSxtQkFBbUIsaUJBQVMsRUFBRSxDQUMzRixDQUFDO29CQUVGLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBRTFDLFdBQVcsQ0FBQyxLQUFLLGtCQUNsQixRQUFRLEVBQUUsaUJBQVMsRUFDbkIsRUFBRSxFQUFFLE1BQU0sSUFDUCxXQUFXLENBQUMsU0FBUyxFQUN4QixDQUFDO29CQUVILFNBQVMsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDO29CQUU5QixLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFFaEMsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTt3QkFDcEIsTUFBTSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBRSxDQUFDLEVBQUUsQ0FBQztxQkFDdEM7b0JBRUQsYUFBTSxDQUFDLFNBQVMsQ0FDZCxHQUFHLElBQUksQ0FBQyxRQUFRLDBCQUEwQixJQUFJLENBQUMsT0FDL0MsYUFBYSxXQUFXLENBQUMsSUFBSTt5QkFDMUIsT0FBTyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUM7eUJBQ3BCLFdBQVcsRUFBRSxvQkFBb0IsRUFDcEMsU0FBUyxDQUFDLE1BQU0sQ0FDakIsQ0FBQztvQkFDRixVQUFHLENBQUMsSUFBSSxDQUNOLFdBQVcsU0FBUyxDQUFDLE1BQU0sY0FBYyxXQUFXLENBQUMsSUFBSSxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUM3RSxJQUFJLENBQ0wsQ0FBQztpQkFDSCxRQUFRLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUUvQixhQUFNLENBQUMsU0FBUyxDQUNkLEdBQUcsSUFBSSxDQUFDLFFBQVEsMEJBQTBCLElBQUksQ0FBQyxPQUMvQyxhQUFhLFdBQVcsQ0FBQyxJQUFJO3FCQUMxQixPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQztxQkFDcEIsV0FBVyxFQUFFLFdBQVcsRUFDM0IsVUFBVSxDQUNYLENBQUM7Z0JBQ0YsYUFBTSxDQUFDLFNBQVMsQ0FDZCxHQUFHLElBQUksQ0FBQyxRQUFRLDBCQUEwQixJQUFJLENBQUMsT0FDL0MsYUFBYSxXQUFXLENBQUMsSUFBSTtxQkFDMUIsT0FBTyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUM7cUJBQ3BCLFdBQVcsRUFBRSxlQUFlLEVBQy9CLEtBQUssQ0FBQyxNQUFNLENBQ2IsQ0FBQztnQkFFRixPQUFPLEtBQUssQ0FBQztZQUNmLENBQUMsQ0FBQztZQUVGLElBQUk7Z0JBQ0YseUNBQXlDO2dCQUN6QyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FDL0Msa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQ2hDLENBQUM7Z0JBQ0YsTUFBTSxjQUFjLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUV2RCwrQ0FBK0M7Z0JBQy9DLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUE0QixDQUFDO2dCQUNwRCxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7b0JBQy9CLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTt3QkFDckIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUM3QixDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztnQkFFSCxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFFeEMsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDbEQsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtvQkFDdkQsTUFBTSxJQUFJLEtBQUssQ0FDYiwwQ0FBMEMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUN6RCxDQUFDO2dCQUNKLENBQUMsQ0FBQyxDQUFDO2dCQUNILFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDL0QsT0FBTzthQUNSO1lBQUMsT0FBTyxHQUFHLEVBQUU7Z0JBQ1osVUFBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLGtCQUFrQixJQUFJLENBQUMsUUFBUSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUN0RSxNQUFNLEdBQUcsQ0FBQzthQUNYO29CQUFTO2dCQUNSLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQzthQUNqQjtRQUNILENBQUMsRUFDRDtZQUNFLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ3RCLE9BQU8sSUFBSSxDQUFDLENBQUM7Z0JBQ2IsSUFDRSxJQUFJLENBQUMsUUFBUTtvQkFDYixXQUFXO29CQUNYLGdCQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLEVBQ3hDO29CQUNBLGFBQU0sQ0FBQyxTQUFTLENBQ2QsR0FBRyxJQUFJLENBQUMsUUFBUSwwQkFBMEIsSUFBSSxDQUFDLE9BQU8sc0JBQXNCLEVBQzVFLENBQUMsQ0FDRixDQUFDO29CQUNGLFdBQVcsR0FBRyxXQUFXLEdBQUcsRUFBRSxDQUFDO29CQUMvQixVQUFHLENBQUMsSUFBSSxDQUNOLGtFQUFrRSxXQUFXLEVBQUUsQ0FDaEYsQ0FBQztpQkFDSDtnQkFDRCxhQUFNLENBQUMsU0FBUyxDQUNkLEdBQUcsSUFBSSxDQUFDLFFBQVEsMEJBQTBCLElBQUksQ0FBQyxPQUFPLG1CQUFtQixFQUN6RSxDQUFDLENBQ0YsQ0FBQztnQkFDRixRQUFRLEdBQUcsRUFBRSxDQUFDO2dCQUNkLFVBQUcsQ0FBQyxJQUFJLENBQ04sRUFBRSxHQUFHLEVBQUUsRUFDUCxxREFBcUQsS0FBSyxFQUFFLENBQzdELENBQUM7WUFDSixDQUFDO1NBQ0YsQ0FDRixDQUFDO1FBRUYsYUFBTSxDQUFDLFNBQVMsQ0FDZCxHQUFHLElBQUksQ0FBQyxRQUFRLDBCQUEwQixJQUFJLENBQUMsT0FBTyxtQkFBbUIsRUFDekUsT0FBTyxDQUNSLENBQUM7UUFFRixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDaEMsSUFBSSxjQUFjLEdBQW9CLEVBQUUsQ0FBQztRQUN6QyxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUsscUJBQVEsQ0FBQyxFQUFFLEVBQUU7WUFDakMsbUhBQW1IO1lBQ25ILHVJQUF1STtZQUN2SSxjQUFjLEdBQUcsUUFBUTtpQkFDdEIsTUFBTSxDQUNMLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FDUCxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQztnQkFDM0IsVUFBVSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDN0MsVUFBVSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FDbEU7aUJBQ0EsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ1osT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BDLENBQUMsQ0FBQyxDQUFDO1NBQ047YUFBTTtZQUNMLGNBQWMsR0FBRyxRQUFRO2lCQUN0QixNQUFNLENBQ0wsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUNQLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQztnQkFDNUIsVUFBVSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FDbEU7aUJBQ0EsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ1osT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BDLENBQUMsQ0FBQyxDQUFDO1NBQ047UUFFRCxhQUFNLENBQUMsU0FBUyxDQUNkLEdBQUcsSUFBSSxDQUFDLFFBQVEsMEJBQTBCLElBQUksQ0FBQyxPQUFPLDBCQUEwQixFQUNoRixJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsWUFBWSxDQUMxQixDQUFDO1FBQ0YsYUFBTSxDQUFDLFNBQVMsQ0FDZCxHQUFHLElBQUksQ0FBQyxRQUFRLDBCQUEwQixJQUFJLENBQUMsT0FBTyx5QkFBeUIsRUFDL0UsY0FBYyxDQUFDLE1BQU0sQ0FDdEIsQ0FBQztRQUNGLGFBQU0sQ0FBQyxTQUFTLENBQ2QsR0FBRyxJQUFJLENBQUMsUUFBUSwwQkFBMEIsSUFBSSxDQUFDLE9BQU8sMEJBQTBCLEVBQ2hGLENBQUMsY0FBYyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUNoRCxDQUFDO1FBQ0YsYUFBTSxDQUFDLFNBQVMsQ0FDZCxHQUFHLElBQUksQ0FBQyxRQUFRLDBCQUEwQixJQUFJLENBQUMsT0FBTyxXQUFXLEVBQ2pFLENBQUMsQ0FDRixDQUFDO1FBQ0YsYUFBTSxDQUFDLFNBQVMsQ0FDZCxHQUFHLElBQUksQ0FBQyxRQUFRLDBCQUEwQixJQUFJLENBQUMsT0FBTyxtQkFBbUIsRUFDekUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFNBQVMsQ0FDdkIsQ0FBQztRQUVGLFVBQUcsQ0FBQyxJQUFJLENBQ04sT0FBTyxRQUFRLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLG1EQUFtRCxjQUFjLENBQUMsTUFBTSxrQkFBa0IsQ0FDbEksQ0FBQztRQUVGLE9BQU8sY0FBYyxDQUFDO0lBQ3hCLENBQUM7SUFNRCwyREFBMkQ7SUFDakQsYUFBYTtRQUNyQixPQUFPOzs7Ozs7Ozs7Ozs7OztLQWNOLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFoVkQsNENBZ1ZDIn0=