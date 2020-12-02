pragma solidity 0.7.4;

import '../crypto/PoseidonHasher.sol';
import '../crypto/BN256.sol';


contract AccountTree is PoseidonHasher {
	uint256 public DEPTH;
	uint256 public BATCH_DEPTH;
	uint256[] public zeros;
	uint256[] public filledSubtreesLeft;
	uint256[] public filledSubtreesRight;

	uint256 public rootLeft;
	uint256 public rootRight;
	uint256 public root;
	uint256 public leafIndexLeft = 0;
	uint256 public leafIndexRight = 0;

	// FIX: storing existence of history of roots is obviously suboptimal.
	mapping(uint256 => bool) public history;

	function SET_SIZE() public view returns (uint256) {
		return 1 << DEPTH;
	}

	function BATCH_SIZE() public view returns (uint256) {
		return 1 << BATCH_DEPTH;
	}

	constructor(uint256[] memory _zeros, uint256 batchDepth) public {
		uint256 depth = _zeros.length;
		require(_zeros.length > 2, 'AccountTree constructor: bad zeros length');
		require(identity() == _zeros[1], 'AccountTree constructor: incompatible hasher');
		require(batchDepth < depth, 'AccountTree constructor: batch depth');
		DEPTH = depth;
		BATCH_DEPTH = batchDepth;
		zeros = new uint256[](depth);
		filledSubtreesLeft = new uint256[](depth);
		filledSubtreesRight = new uint256[](depth - batchDepth);
		zeros = _zeros;
		filledSubtreesLeft = _zeros;
		for (uint256 i = 0; i < depth - batchDepth; i++) {
			filledSubtreesRight[i] = _zeros[i + batchDepth];
		}
		rootRight = hash([_zeros[depth - 1], _zeros[depth - 1]]);
		rootLeft = rootRight;
		root = hash([rootLeft, rootRight]);
	}

	function _updateSingle(uint256 leaf) internal returns (uint256) {
		require(leafIndexLeft < SET_SIZE() - 1, 'AccountTree updateSingle: left set is full');
		uint256 acc = leaf;
		uint256 path = leafIndexLeft;
		bool subtreeSet = false;
		for (uint256 i = 0; i < DEPTH; i++) {
			if (path & 1 == 1) {
				acc = hash([filledSubtreesLeft[i], acc]);
			} else {
				if (!subtreeSet) {
					filledSubtreesLeft[i] = acc;
					subtreeSet = true;
				}
				acc = hash([acc, zeros[i]]);
			}
			path >>= 1;
		}
		rootLeft = acc;
		root = hash([rootLeft, rootRight]);
		history[root] = true;
		leafIndexLeft += 1;
		return leafIndexLeft - 1;
	}

	function _updateBatch(uint256[] memory leafs) internal returns (uint256) {
		require(leafs.length == BATCH_SIZE(), 'AccountTree updateBatch: number of leafs');
		require(leafIndexRight < SET_SIZE() - 1 - BATCH_SIZE(), 'AccountTree updateBatch: right set is full ');
		// Fill the subtree
		for (uint256 i = 0; i < BATCH_DEPTH; i++) {
			uint256 n = (BATCH_DEPTH - i - 1);
			for (uint256 j = 0; j < 1 << n; j++) {
				uint256 k = j << 1;
				leafs[j] = hash([leafs[k], leafs[k + 1]]);
			}
		}
		uint256 acc = leafs[0];
		// Ascend to the root
		uint256 path = leafIndexRight;
		bool subtreeSet = false;
		for (uint256 i = 0; i < DEPTH - BATCH_DEPTH; i++) {
			if (path & 1 == 1) {
				acc = hash([filledSubtreesRight[i], acc]);
			} else {
				if (!subtreeSet) {
					filledSubtreesRight[i] = acc;
					subtreeSet = true;
				}
				acc = hash([acc, zeros[i + BATCH_DEPTH]]);
			}
			path >>= 1;
		}
		rootRight = acc;
		root = hash([rootLeft, rootRight]);
		history[root] = true;
		leafIndexRight += 1;
		return leafIndexRight - 1;
	}
}
