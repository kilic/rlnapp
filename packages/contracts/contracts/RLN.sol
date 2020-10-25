pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import { PoseidonTree } from './PoseidonTree.sol';
import { Snark } from './Snark.sol';
import { BN256 } from './BN256.sol';


/*

# Message

	```
	message = "..."
	signal = hash(enc(message))
	signal_hash = hash(signal, reward_target)
	```

# Polynomial equation of RLN

	```
	y = a1 * x + a0
	x = signal_hash
	a0 = private_key
	a1 = hash(epoch, a0)
	y = signal_hash * hash(epoch, private_key) + private_key
	```

# Circuit

	```
	nullifier = hash(a1) = hash(hash(epoch, a0)) = hash(hash(epoch, private_key))
	public_inputs = (x, y, epoch, nullifier, membershipRoot)
	```

*/

library RLNKeccakMerkleUtils {
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
}


contract RLNRegistry is PoseidonTree {
	// Accept only ETH for now
	uint256 MEMBERSHIP_FEE;

	constructor(uint256 membershipFee) public {
		MEMBERSHIP_FEE = membershipFee;
	}

	function registerSingle(uint256 newMember) external payable returns (uint256) {
		require(msg.value == MEMBERSHIP_FEE, 'RLNRegsitry: fee is not sufficient');
		_updateSingle(newMember);
	}

	function registerBatch(uint256[BATCH_SIZE] memory newMembers) external payable returns (uint256) {
		require(msg.value == MEMBERSHIP_FEE * BATCH_SIZE, 'RLNRegsitry: fee is not sufficient');
		_updateBatch(newMembers);
	}

	function isValidMembershipRoot(uint256 membershipRoot) internal returns (bool) {
		return history[membershipRoot];
	}
}


