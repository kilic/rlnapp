const TestAccountTreeWithQueContract = artifacts.require('TestAccountTreeWithQue');
const Tree = require('@rln/tree').Tree;
const { newPoseidonHasher } = require('@rln/tree');
const { assert } = require('chai');

const hasher = newPoseidonHasher({});
const utils = web3.utils;

let DEPTH;
let BATCH_DEPTH;

contract('tree with que', () => {
	let treeContract;
	let tree;
	const minSubtreeDepth = 1;
	beforeEach(async () => {
		tree = Tree.new(32, hasher);
		treeContract = await TestAccountTreeWithQueContract.new(minSubtreeDepth);
	});

	it('Add que', async () => {
		const que = ['0x00', '0x01', '0x02', '0x03'].map((hex) => web3.utils.toBN(hex));
		await treeContract._addToQueBatch(que);
		assert.equal((await treeContract.leafIndex()).toNumber(), 4);
		assert.equal((await treeContract.leafs(0)).toNumber(), que[0].toNumber());
		assert.equal((await treeContract.leafs(1)).toNumber(), que[1].toNumber());
		assert.equal((await treeContract.leafs(2)).toNumber(), que[2].toNumber());
		assert.equal((await treeContract.leafs(3)).toNumber(), que[3].toNumber());
	});
	it('Merge 4 + C', async () => {
		const que = ['0x01', '0x02', '0x03', '0x04'];
		await treeContract._addToQueBatch(que);
		const level = 2;
		const mergeOffsetLower = 0;
		tree.updateBatch(mergeOffsetLower, que);
		root0 = tree.root;
		await treeContract._merge(level);
		await treeContract._calculateRoot();
		root1 = await treeContract.root();
		assert.equal(root0, utils.toHex(root1));
	});
	it('Merge 4 + C + 4 + C', async () => {
		let que = ['0x01', '0x02', '0x03', '0x04'];
		await treeContract._addToQueBatch(que);
		let level = 2;
		let mergeOffsetLower = 0;
		tree.updateBatch(mergeOffsetLower, que);
		let root0 = tree.root;
		await treeContract._merge(level);
		await treeContract._calculateRoot();
		let root1 = await treeContract.root();
		assert.equal(root0, utils.toHex(root1));

		que = ['0x05', '0x06', '0x07', '0x08'];
		await treeContract._addToQueBatch(que);
		level = 2;
		mergeOffsetLower = 4;
		tree.updateBatch(mergeOffsetLower, que);
		root0 = tree.root;
		await treeContract._merge(level);
		await treeContract._calculateRoot();
		root1 = await treeContract.root();
		assert.equal(root0, utils.toHex(root1));
	});
	it('Merge 4 + C + 2 + C', async () => {
		let que = ['0x01', '0x02', '0x03', '0x04'];
		await treeContract._addToQueBatch(que);
		let level = 2;
		let mergeOffsetLower = 0;
		tree.updateBatch(mergeOffsetLower, que);
		let root0 = tree.root;
		await treeContract._merge(level);
		await treeContract._calculateRoot();
		let root1 = await treeContract.root();
		assert.equal(root0, utils.toHex(root1));

		que = ['0x05', '0x06'];
		await treeContract._addToQueBatch(que);
		level = 1;
		mergeOffsetLower = 4;
		tree.updateBatch(mergeOffsetLower, que);
		root0 = tree.root;
		await treeContract._merge(level);
		await treeContract._calculateRoot();
		root1 = await treeContract.root();
		assert.equal(root0, utils.toHex(root1));
	});
	it('Merge 4 + C + 2 + C + 2 + C', async () => {
		let que = ['0x01', '0x02', '0x03', '0x04'];
		await treeContract._addToQueBatch(que);
		let level = 2;
		let mergeOffsetLower = 0;
		tree.updateBatch(mergeOffsetLower, que);
		let root0 = tree.root;
		await treeContract._merge(level);
		await treeContract._calculateRoot();
		let root1 = await treeContract.root();
		assert.equal(root0, utils.toHex(root1));

		que = ['0x05', '0x06'];
		await treeContract._addToQueBatch(que);
		level = 1;
		mergeOffsetLower = 4;
		tree.updateBatch(mergeOffsetLower, que);
		root0 = tree.root;
		await treeContract._merge(level);
		await treeContract._calculateRoot();
		root1 = await treeContract.root();
		assert.equal(root0, utils.toHex(root1));

		que = ['0x07', '0x08'];
		await treeContract._addToQueBatch(que);
		level = 1;
		mergeOffsetLower = 6;
		tree.updateBatch(mergeOffsetLower, que);
		root0 = tree.root;
		await treeContract._merge(level);
		await treeContract._calculateRoot();
		root1 = await treeContract.root();
		assert.equal(root0, utils.toHex(root1));
	});
	it('Merge 4 + 4 + C', async () => {
		let que = ['0x01', '0x02', '0x03', '0x04'];
		await treeContract._addToQueBatch(que);
		let level = 2;
		let mergeOffsetLower = 0;
		tree.updateBatch(mergeOffsetLower, que);
		let root0 = tree.root;
		await treeContract._merge(level);

		que = ['0x05', '0x06', '0x07', '0x08'];
		await treeContract._addToQueBatch(que);
		level = 2;
		mergeOffsetLower = 4;
		tree.updateBatch(mergeOffsetLower, que);
		root0 = tree.root;
		await treeContract._merge(level);
		await treeContract._calculateRoot();
		root1 = await treeContract.root();
		assert.equal(root0, utils.toHex(root1));
	});
	it('Merge 4 + 2 + C', async () => {
		let que = ['0x01', '0x02', '0x03', '0x04'];
		await treeContract._addToQueBatch(que);
		let level = 2;
		let mergeOffsetLower = 0;
		tree.updateBatch(mergeOffsetLower, que);
		let root0 = tree.root;
		await treeContract._merge(level);

		que = ['0x05', '0x06'];
		await treeContract._addToQueBatch(que);
		level = 1;
		mergeOffsetLower = 4;
		tree.updateBatch(mergeOffsetLower, que);
		root0 = tree.root;
		await treeContract._merge(level);
		await treeContract._calculateRoot();
		root1 = await treeContract.root();
		assert.equal(root0, utils.toHex(root1));
	});
	it('Merge 4 + 2 + 2 + C', async () => {
		let que = ['0x01', '0x02', '0x03', '0x04'];
		await treeContract._addToQueBatch(que);
		let level = 2;
		let mergeOffsetLower = 0;
		tree.updateBatch(mergeOffsetLower, que);
		let root0 = tree.root;
		await treeContract._merge(level);

		que = ['0x05', '0x06'];
		await treeContract._addToQueBatch(que);
		level = 1;
		mergeOffsetLower = 4;
		tree.updateBatch(mergeOffsetLower, que);
		root0 = tree.root;
		await treeContract._merge(level);

		que = ['0x07', '0x08'];
		await treeContract._addToQueBatch(que);
		level = 1;
		mergeOffsetLower = 6;
		tree.updateBatch(mergeOffsetLower, que);
		root0 = tree.root;
		await treeContract._merge(level);
		await treeContract._calculateRoot();
		root1 = await treeContract.root();
		assert.equal(root0, utils.toHex(root1));
	});
});
