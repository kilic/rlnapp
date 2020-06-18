pragma solidity 0.6.10;

import '../Tree.sol';


contract TestTree is Tree {
	constructor(uint256 minSubtreeDepth) public Tree(minSubtreeDepth) {}

	function _addToQueBatch(uint256[] calldata _leafs) external {
		return super.addToQueBatch(_leafs);
	}

	function _merge(uint256 level) external {
		return super.merge(level);
	}

	function _calculateRoot() external {
		return super.calculateRoot();
	}
}