contract RLNInventivized is RLNRegistry {
	// FIX: these values should be fed into constructor
	// FIX: these values should be governed in the end
	uint256 immutable rewardPeriod = 1000; // blocks
	uint256 immutable claimPeriod = 1000; // blocks
	uint256 immutable claimStakeAmount = 1 ether;
	uint256 numberOfBlocksForRandomness = 10;

	enum REWARD_STATUS { None, Submitted, Claimed, Processed }

	Snark.VerifyingKey rlnVerifyingKey;
	mapping(bytes32 => REWARD_STATUS) rewards;
	mapping(uint256 => uint256) targets;

	struct Signal {
		bytes32 messageHash;
		uint256 shareY;
		uint256 epoch;
		uint256 nullifier;
		uint256 membershipRoot;
	}

	constructor(Snark.VerifyingKey memory _verifyingKey, uint256 membershipFee) public RLNRegistry(membershipFee) {
		rlnVerifyingKey = _verifyingKey;
	}

	function commitProofOfMessage(bytes32 messageRoot, uint256 numberOfMessages) external payable {
		require(msg.value == claimStakeAmount, 'RLNInventivized commitProofOfMessage: stake amount');

		uint256 rewardEpoch = block.number / rewardPeriod;

		address beneficiary = msg.sender;
		bytes32 rewardID = getRewardID(beneficiary, messageRoot, numberOfMessages, rewardEpoch);
		require(rewards[rewardID] == REWARD_STATUS.None, 'RLNInventivized commitProofOfMessage: commitment already exists');

		// store proof of message commitment
		rewards[rewardID] = REWARD_STATUS.Submitted;
	}

	function claimReward(
		bytes32 messageRoot,
		uint256 numberOfMessages,
		uint256 nullifierIndex,
		uint256 rewardEpoch,
		Signal memory signal,
		bytes32[] calldata nullifierWitness,
		Snark.Proof memory rlnProof
	) external {
		require(numberOfMessages > 0, 'RLNInventivized claimReward: number of messages is zero');

		// check reward epoch
		require(rewardEpoch + claimPeriod < block.number, 'RLNInventivized claimReward: claim period has passed');

		// check message epoch
		// FIX:
		uint256 messageEpochEnd = block.number - (block.number % rewardPeriod);
		uint256 messageEpochStart = messageEpochEnd - rewardPeriod;
		require(signal.epoch >= messageEpochStart && signal.epoch < messageEpochEnd, 'RLNInventivized claimReward: bad message epoch');

		// check if claim is submitted
		address beneficiary = msg.sender;
		bytes32 rewardID = getRewardID(beneficiary, messageRoot, numberOfMessages, rewardEpoch);
		require(rewards[rewardID] == REWARD_STATUS.Submitted, 'RLNInventivized claimReward: reward claim is not submitted');

		// check nullifier inclusion
		uint256 depth = nullifierWitness.length;
		require(depth != 0, 'Reward claim: missing witness');
		require((1 << depth) >= numberOfMessages && (1 << (depth - 1)) < numberOfMessages, 'RLNInventivized claimReward: bad witness size');
		require(RLNKeccakMerkleUtils.checkInclusion(messageRoot, bytes32(signal.nullifier), nullifierIndex, nullifierWitness), 'RLNInventivized claimReward: nullifier is not included');

		// check membership root
		isValidMembershipRoot(signal.membershipRoot);

		// verify snark of the signal
		// TODO might not be a best hash to field
		uint256 shareX = uint256(keccak256(abi.encodePacked(beneficiary, signal.messageHash))) % BN256.q();
		// public_inputs = (x, y, epoch, nullifier, membershipRoot)
		uint256[] memory circuitInputs = new uint256[](5);
		circuitInputs[0] = shareX;
		circuitInputs[1] = signal.shareY;
		circuitInputs[2] = signal.epoch;
		circuitInputs[3] = signal.nullifier;
		circuitInputs[4] = signal.membershipRoot;
		require(Snark.verify(rlnVerifyingKey, circuitInputs, rlnProof), 'Reward claim: signal verification failed');

		// check if nullifier hits the target
		require(signal.nullifier < getProofOfMessageTarget(rewardEpoch, numberOfMessages), 'Reward claim: proof of message failed');

		// process reward witdrawal
		applyReward(beneficiary, numberOfMessages);

		rewards[rewardID] = REWARD_STATUS.Processed;
	}

	function getRewardID(
		address beneficiary,
		bytes32 messageRoot,
		uint256 numberOfMessages,
		uint256 rewardEpoch
	) internal pure returns (bytes32) {
		return keccak256(abi.encodePacked(beneficiary, messageRoot, numberOfMessages, rewardEpoch));
	}

	function applyReward(address beneficiary, uint256 numberOfMessages) internal {}

	function getProofOfMessageTarget(uint256 rewardEpoch, uint256 numberOfMessages) internal returns (uint256) {
		uint256 target = targets[rewardEpoch];
		if (target == 0) {
			// FIX: generates biased randomness
			targets[rewardEpoch] = getRandomnessForEpoch(rewardEpoch);
			return targets[rewardEpoch];
		} else {
			return target;
		}
	}

	function getRandomnessForEpoch(uint256 rewardEpoch) internal view returns (uint256) {
		uint256 randomnessSourceStart = (rewardEpoch + 1 * rewardPeriod) - numberOfBlocksForRandomness;
		bytes32[10] memory blockHashes;
		require(randomnessSourceStart > block.number - 256, "RLN randomness: loss of randomness, can't start claim period");
		blockHashes[0] = blockhash(randomnessSourceStart);
		blockHashes[1] = blockhash(randomnessSourceStart - 1);
		blockHashes[2] = blockhash(randomnessSourceStart - 2);
		blockHashes[3] = blockhash(randomnessSourceStart - 3);
		blockHashes[4] = blockhash(randomnessSourceStart - 4);
		blockHashes[5] = blockhash(randomnessSourceStart - 5);
		blockHashes[6] = blockhash(randomnessSourceStart - 6);
		blockHashes[7] = blockhash(randomnessSourceStart - 7);
		blockHashes[8] = blockhash(randomnessSourceStart - 8);
		blockHashes[9] = blockhash(randomnessSourceStart - 9);
		return uint256(keccak256(abi.encodePacked(blockHashes))) % BN256.Q;
	}
}


contract RLN is RLNInventivized {
	constructor(Snark.VerifyingKey memory _verifyingKey, uint256 membershipFee) public RLNInventivized(_verifyingKey, membershipFee) {}
}
