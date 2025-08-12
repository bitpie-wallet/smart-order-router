"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EulerSwapHooksSubgraphProvider = void 0;
const router_sdk_1 = require("@uniswap/router-sdk");
const async_retry_1 = __importDefault(require("async-retry"));
const await_timeout_1 = __importDefault(require("await-timeout"));
const graphql_request_1 = require("graphql-request");
const lodash_1 = __importDefault(require("lodash"));
const util_1 = require("../../util");
const subgraph_provider_1 = require("../subgraph-provider");
const subgraph_provider_2 = require("./subgraph-provider");
class EulerSwapHooksSubgraphProvider {
    constructor(chainId, retries = 2, timeout = 30000, rollback = true, subgraphUrlOverride = subgraph_provider_2.SUBGRAPH_URL_BY_CHAIN[chainId]) {
        this.chainId = chainId;
        this.retries = retries;
        this.timeout = timeout;
        this.rollback = rollback;
        this.protocol = router_sdk_1.Protocol.V4;
        if (!subgraphUrlOverride) {
            throw new Error(`No subgraph url for chain id: ${chainId}`);
        }
        this.client = new graphql_request_1.GraphQLClient(subgraphUrlOverride);
    }
    async getHooks(providerConfig) {
        const beforeAll = Date.now();
        let blockNumber = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? await providerConfig.blockNumber
            : undefined;
        const query = (0, graphql_request_1.gql) `
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
        util_1.log.info(`Getting hooks from the subgraph with page size ${subgraph_provider_1.PAGE_SIZE}${(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? ` as of block ${providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber}`
            : ''}.`);
        let retries = 0;
        await (0, async_retry_1.default)(async () => {
            const timeout = new await_timeout_1.default();
            const getHooks = async () => {
                let lastId = '';
                let hooks = [];
                let hooksPage = [];
                // metrics variables
                let totalPages = 0;
                do {
                    totalPages += 1;
                    const hooksResult = await this.client.request(query, {
                        pageSize: subgraph_provider_1.PAGE_SIZE,
                        id: lastId,
                    });
                    hooksPage = hooksResult.eulerSwapHooks;
                    hooks = hooks.concat(hooksPage);
                    lastId = hooks[hooks.length - 1].id;
                    util_1.metric.putMetric(`SubgraphProvider.chain_${this.chainId}.getHooks.paginate.pageSize`, hooksPage.length);
                } while (hooksPage.length > 0);
                util_1.metric.putMetric(`SubgraphProvider.chain_${this.chainId}.getHooks.paginate`, totalPages);
                util_1.metric.putMetric(`SubgraphProvider.chain_${this.chainId}.getHooks.hooks.length`, hooks.length);
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
                util_1.log.error({ err }, `Error fetching ${this.protocol} Subgraph Hooks.`);
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
                    util_1.metric.putMetric(`SubgraphProvider.chain_${this.chainId}.getHooks.indexError`, 1);
                    blockNumber = blockNumber - 10;
                    util_1.log.info(`Detected subgraph indexing error. Rolled back block number to: ${blockNumber}`);
                }
                util_1.metric.putMetric(`SubgraphProvider.chain_${this.chainId}.getHooks.timeout`, 1);
                hooks = [];
                util_1.log.info({ err }, `Failed to get hooks from subgraph. Retry attempt: ${retry}`);
            },
        });
        util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getHooks.retries`, retries);
        util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getHooks.latency`, Date.now() - beforeAll);
        return hooks;
    }
    async getPoolByHook(hook, providerConfig) {
        const beforeAll = Date.now();
        const blockNumber = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? await providerConfig.blockNumber
            : undefined;
        const query = (0, graphql_request_1.gql) `
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
        util_1.log.info(`Getting pool by hook from the subgraph with page size ${subgraph_provider_1.PAGE_SIZE}${(providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber)
            ? ` as of block ${providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber}`
            : ''}.`);
        const poolResult = await this.client.request(query, {
            pageSize: subgraph_provider_1.PAGE_SIZE,
            hooks: hook.toLowerCase(),
        });
        pool = poolResult.pools[0];
        util_1.metric.putMetric(`SubgraphProvider.chain_${this.chainId}.getPoolByHook.pools.length`, poolResult.pools.length);
        util_1.metric.putMetric(`${this.protocol}SubgraphProvider.chain_${this.chainId}.getPoolByHook.latency`, Date.now() - beforeAll);
        return pool;
    }
}
exports.EulerSwapHooksSubgraphProvider = EulerSwapHooksSubgraphProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXVsZXItc3dhcC1ob29rcy1zdWJncmFwaC1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvdjQvZXVsZXItc3dhcC1ob29rcy1zdWJncmFwaC1wcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxvREFBK0M7QUFDL0MsOERBQWdDO0FBQ2hDLGtFQUFvQztBQUNwQyxxREFBcUQ7QUFDckQsb0RBQXVCO0FBR3ZCLHFDQUF5QztBQUV6Qyw0REFBaUQ7QUFFakQsMkRBQTRFO0FBa0I1RSxNQUFhLDhCQUE4QjtJQUl6QyxZQUNVLE9BQWdCLEVBQ2hCLFVBQVUsQ0FBQyxFQUNYLFVBQVUsS0FBSyxFQUNmLFdBQVcsSUFBSSxFQUN2QixtQkFBbUIsR0FBRyx5Q0FBcUIsQ0FBQyxPQUFPLENBQUM7UUFKNUMsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNoQixZQUFPLEdBQVAsT0FBTyxDQUFJO1FBQ1gsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNmLGFBQVEsR0FBUixRQUFRLENBQU87UUFOakIsYUFBUSxHQUFHLHFCQUFRLENBQUMsRUFBRSxDQUFDO1FBUzdCLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1NBQzdEO1FBQ0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLCtCQUFhLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxjQUErQjtRQUM1QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDN0IsSUFBSSxXQUFXLEdBQUcsQ0FBQSxjQUFjLGFBQWQsY0FBYyx1QkFBZCxjQUFjLENBQUUsV0FBVztZQUMzQyxDQUFDLENBQUMsTUFBTSxjQUFjLENBQUMsV0FBVztZQUNsQyxDQUFDLENBQUMsU0FB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