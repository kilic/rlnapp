pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import '../RLN.sol';
import { Snark } from '../crypto/Snark.sol';


contract TestRLN is RLN {
	constructor(
		Snark.VerifyingKey memory _verifyingKey,
		address _registry,
		uint256 _rewardPeriod,
		uint256 _claimPeriod,
		uint256 _numberOfBlocksForRandomness,
		uint256 _claimStakeAmount
	) public RLN(_verifyingKey, _registry, _rewardPeriod, _claimPeriod, _numberOfBlocksForRandomness, _claimStakeAmount) {}

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

	function checkNullifierInclusion(
		bytes32 messageRoot,
		bytes32 nullifier,
		uint256 nullifierIndex,
		bytes32[] calldata witness
	) external pure returns (bool) {
		return RLNKeccakMerkleUtils.checkInclusion(messageRoot, nullifier, nullifierIndex, witness);
	}

	function _proofOfMessage(uint256 __rewardEpoch, uint256 nullifier) external returns (uint256) {
		return proofOfMessage(__rewardEpoch, nullifier);
	}

	function _difficulty(uint256 numberOfMessages) external pure returns (uint256) {
		return difficulty(numberOfMessages);
	}

	function _verifyProofOfMessage(
		uint256 __rewardEpoch,
		uint256 nullifier,
		uint256 numberOfMessages
	) external returns (bool) {
		return verifyProofOfMessage(__rewardEpoch, nullifier, numberOfMessages);
	}

	function verifySnark(uint256[] memory inputs, Snark.Proof memory proof) external view returns (bool) {
		return Snark.verify(rlnVerifyingKey, inputs, proof);
	}
}
