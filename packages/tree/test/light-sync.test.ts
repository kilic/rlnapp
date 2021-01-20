import * as chai from 'chai';
import { ethers } from 'ethers';
import { Tree, Data } from '../src';
import { LightSyncFS } from '../src/light-sync';
import { newPoseidonHasher } from '../src/poseidon';
const assert = chai.assert;

function randLeaf(): Data {
	return ethers.utils.hexlify(ethers.utils.randomBytes(20));
}

function randLeafs(size: number): Array<Data> {
	return Array<Data>(size)
		.fill('0')
		.map(() => randLeaf());
}

describe('Ligth merkle tree sync', function () {
	const POSEIDON_PARAMETERS = {}; // use default
	const hasher = newPoseidonHasher(POSEIDON_PARAMETERS);
	const depth = 3;
	const setSize = 1 << depth;
	const emptyPath = Array<string>(depth).fill('0');
	it('boot: current index = 0', () => {
		const referenceTree = Tree.new(depth, hasher);
		const leafs = randLeafs(setSize);
		const currentIndex = 0;
		const filledSubtrees = referenceTree.zeros.slice(1).reverse();
		const authPath = emptyPath;

		// for (let i = 1; i < setSize; i++) {
		const memberIndex = 0;
		// console.log(i);
		// initilize an empty synconizer
		const sync = LightSyncFS.new(hasher, depth, currentIndex, filledSubtrees, leafs[memberIndex], memberIndex, authPath);
		for (let j = 0; j < 1; j++) {
			console.log('j', j);
			referenceTree.updateSingle(j, leafs[j]);
			sync.incrementalUpdate(leafs[j]);
			// assert.equal(referenceTree.root, sync.root, `${i},${j}`);
			assert.equal(referenceTree.root, sync.root);
			if (sync.inSync) {
				const witness = sync.witness();
				referenceTree.checkInclusion(witness);
			}
		}
		// }
	});
	// it('boot: current index < leaf index', () => {
	// 	const referenceTree = Tree.new(depth, hasher);
	// 	const leafs = randLeafs(setSize);
	// 	const memberIndex = 5;
	// 	const currentIndex = 2;

	// 	const filledSubtrees = referenceTree.zeros.slice(1).reverse();

	// 	const authPath = emptyPath;
	// 	// initilize an empty synconizer
	// 	const sync = LightSyncFS.new(hasher, depth, currentIndex, filledSubtrees, leafs[memberIndex], memberIndex, authPath);
	// 	for (let i = 0; i < 6; i++) {
	// 		referenceTree.updateSingle(i, leafs[i]);
	// 		sync.incrementalUpdate(leafs[i]);
	// 		assert.equal(referenceTree.root, sync.root);
	// 		if (sync.inSync) {
	// 			const witness = sync.witness();
	// 			referenceTree.checkInclusion(witness);
	// 		}
	// 	}
	// });
});
