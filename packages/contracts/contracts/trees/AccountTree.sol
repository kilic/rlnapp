pragma solidity 0.6.10;

import '../crypto/PoseidonHasher.sol';
import '../crypto/BN256.sol';


abstract contract AccountTree is PoseidonHasher {
	function DEPTH() public virtual view returns (uint256);

	function WITNESS_LENGTH() public virtual view returns (uint256);

	function SET_SIZE() public virtual view returns (uint256);

	function BATCH_DEPTH() public virtual view returns (uint256);

	function BATCH_SIZE() public virtual view returns (uint256);

	uint256 public rootLeft;
	uint256 public rootRight;
	uint256 public root;
	uint256 public leafIndexLeft = 0;
	uint256 public leafIndexRight = 0;

	// FIX: storing existence of history of roots is obviously suboptimal.
	mapping(uint256 => bool) public history;

	function zeros(uint256 i) public virtual view returns (uint256);

	function filledSubtreesLeft(uint256 i) public virtual view returns (uint256);

	function setFilledSubtreesLeft(uint256 i, uint256 value) public virtual;

	function filledSubtreesRight(uint256 i) public virtual view returns (uint256);

	function setFilledSubtreesRight(uint256 i, uint256 value) public virtual;

	function _updateSingle(uint256 leaf) internal returns (uint256) {
		require(leafIndexLeft < SET_SIZE() - 1, 'PoseidonTree updateSingle: left set is full');
		uint256 acc = leaf;
		uint256 path = leafIndexLeft;
		bool subtreeSet = false;
		for (uint256 i = 0; i < DEPTH(); i++) {
			if (path & 1 == 1) {
				acc = hash([filledSubtreesLeft(i), acc]);
			} else {
				if (!subtreeSet) {
					setFilledSubtreesLeft(i, acc);
					subtreeSet = true;
				}
				acc = hash([acc, zeros(i)]);
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
		require(leafIndexRight < SET_SIZE() - 1 - BATCH_SIZE(), 'PoseidonTree updateBatch: right set is full ');

		// Fill the subtree
		for (uint256 i = 0; i < BATCH_DEPTH(); i++) {
			uint256 n = (BATCH_DEPTH() - i - 1);
			for (uint256 j = 0; j < 1 << n; j++) {
				uint256 k = j << 1;
				leafs[j] = hash([leafs[k], leafs[k + 1]]);
			}
		}
		uint256 acc = leafs[0];

		// Ascend to the root
		uint256 path = leafIndexRight;
		bool subtreeSet = false;
		for (uint256 i = 0; i < DEPTH() - BATCH_DEPTH(); i++) {
			if (path & 1 == 1) {
				acc = hash([filledSubtreesRight(i), acc]);
			} else {
				if (!subtreeSet) {
					setFilledSubtreesRight(i, acc);
					subtreeSet = true;
				}
				acc = hash([acc, zeros(i + BATCH_DEPTH())]);
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
