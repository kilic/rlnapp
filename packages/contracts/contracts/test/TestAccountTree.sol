pragma solidity 0.6.10;

import '../trees/AccountTree32.sol';
import '../trees/AccountTree24.sol';
import '../trees/AccountTree16.sol';


contract TestAccountTree32 is AccountTree32 {
	constructor() public {}

	function updateSingle(uint256 leaf) external {
		_updateSingle(leaf);
	}

	function updateBatch(uint256[] memory leafs) external {
		_updateBatch(leafs);
	}
}


contract TestAccountTree24 is AccountTree24 {
	constructor() public {}

	function updateSingle(uint256 leaf) external {
		_updateSingle(leaf);
	}

	function updateBatch(uint256[] memory leafs) external {
		_updateBatch(leafs);
	}
}


contract TestAccountTree16 is AccountTree16 {
	constructor() public {}

	function updateSingle(uint256 leaf) external {
		_updateSingle(leaf);
	}

	function updateBatch(uint256[] memory leafs) external {
		_updateBatch(leafs);
	}
}
