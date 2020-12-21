import * as chai from 'chai';
import { Hasher, Tree, Data } from '../src';
import { AuthPath } from '../src/auth_path';
import { newKeccakHasher } from '../src/keccak';
const assert = chai.assert;

const hasher = newKeccakHasher('uint256');

describe('Auth Path', function () {
	const depth = 4;
	const leaves = Array<Data>(1 << depth)
		.fill('0')
		.map((_, i) => (i + 1).toString());
	before(() => {});

	it('from index zero', () => {
		const indexToTrack = 0;
		const currentIndex = 1;
		const tree = Tree.new(depth, hasher);
		const leaf = leaves[indexToTrack];
		tree.updateSingle(indexToTrack, leaf);
		const witness = tree.witness(indexToTrack).nodes;
		const authPath = AuthPath.new(leaf, indexToTrack, currentIndex, depth, hasher, witness, []);
		assert.equal(tree.root, authPath.root());
		for (let i = currentIndex; i < 1 << depth; i++) {
			const newLeaf = leaves[i];
			tree.updateSingle(i, newLeaf);
			authPath.update(newLeaf);
			assert.equal(tree.root, authPath.root());
		}
	});
	it('boot with an offset, track index 0', () => {
		const indexToTrack = 0;
		const currentIndex = 2;
		const tree = Tree.new(depth, hasher);
		const leaf = leaves[indexToTrack];
		for (let i = 0; i < currentIndex; i++) {
			tree.updateSingle(i, leaves[i]);
		}
		const witness = tree.witness(indexToTrack).nodes;
		const currentWitness = tree.witness(currentIndex).nodes;
		const authPath = AuthPath.new(leaf, indexToTrack, currentIndex, depth, hasher, witness, currentWitness);
		assert.equal(tree.root, authPath.root());
		for (let i = currentIndex; i < 1 << depth; i++) {
			const newLeaf = leaves[i];
			tree.updateSingle(i, newLeaf);
			authPath.update(newLeaf);
			assert.equal(tree.root, authPath.root());
		}
	});
	it('boot with an offset, track index n', () => {
		const indexToTrack = 1;
		const currentIndex = 2;
		const tree = Tree.new(depth, hasher);
		const leaf = leaves[indexToTrack];
		for (let i = 0; i < currentIndex; i++) {
			tree.updateSingle(i, leaves[i]);
		}
		const witness = tree.witness(indexToTrack).nodes;
		const currentWitness = tree.witness(currentIndex).nodes;
		const authPath = AuthPath.new(leaf, indexToTrack, currentIndex, depth, hasher, witness, currentWitness);
		assert.equal(tree.root, authPath.root());
		for (let i = currentIndex; i < 1 << depth; i++) {
			const newLeaf = leaves[i];
			tree.updateSingle(i, newLeaf);
			authPath.update(newLeaf);
			assert.equal(tree.root, authPath.root());
		}
	});
});
