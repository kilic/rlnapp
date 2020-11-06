const TestSnark = artifacts.require('TestSnark');
const { assert } = require('chai');
const { Tree, newPoseidonHasher } = require('@rln/tree');
const { RLNUtils } = require('@rln/rln');
const initRLN = require('./init_rln');

const DEPTH = 4;

function randAddress() {
	return web3.utils.randomHex(20);
}

contract('Snark Verification', () => {
	let rln;
	let snark;
	let tree;
	const memberIndex = 2;
	const memberKey = '0xff';
	let verifyingKey;
	before(async () => {
		rln = initRLN(DEPTH);
		hasher = newPoseidonHasher({});
		tree = Tree.new(DEPTH, hasher);
		assert.equal(0, tree.insertSingle(memberIndex, memberKey));
		snark = await TestSnark.new();
		verifyingKey = RLNUtils.rawVerifyingKeyToSol(rln.verifyingKey());
	});
	it('verify snark', async () => {
		const epoch = 100;
		const signal = 'xxx yyy zzz';
		const target = randAddress();
		const rlnOut = rln.generate(tree, epoch, signal, target, memberKey, memberIndex);
		assert.isTrue(rln.verify(rlnOut.rawProof, rlnOut.rawPublicInputs));
		assert.isTrue(await snark.verify(verifyingKey, rlnOut.publicInputs, rlnOut.proof));
	});
});
