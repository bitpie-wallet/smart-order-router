"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2SubgraphProvider = void 0;
const async_retry_1 = __importDefault(require("async-retry"));
const await_timeout_1 = __importDefault(require("await-timeout"));
const graphql_request_1 = require("graphql-request");
const lodash_1 = __importDefault(require("lodash"));
const log_1 = require("../../util/log");
const metric_1 = require("../../util/metric");
const globalChainId_1 = require("../../globalChainId");
const SUBGRAPH_URL_BY_CHAIN = {
    [globalChainId_1.ChainId.MAINNET]: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v2-dev',
};
const PAGE_SIZE = 1000; // 1k is max possible query size from subgraph.
class V2SubgraphProvider {
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
        this.client = new graphql_request_1.GraphQLClient(subgraphUrl);
    }
    async getPools(_tokenIn, _tokenOut, providerConfig) {
        const beforeAll = Date.now();
        let blockNumber = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? await providerConfig.blockNumber
            : undefined;
        log_1.log.info(`Getting V2 pools from the subgraph with page size ${this.pageSize}${(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
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
                query: (0, graphql_request_1.gql) `
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
                query: (0, graphql_request_1.gql) `
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
            ...(this.chainId === globalChainId_1.ChainId.BASE
                ? [
                    {
                        name: 'Virtual pair pools (token0)',
                        query: (0, graphql_request_1.gql) `
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
                        query: (0, graphql_request_1.gql) `
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
                query: (0, graphql_request_1.gql) `
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
                query: (0, graphql_request_1.gql) `
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
        await (0, async_retry_1.default)(async () => {
            const timeout = new await_timeout_1.default();
            const fetchPoolsForQuery = async (queryConfig) => {
                let lastId = '';
                let pools = [];
                let poolsPage = [];
                let totalPages = 0;
                let retries = 0;
                do {
                    totalPages += 1;
                    const start = Date.now();
                    log_1.log.info(`Starting fetching for ${queryConfig.name} page ${totalPages} with page size ${this.pageSize}`);
                    await (0, async_retry_1.default)(async () => {
                        const before = Date.now();
                        const poolsResult = await this.client.request(queryConfig.query, Object.assign({ pageSize: this.pageSize, id: lastId }, queryConfig.variables));
                        metric_1.metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                            .replace(/\s+/g, '_')
                            .toLowerCase()}.paginate.latency`, Date.now() - before);
                        poolsPage = poolsResult.pairs;
                        pools = pools.concat(poolsPage);
                        if (pools.length > 0) {
                            lastId = pools[pools.length - 1].id;
                        }
                        metric_1.metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                            .replace(/\s+/g, '_')
                            .toLowerCase()}.paginate.pageSize`, poolsPage.length);
                    }, {
                        retries: this.retries,
                        onRetry: (err, retry) => {
                            retries += 1;
                            log_1.log.error({ err, lastId }, `Failed request for ${queryConfig.name} page of pools from subgraph. Retry attempt: ${retry}. LastId: ${lastId}`);
                        },
                    });
                    log_1.log.info(`Fetched ${poolsPage.length} pools for ${queryConfig.name} in ${Date.now() - start}ms`);
                } while (poolsPage.length > 0);
                metric_1.metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                    .replace(/\s+/g, '_')
                    .toLowerCase()}.paginate`, totalPages);
                metric_1.metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
                    .replace(/\s+/g, '_')
                    .toLowerCase()}.pairs.length`, pools.length);
                metric_1.metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.${queryConfig.name
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
                log_1.log.error({ err }, 'Error fetching V2 Subgraph Pools.');
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
                    lodash_1.default.includes(err.message, 'indexed up to')) {
                    metric_1.metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.indexError`, 1);
                    blockNumber = blockNumber - 10;
                    log_1.log.info(`Detected subgraph indexing error. Rolled back block number to: ${blockNumber}`);
                }
                metric_1.metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.timeout`, 1);
                allPools = [];
                log_1.log.info({ err }, `Failed to get pools from subgraph. Retry attempt: ${retry}`);
            },
        });
        metric_1.metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.retries`, outerRetries);
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
        metric_1.metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.filter.latency`, Date.now() - beforeFilter);
        metric_1.metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.untracked.length`, poolsSanitized.length);
        metric_1.metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.untracked.percent`, (poolsSanitized.length / allPools.length) * 100);
        metric_1.metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools`, 1);
        metric_1.metric.putMetric(`V2SubgraphProvider.chain_${this.chainId}.getPools.latency`, Date.now() - beforeAll);
        log_1.log.info(`Got ${allPools.length} V2 pools from the subgraph (after deduplication). ${poolsSanitized.length} after filtering`);
        return poolsSanitized;
    }
    // This method checks if a given pool contains the VIRTUAL token.
    isVirtualPairBaseV2Pool(pool) {
        const virtualTokenAddress = '0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b'.toLowerCase();
        return (this.chainId === globalChainId_1.ChainId.BASE &&
            (pool.token0.id.toLowerCase() === virtualTokenAddress ||
                pool.token1.id.toLowerCase() === virtualTokenAddress));
    }
}
exports.V2SubgraphProvider = V2SubgraphProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViZ3JhcGgtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvcHJvdmlkZXJzL3YyL3N1YmdyYXBoLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLDhEQUFnQztBQUNoQyxrRUFBb0M7QUFDcEMscURBQXFEO0FBQ3JELG9EQUF1QjtBQUV2Qix3Q0FBcUM7QUFDckMsOENBQTJDO0FBRTNDLHVEQUE4QztBQThCOUMsTUFBTSxxQkFBcUIsR0FBc0M7SUFDL0QsQ0FBQyx1QkFBTyxDQUFDLE9BQU8sQ0FBQyxFQUNmLGtFQUFrRTtDQUNyRSxDQUFDO0FBRUYsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsK0NBQStDO0FBZ0J2RSxNQUFhLGtCQUFrQjtJQUc3QixZQUNVLE9BQWdCLEVBQ2hCLFVBQVUsQ0FBQyxFQUNYLFVBQVUsTUFBTSxFQUNoQixXQUFXLElBQUksRUFDZixXQUFXLFNBQVMsRUFDcEIsc0JBQXNCLEtBQUssRUFDM0Isd0JBQXdCLE1BQU0sQ0FBQyxTQUFTLEVBQ3hDLG1CQUE0Qjs7UUFQNUIsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNoQixZQUFPLEdBQVAsT0FBTyxDQUFJO1FBQ1gsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNoQixhQUFRLEdBQVIsUUFBUSxDQUFPO1FBQ2YsYUFBUSxHQUFSLFFBQVEsQ0FBWTtRQUNwQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQVE7UUFDM0IsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUFtQjtRQUN4Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQVM7UUFFcEMsTUFBTSxXQUFXLEdBQ2YsTUFBQSxJQUFJLENBQUMsbUJBQW1CLG1DQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUNBQWlDLElBQUksQ0FBQyxP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