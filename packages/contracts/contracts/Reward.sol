pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import { Snark } from './Snark.sol';
import { BN256 } from './BN256.sol';


contract Reward {
	uint256 rewardPeriod = 1 days;
	uint256 messagePeriod = 1 hours;
	uint256 claimPeriod = 1 hours;
	uint256 challengePeriod = 1 days;
	uint256 claimStakeAmount = 1 ether;

	Snark.VerifyingKey rlnVerifingKey;

	struct Signal {
		bytes32 messageHash;
		uint256 shareY;
		uint256 epoch;
		uint256 nullifier;
		uint256 membershipRoot;
	}

	enum REWARD_STATUS { NONE, SUBMITTED, CLAIMED, CHALLENGED }

	mapping(bytes32 => REWARD_STATUS) rewards;

	function submit(bytes32 messageRoot, uint256 numberOfMessages) external payable {
		require(msg.value == claimStakeAmount, 'Reward Submission: stake amount');

		// get reward epoch
		uint256 rewardEpoch = now / rewardPeriod;

		address beneficiary = msg.sender;
		bytes32 rewardID = getRewardID(beneficiary, messageRoot, numberOfMessages, rewardEpoch);
		require(rewards[rewardID] == REWARD_STATUS.NONE, 'Reward Submission: rewardŞ id already exists');

		// store reward submission
		rewards[rewardID] = REWARD_STATUS.SUBMITTED;
	}

	function claim(
		bytes32 messageRoot,
		uint256 numberOfMessages,
		uint256 nullifierIndex,
		uint256 rewardEpoch,
		Signal memory signal,
		bytes32[] calldata nullifierWitness,
		Snark.Proof memory rlnProof
	) external {
		require(numberOfMessages > 0, 'Reward Claim: number of messages is zero');

		// check reward epoch
		require(rewardEpoch + claimPeriod < now, 'Reward Claim: claim period has passed');

		// check message epoch
		uint256 messageEpochEnd = now - (now % rewardPeriod);
		uint256 messageEpochStart = messageEpochEnd - rewardPeriod;
		require(signal.epoch >= messageEpochStart && signal.epoch < messageEpochEnd, 'Reward Claim: bad message epoch');

		// check if claim is submitted
		address beneficiary = msg.sender;
		bytes32 rewardID = getRewardID(beneficiary, messageRoot, numberOfMessages, rewardEpoch);
		require(rewards[rewardID] == REWARD_STATUS.SUBMITTED, 'Reward Claim: reward claim is not submitted');

		// check nullifier inclusion
		uint256 depth = nullifierWitness.length;
		require(depth != 0, 'Reward Claim: missing witness');
		require((1 << depth) >= numberOfMessages && (1 << (depth - 1)) < numberOfMessages, 'Reward Claim: bad witness size');
		require(checkInclusion(messageRoot, bytes32(signal.nullifier), nullifierIndex, nullifierWitness), 'Reward Claim: nullifier is not included');

		// check membership root
		// TODO

		// verify snark of the signal
		uint256 shareX = uint256(keccak256(abi.encodePacked(beneficiary, signal.messageHash))) % BN256.Q;
		// TODO might not be a best hash to field
		// public_inputs = (x, y, epoch, nullifier, membershipRoot)
		uint256[] memory circuitInputs = new uint256[](5);
		circuitInputs[0] = shareX;
		circuitInputs[1] = signal.shareY;
		circuitInputs[2] = signal.epoch;
		circuitInputs[3] = signal.nullifier;
		circuitInputs[4] = signal.membershipRoot;
		require(Snark.verify(rlnVerifingKey, circuitInputs, rlnProof), 'Reward Claim: signal verification failed');

		// check if nullifier hits the target
		require(signal.nullifier < getProofOfMessageTarget(rewardEpoch, numberOfMessages), 'Reward Claim: proof of message failed');

		// process reward witdrawal
		applyReward(beneficiary, numberOfMessages);
	}

	function getRewardID(
		address beneficiary,
		bytes32 messageRoot,
		uint256 numberOfMessages,
		uint256 rewardEpoch
	) internal pure returns (bytes32) {
		return keccak256(abi.encodePacked(beneficiary, messageRoot, numberOfMessages, rewardEpoch));
	}

	function checkInclusion(
		bytes32 root,
		bytes32 leaf,
		uint256 leafIndex,
		bytes32[] memory witness
	) internal pure returns (bool) {
		uint256 depth = witness.length;
		uint256 path = leafIndex;
		bytes32 acc = leaf;
		for (uint256 i = 0; i < depth; i++) {
			if (path & 1 == 1) {
				acc = keccak256(abi.encode(witness[i], acc));
			} else {
				acc = keccak256(abi.encode(acc, witness[i]));
			}
			path >>= 1;
		}
		return root == acc;
	}

	function getProofOfMessageTarget(uint256 epoch, uint256 numberOfMessages) internal pure returns (uint256) {
		// TODO: below is a placeholder
		return uint256(keccak256(abi.encode(epoch, numberOfMessages)));
	}

	function applyReward(address beneficiary, uint256 numberOfMessages) internal {
		// TODO
	}
}
