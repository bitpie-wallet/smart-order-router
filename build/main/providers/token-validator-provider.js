"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenValidatorProvider = exports.TokenValidationResult = exports.DEFAULT_ALLOWLIST = void 0;
const lodash_1 = __importDefault(require("lodash"));
const ITokenValidator__factory_1 = require("../types/other/factories/ITokenValidator__factory");
const util_1 = require("../util");
exports.DEFAULT_ALLOWLIST = new Set([
    // RYOSHI. Does not allow transfers between contracts so fails validation.
    '0x777E2ae845272a2F540ebf6a3D03734A5a8f618e'.toLowerCase(),
]);
var TokenValidationResult;
(function (TokenValidationResult) {
    TokenValidationResult[TokenValidationResult["UNKN"] = 0] = "UNKN";
    TokenValidationResult[TokenValidationResult["FOT"] = 1] = "FOT";
    TokenValidationResult[TokenValidationResult["STF"] = 2] = "STF";
})(TokenValidationResult = exports.TokenValidationResult || (exports.TokenValidationResult = {}));
const TOKEN_VALIDATOR_ADDRESS = '0xb5ee1690b7dcc7859771148d0889be838fe108e0';
const AMOUNT_TO_FLASH_BORROW = '1000';
const GAS_LIMIT_PER_VALIDATE = 1000000;
class TokenValidatorProvider {
    constructor(chainId, multicall2Provider, tokenValidationCache, tokenValidatorAddress = TOKEN_VALIDATOR_ADDRESS, gasLimitPerCall = GAS_LIMIT_PER_VALIDATE, amountToFlashBorrow = AMOUNT_TO_FLASH_BORROW, allowList = exports.DEFAULT_ALLOWLIST) {
        this.chainId = chainId;
        this.multicall2Provider = multicall2Provider;
        this.tokenValidationCache = tokenValidationCache;
        this.tokenValidatorAddress = tokenValidatorAddress;
        this.gasLimitPerCall = gasLimitPerCall;
        this.amountToFlashBorrow = amountToFlashBorrow;
        this.allowList = allowList;
        this.CACHE_KEY = (chainId, address) => `token-${chainId}-${address}`;
        this.BASES = [util_1.WRAPPED_NATIVE_CURRENCY[this.chainId].address];
    }
    async validateTokens(tokens, providerConfig) {
        const tokenAddressToToken = lodash_1.default.keyBy(tokens, 'address');
        const addressesRaw = (0, lodash_1.default)(tokens)
            .map((token) => token.address)
            .uniq()
            .value();
        const addresses = [];
        const tokenToResult = {};
        // Check if we have cached token validation results for any tokens.
        for (const address of addressesRaw) {
            if (await this.tokenValidationCache.has(this.CACHE_KEY(this.chainId, address))) {
                tokenToResult[address.toLowerCase()] =
                    (await this.tokenValidationCache.get(this.CACHE_KEY(this.chainId, address)));
                util_1.metric.putMetric(`TokenValidatorProviderValidateCacheHitResult${tokenToResult[address.toLowerCase()]}`, 1, util_1.MetricLoggerUnit.Count);
            }
            else {
                addresses.push(address);
            }
        }
        util_1.log.info(`Got token validation results for ${addressesRaw.length - addresses.length} tokens from cache. Getting ${addresses.length} on-chain.`);
        const functionParams = (0, lodash_1.default)(addresses)
            .map((address) => [address, this.BASES, this.amountToFlashBorrow])
            .value();
        // We use the validate function instead of batchValidate to avoid poison pill problem.
        // One token that consumes too much gas could cause the entire batch to fail.
        const multicallResult = await this.multicall2Provider.callSameFunctionOnContractWithMultipleParams({
            address: this.tokenValidatorAddress,
            contractInterface: ITokenValidator__factory_1.ITokenValidator__factory.createInterface(),
            functionName: 'validate',
            functionParams: functionParams,
            providerConfig,
            additionalConfig: {
                gasLimitPerCallOverride: this.gasLimitPerCall,
            },
        });
        for (let i = 0; i < multicallResult.results.length; i++) {
            const resultWrapper = multicallResult.results[i];
            const tokenAddress = addresses[i];
            const token = tokenAddressToToken[tokenAddress];
            if (this.allowList.has(token.address.toLowerCase())) {
                tokenToResult[token.address.toLowerCase()] = TokenValidationResult.UNKN;
                await this.tokenValidationCache.set(this.CACHE_KEY(this.chainId, token.address.toLowerCase()), tokenToResult[token.address.toLowerCase()]);
                continue;
            }
            // Could happen if the tokens transfer consumes too much gas so we revert. Just
            // drop the token in that case.
            if (!resultWrapper.success) {
                util_1.metric.putMetric('TokenValidatorProviderValidateFailed', 1, util_1.MetricLoggerUnit.Count);
                util_1.log.error({ result: resultWrapper }, `Failed to validate token ${token.symbol}`);
                continue;
            }
            util_1.metric.putMetric('TokenValidatorProviderValidateSuccess', 1, util_1.MetricLoggerUnit.Count);
            const validationResult = resultWrapper.result[0];
            tokenToResult[token.address.toLowerCase()] =
                validationResult;
            await this.tokenValidationCache.set(this.CACHE_KEY(this.chainId, token.address.toLowerCase()), tokenToResult[token.address.toLowerCase()]);
            util_1.metric.putMetric(`TokenValidatorProviderValidateCacheMissResult${validationResult}`, 1, util_1.MetricLoggerUnit.Count);
        }
        return {
            getValidationByToken: (token) => tokenToResult[token.address.toLowerCase()],
        };
    }
}
exports.TokenValidatorProvider = TokenValidatorProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW4tdmFsaWRhdG9yLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3Byb3ZpZGVycy90b2tlbi12YWxpZGF0b3ItcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQ0Esb0RBQXVCO0FBR3ZCLGdHQUE2RjtBQUM3RixrQ0FLaUI7QUFNSixRQUFBLGlCQUFpQixHQUFHLElBQUksR0FBRyxDQUFTO0lBQy9DLDBFQUEwRTtJQUMxRSw0Q0FBNEMsQ0FBQyxXQUFXLEVBQUU7Q0FDM0QsQ0FBQyxDQUFDO0FBRUgsSUFBWSxxQkFJWDtBQUpELFdBQVkscUJBQXFCO0lBQy9CLGlFQUFRLENBQUE7SUFDUiwrREFBTyxDQUFBO0lBQ1AsK0RBQU8sQ0FBQTtBQUNULENBQUMsRUFKVyxxQkFBcUIsR0FBckIsNkJBQXFCLEtBQXJCLDZCQUFxQixRQUloQztBQU1ELE1BQU0sdUJBQXVCLEdBQUcsNENBQTRDLENBQUM7QUFDN0UsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLENBQUM7QUFDdEMsTUFBTSxzQkFBc0IsR0FBRyxPQUFTLENBQUM7QUFzQnpDLE1BQWEsc0JBQXNCO0lBTWpDLFlBQ1ksT0FBZ0IsRUFDaEIsa0JBQXNDLEVBQ3hDLG9CQUFtRCxFQUNuRCx3QkFBd0IsdUJBQXVCLEVBQy9DLGtCQUFrQixzQkFBc0IsRUFDeEMsc0JBQXNCLHNCQUFzQixFQUM1QyxZQUFZLHlCQUFpQjtRQU4zQixZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ2hCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDeEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUErQjtRQUNuRCwwQkFBcUIsR0FBckIscUJBQXFCLENBQTBCO1FBQy9DLG9CQUFlLEdBQWYsZUFBZSxDQUF5QjtRQUN4Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXlCO1FBQzVDLGNBQVMsR0FBVCxTQUFTLENBQW9CO1FBWi9CLGNBQVMsR0FBRyxDQUFDLE9B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