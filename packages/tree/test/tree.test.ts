import * as chai from 'chai';
import { Hasher, Tree, Data, Witness } from '../src';
import { newKeccakHasher } from '../src/keccak';
import { newPoseidonHasher } from '../src/poseidon';
const assert = chai.assert;

function insertBatch(hasher: Hasher) {
	const depth = 4;
	for (let k = 0; k < 16; k++) {
		for (let j = 1; j < 16 - k; j++) {
			const tree = Tree.new(depth, hasher);
			const offset = k;
			const len = j;
			const data = Array<Data>(len)
				.fill('0')
				.map((_, i) => i.toString());
			tree.insertBatch(offset, data);
			const otherTree = Tree.new(depth, hasher);
			for (let i = 0; i < data.length; i++) {
				otherTree.insertSingle(offset + i, data[i]);
			}
			assert.equal(tree.root, otherTree.root);
		}
	}
}

function updateBatch(hasher: Hasher) {
	const depth = 4;
	const tree = Tree.new(depth, hasher);
	const len = 16;
	const offset = 0;
	const data = Array<Data>(len).fill('0');
	const root0 = tree.root;
	tree.updateBatch(offset, data);
	assert.equal(tree.root, root0);
}

function witness(hasher: Hasher) {
	const depth = 4;
	const tree = Tree.new(depth, hasher);
	const witness: Witness = {
		nodes: tree.zeros.slice(1).reverse(),
		leaf: '0x00',
		index: 1
	};
	assert.isTrue(tree.checkInclusion(witness));
	witness.leaf = '0x01';
	assert.isFalse(tree.checkInclusion(witness));
	const data = Array<Data>(tree.setSize)
		.fill('0')
		.map((_, i) => (i + 1).toString());
	tree.updateBatch(0, data);
	for (let i = 0; i < tree.setSize; i++) {
		const witness = tree.witness(i);
		assert.isTrue(tree.checkInclusion(witness));
		witness.leaf = '0x00';
		assert.isFalse(tree.checkInclusion(witness));
	}
}

function witnessBatchMerge(hasher: Hasher) {
	const depth = 8;
	const tree = Tree.new(depth, hasher);
	let witness = tree.witnessForBatch(0, 2);
	assert.isTrue(tree.checkInclusion(witness));
	let data = Array<Data>(64)
		.fill('0')
		.map((_, i) => (i + 1).toString());
	tree.updateBatch(0, data);
	witness = tree.witnessForBatch(0, 6);
	assert.isTrue(tree.checkInclusion(witness));
	data = Array<Data>(16)
		.fill('0')
		.map((_, i) => (i + 1).toString());
	tree.updateBatch(64, data);
	witness = tree.witnessForBatch(64, 4);
	assert.isTrue(tree.checkInclusion(witness));
}

describe('Merkle Tree with Poseidon Hasher', function () {
	const POSEIDON_PARAMETERS = {}; // use default
	const hasher = newPoseidonHasher(POSEIDON_PARAMETERS);
	it('insert', () => {
		insertBatch(hasher);
	}).timeout(5000);
	it('update', () => {
		updateBatch(hasher);
	});
	it('witness', () => {
		witness(hasher);
	});
	it('witness for batch merging', () => {
		witnessBatchMerge(hasher);
	});
});

describe('Merkle Tree with Keccak Hasher', function () {
	const hasher = newKeccakHasher('uint256');
	it('insert', () => {
		insertBatch(hasher);
	}).timeout(5000);
	it('update', () => {
		updateBatch(hasher);
	});
	it('witness', () => {
		witness(hasher);
	});
	it('witness for batch merging', () => {
		witnessBatchMerge(hasher);
	});
});
