pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import { Snark } from './crypto/Snark.sol';
import { BN256 } from './crypto/BN256.sol';
import { RLNRegistry } from './RLNRegistry.sol';


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


contract RLNInventivized {
	uint256 public immutable rewardPeriod; // blocks
	uint256 public immutable claimPeriod; // blocks
	uint256 public immutable claimStakeAmount;
	uint256 public immutable numberOfBlocksForRandomness;

	RLNRegistry registry;
	mapping(bytes32 => REWARD_STATUS) public rewards;

	// FIX: no need to store old targets
	// find out a way to store less targets
	mapping(uint256 => uint256) public randNumber;

	Snark.VerifyingKey rlnVerifyingKey;

	enum REWARD_STATUS { None, Submitted, Claimed, Processed }

	event RewardApplied(bytes32 rewardID);

	struct Signal {
		bytes32 messageHash;
		uint256 shareY;
		uint256 epoch;
		uint256 nullifier;
		uint256 membershipRoot;
	}

	constructor(
		Snark.VerifyingKey memory _verifyingKey,
		address _registry,
		uint256 _rewardPeriod,
		uint256 _claimPeriod,
		uint256 _numberOfBlocksForRandomness,
		uint256 _claimStakeAmount
	) public {
		rlnVerifyingKey = _verifyingKey;
		registry = RLNRegistry(_registry);
		rewardPeriod = _rewardPeriod;
		claimPeriod = _claimPeriod;
		claimStakeAmount = _claimStakeAmount;
		numberOfBlocksForRandomness = _numberOfBlocksForRandomness;
	}

	function commitProofOfMessage(bytes32 messageRoot, uint256 numberOfMessages) external payable {
		require(msg.value == claimStakeAmount, 'RLNInventivized commitProofOfMessage: stake amount');

		uint256 _rewardEpoch = rewardEpoch();

		address beneficiary = msg.sender;
		bytes32 _rewardID = rewardID(beneficiary, messageRoot, numberOfMessages, _rewardEpoch);
		require(rewards[_rewardID] == REWARD_STATUS.None, 'RLNInventivized commitProofOfMessage: commitment already exists');

		// store proof of message commitment
		rewards[_rewardID] = REWARD_STATUS.Submitted;
	}

	function claimReward(
		bytes32 messageRoot,
		uint256 numberOfMessages,
		uint256 nullifierIndex,
		uint256 _rewardEpoch,
		Signal memory signal,
		bytes32[] calldata nullifierWitness,
		Snark.Proof memory rlnProof
	) external {
		require(numberOfMessages > 1, 'RLNInventivized claimReward: number of messages');

		// check reward epoch
		require(_rewardEpoch + claimPeriod < block.number, 'RLNInventivized claimReward: claim period has passed');

		// check message epoch
		// FIX:
		uint256 messageEpochEnd = block.number - (block.number % rewardPeriod);
		uint256 messageEpochStart = messageEpochEnd - rewardPeriod;
		require(signal.epoch >= messageEpochStart && signal.epoch < messageEpochEnd, 'RLNInventivized claimReward: bad message epoch');

		// check if claim is submitted
		bytes32 _rewardID = rewardID(msg.sender, messageRoot, numberOfMessages, _rewardEpoch);
		require(rewards[_rewardID] == REWARD_STATUS.Submitted, 'RLNInventivized claimReward: reward claim is not submitted or is processed');

		// check nullifier inclusion
		require(nullifierWitness.length != 0, 'RLNInventivized claimReward: missing witness');
		require((1 << nullifierWitness.length) >= numberOfMessages && (1 << (nullifierWitness.length - 1)) < numberOfMessages, 'RLNInventivized claimReward: bad witness size');
		require(RLNKeccakMerkleUtils.checkInclusion(messageRoot, bytes32(signal.nullifier), nullifierIndex, nullifierWitness), 'RLNInventivized claimReward: nullifier is not included');

		// check membership root
		// registry.isValidMembershipRoot(signal.membershipRoot);

		// verify snark of the signal
		uint256[] memory circuitInputs = new uint256[](5);
		circuitInputs[0] = signal.membershipRoot;
		circuitInputs[1] = signal.epoch;
		// TODO: possible change for hash to field
		circuitInputs[2] = uint256(keccak256(abi.encodePacked(msg.sender, signal.messageHash))) % BN256.q();
		circuitInputs[3] = signal.shareY;
		circuitInputs[4] = signal.nullifier;

		require(Snark.verify(rlnVerifyingKey, circuitInputs, rlnProof), 'RLNInventivized claimReward: signal verification failed');

		// check if nullifier hits the target
		require(verifyProofOfMessage(_rewardEpoch, signal.nullifier, numberOfMessages), 'RLNInventivized claimReward: proof of message failed');

		// process reward witdrawal
		applyReward(msg.sender, numberOfMessages);
		emit RewardApplied(_rewardID);

		rewards[_rewardID] = REWARD_STATUS.Processed;
	}

	function applyReward(address beneficiary, uint256 numberOfMessages) internal {
		// TODO: economic source of reward is not decided yet
	}

	function rewardID(
		address beneficiary,
		bytes32 messageRoot,
		uint256 numberOfMessages,
		uint256 _rewardEpoch
	) internal pure returns (bytes32) {
		return keccak256(abi.encodePacked(beneficiary, messageRoot, numberOfMessages, _rewardEpoch));
	}

	function rewardEpoch() internal view returns (uint256) {
		return block.number / rewardPeriod + 1;
	}

	function verifyProofOfMessage(
		uint256 _rewardEpoch,
		uint256 nullifier,
		uint256 numberOfMessages
	) internal returns (bool) {
		return proofOfMessage(_rewardEpoch, nullifier) < difficulty(numberOfMessages);
	}

	function proofOfMessage(uint256 _rewardEpoch, uint256 nullifier) internal returns (uint256) {
		uint256 _randNumber = randNumber[_rewardEpoch];
		if (_randNumber == 0) {
			_randNumber = randomForEpoch(_rewardEpoch);
			randNumber[_rewardEpoch] = _randNumber;
		}
		return (_randNumber * nullifier);
	}

	function difficulty(uint256 numberOfMessages) internal pure returns (uint256) {
		return 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff / numberOfMessages;
	}

	function randomForEpoch(uint256 _rewardEpoch) internal view returns (uint256) {
		uint256 _sourceOfRandomness = sourceOfRandomness(_rewardEpoch);
		require(_sourceOfRandomness + 256 > block.number, "RLNIncentivized randomForEpoch: loss of randomness, can't start claim period");
		require(_sourceOfRandomness + numberOfBlocksForRandomness <= block.number, 'RLNIncentivized randomForEpoch: early attempt to get randomness');

		bytes32[] memory blockHashes = new bytes32[](numberOfBlocksForRandomness);
		for (uint256 i = 0; i < numberOfBlocksForRandomness; i++) {
			blockHashes[i] = blockhash(_sourceOfRandomness + i);
		}
		// FIX: hashing to field below generates biased randomness
		// possible solution 1: hash the nullifier to the word 2^256 field
		// possible solution 2: follow the way in BLS standart
		// return uint256(keccak256(abi.encodePacked(blockHashes))) % BN256.Q;
		return uint256(keccak256(abi.encodePacked(blockHashes)));
	}

	function sourceOfRandomness(uint256 _rewardEpoch) internal view returns (uint256) {
		return (_rewardEpoch * rewardPeriod) - numberOfBlocksForRandomness;
	}
}


contract RLN is RLNInventivized {
	constructor(
		Snark.VerifyingKey memory _verifyingKey,
		address _registry,
		uint256 _rewardPeriod,
		uint256 _claimPeriod,
		uint256 _numberOfBlocksForRandomness,
		uint256 _claimStakeAmount
	) public RLNInventivized(_verifyingKey, _registry, _rewardPeriod, _claimPeriod, _numberOfBlocksForRandomness, _claimStakeAmount) {}
}
