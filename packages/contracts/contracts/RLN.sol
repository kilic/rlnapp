pragma solidity 0.6.7;

import "./Poseidon.sol";


contract RLN is Poseidon {
	
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
		emit MemberRegistered(pubkey, leafIndex);
		leafIndex += 1;
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
