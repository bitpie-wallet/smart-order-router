"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTronPoolAddress = void 0;
const abi_1 = require("@ethersproject/abi");
const keccak256_1 = require("@ethersproject/keccak256");
const solidity_1 = require("@ethersproject/solidity");
const TRON_POOL_INIT_CODE_HASH = '0xba928a717d71946d75999ef1adef801a79cd34a20efecea8b2876b85f5f49580';
function computeTronPoolAddress({ factoryAddress, tokenA, tokenB, fee, }) {
    const [token0, token1] = tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
        ? [tokenA.address, tokenB.address]
        : [tokenB.address, tokenA.address];
    const poolKeyHash = (0, keccak256_1.keccak256)(abi_1.defaultAbiCoder.encode(['address', 'address', 'uint24'], [token0, token1, fee]));
    const packedData = (0, solidity_1.pack)(['bytes1', 'address', 'bytes32', 'bytes32'], ['0x41', factoryAddress, poolKeyHash, TRON_POOL_INIT_CODE_HASH]);
    const fullHash = (0, keccak256_1.keccak256)(packedData);
    const poolAddress = '0x' + fullHash.slice(-40);
    return poolAddress;
}
exports.computeTronPoolAddress = computeTronPoolAddress;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJvblBvb2xBZGRyZXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3V0aWwvdHJvblBvb2xBZGRyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRDQUFxRDtBQUNyRCx3REFBcUQ7QUFDckQsc0RBQStDO0FBSS9DLE1BQU0sd0JBQXdCLEdBQUcsb0VBQW9FLENBQUM7QUFFdEcsU0FBZ0Isc0JBQXNCLENBQUMsRUFDckMsY0FBYyxFQUNkLE1BQU0sRUFDTixNQUFNLEVBQ04sR0FBRyxHQU1KO0lBQ0MsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFO1FBQ2xGLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUNsQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUVyQyxNQUFNLFdBQVcsR0FBRyxJQUFBLHFCQUFTLEVBQzNCLHFCQUFlLENBQUMsTUFBTSxDQUNwQixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLEVBQ2hDLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FDdEIsQ0FDRixDQUFDO0lBRUYsTUFBTSxVQUFVLEdBQUcsSUFBQSxlQUFJLEVBQ3JCLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQzNDLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsd0JBQXdCLENBQUMsQ0FDaEUsQ0FBQztJQUVGLE1BQU0sUUFBUSxHQUFHLElBQUEscUJBQVMsRUFBQyxVQUFVLENBQUMsQ0FBQztJQUN2QyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBRS9DLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUEvQkQsd0RBK0JDIn0=