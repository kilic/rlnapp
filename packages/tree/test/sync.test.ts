import { Hasher, Tree } from '../src';
import { RlnFactory } from '../src/generated_contract_wrappers/RlnFactory';
import { wallet, provider } from './provider';
import { Rln } from '../src/generated_contract_wrappers/Rln';
import { utils } from 'ethers';
import { TreeSync } from '../src/sync';
import * as chai from 'chai';

const assert = chai.assert;
const RLN_FACTORY = new RlnFactory(wallet);
const POSEIDON_PARAMETERS = {}; // use default
const HASHER = Hasher.new(POSEIDON_PARAMETERS);

const MEMBERSHIP_FEE = utils.parseEther('1');

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function randPubkey(): string {
	return utils.hexlify(utils.randomBytes(32));
}

async function newRln(depth: number): Promise<Rln> {
	const rln = await RLN_FACTORY.deploy(depth, MEMBERSHIP_FEE);
	await rln.deployTransaction.wait();
	return rln;
}

describe('Tree Sync', function () {
	it('treesync empty start', async () => {
		const depth = 32;
		const referenceTree = Tree.new(depth, HASHER);
		const rln = await newRln(depth);
		const treesync = await TreeSync.new(HASHER, rln.address, provider);
		// register 0
		const pubkey0 = randPubkey();
		referenceTree.updateSingle(0, pubkey0);
		let tx = await rln.register(pubkey0, { value: MEMBERSHIP_FEE });
		// register 1
		const pubkey1 = randPubkey();
		referenceTree.updateSingle(1, pubkey1);
		tx = await rln.register(pubkey1, { value: MEMBERSHIP_FEE });
		await sleep(1000); // sleep some to treesync gets events
		assert.equal(referenceTree.root, treesync.root);
	}).timeout(4000);

	it('treesync boot', async () => {
		const depth = 32;
		const referenceTree = Tree.new(depth, HASHER);
		const rln = await newRln(depth);
		// register 0
		const pubkey0 = randPubkey();
		referenceTree.updateSingle(0, pubkey0);
		let tx = await rln.register(pubkey0, { value: MEMBERSHIP_FEE });
		// register 1
		const pubkey1 = randPubkey();
		referenceTree.updateSingle(1, pubkey1);
		tx = await rln.register(pubkey1, { value: MEMBERSHIP_FEE });
		await sleep(1000); // sleep some to treesync gets events
		const treesync = await TreeSync.new(HASHER, rln.address, provider);
		assert.equal(referenceTree.root, treesync.root);
	}).timeout(4000);
});
