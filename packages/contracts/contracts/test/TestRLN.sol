pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import '../RLN.sol';


contract TestRLN is RLN {
	constructor(
		Snark.VerifyingKey memory _verifyingKey,
		address _registry,
		uint256 _rewardPeriod,
		uint256 _claimPeriod,
		uint256 _numberOfBlocksForRandomness
	) public RLN(_verifyingKey, _registry, _rewardPeriod, _claimPeriod, _numberOfBlocksForRandomness) {}

	function _rewardID(
		address beneficiary,
		bytes32 messageRoot,
		uint256 numberOfMessages,
		uint256 rewardEpoch
	) external pure returns (bytes32) {
		return rewardID(beneficiary, messageRoot, numberOfMessages, rewardEpoch);
	}

	function _rewardEpoch() external view returns (uint256) {
		return rewardEpoch();
	}

	function _randomForEpoch(uint256 rewardEpoch) external view returns (uint256) {
		return randomForEpoch(rewardEpoch);
	}

	function _sourceOfRandomness(uint256 rewardEpoch) external view returns (uint256) {
		return sourceOfRandomness(rewardEpoch);
	}
}
