import retry from 'async-retry';
import Timeout from 'await-timeout';
import { gql, GraphQLClient } from 'graphql-request';
import _ from 'lodash';
import { log } from '../../util/log';
import { metric } from '../../util/metric';
import { ChainId } from '../../globalChainId';
const SUBGRAPH_URL_BY_CHAIN = {
    [ChainId.MAINNET]: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v2-dev',
};
const PAGE_SIZE = 1000; // 1k is max possible query size from subgraph.
export class V2SubgraphProvider {
    constructor(chainId, retries = 2, timeout = 360000, rollback = true, pageSize = PAGE_SIZE, trackedEthThreshold = 0.025, untrackedUsdThreshold = Number.MAX_VALUE, subgraphUrlOverride) {
        var _a;
        this.chainId = chainId;
        this.retries = retries;
        this.timeout = timeout;
        this.rollback = rollback;
        this.pageSize = pageSize;
        this.trackedEthThreshold = trackedEthThreshold;
        this.untrackedUsdThreshold = untrackedUsdThreshold;
        this.subgraphUrlOverride = subgraphUrlOverride;
        const subgraphUrl = (_a = this.subgraphUrlOverride) !== null && _a !== void 0 ? _a : SUBGRAPH_URL_BY_CHAIN[this.chainId];
        if (!subgraphUrl) {
            throw new Error(`No subgraph url for chain id: ${this.chainId}`);
        }
        this.client = new GraphQLClient(subgraphUrl);
    }
    async getPools(_tokenIn, _tokenOut, providerConfig) {
        const beforeAll = Date.now();
        let blockNumber = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? await providerConfig.blockNumber
            : undefined;
        log.info(`Getting V2 pools from the subgraph with page size ${this.pageSize}${(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? ` as of block ${providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber}`
            : ''}.`);
        // TODO: Remove. Temporary fix to ensure tokens without trackedReserveETH are in the list.
        const FEI = '0x956f47f50a910163d8bf957cf5846d573e7f87ca';
        const virtualTokenAddress = '0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b'.toLowerCase();
        // Define separate queries for each filtering condition
        // Note: GraphQL doesn't support OR conditions, so we need separate queries for each condition
        const queries = [
            // 1. FEI token pools - split into two queries since OR is not supported
            {
                name: 'FEI pools (token0)',
                query: gql `
          query getFEIPoolsToken0($pageSize: Int!, $id: String, $feiToken: String!) {
            pairs(
              first: $pageSize
              ${blockNumber ? `block: { number: ${blockNumber} }` : ``}
              where: { 
                id_gt: $id,
                token0: $feiToken
              }
            ) {
              id
              token0 { id, symbol }
              token1 { id, symbol }
              totalSupply
              trackedReserveETH
              reserveETH
              reserveUSD
            }
          }
        `,
                variables: { feiToken: FEI },
            },
            {
                name: 'FEI pools (token1)',
                query: gql `
          query getFEIPoolsToken1($pageSize: Int!, $id: String, $feiToken: String!) {
            pairs(
              first: $pageSize
              ${blockNumber ? `block: { number: ${blockNumber} }` : ``}
              where: { 
                id_gt: $id,
                token1: $feiToken
              }
            ) {
              id
              token0 { id, symbol }
              token1 { id, symbol }
              totalSupply
              trackedReserveETH
              reserveETH
              reserveUSD
            }
          }
        `,
                variables: { feiToken: FEI },
            },
            // 2. Virtual pair pools (only for BASE chain) - split into two queries
            ...(this.chainId === ChainId.BASE
                ? [
                    {
                        name: 'Virtual pair pools (token0)',
                        query: gql `
            query getVirtualPoolsToken0($pageSize: Int!, $id: String, $virtualToken: String!) {
              pairs(
                first: $pageSize
                ${blockNumber ? `block: { number: ${blockNumber} }` : ``}
                where: { 
                  id_gt: $id,
                  token0: $virtualToken
                }
              ) {
                id
                token0 { id, symbol }
                token1 { id, symbol }
                totalSupply
                trackedReserveETH
                reserveETH
                reserveUSD
              }
            }
          `,
                        variables: { virtualToken: virtualTokenAddress },
                    },
                    {
                        name: 'Virtual pair pools (token1)',
                        query: gql `
            query getVirtualPoolsToken1($pageSize: Int!, $id: String, $virtualToken: String!) {
              pairs(
                first: $pageSize
                ${blockNumber ? `block: { number: ${blockNumber} }` : ``}
                where: { 
                  id_gt: $id,
                  token1: $virtualToken
                }
              ) {
                id
                token0 { id, symbol }
                token1 { id, symbol }
                totalSupply
                trackedReserveETH
                reserveETH
                reserveUSD
              }
            }
          `,
                        variables: { virtualToken: virtualTokenAddress },
                    },
                ]
                : []),
            // 3. High tracked reserve ETH pools
            {
                name: 'High tracked reserve ETH pools',
                query: gql `
          query getHighTrackedReservePools($pageSize: Int!, $id: String, $threshold: String!) {
            pairs(
              first: $pageSize
              ${blockNumber ? `block: { number: ${blockNumber} }` : ``}
              where: { 
                id_gt: $id,
                trackedReserveETH_gt: $threshold
              }
            ) {
              id
              token0 { id, symbol }
              token1 { id, symbol }
              totalSupply
              trackedReserveETH
              reserveETH
              reserveUSD
            }
          }
        `,
                variables: { threshold: this.trackedEthThreshold.toString() },
            },
            // 4. High untracked USD pools
            {
                name: 'High untracked USD pools',
                query: gql `
          query getHighUSDReservePools($pageSize: Int!, $id: String, $threshold: String!) {
            pairs(
              first: $pageSize
              ${blockNumber ? `block: { number: ${blockNumber} }` : ``}
              where: { 
                id_gt: $id,
                reserveUSD_gt: $threshold
              }
            ) {
              id
              token0 { id, symbol }
              token1 { id, symbol }
              totalSupply
              trackedReserveETH
              reserveETH
              reserveUSD
            }
          }
        `,
                variables: { threshold: this.untrackedUsdThreshold.toString() },
            },
        ];
        let allPools = [];
        let outerRetries = 0;
        await retry(async () => {
            const timeout = new Timeout();
            const fetchPoolsForQuery = async (queryConfig) => {
                let lastId = '';
                let pools = [];
                let poolsPage = [];
                let totalPages = 0;
                let retries = 0;
                do {
                    totalPages += 1;
                    const start = Date.now();
                    log.info(`Starting fetching for ${queryConfig.name} page ${totalPages} with page size ${this.pageSize}`);
                    await retry(async () => {
                        const before = Date.now();
                        const poolsResult = await this.client.request(queryConfig.query, {
                            pageSize: this.pageSize,
                            id: lastId,
                            ...queryConfig.variables,
                        });
                        metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                            .replace(/\s+/g, '_')
                            .toLowerCase()}.paginate.latency`, Date.now() - before);
                        poolsPage = poolsResult.pairs;
                        pools = pools.concat(poolsPage);
                        if (pools.length > 0) {
                            lastId = pools[pools.length - 1].id;
                        }
                        metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                            .replace(/\s+/g, '_')
                            .toLowerCase()}.paginate.pageSize`, poolsPage.length);
                    }, {
                        retries: this.retries,
                        onRetry: (err, retry) => {
                            retries += 1;
                            log.error({ err, lastId }, `Failed request for ${queryConfig.name} page of pools from subgraph. Retry attempt: ${retry}. LastId: ${lastId}`);
                        },
                    });
                    log.info(`Fetched ${poolsPage.length} pools for ${queryConfig.name} in ${Date.now() - start}ms`);
                } while (poolsPage.length > 0);
                metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                    .replace(/\s+/g, '_')
                    .toLowerCase()}.paginate`, totalPages);
                metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                    .replace(/\s+/g, '_')
                    .toLowerCase()}.pairs.length`, pools.length);
                metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                    .replace(/\s+/g, '_')
                    .toLowerCase()}.paginate.retries`, retries);
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
                log.error({ err }, 'Error fetching V2 Subgraph Pools.');
                throw err;
            }
            finally {
                timeout.clear();
            }
        }, {
            retries: this.retries,
            onRetry: (err, retry) => {
                outerRetries += 1;
                if (this.rollback &&
                    blockNumber &&
                    _.includes(err.message, 'indexed up to')) {
                    metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.indexError`, 1);
                    blockNumber = blockNumber - 10;
                    log.info(`Detected subgraph indexing error. Rolled back block number to: ${blockNumber}`);
                }
                metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.timeout`, 1);
                allPools = [];
                log.info({ err }, `Failed to get pools from subgraph. Retry attempt: ${retry}`);
            },
        });
        metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.retries`, outerRetries);
        // Apply the same filtering logic to ensure consistency
        const beforeFilter = Date.now();
        const poolsSanitized = allPools
            .filter((pool) => {
            return (pool.token0.id == FEI ||
                pool.token1.id == FEI ||
                this.isVirtualPairBaseV2Pool(pool) ||
                parseFloat(pool.trackedReserveETH) > this.trackedEthThreshold ||
                parseFloat(pool.reserveUSD) > this.untrackedUsdThreshold);
        })
            .map((pool) => {
            return {
                id: pool.id.toLowerCase(),
                token0: {
                    id: pool.token0.id.toLowerCase(),
                },
                token1: {
                    id: pool.token1.id.toLowerCase(),
                },
                supply: parseFloat(pool.totalSupply),
                reserve: parseFloat(pool.trackedReserveETH),
                reserveUSD: parseFloat(pool.reserveUSD),
            };
        });
        metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.filter.latency`, Date.now() - beforeFilter);
        metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.untracked.length`, poolsSanitized.length);
        metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.untracked.percent`, (poolsSanitized.length / allPools.length) * 100);
        metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools`, 1);
        metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.latency`, Date.now() - beforeAll);
        log.info(`Got ${allPools.length} V2 pools from the subgraph (after deduplication). ${poolsSanitized.length} after filtering`);
        return poolsSanitized;
    }
    // This method checks if a given pool contains the VIRTUAL token.
    isVirtualPairBaseV2Pool(pool) {
        const virtualTokenAddress = '0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b'.toLowerCase();
        return (this.chainId === ChainId.BASE &&
            (pool.token0.id.toLowerCase() === virtualTokenAddress ||
                pool.token1.id.toLowerCase() === virtualTokenAddress));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViZ3JhcGgtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvcHJvdmlkZXJzL3YyL3N1YmdyYXBoLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sS0FBSyxNQUFNLGFBQWEsQ0FBQztBQUNoQyxPQUFPLE9BQU8sTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNyRCxPQUFPLENBQUMsTUFBTSxRQUFRLENBQUM7QUFFdkIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3JDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUUzQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUE4QjlDLE1BQU0scUJBQXFCLEdBQXNDO0lBQy9ELENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUNmLGtFQUFrRTtDQUNyRSxDQUFDO0FBRUYsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsK0NBQStDO0FBZ0J2RSxNQUFNLE9BQU8sa0JBQWtCO0lBRzdCLFlBQ1UsT0FBZ0IsRUFDaEIsVUFBVSxDQUFDLEVBQ1gsVUFBVSxNQUFNLEVBQ2hCLFdBQVcsSUFBSSxFQUNmLFdBQVcsU0FBUyxFQUNwQixzQkFBc0IsS0FBSyxFQUMzQix3QkFBd0IsTUFBTSxDQUFDLFNBQVMsRUFDeEMsbUJBQTRCOztRQVA1QixZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ2hCLFlBQU8sR0FBUCxPQUFPLENBQUk7UUFDWCxZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ2hCLGFBQVEsR0FBUixRQUFRLENBQU87UUFDZixhQUFRLEdBQVIsUUFBUSxDQUFZO1FBQ3BCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBUTtRQUMzQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQW1CO1FBQ3hD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