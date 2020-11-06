pragma solidity 0.7.4;

import '../trees/AccountTreeWithQue.sol';


contract TestAccountTreeWithQue is AccountTreeWithQue {
	constructor(uint256 minSubtreeDepth) public AccountTreeWithQue(minSubtreeDepth) {}

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
