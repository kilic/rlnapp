pragma solidity 0.6.10;

import '../PoseidonTree.sol';


contract TestPoseidonTree is PoseidonTree {
	constructor() public {}

	function updateSingle(uint256 leaf) external {
		_updateSingle(leaf);
	}

	function updateBatch(uint256[BATCH_SIZE] memory leafs) external {
		_updateBatch(leafs);
	}
}
