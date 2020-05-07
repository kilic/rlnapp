import * as chai from 'chai';
import { Hasher, Tree, Data } from '../src/';
const assert = chai.assert;

const POSEIDON_PARAMETERS = {}; // use default

describe('Merkle Tree', function () {
	let hasher;
	before(async () => {
		hasher = Hasher.new(POSEIDON_PARAMETERS);
	});
	it('initializes with zeros', async () => {
		assert.equal(Tree.new(3, hasher).root, '0x13fc18037da87a772cd576e98b3e6b503fa1c5025ea003da8e7ea8bbeced270f');
		assert.equal(Tree.new(32, hasher).root, '0x1fbea75a9b8db0cc611a2419a409f9961cb1a47d8fed6e7069a60d70fbea3e54');
	});
	it('insert single', async () => {
		const tree3 = Tree.new(3, hasher);
		assert.equal(0, tree3.insert(5, '0x01'));
		assert.equal(0, tree3.insert(6, '0x02'));
		assert.equal(tree3.root, '0x170990af0d57e5ac9161ede7b278c743925bcbb51a1252907a290432cb5bf502');
		const tree32 = Tree.new(32, hasher);
		assert.equal(0, tree32.insert(5, '0x01'));
		assert.equal(0, tree32.insert(6, '0x02'));
		assert.equal(tree32.root, '0x2efd616a1e172e5700aa002b9b41fa3ebe04f61506aa7fff952b1e37ffec12ff');
	});
	it('update single', async () => {
		const tree3 = Tree.new(3, hasher);
		assert.equal(0, tree3.update(5, hasher.hash('0x01')));
		assert.equal(0, tree3.update(6, hasher.hash('0x02')));
		assert.equal(tree3.root, '0x170990af0d57e5ac9161ede7b278c743925bcbb51a1252907a290432cb5bf502');
		const tree32 = Tree.new(32, hasher);
		assert.equal(0, tree32.update(5, hasher.hash('0x01')));
		assert.equal(0, tree32.update(6, hasher.hash('0x02')));
		assert.equal(tree32.root, '0x2efd616a1e172e5700aa002b9b41fa3ebe04f61506aa7fff952b1e37ffec12ff');
	});
	it('insert batch', async () => {
		const depth = 32;
		const M = 64;
		const tree = Tree.new(depth, hasher);
		const data = Array<Data>(M)
			.fill('0')
			.map((_, i) => i.toString());
		const offset = M * 5;
		assert.equal(0, tree.insertBatch(offset, data));
		const otherTree = Tree.new(depth, hasher);
		for (let i = 0; i < data.length; i++) {
			otherTree.insert(offset + i, data[i]);
		}
		assert.equal(tree.root, otherTree.root);
	});
	it('update batch', async () => {
		const depth = 32;
		const M = 64;
		const tree = Tree.new(depth, hasher);
		const batch = Array<Data>(M)
			.fill('0')
			.map((_, i) => hasher.hash(i.toString()));
		const offset = M * 5;
		assert.equal(0, tree.updateBatch(offset, batch));
		const otherTree = Tree.new(depth, hasher);
		for (let i = 0; i < batch.length; i++) {
			otherTree.update(offset + i, batch[i]);
		}
		assert.equal(tree.root, otherTree.root);
	});
});
