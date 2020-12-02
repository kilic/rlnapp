pragma solidity 0.7.4;

import '../crypto/PoseidonHasher.sol';


contract AccountTreeWithQue is PoseidonHasher {
	uint256 public constant DEPTH = 32;
	uint256 public immutable MIN_SUBPoseidonTree_DEPTH;

	uint256[DEPTH] public ZEROS = [
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
		0x70a8adedff9e6fed753490279093b41910c19223695f01fd4b17772d37f1577,
		0x1f32ceda8fc2ba8d43c1559c81b3178de7cbf6fb01a3cb3bd277d6626fc5a880,
		0x1fbea75a9b8db0cc611a2419a409f9961cb1a47d8fed6e7069a60d70fbea3e54
	];
	uint256[DEPTH] public filledSubtrees = [
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
		0x70a8adedff9e6fed753490279093b41910c19223695f01fd4b17772d37f1577,
		0x1f32ceda8fc2ba8d43c1559c81b3178de7cbf6fb01a3cb3bd277d6626fc5a880,
		0x1fbea75a9b8db0cc611a2419a409f9961cb1a47d8fed6e7069a60d70fbea3e54
	];

	uint256 public root;
	mapping(uint256 => uint256) public leafs;
	uint256 public leafIndex = 0;
	uint256 public mergeOffsetLower = 0;

	constructor(uint256 minlevel) public {
		require(identity() == ZEROS[0], 'AccountTreeWithQue constructor: incompatible hasher');
		require(DEPTH == filledSubtrees.length, 'AccountTreeWithQue constructor: bad tree construction');
		require(DEPTH == ZEROS.length, 'AccountTreeWithQue constructor: bad tree construction');
		require(minlevel < DEPTH - 1, 'AccountTreeWithQue constructor: large subtree depth');
		MIN_SUBPoseidonTree_DEPTH = minlevel;
		root = ZEROS[DEPTH - 1];
	}

	function addToQue(uint256 leaf) internal {
		leafs[leafIndex] = leaf;
		leafIndex += 1;
	}

	function addToQueBatch(uint256[] calldata _leafs) internal {
		for (uint256 i = 0; i < _leafs.length; i++) {
			leafs[leafIndex + i] = _leafs[i];
		}
		leafIndex += _leafs.length;
	}

	function merge(uint256 level) internal {
		require(level >= MIN_SUBPoseidonTree_DEPTH && level < DEPTH - 1, 'AccountTreeWithQue merge: subtree depth too low');

		uint256 mergeSize = 1 << level;
		uint256 mergeOffsetUpper = mergeOffsetLower + mergeSize;
		uint256 path = mergeOffsetLower >> level;

		// Check whether valid merge request
		require(leafIndex - mergeOffsetLower >= mergeSize, 'AccountTreeWithQue merge: subtree set size must be lower or equal than que size');
		require((mergeOffsetUpper - 1) >> level == path, 'AccountTreeWithQue merge: cannot construct subtree');

		uint256[] memory buf = new uint256[](mergeSize / 2);

		// Hash leafs
		for (uint256 i = 0; i < mergeSize / 2; i++) {
			uint256 j = mergeOffsetLower + 2 * i;
			buf[i] = hash([leafs[j], leafs[j + 1]]);
		}

		// Ascend the subtree
		for (uint256 i = 1; i < level; i++) {
			for (uint256 j = 0; j < 1 << (level - i - 1); j++) {
				uint256 k = 2 * j;
				buf[j] = hash([buf[k], buf[k + 1]]);
			}
		}
		uint256 acc = buf[0];

		// Merge with filled subtrees
		while (path & 1 == 1) {
			acc = hash([filledSubtrees[level - 1], acc]);
			path >>= 1;
			level += 1;
		}

		filledSubtrees[level - 1] = acc;
		mergeOffsetLower += mergeSize;
	}

	function calculateRoot() internal {
		uint256 path = (mergeOffsetLower - 1) >> 1;
		uint256 level = 0;
		while (path & 1 == 1) {
			path >>= 1;
			level += 1;
		}
		uint256 acc = hash([filledSubtrees[level], ZEROS[level]]);
		for (uint256 i = level + 1; i < DEPTH - 1; i++) {
			path >>= 1;
			if (path & 1 == 1) {
				acc = hash([filledSubtrees[i], acc]);
			} else {
				acc = hash([acc, ZEROS[i]]);
			}
		}
		root = acc;
	}
}
