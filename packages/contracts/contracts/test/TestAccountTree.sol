pragma solidity 0.7.4;

import '../trees/AccountTree.sol';


contract TestAccountTree is AccountTree {
	constructor(uint256[] memory _zeros, uint256 batchDepth) public AccountTree(_zeros, batchDepth) {}

	function updateSingle(uint256 leaf) external {
		_updateSingle(leaf);
	}

	function updateBatch(uint256[] memory leafs) external {
		_updateBatch(leafs);
	}
}
