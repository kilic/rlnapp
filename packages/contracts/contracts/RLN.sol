pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import { AccountTree32 } from './trees/AccountTree32.sol';
import { Snark } from './crypto/Snark.sol';
import { BN256 } from './crypto/BN256.sol';


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


// NOTICE: here we must switch the depth manually
contract RLNRegistry is AccountTree16 {
	// Accept only ETH for now
	uint256 membershipFee;

	constructor(uint256 _membershipFee) public {
		membershipFee = _membershipFee;
	}

	function registerSingle(uint256 newMember) external payable returns (uint256) {
		require(msg.value == membershipFee, 'RLNRegsitry: fee is not sufficient');
		_updateSingle(newMember);
	}

	function registerBatch(uint256[] memory newMembers) external payable returns (uint256) {
		require(msg.value == membershipFee * newMembers.length, 'RLNRegsitry: fee is not sufficient');
		_updateBatch(newMembers);
	}

	function isValidMembershipRoot(uint256 membershipRoot) external view returns (bool) {
		return history[membershipRoot];
	}
}


contract RLNInventivized {
	uint256 public immutable rewardPeriod; // blocks
	uint256 public immutable claimPeriod; // blocks
	uint256 public immutable claimStakeAmount = 1 ether;
	uint256 public immutable numberOfBlocksForRandomness;

	RLNRegistry registry;
	mapping(bytes32 => REWARD_STATUS) public rewards;

	// FIX: no need to store old targets
	// find out a way to store less targets
	mapping(uint256 => uint256) public randNumber;

	Snark.VerifyingKey rlnVerifyingKey;

	enum REWARD_STATUS { None, Submitted, Claimed, Processed }

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
		uint256 _numberOfBlocksForRandomness
	) public {
		rlnVerifyingKey = _verifyingKey;
		registry = RLNRegistry(_registry);
		rewardPeriod = _rewardPeriod;
		claimPeriod = _claimPeriod;
		numberOfBlocksForRandomness = _numberOfBlocksForRandomness;
	}

	function commitProofOfMessage(bytes32 messageRoot, uint256 numberOfMessages) external payable {
		require(msg.value == claimStakeAmount, 'RLNInventivized commitProofOfMessage: stake amount');

		uint256 rewardEpoch = rewardEpoch() - 1;

		address beneficiary = msg.sender;
		bytes32 rewardID = rewardID(beneficiary, messageRoot, numberOfMessages, rewardEpoch);
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
		bytes32 rewardID = rewardID(beneficiary, messageRoot, numberOfMessages, rewardEpoch);
		require(rewards[rewardID] == REWARD_STATUS.Submitted, 'RLNInventivized claimReward: reward claim is not submitted');

		// check nullifier inclusion
		uint256 depth = nullifierWitness.length;
		require(depth != 0, 'Reward claim: missing witness');
		require((1 << depth) >= numberOfMessages && (1 << (depth - 1)) < numberOfMessages, 'RLNInventivized claimReward: bad witness size');
		require(RLNKeccakMerkleUtils.checkInclusion(messageRoot, bytes32(signal.nullifier), nullifierIndex, nullifierWitness), 'RLNInventivized claimReward: nullifier is not included');

		// check membership root
		registry.isValidMembershipRoot(signal.membershipRoot);

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
		require(proofOfMessageTarget(rewardEpoch, signal.nullifier) > 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff / numberOfMessages, 'Reward claim: proof of message failed');

		// process reward witdrawal
		applyReward(beneficiary, numberOfMessages);

		rewards[rewardID] = REWARD_STATUS.Processed;
	}

	function applyReward(address beneficiary, uint256 numberOfMessages) internal {
		// TODO: economic source of reward is not decided yet
	}

	function rewardID(
		address beneficiary,
		bytes32 messageRoot,
		uint256 numberOfMessages,
		uint256 rewardEpoch
	) internal pure returns (bytes32) {
		return keccak256(abi.encodePacked(beneficiary, messageRoot, numberOfMessages, rewardEpoch));
	}

	function rewardEpoch() internal view returns (uint256) {
		return block.number / rewardPeriod + 1;
	}

	function proofOfMessageTarget(uint256 _rewardEpoch, uint256 nullifier) internal returns (uint256) {
		uint256 _randNumber = randNumber[_rewardEpoch];
		if (_randNumber == 0) {
			_randNumber = randomForEpoch(_rewardEpoch);
			randNumber[_rewardEpoch] = _randNumber;
		}
		return (_randNumber * nullifier);
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
		// possible solution 2: use trick in BLS standart
		return uint256(keccak256(abi.encodePacked(blockHashes))) % BN256.Q;
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
		uint256 _numberOfBlocksForRandomness
	) public RLNInventivized(_verifyingKey, _registry, _rewardPeriod, _claimPeriod, _numberOfBlocksForRandomness) {}
}
