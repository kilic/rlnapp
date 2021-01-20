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
	it('boot from 0', () => {
		const referenceTree = Tree.new(depth, hasher);
		const leafs = randLeafs(setSize);
		const memberIndex = 5;
		const currentIndex = 0;
		const filledSubtrees = referenceTree.zeros.slice(1).reverse();
		const authPath = emptyPath;
		// initilize an empty synconizer
		const sync = LightSyncFS.new(hasher, depth, currentIndex, filledSubtrees, leafs[memberIndex], memberIndex, authPath);
		for (let i = 0; i < 6; i++) {
			assert.equal(0, referenceTree.updateSingle(i, leafs[i]));
			sync.incrementalUpdate(leafs[i]);
			assert.equal(referenceTree.root, sync.root);
			if (sync.inSync) {
				const witness = sync.witness();
				assert.equal(0, referenceTree.checkInclusion(witness));
			}
		}
	});
});
