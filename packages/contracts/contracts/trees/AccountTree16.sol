pragma solidity 0.6.10;

import './AccountTree.sol';


contract AccountTree16 is AccountTree {
	uint256 public constant _DEPTH = 15;
	uint256 public constant _WITNESS_LENGTH = _DEPTH;
	uint256 public constant _SET_SIZE = 1 << _DEPTH;
	uint256 public constant _BATCH_DEPTH = 7;
	uint256 public constant _BATCH_SIZE = 1 << _BATCH_DEPTH;

	constructor() public {
		require(identity() == _zeros[1], 'PoseidonTree constructor: incompatible hasher');
		rootRight = hash([_zeros[_DEPTH - 1], _zeros[_DEPTH - 1]]);
		rootLeft = rootRight;
		root = hash([rootLeft, rootRight]);
	}

	function DEPTH() public override view returns (uint256) {
		return _DEPTH;
	}

	function WITNESS_LENGTH() public override view returns (uint256) {
		return _WITNESS_LENGTH;
	}

	function SET_SIZE() public override view returns (uint256) {
		return _SET_SIZE;
	}

	function BATCH_DEPTH() public override view returns (uint256) {
		return _BATCH_DEPTH;
	}

	function BATCH_SIZE() public override view returns (uint256) {
		return _BATCH_SIZE;
	}

	uint256[_DEPTH] public _zeros = [
		0,
		0x2ff267fd23782a5625e6d804f0a7fa700b8dc6084e2e7a5aff7cd4b1c506d30b,
		0x7191352b37e1257205f09eaba526667cf18cb12e2cfeb2abc38e64bc0f0112e,
		0x13fc18037da87a772cd576e98b3e6b503fa1c5025ea003da8e7ea8bbeced270f,
		0x1772616e1f247b11b69013c9acc6afb7319361071d3b939eaff60ca68f2eb22,
		0x146b7c868ccbaed11de1e54203a5cb5529348e8411533ac971f635333ddfa083,
		0x1a98da6eee62076354730ca9a8114a5ccee3eae0887bb4314c7853f2607375db,
		0x6bc7c08258424769c1d8b2b49f0abc057a40d7f49cc588616d81c589fce0a99,
		0x270668d6ee8a804cca49a58672a364333edba320cf06051e0ef90e29d3a989a0,
		0x280514a333bde29d5d9a5967c7e131b6b386677483a74963c758610ae3cd6577,
		0x23e32f2d130a5775c21b2b3fbab442a5eb534d6647d0879bff6248905f12144b,
		0x28353de78662547954bd1726bb187604e5215e2fc705b480e8f82703c82c4d73,
		0x26d4f9e676413e664da88896a1a2bad525cf6bcbca0d02fb9eec6ba9f3f59fb1,
		0x1c234c6ce63e279bc2fd3f5e2ae7e7d6ceac3d8c0993f6e1c5446ff03d7c8cff,
		0x266122062ad452c57cef2d8fc4cefab39e2d847d632b139c812aab2c118d54cf
	];

	uint256[_DEPTH] public _filledSubtreesLeft = [
		0,
		0x2ff267fd23782a5625e6d804f0a7fa700b8dc6084e2e7a5aff7cd4b1c506d30b,
		0x7191352b37e1257205f09eaba526667cf18cb12e2cfeb2abc38e64bc0f0112e,
		0x13fc18037da87a772cd576e98b3e6b503fa1c5025ea003da8e7ea8bbeced270f,
		0x1772616e1f247b11b69013c9acc6afb7319361071d3b939eaff60ca68f2eb22,
		0x146b7c868ccbaed11de1e54203a5cb5529348e8411533ac971f635333ddfa083,
		0x1a98da6eee62076354730ca9a8114a5ccee3eae0887bb4314c7853f2607375db,
		0x6bc7c08258424769c1d8b2b49f0abc057a40d7f49cc588616d81c589fce0a99,
		0x270668d6ee8a804cca49a58672a364333edba320cf06051e0ef90e29d3a989a0,
		0x280514a333bde29d5d9a5967c7e131b6b386677483a74963c758610ae3cd6577,
		0x23e32f2d130a5775c21b2b3fbab442a5eb534d6647d0879bff6248905f12144b,
		0x28353de78662547954bd1726bb187604e5215e2fc705b480e8f82703c82c4d73,
		0x26d4f9e676413e664da88896a1a2bad525cf6bcbca0d02fb9eec6ba9f3f59fb1,
		0x1c234c6ce63e279bc2fd3f5e2ae7e7d6ceac3d8c0993f6e1c5446ff03d7c8cff,
		0x266122062ad452c57cef2d8fc4cefab39e2d847d632b139c812aab2c118d54cf
	];

	uint256[_DEPTH - _BATCH_DEPTH] public _filledSubtreesRight = [0x23e32f2d130a5775c21b2b3fbab442a5eb534d6647d0879bff6248905f12144b, 0x28353de78662547954bd1726bb187604e5215e2fc705b480e8f82703c82c4d73, 0x26d4f9e676413e664da88896a1a2bad525cf6bcbca0d02fb9eec6ba9f3f59fb1, 0x1c234c6ce63e279bc2fd3f5e2ae7e7d6ceac3d8c0993f6e1c5446ff03d7c8cff, 0x266122062ad452c57cef2d8fc4cefab39e2d847d632b139c812aab2c118d54cf, 0x159219e77221876c5b4c534eec1e9b6d613c01d7024de0c2e9457cf4cf0edb81];

	function zeros(uint256 i) public override view returns (uint256) {
		return _zeros[i];
	}

	function filledSubtreesLeft(uint256 i) public override view returns (uint256) {
		return _filledSubtreesLeft[i];
	}

	function setFilledSubtreesLeft(uint256 i, uint256 value) public override {
		_filledSubtreesLeft[i] = value;
	}

	function filledSubtreesRight(uint256 i) public override view returns (uint256) {
		return _filledSubtreesRight[i];
	}

	function setFilledSubtreesRight(uint256 i, uint256 value) public override {
		_filledSubtreesRight[i] = value;
	}
}
