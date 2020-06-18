import * as chai from 'chai';
import { Hasher, Tree, Data, Witness } from '../src';
const assert = chai.assert;

const POSEIDON_PARAMETERS = {}; // use default
const hasher = Hasher.new(POSEIDON_PARAMETERS);

describe('Merkle Tree', function () {
	before(async () => {});
	it('initializes with zeros', async () => {
		assert.equal(Tree.new(3, hasher).root, '0x13fc18037da87a772cd576e98b3e6b503fa1c5025ea003da8e7ea8bbeced270f');
		assert.equal(Tree.new(32, hasher).root, '0x1fbea75a9b8db0cc611a2419a409f9961cb1a47d8fed6e7069a60d70fbea3e54');
	});
	it('insert single', async () => {
		const tree3 = Tree.new(3, hasher);
		assert.equal(0, tree3.insertSingle(5, '0x01'));
		assert.equal(0, tree3.insertSingle(6, '0x02'));
		assert.equal(tree3.root, '0x170990af0d57e5ac9161ede7b278c743925bcbb51a1252907a290432cb5bf502');
		const tree32 = Tree.new(32, hasher);
		assert.equal(0, tree32.insertSingle(5, '0x01'));
		assert.equal(0, tree32.insertSingle(6, '0x02'));
		assert.equal(tree32.root, '0x2efd616a1e172e5700aa002b9b41fa3ebe04f61506aa7fff952b1e37ffec12ff');
	});
	it('update single', async () => {
		const tree3 = Tree.new(3, hasher);
		assert.equal(0, tree3.updateSingle(5, hasher.hash('0x01')));
		assert.equal(0, tree3.updateSingle(6, hasher.hash('0x02')));
		assert.equal(tree3.root, '0x170990af0d57e5ac9161ede7b278c743925bcbb51a1252907a290432cb5bf502');
		const tree32 = Tree.new(32, hasher);
		assert.equal(0, tree32.updateSingle(5, hasher.hash('0x01')));
		assert.equal(0, tree32.updateSingle(6, hasher.hash('0x02')));
		assert.equal(tree32.root, '0x2efd616a1e172e5700aa002b9b41fa3ebe04f61506aa7fff952b1e37ffec12ff');
	});
	it('insert batch', async () => {
		const depth = 4;
		for (let k = 0; k < 16; k++) {
			for (let j = 1; j < 16 - k; j++) {
				const tree = Tree.new(depth, hasher);
				const offset = k;
				const len = j;
				const data = Array<Data>(len)
					.fill('0')
					.map((_, i) => i.toString());
				assert.equal(0, tree.insertBatch(offset, data), `${k}, ${j}`);
				const otherTree = Tree.new(depth, hasher);
				for (let i = 0; i < data.length; i++) {
					assert.equal(0, otherTree.insertSingle(offset + i, data[i]));
				}
				assert.equal(tree.root, otherTree.root);
			}
		}
	}).timeout(5000);
	it('update batch', async () => {
		const depth = 4;
		const tree = Tree.new(depth, hasher);
		const len = 16;
		const offset = 0;
		const data = Array<Data>(len).fill('0');
		const root0 = tree.root;
		assert.equal(0, tree.updateBatch(offset, data));
		assert.equal(tree.root, root0);
	});
	it('witness', async () => {
		const depth = 4;
		const tree = Tree.new(depth, hasher);
		const witness: Witness = {
			path: [false, false, false, false],
			nodes: tree.zeros.slice(1).reverse(),
			leaf: '0x00',
			index: 1
		};
		assert.equal(0, tree.checkInclusion(witness));
		witness.leaf = '0x01';
		assert.equal(-1, tree.checkInclusion(witness));
		const data = Array<Data>(tree.setSize)
			.fill('0')
			.map((_, i) => (i + 1).toString());
		assert.equal(0, tree.updateBatch(0, data));
		for (let i = 0; i < tree.setSize; i++) {
			const witness = tree.witness(i);
			assert.equal(0, tree.checkInclusion(witness));
			witness.leaf = '0x00';
			assert.equal(-1, tree.checkInclusion(witness));
		}
	});
	it('witness for batch merging', async () => {
		const depth = 8;
		const tree = Tree.new(depth, hasher);
		let witness = tree.witnessForBatch(0, 2);
		assert.equal(0, tree.checkInclusion(witness));
		let data = Array<Data>(64)
			.fill('0')
			.map((_, i) => (i + 1).toString());
		assert.equal(0, tree.updateBatch(0, data));
		witness = tree.witnessForBatch(0, 6);
		assert.equal(0, tree.checkInclusion(witness));
		data = Array<Data>(16)
			.fill('0')
			.map((_, i) => (i + 1).toString());
		assert.equal(0, tree.updateBatch(64, data));
		witness = tree.witnessForBatch(64, 4);
		assert.equal(0, tree.checkInclusion(witness));
	});
});
