"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApplicableV4FeesTickspacingsHooks = exports.getApplicableV3FeeAmounts = exports.unparseFeeAmount = exports.parseFeeAmount = exports.parseAmount = exports.MAX_UINT160 = exports.CurrencyAmount = void 0;
const units_1 = require("@ethersproject/units");
const router_sdk_1 = require("@uniswap/router-sdk");
const sdk_core_1 = require("@uniswap/sdk-core");
const v3_sdk_1 = require("@uniswap/v3-sdk");
const jsbi_1 = __importDefault(require("jsbi"));
const globalChainId_1 = require("../globalChainId");
class CurrencyAmount extends sdk_core_1.CurrencyAmount {
}
exports.CurrencyAmount = CurrencyAmount;
exports.MAX_UINT160 = '0xffffffffffffffffffffffffffffffffffffffff';
// Try to parse a user entered amount for a given token
function parseAmount(value, currency) {
    const typedValueParsed = (0, units_1.parseUnits)(value, currency.decimals).toString();
    return CurrencyAmount.fromRawAmount(currency, jsbi_1.default.BigInt(typedValueParsed));
}
exports.parseAmount = parseAmount;
function parseFeeAmount(feeAmountStr) {
    switch (feeAmountStr) {
        case '10000':
            return v3_sdk_1.FeeAmount.HIGH;
        case '3000':
            return v3_sdk_1.FeeAmount.MEDIUM;
        case '500':
            return v3_sdk_1.FeeAmount.LOW;
        case '400':
            return v3_sdk_1.FeeAmount.LOW_400;
        case '300':
            return v3_sdk_1.FeeAmount.LOW_300;
        case '200':
            return v3_sdk_1.FeeAmount.LOW_200;
        case '100':
            return v3_sdk_1.FeeAmount.LOWEST;
        default:
            throw new Error(`Fee amount ${feeAmountStr} not supported.`);
    }
}
exports.parseFeeAmount = parseFeeAmount;
function unparseFeeAmount(feeAmount) {
    switch (feeAmount) {
        case v3_sdk_1.FeeAmount.HIGH:
            return '10000';
        case v3_sdk_1.FeeAmount.MEDIUM:
            return '3000';
        case v3_sdk_1.FeeAmount.LOW:
            return '500';
        case v3_sdk_1.FeeAmount.LOW_400:
            return '400';
        case v3_sdk_1.FeeAmount.LOW_300:
            return '300';
        case v3_sdk_1.FeeAmount.LOW_200:
            return '200';
        case v3_sdk_1.FeeAmount.LOWEST:
            return '100';
        default:
            throw new Error(`Fee amount ${feeAmount} not supported.`);
    }
}
exports.unparseFeeAmount = unparseFeeAmount;
function getApplicableV3FeeAmounts(chainId) {
    const feeAmounts = [
        v3_sdk_1.FeeAmount.HIGH,
        v3_sdk_1.FeeAmount.MEDIUM,
        v3_sdk_1.FeeAmount.LOW,
        v3_sdk_1.FeeAmount.LOWEST,
    ];
    if (chainId === globalChainId_1.ChainId.BASE) {
        feeAmounts.push(v3_sdk_1.FeeAmount.LOW_200, v3_sdk_1.FeeAmount.LOW_300, v3_sdk_1.FeeAmount.LOW_400);
    }
    return feeAmounts;
}
exports.getApplicableV3FeeAmounts = getApplicableV3FeeAmounts;
function getApplicableV4FeesTickspacingsHooks(chainId) {
    const feeAmounts = [
        v3_sdk_1.FeeAmount.HIGH,
        v3_sdk_1.FeeAmount.MEDIUM,
        v3_sdk_1.FeeAmount.LOW,
        v3_sdk_1.FeeAmount.LOWEST,
    ];
    if (chainId === globalChainId_1.ChainId.BASE) {
        feeAmounts.push(v3_sdk_1.FeeAmount.LOW_200, v3_sdk_1.FeeAmount.LOW_300, v3_sdk_1.FeeAmount.LOW_400);
    }
    return feeAmounts.map((feeAmount) => [
        feeAmount,
        v3_sdk_1.TICK_SPACINGS[feeAmount],
        router_sdk_1.ADDRESS_ZERO,
    ]);
}
exports.getApplicableV4FeesTickspacingsHooks = getApplicableV4FeesTickspacingsHooks;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1vdW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy91dGlsL2Ftb3VudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsZ0RBQWtEO0FBQ2xELG9EQUFtRDtBQUNuRCxnREFHMkI7QUFDM0IsNENBQTJEO0FBQzNELGdEQUF3QjtBQUV4QixvREFBMkM7QUFFM0MsTUFBYSxjQUFlLFNBQVEseUJBQTJCO0NBQUk7QUFBbkUsd0NBQW1FO0FBRXRELFFBQUEsV0FBVyxHQUFHLDRDQUE0QyxDQUFDO0FBRXhFLHVEQUF1RDtBQUN2RCxTQUFnQixXQUFXLENBQUMsS0FBYSxFQUFFLFFBQWtCO0lBQzNELE1BQU0sZ0JBQWdCLEdBQUcsSUFBQSxrQkFBVSxFQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDekUsT0FBTyxjQUFjLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxjQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztBQUMvRSxDQUFDO0FBSEQsa0NBR0M7QUFFRCxTQUFnQixjQUFjLENBQUMsWUFBb0I7SUFDakQsUUFBUSxZQUFZLEVBQUU7UUFDcEIsS0FBSyxPQUFPO1lBQ1YsT0FBTyxrQkFBUyxDQUFDLElBQUksQ0FBQztRQUN4QixLQUFLLE1BQU07WUFDVCxPQUFPLGtCQUFTLENBQUMsTUFBTSxDQUFDO1FBQzFCLEtBQUssS0FBSztZQUNSLE9BQU8sa0JBQVMsQ0FBQyxHQUFHLENBQUM7UUFDdkIsS0FBSyxLQUFLO1lBQ1IsT0FBTyxrQkFBUyxDQUFDLE9BQU8sQ0FBQztRQUMzQixLQUFLLEtBQUs7WUFDUixPQUFPLGtCQUFTLENBQUMsT0FBTyxDQUFDO1FBQzNCLEtBQUssS0FBSztZQUNSLE9BQU8sa0JBQVMsQ0FBQyxPQUFPLENBQUM7UUFDM0IsS0FBSyxLQUFLO1lBQ1IsT0FBTyxrQkFBUyxDQUFDLE1BQU0sQ0FBQztRQUMxQjtZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxZQUFZLGlCQUFpQixDQUFDLENBQUM7S0FDaEU7QUFDSCxDQUFDO0FBbkJELHdDQW1CQztBQUVELFNBQWdCLGdCQUFnQixDQUFDLFNBQW9CO0lBQ25ELFFBQVEsU0FBUyxFQUFFO1FBQ2pCLEtBQUssa0JBQVMsQ0FBQyxJQUFJO1lBQ2pCLE9BQU8sT0FBTyxDQUFDO1FBQ2pCLEtBQUssa0JBQVMsQ0FBQyxNQUFNO1lBQ25CLE9BQU8sTUFBTSxDQUFDO1FBQ2hCLEtBQUssa0JBQVMsQ0FBQyxHQUFHO1lBQ2hCLE9BQU8sS0FBSyxDQUFDO1FBQ2YsS0FBSyxrQkFBUyxDQUFDLE9BQU87WUFDcEIsT0FBTyxLQUFLLENBQUM7UUFDZixLQUFLLGtCQUFTLENBQUMsT0FBTztZQUNwQixPQUFPLEtBQUssQ0FBQztRQUNmLEtBQUssa0JBQVMsQ0FBQyxPQUFPO1lBQ3BCLE9BQU8sS0FBSyxDQUFDO1FBQ2YsS0FBSyxrQkFBUyxDQUFDLE1BQU07WUFDbkIsT0FBTyxLQUFLLENBQUM7UUFDZjtZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxTQUFTLGlCQUFpQixDQUFDLENBQUM7S0FDN0Q7QUFDSCxDQUFDO0FBbkJELDRDQW1CQztBQUVELFNBQWdCLHlCQUF5QixDQUFDLE9BQWdCO0lBQ3hELE1BQU0sVUFBVSxHQUFHO1FBQ2pCLGtCQUFTLENBQUMsSUFBSTtRQUNkLGtCQUFTLENBQUMsTUFBTTtRQUNoQixrQkFBUyxDQUFDLEdBQUc7UUFDYixrQkFBUyxDQUFDLE1BQU07S0FDakIsQ0FBQztJQUVGLElBQUksT0FBTyxLQUFLLHVCQUFPLENBQUMsSUFBSSxFQUFFO1FBQzVCLFVBQVUsQ0FBQyxJQUFJLENBQUMsa0JBQVMsQ0FBQyxPQUFPLEVBQUUsa0JBQVMsQ0FBQyxPQUFPLEVBQUUsa0JBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUMxRTtJQUVELE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFiRCw4REFhQztBQUVELFNBQWdCLG9DQUFvQyxDQUNsRCxPQUFnQjtJQUVoQixNQUFNLFVBQVUsR0FBRztRQUNqQixrQkFBUyxDQUFDLElBQUk7UUFDZCxrQkFBUyxDQUFDLE1BQU07UUFDaEIsa0JBQVMsQ0FBQyxHQUFHO1FBQ2Isa0JBQVMsQ0FBQyxNQUFNO0tBQ2pCLENBQUM7SUFFRixJQUFJLE9BQU8sS0FBSyx1QkFBTyxDQUFDLElBQUksRUFBRTtRQUM1QixVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFTLENBQUMsT0FBTyxFQUFFLGtCQUFTLENBQUMsT0FBTyxFQUFFLGtCQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDMUU7SUFFRCxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO1FBQ25DLFNBQW1CO1FBQ25CLHNCQUFhLENBQUMsU0FBUyxDQUFDO1FBQ3hCLHlCQUFZO0tBQ2IsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQW5CRCxvRkFtQkMifQ==