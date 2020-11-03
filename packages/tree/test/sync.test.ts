import { Hasher, Tree } from '../src';
import { RlnFactory } from '../src/generated_contract_wrappers/RlnFactory';
import { wallet, provider, downProvider } from './provider';
import { Rln } from '../src/generated_contract_wrappers/Rln';
import { utils } from 'ethers';
import { TreeSync } from '../src/sync';
import { newPoseidonHasher } from '../src/poseidon';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const assert = chai.assert;
const expect = chai.expect;
const RLN_FACTORY = new RlnFactory(wallet);
const POSEIDON_PARAMETERS = {}; // use default
const HASHER = newPoseidonHasher(POSEIDON_PARAMETERS);

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
	it('start with set empty', async () => {
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
	}).timeout(3000);
	it('boot from scratch', async () => {
		const depth = 32;
		const referenceTree = Tree.new(depth, HASHER);
		const rln = await newRln(depth);
		// register 0
		const pubkey0 = randPubkey();
		referenceTree.updateSingle(0, pubkey0);
		let tx = await rln.register(pubkey0, { value: MEMBERSHIP_FEE });
		await tx.wait();
		// register 1
		const pubkey1 = randPubkey();
		referenceTree.updateSingle(1, pubkey1);
		tx = await rln.register(pubkey1, { value: MEMBERSHIP_FEE });
		await tx.wait();
		await sleep(1000); // sleep some to treesync gets events
		const treesync = await TreeSync.new(HASHER, rln.address, provider);
		assert.equal(referenceTree.root, treesync.root);
		await sleep(1000); // sleep some to treesync gets events
		assert.equal(referenceTree.root, treesync.root);
	}).timeout(3000);
	it('sync after a disconnection', async () => {
		const depth = 32;
		const referenceTree = Tree.new(depth, HASHER);
		const rln = await newRln(depth);
		const treesync = await TreeSync.new(HASHER, rln.address, provider);
		// register two pubkeys
		const pubkey0 = randPubkey();
		referenceTree.updateSingle(0, pubkey0);
		await rln.register(pubkey0, { value: MEMBERSHIP_FEE });
		const pubkey1 = randPubkey();
		referenceTree.updateSingle(1, pubkey1);
		await rln.register(pubkey1, { value: MEMBERSHIP_FEE });
		await sleep(1000); // sleep some to treesync gets events
		assert.equal(referenceTree.root, treesync.root);
		// make treesync to be offline
		assert.equal(-1, await treesync.updateProvider(downProvider));
		// register two more pubkeys
		const pubkey2 = randPubkey();
		referenceTree.updateSingle(2, pubkey2);
		let tx = await rln.register(pubkey2, { value: MEMBERSHIP_FEE });
		await tx.wait();
		const pubkey3 = randPubkey();
		referenceTree.updateSingle(3, pubkey3);
		tx = await rln.register(pubkey3, { value: MEMBERSHIP_FEE });
		await tx.wait();
		// make treesync to be online
		assert.equal(0, await treesync.updateProvider(provider));
		assert.equal(referenceTree.root, treesync.root);
	}).timeout(3000);
});
