pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import '../crypto/Snark.sol';


contract TestSnark {
	function verify(
		Snark.VerifyingKey memory vk,
		uint256[] memory input,
		Snark.Proof memory proof
	) external view returns (bool) {
		return Snark.verify(vk, input, proof);
	}
}
