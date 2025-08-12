import { Protocol } from '@uniswap/router-sdk';
import retry from 'async-retry';
import Timeout from 'await-timeout';
import { gql, GraphQLClient } from 'graphql-request';
import _ from 'lodash';
import { log, metric } from '../util';
export const PAGE_SIZE = 1000; // 1k is max possible query size from subgraph.
export class SubgraphProvider {
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
            this.client = new GraphQLClient(this.subgraphUrl, {
                headers: {
                    authorization: `Bearer ${this.bearerToken}`
                },
            });
        }
        else {
            this.client = new GraphQLClient(this.subgraphUrl);
        }
    }
    async getPools(_currencyIn, _currencyOut, providerConfig) {
        const beforeAll = Date.now();
        let blockNumber = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? await providerConfig.blockNumber
            : undefined;
        log.info(`Getting ${this.protocol} pools from the subgraph with page size ${PAGE_SIZE}${(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? ` as of block ${providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber}`
            : ''}.`);
        // Define separate queries for each filtering condition
        const queries = [
            // 1. Pools with high tracked ETH (for both V3 and V4)
            {
                name: 'High tracked ETH pools',
                query: gql `
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
            ...(this.protocol === Protocol.V4
                ? [
                    {
                        name: 'V4 high liquidity pools',
                        query: gql `
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
            ...(this.protocol === Protocol.V3
                ? [
                    {
                        name: 'V3 zero ETH pools',
                        query: gql `
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
        await retry(async () => {
            const timeout = new Timeout();
            const fetchPoolsForQuery = async (queryConfig) => {
                let lastId = '';
                let pools = [];
                let poolsPage = [];
                let totalPages = 0;
                do {
                    totalPages += 1;
                    const start = Date.now();
                    log.info(`Starting fetching for ${queryConfig.name} page ${totalPages} with page size ${PAGE_SIZE}`);
                    const poolsResult = await this.client.request(queryConfig.query, {
                        pageSize: PAGE_SIZE,
                        id: lastId,
                        ...queryConfig.variables,
                    });
                    poolsPage = poolsResult.pools;
                    pools = pools.concat(poolsPage);
                    if (pools.length > 0) {
                        lastId = pools[pools.length - 1].id;
                    }
                    metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                        .replace(/\s+/g, '_')
                        .toLowerCase()}.paginate.pageSize`, poolsPage.length);
                    log.info(`Fetched ${poolsPage.length} pools for ${queryConfig.name} in ${Date.now() - start}ms`);
                } while (poolsPage.length > 0);
                metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                    .replace(/\s+/g, '_')
                    .toLowerCase()}.paginate`, totalPages);
                metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
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
                log.error({ err }, `Error fetching ${this.protocol} Subgraph Pools.`);
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
                    _.includes(err.message, 'indexed up to')) {
                    metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.indexError`, 1);
                    blockNumber = blockNumber - 10;
                    log.info(`Detected subgraph indexing error. Rolled back block number to: ${blockNumber}`);
                }
                metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.timeout`, 1);
                allPools = [];
                log.info({ err }, `Failed to get pools from subgraph. Retry attempt: ${retry}`);
            },
        });
        metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.retries`, retries);
        const beforeFilter = Date.now();
        let poolsSanitized = [];
        if (this.protocol === Protocol.V3) {
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
        metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.filter.latency`, Date.now() - beforeFilter);
        metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.filter.length`, poolsSanitized.length);
        metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.filter.percent`, (poolsSanitized.length / allPools.length) * 100);
        metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools`, 1);
        metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPools.latency`, Date.now() - beforeAll);
        log.info(`Got ${allPools.length} ${this.protocol} pools from the subgraph (after deduplication). ${poolsSanitized.length} after filtering`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViZ3JhcGgtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvcHJvdmlkZXJzL3N1YmdyYXBoLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxPQUFPLEtBQUssTUFBTSxhQUFhLENBQUM7QUFDaEMsT0FBTyxPQUFPLE1BQU0sZUFBZSxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDckQsT0FBTyxDQUFDLE1BQU0sUUFBUSxDQUFDO0FBR3ZCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBYXRDLE1BQU0sQ0FBQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQywrQ0FBK0M7QUFpQzlFLE1BQU0sT0FBZ0IsZ0JBQWdCO0lBTXBDLFlBQ1UsUUFBa0IsRUFDbEIsT0FBZ0IsRUFDaEIsVUFBVSxDQUFDLEVBQ1gsVUFBVSxLQUFLLEVBQ2YsV0FBVyxJQUFJLEVBQ2Ysc0JBQXNCLElBQUk7SUFDbEMscURBQXFEO0lBQzdDLHdCQUF3QixNQUFNLENBQUMsU0FBUyxFQUN4QyxXQUFvQixFQUNwQixXQUFvQjtRQVRwQixhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ2xCLFlBQU8sR0FBUCxPQUFPLENBQVM7UUFDaEIsWUFBTyxHQUFQLE9BQU8sQ0FBSTtRQUNYLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixhQUFRLEdBQVIsUUFBUSxDQUFPO1FBQ2Ysd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFPO1FBRTFCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBbUI7UUFDeEMsZ0JBQVcsR0FBWCxXQUFXLENBQVM7UUFDcEIsZ0JBQVcsR0FBWCxXQUFXLENBQVM7UUFFNUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIs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