const TestAccountTreeContract = artifacts.require('TestAccountTree');
const Tree = require('@rln/tree').Tree;
const { newPoseidonHasher } = require('@rln/tree');
const { assert } = require('chai');

const utils = web3.utils;
const hasher = newPoseidonHasher({});

function bnToHex(n) {
	return utils.padLeft(utils.toHex(n), 64);
}

contract('Account Tree', () => {
	let batchDepth;
	let treeLeft;
	let treeRight;
	let treeContract;

	async function updateSingle() {
		let z = await treeContract.zeros(1);
		for (let i = 0; i < 5; i++) {
			const leaf = web3.utils.randomHex(16);
			treeLeft.updateSingle(i, leaf);
			await treeContract.updateSingle(leaf);
			assert.equal(treeLeft.root, bnToHex(await treeContract.rootLeft()));
			assert.equal(treeRight.root, bnToHex(await treeContract.rootRight()));
			const root = hasher.hash2(treeLeft.root, treeRight.root);
			assert.equal(root, bnToHex(await treeContract.root()));
		}
	}

	async function updateBatch() {
		const batchSize = 1 << batchDepth;
		for (let k = 0; k < 4; k++) {
			let leafs = [];
			for (let i = 0; i < batchSize; i++) {
				const leaf = web3.utils.randomHex(16);
				leafs.push(leaf);
			}
			treeRight.updateBatch(batchSize * k, leafs);
			await treeContract.updateBatch(leafs);
			assert.equal(treeLeft.root, bnToHex(await treeContract.rootLeft()));
			assert.equal(treeRight.root, bnToHex(await treeContract.rootRight()));
			const root = hasher.hash2(treeLeft.root, treeRight.root);
			assert.equal(root, bnToHex(await treeContract.root()));
		}
	}

	async function suite(contract, depth, _batchDepth) {
		batchDepth = _batchDepth;
		treeLeft = Tree.new(depth - 1, hasher);
		treeRight = Tree.new(depth - 1, hasher);
		zeros = treeLeft.zeros.slice(1).reverse();
		treeContract = await contract.new(zeros, batchDepth);
	}

	contract('16', () => {
		beforeEach(async () => {
			await suite(TestAccountTreeContract, 16, 4);
		});
		it('single', async () => {
			await updateSingle();
		});
		it('batch', async () => {
			await updateBatch();
		});
	});
});
