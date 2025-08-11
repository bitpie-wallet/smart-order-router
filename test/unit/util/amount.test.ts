import { FeeAmount } from '@uniswap/v3-sdk';
import { parseFeeAmount } from '../../../src';
import { getApplicableV3FeeAmounts, unparseFeeAmount } from '../../../src';
import { ChainId } from '../../../src/globalChainId';

describe('amount', () => {
  it('validate FeeAmount enum helpers', async () => {
    // Check that all enumes can be unparsed and parsed.
    const feeAmountValues = Object.values(FeeAmount).filter(value => typeof value === 'number');
    for (const feeAmount of feeAmountValues) {
      const feeAmountStr = unparseFeeAmount(feeAmount as FeeAmount);
      expect(feeAmountStr).toBeDefined();
      const feeAmountParsed = parseFeeAmount(feeAmountStr);
      expect(feeAmountParsed).toBeDefined();
    }

    // Check that we get expected fee amounts lists lengths
    expect(getApplicableV3FeeAmounts(ChainId.MAINNET).length).toEqual(4);
    expect(getApplicableV3FeeAmounts(ChainId.BASE).length).toEqual(7);
  });
});
