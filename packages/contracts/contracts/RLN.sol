pragma solidity 0.6.7;

import "./Poseidon.sol";


contract RLN is Poseidon {
	
	// uint256 constant DEPTH = 32;
	// uint256 constant SET_SIZE = 1 << 32;
	// uint256 constant MEMBERSHIP_FEE = 0.1 ether;

	uint256 public immutable DEPTH;
	uint256 public immutable SET_SIZE;
	uint256 public immutable MEMBERSHIP_FEE;

	uint256 public leafIndex = 0;
	mapping(uint256 => uint256) public members;
	mapping(uint256 => bool) public deregisteredLeafs;

	event MemberRegistered(uint256 indexed pubkey, uint256 indexed leafIndex);
	event MemberWithdrawn(uint256 indexed pubkey, uint256 indexed leafIndex);

	constructor(uint256 depth, uint256 membershipFee) public {
		DEPTH = depth;
		SET_SIZE = 1 << depth;
		MEMBERSHIP_FEE = membershipFee;
	}

	function register(uint256 pubkey) external payable {
		require(leafIndex < SET_SIZE, "set is full");
		require(msg.value == MEMBERSHIP_FEE, "membership fee is not satisfied");
		_register(pubkey);
	}

	function registerBatch(uint256[] calldata pubkeys) external payable {
		require(leafIndex + pubkeys.length <= SET_SIZE, "set is full");
		require(msg.value == MEMBERSHIP_FEE * pubkeys.length, "membership fee is not satisfied");
		for (uint256 i = 0; i < pubkeys.length; i++) {
			_register(pubkeys[i]);
		}
	}

	function _register(uint256 pubkey) internal {
		members[leafIndex] = pubkey;
		leafIndex += 1;
		emit MemberRegistered(pubkey, leafIndex);
	}

	function withdrawBatch(uint256[] calldata preimages, uint256[] calldata leafIndexes, address payable[] calldata receivers) external payable {
		uint256 l = preimages.length;
		require(l == leafIndexes.length, "bad size 1");
		require(l == receivers.length, "bad size 2");
		for (uint256 i = 0; i < l; i++) {
			_withdraw(preimages[i], leafIndexes[i], receivers[i]);
		}
	}

	function withdraw(uint256 preimage, uint256 _leafIndex, address payable receiver) external payable {
		_withdraw(preimage, _leafIndex, receiver);
	}

	function _withdraw(uint256 preimage, uint256 _leafIndex, address payable receiver) internal {
		require(!deregisteredLeafs[_leafIndex], "member is deregistered");
		require(_leafIndex < SET_SIZE, "invalid leaf index");
		require(receiver != address(0), "empty address");
		uint256 pubkey = hash([preimage, 0]);
		require(members[_leafIndex] == pubkey, "bad preimage for leaf index");
		receiver.transfer(MEMBERSHIP_FEE);
		deregisteredLeafs[_leafIndex] = true;
		emit MemberWithdrawn(pubkey, _leafIndex);
	}

	function _hash(uint256[2] calldata input) external pure returns (uint256) {
		return hash(input);
	}
}

// contract Membership is Poseidon {
// 	uint256 constant DEPTH = 32;
// 	uint256 constant QUE_DEPTH = 7;
// 	uint256 constant QUE_SIZE = 1 << QUE_DEPTH;
// 	uint256 constant HALF_QUE_SIZE = QUE_SIZE / 2;
// 	uint256 constant MEMBERSHIP_FEE = 0.1 ether;
// 	uint256[DEPTH + 1] public zeros;
// 	uint256[QUE_SIZE] que;
// 	uint256 public queIndex = 0;
// 	uint256 public childIndex = 0;

// 	mapping(uint256 => mapping(uint256 => uint256)) nodes;

// 	constructor(uint256[DEPTH + 1] memory _zeros) public {
// 		zeros = _zeros;
// 	}

// 	event AddedToQueue(uint256 indexed pubkey, uint256 indexed child, uint256 indexed index);
// 	event QueueIsFull(uint256 child);

// 	function addToQueue(uint256 pubkey) external payable {
// 		require(!isQueueFull(), "");
// 		require(msg.value != MEMBERSHIP_FEE, "membership fee is not satisfied");
// 		que[queIndex] = pubkey;
// 		emit AddedToQueue(pubkey, childIndex, queIndex);
// 		queIndex += 1;
// 		if (isQueueFull()) {
// 			emit QueueIsFull(childIndex);
// 		}
// 	}

// 	function finalizeQue(uint256[DEPTH - QUE_DEPTH] calldata zeroProof) external returns (uint256) {
// 		// zero proof
// 		uint256 acc = zeros[DEPTH - QUE_DEPTH];
// 		uint256 nodeIndex = childIndex;
// 		for (uint256 i = 0; i < DEPTH - QUE_DEPTH; i++) {
// 			if (nodeIndex & 1 == 1) {
// 				acc = hash([zeroProof[i], acc]);
// 			} else {
// 				acc = hash([acc, zeroProof[i]]);
// 			}
// 			nodeIndex >>= 1;
// 		}
// 		return acc;

// 		// is this constant sized loop optimized in compile time?
// 		// uint256[HALF_QUE_SIZE] memory tmp;
// 		// for (uint256 i = 0; i < QUE_DEPTH; i++) {
// 		// 	for (uint256 j = 0; j < 1 << (QUE_DEPTH - i); j += 2) {
// 		// 		if (i == 0) {
// 		// 			tmp[j >> 1] = hash([que[j], que[j + 1]]);
// 		// 		} else {
// 		// 			tmp[j >> 1] = hash([tmp[j], tmp[j + 1]]);
// 		// 		}
// 		// 	}
// 		// }
// 		// uint256 nodeIndex = childIndex;
// 		// uint256 level = DEPTH - QUE_DEPTH;
// 		// uint256 acc = getCouple(level, nodeIndex);
// 		// if (nodeIndex & 1 == 1) {
// 		// 	acc = hash(acc, tmp[0]);
// 		// } else {
// 		// 	acc = hash(tmp[0], acc);
// 		// }
// 		// uint256 x;
// 		// for (uint256 _level = level; _level < DEPTH; _level++) {
// 		// 	x = getCouple(level, nodeIndex);
// 		// 	if (nodeIndex & 1 == 1) {
// 		// 		acc = hash(acc, x);
// 		// 	} else {
// 		// 		acc = hash(x, acc);
// 		// 	}
// 		// 	nodeIndex >>= 1;
// 		// }
// 	}

// 	function isQueueFull() internal view returns (bool) {
// 		return queIndex == QUE_SIZE;
// 	}
// }
