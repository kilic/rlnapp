const TestAccountTree32Contract = artifacts.require('TestAccountTree32');
const TestAccountTree24Contract = artifacts.require('TestAccountTree24');
const TestAccountTree16Contract = artifacts.require('TestAccountTree16');

const Hasher = require('@rln/tree').Hasher;
const Tree = require('@rln/tree').Tree;
const { assert } = require('chai');

const utils = web3.utils;

contract.skip('Account Tree', () => {
	let DEPTH;
	let BATCH_DEPTH;
	let treeLeft;
	let treeRight;
	let hasher;
	let treeContract;

	async function updateSingle() {
		for (let i = 0; i < 5; i++) {
			const leaf = web3.utils.randomHex(16);
			treeLeft.updateSingle(i, leaf);
			await treeContract.updateSingle(leaf);
			assert.equal(treeLeft.root, utils.toHex(await treeContract.rootLeft()));
			assert.equal(treeRight.root, utils.toHex(await treeContract.rootRight()));
			const root = hasher.hash2(treeLeft.root, treeRight.root);
			assert.equal(root, utils.toHex(await treeContract.root()));
		}
	}

	async function updateBatch() {
		const batchSize = 1 << BATCH_DEPTH;
		for (let k = 0; k < 4; k++) {
			let leafs = [];
			for (let i = 0; i < batchSize; i++) {
				const leaf = web3.utils.randomHex(16);
				leafs.push(leaf);
			}
			treeRight.updateBatch(batchSize * k, leafs);
			await treeContract.updateBatch(leafs);
			assert.equal(treeLeft.root, utils.toHex(await treeContract.rootLeft()));
			assert.equal(treeRight.root, utils.toHex(await treeContract.rootRight()));
			const root = hasher.hash2(treeLeft.root, treeRight.root);
			assert.equal(root, utils.toHex(await treeContract.root()));
		}
	}

	async function suite(contract) {
		treeContract = await contract.new();
		DEPTH = (await treeContract.DEPTH()).toNumber();
		BATCH_DEPTH = (await treeContract.BATCH_DEPTH()).toNumber();
		treeLeft = Tree.new(DEPTH, hasher);
		treeRight = Tree.new(DEPTH, hasher);
		hasher = treeLeft.hasher;
		zeros = treeLeft.zeros;
	}

	contract('16', () => {
		beforeEach(async () => {
			await suite(TestAccountTree16Contract);
		});
		it('single', async () => {
			await updateSingle();
		});
		it('batch', async () => {
			await updateBatch();
		});
	});

	contract('24', () => {
		beforeEach(async () => {
			await suite(TestAccountTree24Contract);
		});
		it('single', async () => {
			await updateSingle();
		});
		it('batch', async () => {
			await updateBatch();
		});
	});

	contract('32', () => {
		beforeEach(async () => {
			await suite(TestAccountTree32Contract);
		});
		it('single', async () => {
			await updateSingle();
		});
		it('batch', async () => {
			await updateBatch();
		});
	});
});
