pragma solidity 0.7.4;

import { AccountTree } from './trees/AccountTree.sol';


contract RLNRegistry is AccountTree {
	uint256 membershipFee;

	//
	constructor(
		uint256 _membershipFee,
		uint256 batchDepth,
		uint256[] memory _zeros
	) public AccountTree(_zeros, batchDepth) {
		membershipFee = _membershipFee;
	}

	function registerSingle(uint256 newMember) external payable returns (uint256) {
		require(msg.value == membershipFee, 'RLNRegsitry: fee is not sufficient');
		return _updateSingle(newMember);
	}

	function registerBatch(uint256[] memory newMembers) external payable returns (uint256) {
		require(msg.value == membershipFee * newMembers.length, 'RLNRegsitry: fee is not sufficient');
		return _updateBatch(newMembers);
	}

	function isValidMembershipRoot(uint256 membershipRoot) external view returns (bool) {
		return history[membershipRoot];
	}
}
