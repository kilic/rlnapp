pragma solidity 0.6.10;

import '../PoseidonHasher.sol';


contract TestPoseidon is PoseidonHasher {
	function test(uint256[2] calldata input) external pure returns (uint256) {
		return hash(input);
	}

	function poseidonGasCost() external returns (uint256) {
		uint256 g = gasleft();
		hash([uint256(1), uint256(2)]);
		return g - gasleft();
	}
}
