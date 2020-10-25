pragma solidity 0.6.10;

import './PoseidonHasher.sol';
import './BN256.sol';


contract PoseidonTree is PoseidonHasher {
	uint256 public constant DEPTH = 31;
	uint256 public constant WITNESS_LENGTH = DEPTH;
	uint256 public constant SET_SIZE = 1 << DEPTH;
	uint256 public constant BATCH_DEPTH = 7;
	uint256 public constant BATCH_SIZE = 1 << BATCH_DEPTH;

	uint256 public rootLeft;
	uint256 public rootRight;
	uint256 public root;
	uint256 public leafIndexLeft = 0;
	uint256 public leafIndexRight = 0;

	// FIX: storing existence of history of roots is obviously suboptimal.
	mapping(uint256 => bool) public history;

	uint256[DEPTH] public ZEROS = [
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
		0x266122062ad452c57cef2d8fc4cefab39e2d847d632b139c812aab2c118d54cf,
		0x159219e77221876c5b4c534eec1e9b6d613c01d7024de0c2e9457cf4cf0edb81,
		0xadf304be8a52f3efb2445821f570e5a928a11bb2f3519e571d633b68da20ff9,
		0x5c82e4d54539f846eafa277f2e91210155f8c4c71c5ed50c1a217ac0ac1c5a8,
		0x1d25428ea3f30291970eaee177cc4b23aeef90507cf309cca7c8c72e59832e9a,
		0x1821b6013e0567c73e26449d62b7ae16ec09cd9f342842742fd66e6226348a7b,
		0x18ca288533ec6604899f29c01ab46cceae35d599ed4d008a5d3893f6dba01c0b,
		0x1b5fd3a832a485b085da2b8105fb48a0fbd22a5dedd17a924d7d631ea139f44f,
		0x27cf99f8f539e9faddfda81df4f1d06b7336215766967963a69d8297905acd87,
		0x243c5e5b3b977c72f8dae50394d5d8816cb8ea0fff0e2e918003e2b631a689d4,
		0x13f53d9589a87bcb657813450e59278cac8ce63ce769dba9780386130ed1dcb2,
		0x15c4bbfd4f89745db739395fc2498923a7680d5af23f4206387cee8374cd603a,
		0x2ad298c8013a34d4e9b06233c644afa434fb358db0f4c47262fd81b2c5ddce35,
		0x1b0c9428e5a6e29f64acd125df122f63a2ebf84b4d7eb50e9d96246d423325b5,
		0x29e84b4c20a814d303dc370a2aeae034542501727d9ad166964e39d6adeb530c,
		0xbc4c86c3b9840518e0fdf9f5f12c69629fe63fc86532ef0cd5c2950b9311489,
		0x70a8adedff9e6fed753490279093b41910c19223695f01fd4b17772d37f1577
	];

	uint256[DEPTH] public filledSubtreesLeft = [
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
		0x266122062ad452c57cef2d8fc4cefab39e2d847d632b139c812aab2c118d54cf,
		0x159219e77221876c5b4c534eec1e9b6d613c01d7024de0c2e9457cf4cf0edb81,
		0xadf304be8a52f3efb2445821f570e5a928a11bb2f3519e571d633b68da20ff9,
		0x5c82e4d54539f846eafa277f2e91210155f8c4c71c5ed50c1a217ac0ac1c5a8,
		0x1d25428ea3f30291970eaee177cc4b23aeef90507cf309cca7c8c72e59832e9a,
		0x1821b6013e0567c73e26449d62b7ae16ec09cd9f342842742fd66e6226348a7b,
		0x18ca288533ec6604899f29c01ab46cceae35d599ed4d008a5d3893f6dba01c0b,
		0x1b5fd3a832a485b085da2b8105fb48a0fbd22a5dedd17a924d7d631ea139f44f,
		0x27cf99f8f539e9faddfda81df4f1d06b7336215766967963a69d8297905acd87,
		0x243c5e5b3b977c72f8dae50394d5d8816cb8ea0fff0e2e918003e2b631a689d4,
		0x13f53d9589a87bcb657813450e59278cac8ce63ce769dba9780386130ed1dcb2,
		0x15c4bbfd4f89745db739395fc2498923a7680d5af23f4206387cee8374cd603a,
		0x2ad298c8013a34d4e9b06233c644afa434fb358db0f4c47262fd81b2c5ddce35,
		0x1b0c9428e5a6e29f64acd125df122f63a2ebf84b4d7eb50e9d96246d423325b5,
		0x29e84b4c20a814d303dc370a2aeae034542501727d9ad166964e39d6adeb530c,
		0xbc4c86c3b9840518e0fdf9f5f12c69629fe63fc86532ef0cd5c2950b9311489,
		0x70a8adedff9e6fed753490279093b41910c19223695f01fd4b17772d37f1577
	];

	uint256[DEPTH - BATCH_DEPTH] public filledSubtreesRight = [
		0x23e32f2d130a5775c21b2b3fbab442a5eb534d6647d0879bff6248905f12144b,
		0x28353de78662547954bd1726bb187604e5215e2fc705b480e8f82703c82c4d73,
		0x26d4f9e676413e664da88896a1a2bad525cf6bcbca0d02fb9eec6ba9f3f59fb1,
		0x1c234c6ce63e279bc2fd3f5e2ae7e7d6ceac3d8c0993f6e1c5446ff03d7c8cff,
		0x266122062ad452c57cef2d8fc4cefab39e2d847d632b139c812aab2c118d54cf,
		0x159219e77221876c5b4c534eec1e9b6d613c01d7024de0c2e9457cf4cf0edb81,
		0xadf304be8a52f3efb2445821f570e5a928a11bb2f3519e571d633b68da20ff9,
		0x5c82e4d54539f846eafa277f2e91210155f8c4c71c5ed50c1a217ac0ac1c5a8,
		0x1d25428ea3f30291970eaee177cc4b23aeef90507cf309cca7c8c72e59832e9a,
		0x1821b6013e0567c73e26449d62b7ae16ec09cd9f342842742fd66e6226348a7b,
		0x18ca288533ec6604899f29c01ab46cceae35d599ed4d008a5d3893f6dba01c0b,
		0x1b5fd3a832a485b085da2b8105fb48a0fbd22a5dedd17a924d7d631ea139f44f,
		0x27cf99f8f539e9faddfda81df4f1d06b7336215766967963a69d8297905acd87,
		0x243c5e5b3b977c72f8dae50394d5d8816cb8ea0fff0e2e918003e2b631a689d4,
		0x13f53d9589a87bcb657813450e59278cac8ce63ce769dba9780386130ed1dcb2,
		0x15c4bbfd4f89745db739395fc2498923a7680d5af23f4206387cee8374cd603a,
		0x2ad298c8013a34d4e9b06233c644afa434fb358db0f4c47262fd81b2c5ddce35,
		0x1b0c9428e5a6e29f64acd125df122f63a2ebf84b4d7eb50e9d96246d423325b5,
		0x29e84b4c20a814d303dc370a2aeae034542501727d9ad166964e39d6adeb530c,
		0xbc4c86c3b9840518e0fdf9f5f12c69629fe63fc86532ef0cd5c2950b9311489,
		0x70a8adedff9e6fed753490279093b41910c19223695f01fd4b17772d37f1577
	];

	constructor() public {
		require(identity() == ZEROS[1], 'PoseidonTree constructor: incompatible hasher');
		rootRight = hash([ZEROS[DEPTH - 1], ZEROS[DEPTH - 1]]);
		rootLeft = rootRight;
		root = hash([rootLeft, rootRight]);
	}

	function _updateSingle(uint256 leaf) internal returns (uint256) {
		require(leafIndexLeft < SET_SIZE - 1, 'PoseidonTree updateSingle: left set is full');
		uint256 acc = leaf;
		uint256 path = leafIndexLeft;
		bool subtreeSet = false;
		for (uint256 i = 0; i < DEPTH; i++) {
			if (path & 1 == 1) {
				acc = hash([filledSubtreesLeft[i], acc]);
			} else {
				if (!subtreeSet) {
					filledSubtreesLeft[i] = acc;
					subtreeSet = true;
				}
				acc = hash([acc, ZEROS[i]]);
			}
			path >>= 1;
		}
		rootLeft = acc;
		root = hash([rootLeft, rootRight]);
		history[root] = true;
		leafIndexLeft += 1;
		return leafIndexLeft - 1;
	}

	function _updateBatch(uint256[BATCH_SIZE] memory leafs) internal returns (uint256) {
		require(leafIndexRight < SET_SIZE - 1 - BATCH_SIZE, 'PoseidonTree updateBatch: right set is full ');

		// Fill the subtree
		for (uint256 i = 0; i < BATCH_DEPTH; i++) {
			uint256 n = (BATCH_DEPTH - i - 1);
			for (uint256 j = 0; j < 1 << n; j++) {
				uint256 k = j << 1;
				leafs[j] = hash([leafs[k], leafs[k + 1]]);
			}
		}
		uint256 acc = leafs[0];

		// Ascend to the root
		uint256 path = leafIndexRight;
		bool subtreeSet = false;
		for (uint256 i = 0; i < DEPTH - BATCH_DEPTH; i++) {
			if (path & 1 == 1) {
				acc = hash([filledSubtreesRight[i], acc]);
			} else {
				if (!subtreeSet) {
					filledSubtreesRight[i] = acc;
					subtreeSet = true;
				}
				acc = hash([acc, ZEROS[i + BATCH_DEPTH]]);
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
