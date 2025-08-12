import http from 'http';
import https from 'https';
import { MaxUint256 } from '@ethersproject/constants';
import { permit2Address } from '@uniswap/permit2-sdk';
import { ChainId } from '../globalChainId';
import { UNIVERSAL_ROUTER_ADDRESS } from '@uniswap/universal-router-sdk';
import axios from 'axios';
import { BigNumber } from 'ethers/lib/ethers';
import { metric, MetricLoggerUnit, SwapType, } from '../routers';
import { Erc20__factory } from '../types/other/factories/Erc20__factory';
import { Permit2__factory } from '../types/other/factories/Permit2__factory';
import { BEACON_CHAIN_DEPOSIT_ADDRESS, log, MAX_UINT160, SWAP_ROUTER_02_ADDRESSES, } from '../util';
import { APPROVE_TOKEN_FOR_TRANSFER } from '../util/callData';
import { calculateGasUsed, initSwapRouteFromExisting, logGasEstimationVsSimulationMetrics, } from '../util/gas-factory-helpers';
import { breakDownTenderlySimulationError } from '../util/tenderlySimulationErrorBreakDown';
import { SimulationStatus, Simulator, } from './simulation-provider';
var TenderlySimulationType;
(function (TenderlySimulationType) {
    TenderlySimulationType["QUICK"] = "quick";
    TenderlySimulationType["FULL"] = "full";
    TenderlySimulationType["ABI"] = "abi";
})(TenderlySimulationType || (TenderlySimulationType = {}));
const TENDERLY_BATCH_SIMULATE_API = (tenderlyBaseUrl, tenderlyUser, tenderlyProject) => `${tenderlyBaseUrl}/api/v1/account/${tenderlyUser}/project/${tenderlyProject}/simulate-batch`;
const TENDERLY_NODE_API = (chainId, tenderlyNodeApiKey) => {
    switch (chainId) {
        case ChainId.MAINNET:
            return `https://mainnet.gateway.tenderly.co/${tenderlyNodeApiKey}`;
        case ChainId.BASE:
            return `https://base.gateway.tenderly.co/${tenderlyNodeApiKey}`;
        case ChainId.ARBITRUM_ONE:
            return `https://arbitrum.gateway.tenderly.co/${tenderlyNodeApiKey}`;
        case ChainId.OPTIMISM:
            return `https://optimism.gateway.tenderly.co/${tenderlyNodeApiKey}`;
        case ChainId.POLYGON:
            return `https://polygon.gateway.tenderly.co/${tenderlyNodeApiKey}`;
        case ChainId.AVALANCHE:
            return `https://avalanche.gateway.tenderly.co/${tenderlyNodeApiKey}`;
        case ChainId.BLAST:
            return `https://blast.gateway.tenderly.co/${tenderlyNodeApiKey}`;
        case ChainId.WORLDCHAIN:
            return `https://worldchain-mainnet.gateway.tenderly.co/${tenderlyNodeApiKey}`;
        case ChainId.UNICHAIN:
            return `https://unichain.gateway.tenderly.co/${tenderlyNodeApiKey}`;
        case ChainId.SONEIUM:
            return `https://soneium.gateway.tenderly.co/${tenderlyNodeApiKey}`;
        default:
            throw new Error(`ChainId ${chainId} does not correspond to a tenderly node endpoint`);
    }
};
export const TENDERLY_NOT_SUPPORTED_CHAINS = [
    ChainId.CELO,
    ChainId.CELO_ALFAJORES,
    ChainId.ZKSYNC,
    // tenderly node RPC supports BNB and ZORA upon request, we will make them available
    ChainId.BNB,
    ChainId.ZORA,
    ChainId.MONAD_TESTNET,
];
// We multiply tenderly gas limit by this to overestimate gas limit
const DEFAULT_ESTIMATE_MULTIPLIER = 1.3;
export class FallbackTenderlySimulator extends Simulator {
    constructor(chainId, provider, portionProvider, tenderlySimulator, ethEstimateGasSimulator) {
        super(provider, portionProvider, chainId);
        this.tenderlySimulator = tenderlySimulator;
        this.ethEstimateGasSimulator = ethEstimateGasSimulator;
    }
    async simulateTransaction(fromAddress, swapOptions, swapRoute, providerConfig) {
        // Make call to eth estimate gas if possible
        // For erc20s, we must check if the token allowance is sufficient
        const inputAmount = swapRoute.trade.inputAmount;
        if (inputAmount.currency.isNative ||
            (await this.checkTokenApproved(fromAddress, inputAmount, swapOptions, this.provider))) {
            log.info('Simulating with eth_estimateGas since token is native or approved.');
            try {
                const swapRouteWithGasEstimate = await this.ethEstimateGasSimulator.ethEstimateGas(fromAddress, swapOptions, swapRoute, providerConfig);
                return swapRouteWithGasEstimate;
            }
            catch (err) {
                log.info({ err: err }, 'Error simulating using eth_estimateGas');
                // If it fails, we should still try to simulate using Tenderly
                // return { ...swapRoute, simulationStatus: SimulationStatus.Failed };
            }
        }
        try {
            return await this.tenderlySimulator.simulateTransaction(fromAddress, swapOptions, swapRoute, providerConfig);
        }
        catch (err) {
            log.error({ err: err }, 'Failed to simulate via Tenderly');
            if (err instanceof Error && err.message.includes('timeout')) {
                metric.putMetric('TenderlySimulationTimeouts', 1, MetricLoggerUnit.Count);
            }
            return { ...swapRoute, simulationStatus: SimulationStatus.SystemDown };
        }
    }
}
export class TenderlySimulator extends Simulator {
    constructor(chainId, tenderlyBaseUrl, tenderlyUser, tenderlyProject, tenderlyAccessKey, tenderlyNodeApiKey, v2PoolProvider, v3PoolProvider, v4PoolProvider, provider, portionProvider, overrideEstimateMultiplier, tenderlyRequestTimeout, tenderlyNodeApiMigrationPercent, tenderlyNodeApiEnabledChains) {
        super(provider, portionProvider, chainId);
        this.tenderlyNodeApiEnabledChains = [];
        this.tenderlyServiceInstance = axios.create({
            // keep connections alive,
            // maxSockets default is Infinity, so Infinity is read as 50 sockets
            httpAgent: new http.Agent({ keepAlive: true }),
            httpsAgent: new https.Agent({ keepAlive: true }),
        });
        this.tenderlyBaseUrl = tenderlyBaseUrl;
        this.tenderlyUser = tenderlyUser;
        this.tenderlyProject = tenderlyProject;
        this.tenderlyAccessKey = tenderlyAccessKey;
        this.tenderlyNodeApiKey = tenderlyNodeApiKey;
        this.v2PoolProvider = v2PoolProvider;
        this.v3PoolProvider = v3PoolProvider;
        this.v4PoolProvider = v4PoolProvider;
        this.overrideEstimateMultiplier = overrideEstimateMultiplier !== null && overrideEstimateMultiplier !== void 0 ? overrideEstimateMultiplier : {};
        this.tenderlyRequestTimeout = tenderlyRequestTimeout;
        this.tenderlyNodeApiMigrationPercent = tenderlyNodeApiMigrationPercent;
        this.tenderlyNodeApiEnabledChains = tenderlyNodeApiEnabledChains;
    }
    async simulateTransaction(fromAddress, swapOptions, swapRoute, providerConfig) {
        var _a, _b, _c;
        const currencyIn = swapRoute.trade.inputAmount.currency;
        const tokenIn = currencyIn.wrapped;
        const currencyOut = swapRoute.trade.outputAmount.currency;
        const tokenOut = currencyOut.wrapped;
        const chainId = this.chainId;
        if (TENDERLY_NOT_SUPPORTED_CHAINS.includes(chainId)) {
            const msg = `${TENDERLY_NOT_SUPPORTED_CHAINS.toString()} not supported by Tenderly!`;
            log.info(msg);
            return { ...swapRoute, simulationStatus: SimulationStatus.NotSupported };
        }
        if (!swapRoute.methodParameters) {
            const msg = 'No calldata provided to simulate transaction';
            log.info(msg);
            throw new Error(msg);
        }
        const { calldata } = swapRoute.methodParameters;
        log.info({
            calldata: swapRoute.methodParameters.calldata,
            fromAddress: fromAddress,
            chainId: chainId,
            tokenInAddress: tokenIn.address,
            router: swapOptions.type,
        }, 'Simulating transaction on Tenderly');
        const blockNumber = await (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber);
        let estimatedGasUsed;
        const estimateMultiplier = (_a = this.overrideEstimateMultiplier[chainId]) !== null && _a !== void 0 ? _a : DEFAULT_ESTIMATE_MULTIPLIER;
        if (swapOptions.type == SwapType.UNIVERSAL_ROUTER) {
            // simulating from beacon chain deposit address that should always hold **enough balance**
            if (currencyIn.isNative && this.chainId == ChainId.MAINNET) {
                fromAddress = BEACON_CHAIN_DEPOSIT_ADDRESS;
            }
            // Do initial onboarding approval of Permit2.
            const erc20Interface = Erc20__factory.createInterface();
            const approvePermit2Calldata = erc20Interface.encodeFunctionData('approve', [permit2Address(this.chainId), MaxUint256]);
            // We are unsure if the users calldata contains a permit or not. We just
            // max approve the Universal Router from Permit2 instead, which will cover both cases.
            const permit2Interface = Permit2__factory.createInterface();
            const approveUniversalRouterCallData = permit2Interface.encodeFunctionData('approve', [
                tokenIn.address,
                UNIVERSAL_ROUTER_ADDRESS(swapOptions.version, this.chainId),
                MAX_UINT160,
                Math.floor(new Date().getTime() / 1000) + 10000000,
            ]);
            const approvePermit2 = {
                network_id: chainId,
                estimate_gas: true,
                input: approvePermit2Calldata,
                to: tokenIn.address,
                value: '0',
                from: fromAddress,
                block_number: blockNumber,
                simulation_type: TenderlySimulationType.QUICK,
                save_if_fails: providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.saveTenderlySimulationIfFailed,
            };
            const approveUniversalRouter = {
                network_id: chainId,
                estimate_gas: true,
                input: approveUniversalRouterCallData,
                to: permit2Address(this.chainId),
                value: '0',
                from: fromAddress,
                block_number: blockNumber,
                simulation_type: TenderlySimulationType.QUICK,
                save_if_fails: providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.saveTenderlySimulationIfFailed,
            };
            const swap = {
                network_id: chainId,
                input: calldata,
                estimate_gas: true,
                to: UNIVERSAL_ROUTER_ADDRESS(swapOptions.version, this.chainId),
                value: currencyIn.isNative ? swapRoute.methodParameters.value : '0',
                from: fromAddress,
                block_number: blockNumber,
                simulation_type: TenderlySimulationType.QUICK,
                save_if_fails: providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.saveTenderlySimulationIfFailed,
            };
            const body = {
                simulations: [approvePermit2, approveUniversalRouter, swap],
                estimate_gas: true,
            };
            const opts = {
                headers: {
                    'X-Access-Key': this.tenderlyAccessKey,
                },
                timeout: this.tenderlyRequestTimeout,
            };
            const url = TENDERLY_BATCH_SIMULATE_API(this.tenderlyBaseUrl, this.tenderlyUser, this.tenderlyProject);
            metric.putMetric('TenderlySimulationUniversalRouterRequests', 1, MetricLoggerUnit.Count);
            const before = Date.now();
            if (Math.random() * 100 < ((_b = this.tenderlyNodeApiMigrationPercent) !== null && _b !== void 0 ? _b : 0) &&
                ((_c = this.tenderlyNodeApiEnabledChains) !== null && _c !== void 0 ? _c : []).find((chainId) => chainId === this.chainId)) {
                const { data: resp, status: httpStatus } = await this.requestNodeSimulation(approvePermit2, approveUniversalRouter, swap);
                // We will maintain the original metrics TenderlySimulationUniversalRouterLatencies and TenderlySimulationUniversalRouterResponseStatus
                // so that they don't provide the existing tenderly dashboard as well as simulation alerts
                // In the meanwhile, we also add tenderly node metrics to distinguish from the tenderly api metrics
                // Once we migrate to node endpoint 100%, original metrics TenderlySimulationUniversalRouterLatencies and TenderlySimulationUniversalRouterResponseStatus
                // will work as is
                metric.putMetric('TenderlySimulationUniversalRouterLatencies', Date.now() - before, MetricLoggerUnit.Milliseconds);
                metric.putMetric('TenderlyNodeSimulationUniversalRouterLatencies', Date.now() - before, MetricLoggerUnit.Milliseconds);
                metric.putMetric(`TenderlySimulationUniversalRouterResponseStatus${httpStatus}`, 1, MetricLoggerUnit.Count);
                metric.putMetric(`TenderlyNodeSimulationUniversalRouterResponseStatus${httpStatus}`, 1, MetricLoggerUnit.Count);
                // technically, we can also early return SimulationStatus.SystemDown when http status is not 200.
                // in reality, when tenderly is down for whatever reason, i see it always throw during axios http request
                // so that it hits the catch block in https://github.com/Uniswap/smart-order-router/blob/8bfec299001d3204483f761f57a38be04512a948/src/providers/tenderly-simulation-provider.ts#L226
                // which is where we want to actually return SimulationStatus.SystemDown
                // in other words, I've never see a TenderlySimulationUniversalRouterResponseStatus metric with a non-200 status
                // if there's downtime, it won't log metric at https://github.com/Uniswap/smart-order-router/blob/8bfec299001d3204483f761f57a38be04512a948/src/providers/tenderly-simulation-provider.ts#L434
                // Validate tenderly response body
                if (!resp ||
                    !resp.result ||
                    resp.result.length < 3 ||
                    resp.result[2].error) {
                    log.error({ resp }, `Failed to invoke Tenderly Node Endpoint for gas estimation bundle ${JSON.stringify(body, null, 2)}.`);
                    if (resp &&
                        resp.result &&
                        resp.result.length >= 3 &&
                        resp.result[2].error &&
                        resp.result[2].error.data) {
                        return {
                            ...swapRoute,
                            simulationStatus: breakDownTenderlySimulationError(tokenIn, tokenOut, resp.result[2].error.data),
                        };
                    }
                    return { ...swapRoute, simulationStatus: SimulationStatus.Failed };
                }
                // Parse the gas used in the simulation response object, and then pad it so that we overestimate.
                estimatedGasUsed = BigNumber.from((Number(resp.result[2].gas) * estimateMultiplier).toFixed(0));
                log.info({
                    body,
                    approvePermit2GasUsed: resp.result[0].gasUsed,
                    approveUniversalRouterGasUsed: resp.result[1].gasUsed,
                    swapGasUsed: resp.result[2].gasUsed,
                    approvePermit2Gas: resp.result[0].gas,
                    approveUniversalRouterGas: resp.result[1].gas,
                    swapGas: resp.result[2].gas,
                    swapWithMultiplier: estimatedGasUsed.toString(),
                }, 'Successfully Simulated Approvals + Swap via Tenderly node endpoint for Universal Router. Gas used.');
            }
            else {
                const { data: resp, status: httpStatus } = await this.tenderlyServiceInstance
                    .post(url, body, opts)
                    .finally(() => {
                    metric.putMetric('TenderlySimulationLatencies', Date.now() - before, MetricLoggerUnit.Milliseconds);
                });
                metric.putMetric('TenderlySimulationUniversalRouterLatencies', Date.now() - before, MetricLoggerUnit.Milliseconds);
                metric.putMetric('TenderlyApiSimulationUniversalRouterLatencies', Date.now() - before, MetricLoggerUnit.Milliseconds);
                metric.putMetric(`TenderlySimulationUniversalRouterResponseStatus${httpStatus}`, 1, MetricLoggerUnit.Count);
                metric.putMetric(`TenderlyApiSimulationUniversalRouterResponseStatus${httpStatus}`, 1, MetricLoggerUnit.Count);
                // Validate tenderly response body
                if (!resp ||
                    resp.simulation_results.length < 3 ||
                    !resp.simulation_results[2].transaction ||
                    resp.simulation_results[2].transaction.error_message) {
                    this.logTenderlyErrorResponse(resp);
                    return { ...swapRoute, simulationStatus: SimulationStatus.Failed };
                }
                // Parse the gas used in the simulation response object, and then pad it so that we overestimate.
                estimatedGasUsed = BigNumber.from((resp.simulation_results[2].transaction.gas * estimateMultiplier).toFixed(0));
                log.info({
                    body,
                    approvePermit2GasUsed: resp.simulation_results[0].transaction.gas_used,
                    approveUniversalRouterGasUsed: resp.simulation_results[1].transaction.gas_used,
                    swapGasUsed: resp.simulation_results[2].transaction.gas_used,
                    approvePermit2Gas: resp.simulation_results[0].transaction.gas,
                    approveUniversalRouterGas: resp.simulation_results[1].transaction.gas,
                    swapGas: resp.simulation_results[2].transaction.gas,
                    swapWithMultiplier: estimatedGasUsed.toString(),
                }, 'Successfully Simulated Approvals + Swap via Tenderly Api endpoint for Universal Router. Gas used.');
                log.info({
                    body,
                    swapSimulation: resp.simulation_results[2].simulation,
                    swapTransaction: resp.simulation_results[2].transaction,
                }, 'Successful Tenderly Api endpoint Swap Simulation for Universal Router');
            }
        }
        else if (swapOptions.type == SwapType.SWAP_ROUTER_02) {
            const approve = {
                network_id: chainId,
                input: APPROVE_TOKEN_FOR_TRANSFER,
                estimate_gas: true,
                to: tokenIn.address,
                value: '0',
                from: fromAddress,
                simulation_type: TenderlySimulationType.QUICK,
            };
            const swap = {
                network_id: chainId,
                input: calldata,
                to: SWAP_ROUTER_02_ADDRESSES(chainId),
                estimate_gas: true,
                value: currencyIn.isNative ? swapRoute.methodParameters.value : '0',
                from: fromAddress,
                block_number: blockNumber,
                simulation_type: TenderlySimulationType.QUICK,
            };
            const body = { simulations: [approve, swap] };
            const opts = {
                headers: {
                    'X-Access-Key': this.tenderlyAccessKey,
                },
                timeout: this.tenderlyRequestTimeout,
            };
            const url = TENDERLY_BATCH_SIMULATE_API(this.tenderlyBaseUrl, this.tenderlyUser, this.tenderlyProject);
            metric.putMetric('TenderlySimulationSwapRouter02Requests', 1, MetricLoggerUnit.Count);
            const before = Date.now();
            const { data: resp, status: httpStatus } = await this.tenderlyServiceInstance.post(url, body, opts);
            metric.putMetric(`TenderlySimulationSwapRouter02ResponseStatus${httpStatus}`, 1, MetricLoggerUnit.Count);
            const latencies = Date.now() - before;
            log.info(`Tenderly simulation swap router02 request body: ${body}, having latencies ${latencies} in milliseconds.`);
            metric.putMetric('TenderlySimulationSwapRouter02Latencies', latencies, MetricLoggerUnit.Milliseconds);
            // Validate tenderly response body
            if (!resp ||
                resp.simulation_results.length < 2 ||
                !resp.simulation_results[1].transaction ||
                resp.simulation_results[1].transaction.error_message) {
                const msg = `Failed to Simulate Via Tenderly!: ${resp.simulation_results[1].transaction.error_message}`;
                log.info({ err: resp.simulation_results[1].transaction.error_message }, msg);
                return { ...swapRoute, simulationStatus: SimulationStatus.Failed };
            }
            // Parse the gas used in the simulation response object, and then pad it so that we overestimate.
            estimatedGasUsed = BigNumber.from((resp.simulation_results[1].transaction.gas * estimateMultiplier).toFixed(0));
            log.info({
                body,
                approveGasUsed: resp.simulation_results[0].transaction.gas_used,
                swapGasUsed: resp.simulation_results[1].transaction.gas_used,
                approveGas: resp.simulation_results[0].transaction.gas,
                swapGas: resp.simulation_results[1].transaction.gas,
                swapWithMultiplier: estimatedGasUsed.toString(),
            }, 'Successfully Simulated Approval + Swap via Tenderly for SwapRouter02. Gas used.');
            log.info({
                body,
                swapTransaction: resp.simulation_results[1].transaction,
                swapSimulation: resp.simulation_results[1].simulation,
            }, 'Successful Tenderly Swap Simulation for SwapRouter02');
        }
        else {
            throw new Error(`Unsupported swap type: ${swapOptions}`);
        }
        const { estimatedGasUsedUSD, estimatedGasUsedQuoteToken, estimatedGasUsedGasToken, quoteGasAdjusted, } = await calculateGasUsed(chainId, swapRoute, estimatedGasUsed, this.v2PoolProvider, this.v3PoolProvider, this.provider, providerConfig);
        logGasEstimationVsSimulationMetrics(swapRoute, estimatedGasUsed, chainId);
        return {
            ...initSwapRouteFromExisting(swapRoute, this.v2PoolProvider, this.v3PoolProvider, this.v4PoolProvider, this.portionProvider, quoteGasAdjusted, estimatedGasUsed, estimatedGasUsedQuoteToken, estimatedGasUsedUSD, swapOptions, estimatedGasUsedGasToken, providerConfig),
            simulationStatus: SimulationStatus.Succeeded,
        };
    }
    logTenderlyErrorResponse(resp) {
        log.info({
            resp,
        }, 'Failed to Simulate on Tenderly');
        log.info({
            err: resp.simulation_results.length >= 1
                ? resp.simulation_results[0].transaction
                : {},
        }, 'Failed to Simulate on Tenderly #1 Transaction');
        log.info({
            err: resp.simulation_results.length >= 1
                ? resp.simulation_results[0].simulation
                : {},
        }, 'Failed to Simulate on Tenderly #1 Simulation');
        log.info({
            err: resp.simulation_results.length >= 2
                ? resp.simulation_results[1].transaction
                : {},
        }, 'Failed to Simulate on Tenderly #2 Transaction');
        log.info({
            err: resp.simulation_results.length >= 2
                ? resp.simulation_results[1].simulation
                : {},
        }, 'Failed to Simulate on Tenderly #2 Simulation');
        log.info({
            err: resp.simulation_results.length >= 3
                ? resp.simulation_results[2].transaction
                : {},
        }, 'Failed to Simulate on Tenderly #3 Transaction');
        log.info({
            err: resp.simulation_results.length >= 3
                ? resp.simulation_results[2].simulation
                : {},
        }, 'Failed to Simulate on Tenderly #3 Simulation');
    }
    async requestNodeSimulation(approvePermit2, approveUniversalRouter, swap) {
        const nodeEndpoint = TENDERLY_NODE_API(this.chainId, this.tenderlyNodeApiKey);
        // TODO: ROUTE-362 - Revisit tenderly node simulation hardcode latest block number
        // https://linear.app/uniswap/issue/ROUTE-362/revisit-tenderly-node-simulation-hardcode-latest-block-number
        const blockNumber = // swap.block_number
         
        // ? BigNumber.from(swap.block_number).toHexString().replace('0x0', '0x')
        'latest';
        const body = {
            id: 1,
            jsonrpc: '2.0',
            method: 'tenderly_estimateGasBundle',
            params: [
                [
                    {
                        from: approvePermit2.from,
                        to: approvePermit2.to,
                        data: approvePermit2.input,
                    },
                    {
                        from: approveUniversalRouter.from,
                        to: approveUniversalRouter.to,
                        data: approveUniversalRouter.input,
                    },
                    { from: swap.from, to: swap.to, data: swap.input },
                ],
                blockNumber,
            ],
        };
        const opts = {
            timeout: this.tenderlyRequestTimeout,
        };
        const before = Date.now();
        try {
            // For now, we don't timeout tenderly node endpoint, but we should before we live switch to node endpoint
            const { data: resp, status: httpStatus } = await this.tenderlyServiceInstance.post(nodeEndpoint, body, opts);
            const latencies = Date.now() - before;
            metric.putMetric('TenderlyNodeGasEstimateBundleLatencies', latencies, MetricLoggerUnit.Milliseconds);
            metric.putMetric('TenderlyNodeGasEstimateBundleSuccess', 1, MetricLoggerUnit.Count);
            if (httpStatus !== 200) {
                log.error(`Failed to invoke Tenderly Node Endpoint for gas estimation bundle ${JSON.stringify(body, null, 2)}. HTTP Status: ${httpStatus}`, { resp });
                return { data: resp, status: httpStatus };
            }
            return { data: resp, status: httpStatus };
        }
        catch (err) {
            log.error({ err }, `Failed to invoke Tenderly Node Endpoint for gas estimation bundle ${JSON.stringify(body, null, 2)}. Error: ${err}`);
            metric.putMetric('TenderlyNodeGasEstimateBundleFailure', 1, MetricLoggerUnit.Count);
            // we will have to re-throw the error, so that simulation-provider can catch the error, and return simulation status = failed
            throw err;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuZGVybHktc2ltdWxhdGlvbi1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9wcm92aWRlcnMvdGVuZGVybHktc2ltdWxhdGlvbi1wcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLElBQUksTUFBTSxNQUFNLENBQUM7QUFDeEIsT0FBTyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBRTFCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUV0RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQzNDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sS0FBNkIsTUFBTSxPQUFPLENBQUM7QUFDbEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRTlDLE9BQU8sRUFFTCxNQUFNLEVBQ04sZ0JBQWdCLEVBR2hCLFFBQVEsR0FDVCxNQUFNLFlBQVksQ0FBQztBQUNwQixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDN0UsT0FBTyxFQUNMLDRCQUE0QixFQUM1QixHQUFHLEVBQ0gsV0FBVyxFQUNYLHdCQUF3QixHQUN6QixNQUFNLFNBQVMsQ0FBQztBQUNqQixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUM5RCxPQUFPLEVBQ0wsZ0JBQWdCLEVBQ2hCLHlCQUF5QixFQUN6QixtQ0FBbUMsR0FDcEMsTUFBTSw2QkFBNkIsQ0FBQztBQUVyQyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUc1RixPQUFPLEVBRUwsZ0JBQWdCLEVBQ2hCLFNBQVMsR0FD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