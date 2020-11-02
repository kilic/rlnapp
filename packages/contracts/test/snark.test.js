const TestSnark = artifacts.require('TestSnark');
const { assert } = require('chai');
const { Tree } = require('@rln/tree');
const { RLN, RLNUtils } = require('@rln/rln');

const DEPTH = 3;

function randAddress() {
	return web3.utils.randomHex(20);
}

contract('Snark', () => {
	let rln;
	let snark;
	let tree;
	const memberIndex = 2;
	const memberKey = '0xff';
	let verifyingKey;
	before(async () => {
		rln = await RLN.new(DEPTH);
		tree = Tree.new(DEPTH);
		assert.equal(0, tree.insertSingle(memberIndex, memberKey));
		snark = await TestSnark.new();
		verifyingKey = RLNUtils.rawVerifyingKeyToSol(rln.verifyingKey());
	});
	it('verify snark', async () => {
		const epoch = 100;
		const signal = 'xxx yyy zzz';
		const target = randAddress();
		const rlnOut = rln.generateRLN(tree, epoch, signal, target, memberKey, memberIndex);
		assert.isTrue(rln.verify(rlnOut.proof, rlnOut.publicInputs));
		console.log(rlnOut.proof.length);
		const proof = RLNUtils.rawProofToSol(rlnOut.proof);
		const inputs = RLNUtils.rawPublicInputsToSol(rlnOut.publicInputs);
		assert.isTrue(await snark.verify(verifyingKey, inputs, proof));
	});
});
