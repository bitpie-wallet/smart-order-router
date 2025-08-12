import { Protocol } from '@uniswap/router-sdk';
import retry from 'async-retry';
import Timeout from 'await-timeout';
import { gql, GraphQLClient } from 'graphql-request';
import _ from 'lodash';
import { log, metric } from '../../util';
import { PAGE_SIZE } from '../subgraph-provider';
import { SUBGRAPH_URL_BY_CHAIN } from './subgraph-provider';
export class EulerSwapHooksSubgraphProvider {
    constructor(chainId, retries = 2, timeout = 30000, rollback = true, subgraphUrlOverride = SUBGRAPH_URL_BY_CHAIN[chainId]) {
        this.chainId = chainId;
        this.retries = retries;
        this.timeout = timeout;
        this.rollback = rollback;
        this.protocol = Protocol.V4;
        if (!subgraphUrlOverride) {
            throw new Error(`No subgraph url for chain id: ${chainId}`);
        }
        this.client = new GraphQLClient(subgraphUrlOverride);
    }
    async getHooks(providerConfig) {
        const beforeAll = Date.now();
        let blockNumber = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? await providerConfig.blockNumber
            : undefined;
        const query = gql `
      query getEulerSwapHooks($pageSize: Int!, $id: String) {
        eulerSwapHooks(
          first: $pageSize,
          ${blockNumber ? `block: { number: ${blockNumber} }` : ``}
          where: { id_gt: $id }
        ) {
          id
          hook
          asset0
          asset1
          eulerAccount
        }
      }
    `;
        let hooks = [];
        log.info(`Getting hooks from the subgraph with page size ${PAGE_SIZE}${(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? ` as of block ${providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber}`
            : ''}.`);
        let retries = 0;
        await retry(async () => {
            const timeout = new Timeout();
            const getHooks = async () => {
                let lastId = '';
                let hooks = [];
                let hooksPage = [];
                // metrics variables
                let totalPages = 0;
                do {
                    totalPages += 1;
                    const hooksResult = await this.client.request(query, {
                        pageSize: PAGE_SIZE,
                        id: lastId,
                    });
                    hooksPage = hooksResult.eulerSwapHooks;
                    hooks = hooks.concat(hooksPage);
                    lastId = hooks[hooks.length - 1].id;
                    metric.putMetric(`SubgraphProvider.chain_${this.chainId}.getHooks.paginate.pageSize`, hooksPage.length);
                } while (hooksPage.length > 0);
                metric.putMetric(`SubgraphProvider.chain_${this.chainId}.getHooks.paginate`, totalPages);
                metric.putMetric(`SubgraphProvider.chain_${this.chainId}.getHooks.hooks.length`, hooks.length);
                return hooks;
            };
            try {
                const getHooksPromise = getHooks();
                const timerPromise = timeout.set(this.timeout).then(() => {
                    throw new Error(`Timed out getting hooks from subgraph: ${this.timeout}`);
                });
                hooks = await Promise.race([getHooksPromise, timerPromise]);
                return;
            }
            catch (err) {
                log.error({ err }, `Error fetching ${this.protocol} Subgraph Hooks.`);
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
                    metric.putMetric(`SubgraphProvider.chain_${this.chainId}.getHooks.indexError`, 1);
                    blockNumber = blockNumber - 10;
                    log.info(`Detected subgraph indexing error. Rolled back block number to: ${blockNumber}`);
                }
                metric.putMetric(`SubgraphProvider.chain_${this.chainId}.getHooks.timeout`, 1);
                hooks = [];
                log.info({ err }, `Failed to get hooks from subgraph. Retry attempt: ${retry}`);
            },
        });
        metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getHooks.retries`, retries);
        metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getHooks.latency`, Date.now() - beforeAll);
        return hooks;
    }
    async getPoolByHook(hook, providerConfig) {
        const beforeAll = Date.now();
        const blockNumber = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? await providerConfig.blockNumber
            : undefined;
        const query = gql `
      query getPools($pageSize: Int!, $hooks: String) {
        pools(
          first: $pageSize,
          ${blockNumber ? `block: { number: ${blockNumber} }` : ``}
          where: {hooks: $hooks}
        ) {
          id
          token0 {
            symbol
            id
            derivedETH
          }
          token1 {
            symbol
            id
            derivedETH
          }
          feeTier
          tick
          tickSpacing
          liquidity
          hooks
          totalValueLockedUSD
          totalValueLockedETH
          totalValueLockedUSDUntracked
          sqrtPrice
        }
      }
    `;
        let pool = undefined;
        log.info(`Getting pool by hook from the subgraph with page size ${PAGE_SIZE}${(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? ` as of block ${providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber}`
            : ''}.`);
        const poolResult = await this.client.request(query, {
            pageSize: PAGE_SIZE,
            hooks: hook.toLowerCase(),
        });
        pool = poolResult.pools[0];
        metric.putMetric(`SubgraphProvider.chain_${this.chainId}.getPoolByHook.pools.length`, poolResult.pools.length);
        metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPoolByHook.latency`, Date.now() - beforeAll);
        return pool;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXVsZXItc3dhcC1ob29rcy1zdWJncmFwaC1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvdjQvZXVsZXItc3dhcC1ob29rcy1zdWJncmFwaC1wcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDL0MsT0FBTyxLQUFLLE1BQU0sYUFBYSxDQUFDO0FBQ2hDLE9BQU8sT0FBTyxNQUFNLGVBQWUsQ0FBQztBQUNwQyxPQUFPLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3JELE9BQU8sQ0FBQyxNQUFNLFFBQVEsQ0FBQztBQUd2QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV6QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFakQsT0FBTyxFQUFFLHFCQUFxQixFQUFrQixNQUFNLHFCQUFxQixDQUFDO0FBa0I1RSxNQUFNLE9BQU8sOEJBQThCO0lBSXpDLFlBQ1UsT0FBZ0IsRUFDaEIsVUFBVSxDQUFDLEVBQ1gsVUFBVSxLQUFLLEVBQ2YsV0FBVyxJQUFJLEVBQ3ZCLG1CQUFtQixHQUFHLHFCQUFxQixDQUFDLE9BQU8sQ0FBQztRQUo1QyxZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ2hCLFlBQU8sR0FBUCxPQUFPLENBQUk7UUFDWCxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ2YsYUFBUSxHQUFSLFFBQVEsQ0FBTztRQU5qQixhQUFRLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQVM3QixJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsT0FBTyxFQUFFLENBQUMsQ0FBQztTQUM3RDtRQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxhQUFhLENBQUMs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