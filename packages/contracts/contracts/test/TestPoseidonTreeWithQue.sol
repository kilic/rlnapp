pragma solidity 0.6.10;

import '../PoseidonTreeWithQue.sol';


contract TestPoseidonTreeWithQue is PoseidonTreeWithQue {
	constructor(uint256 minSubtreeDepth) public PoseidonTreeWithQue(minSubtreeDepth) {}

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
