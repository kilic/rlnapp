pragma solidity 0.7.4;

import "../crypto/PoseidonHasher.sol";

contract TestPoseidon is PoseidonHasher {
	function test(uint256[2] calldata input) external pure returns (uint256) {
		return _hash(input);
	}

	function poseidonGasCost() external returns (uint256) {
		uint256 g = gasleft();
		_hash([uint256(1), uint256(2)]);
		return g - gasleft();
	}
}
