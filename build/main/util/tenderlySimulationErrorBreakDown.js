"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.breakDownTenderlySimulationError = void 0;
const providers_1 = require("../providers");
function breakDownTenderlySimulationError(tokenIn, tokenOut, data) {
    if (data) {
        switch (data) {
            case '0x739dbe52': // V3TooMuchRequested
            case '0x39d35496': // V3TooLittleReceived
            case '0x849eaf98': // V2TooLittleReceived
            case '0x8ab0bc16': // V2TooMuchRequested
            case '0x08c379a000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000025556e697377617056323a20494e53554646494349454e545f4f55545055545f414d4f554e54000000000000000000000000000000000000000000000000000000': // INSUFFICIENT_OUTPUT_AMOUNT
            case '0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000034949410000000000000000000000000000000000000000000000000000000000': // IIA
                return providers_1.SimulationStatus.SlippageTooLow;
            case '0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000145452414e534645525f46524f4d5f4641494c4544000000000000000000000000': // TRANSFER_FROM_FAILED
                return providers_1.SimulationStatus.TransferFromFailed;
            case '0x675cae38': // InsufficientToken
                if (tokenIn.address.toLowerCase() ===
                    providers_1.VIRTUAL_BASE.address.toLowerCase() ||
                    tokenOut.address.toLowerCase() === providers_1.VIRTUAL_BASE.address.toLowerCase()) {
                    // if this is from virtual, we'd guess it's due to slippage too low, although it might be due to something else
                    return providers_1.SimulationStatus.SlippageTooLow;
                }
                // Otherwise we don't wanna guess, just return generic failed.
                return providers_1.SimulationStatus.Failed;
            default: // we don't know why onchain execution reverted, just return generic failed.
                return providers_1.SimulationStatus.Failed;
        }
    }
    return providers_1.SimulationStatus.Failed;
}
exports.breakDownTenderlySimulationError = breakDownTenderlySimulationError;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuZGVybHlTaW11bGF0aW9uRXJyb3JCcmVha0Rvd24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvdXRpbC90ZW5kZXJseVNpbXVsYXRpb25FcnJvckJyZWFrRG93bi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSw0Q0FBOEQ7QUFFOUQsU0FBZ0IsZ0NBQWdDLENBQzlDLE9BQWMsRUFDZCxRQUFlLEVBQ2YsSUFBYTtJQUViLElBQUksSUFBSSxFQUFFO1FBQ1IsUUFBUSxJQUFJLEVBQUU7WUFDWixLQUFLLFlBQVksQ0FBQyxDQUFDLHFCQUFxQjtZQUN4QyxLQUFLLFlBQVksQ0FBQyxDQUFDLHNCQUFzQjtZQUN6QyxLQUFLLFlBQVksQ0FBQyxDQUFDLHNCQUFzQjtZQUN6QyxLQUFLLFlBQVksQ0FBQyxDQUFDLHFCQUFxQjtZQUN4QyxLQUFLLDRRQUE0USxDQUFDLENBQUMsNkJBQTZCO1lBQ2hULEtBQUssNE1BQTRNLEVBQUUsTUFBTTtnQkFDdk4sT0FBTyw0QkFBZ0IsQ0FBQyxjQUFjLENBQUM7WUFDekMsS0FBSyw0TUFBNE0sRUFBRSx1QkFBdUI7Z0JBQ3hPLE9BQU8sNEJBQWdCLENBQUMsa0JBQWtCLENBQUM7WUFDN0MsS0FBSyxZQUFZLEVBQUUsb0JBQW9CO2dCQUNyQyxJQUNFLE9BQU8sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFO29CQUMzQix3QkFBWSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUU7b0JBQ3BDLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEtBQUssd0JBQVksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEVBQ3JFO29CQUNBLCtHQUErRztvQkFDL0csT0FBTyw0QkFBZ0IsQ0FBQyxjQUFjLENBQUM7aUJBQ3hDO2dCQUVELDhEQUE4RDtnQkFDOUQsT0FBTyw0QkFBZ0IsQ0FBQyxNQUFNLENBQUM7WUFDakMsU0FBUyw0RUFBNEU7Z0JBQ25GLE9BQU8sNEJBQWdCLENBQUMsTUFBTSxDQUFDO1NBQ2xDO0tBQ0Y7SUFFRCxPQUFPLDRCQUFnQixDQUFDLE1BQU0sQ0FBQztBQUNqQyxDQUFDO0FBbENELDRFQWtDQyJ9