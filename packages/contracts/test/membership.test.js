const RLN = artifacts.require("RLN");
const PoseidonHasher = artifacts.require("PoseidonHasher");
const { newPoseidonHasher } = require("@rln/tree");
const { assert } = require("chai");
const { expectRevert } = require("@openzeppelin/test-helpers");
const BN = web3.utils.BN;
const zero = new BN(0);
const one = new BN(1);

const poseidon = newPoseidonHasher({});

const membershipDeposit = web3.utils.toBN(web3.utils.toWei("0.1", "ether"));

function bn(n) {
	return new BN(n);
}

function randAddr() {
	return web3.utils.toChecksumAddress(web3.utils.randomHex(20));
}

contract("Poseidon Hasher", (accounts) => {
	let poseidonHasher;
	before(async () => {
		const poseidonHasherContract = await PoseidonHasher.new();
		poseidonHasher = poseidonHasherContract.address;
	});

	it("deploy", async () => {
		const depth = bn(32);
		const setSize = one.shln(32);
		const rln = await RLN.new(membershipDeposit, depth, poseidonHasher);
		assert.isTrue(zero.eq(await rln.pubkeyIndex()));
		assert.isTrue(membershipDeposit.eq(await rln.MEMBERSHIP_DEPOSIT()));
		assert.isTrue(depth.eq(await rln.DEPTH()));
		assert.isTrue(setSize.eq(await rln.SET_SIZE()));
	});

	it("register", async () => {
		const rln = await RLN.new(membershipDeposit, 32, poseidonHasher);
		const pubkey = poseidon.hash("0x01");
		await rln.register(pubkey, { from: accounts[0], value: membershipDeposit });
		assert.isTrue(one.eq(await rln.pubkeyIndex()));
		assert.equal((await rln.members(0)).toString(16), pubkey.slice(2));
	});

	it("register / fail / membership deposit", async () => {
		const rln = await RLN.new(membershipDeposit, 32, poseidonHasher);
		const pubkey = poseidon.hash("0x01");
		await expectRevert(rln.register(pubkey, { from: accounts[0], value: (await rln.MEMBERSHIP_DEPOSIT()).add(one) }), "RLN, register: membership deposit is not satisfied");
		await expectRevert(rln.register(pubkey, { from: accounts[0], value: (await rln.MEMBERSHIP_DEPOSIT()).sub(one) }), "RLN, register: membership deposit is not satisfied");
	});

	it("register batch", async () => {
		const rln = await RLN.new(membershipDeposit, 32, poseidonHasher);
		const pubkeys = ["0x01", "0x02", "0x03", "0x04"].map((secret) => poseidon.hash(secret));
		const _membershipDeposit = membershipDeposit.mul(bn(pubkeys.length));
		await rln.registerBatch(pubkeys, { from: accounts[0], value: _membershipDeposit });
		assert.isTrue(bn(pubkeys.length).eq(await rln.pubkeyIndex()));
		assert.equal(_membershipDeposit.toString(), await web3.eth.getBalance(rln.address));
		for (let i = 0; i < pubkeys.length; i++) {
			assert.equal(web3.utils.padLeft((await rln.members(i)).toString(16), 64), pubkeys[i].slice(2));
		}
	});

	it("register / fail / full set", async () => {
		const rln = await RLN.new(membershipDeposit, 2, poseidonHasher);
		const pubkeys = ["0x01", "0x02", "0x03", "0x04"].map((secret) => poseidon.hash(secret));
		await rln.registerBatch(pubkeys, { from: accounts[0], value: membershipDeposit.mul(bn(pubkeys.length)) });
		const pubkey = poseidon.hash("0x05");
		await expectRevert(rln.register(pubkey, { from: accounts[0], value: membershipDeposit }), "RLN, register: set is full");
	});

	it("register batch / fail / full set", async () => {
		const rln = await RLN.new(membershipDeposit, 2, poseidonHasher);
		const pubkeys = ["0x01", "0x02", "0x03", "0x04", "0x05"].map((secret) => poseidon.hash(secret));
		await expectRevert(rln.registerBatch(pubkeys, { from: accounts[0], value: membershipDeposit.mul(bn(pubkeys.length)) }), "RLN, registerBatch: set is full");
	});

	it("register batch / fail / membership deposit", async () => {
		const rln = await RLN.new(membershipDeposit, 32, poseidonHasher);
		const pubkeys = ["0x01", "0x02", "0x03", "0x04", "0x05"].map((secret) => poseidon.hash(secret));
		await expectRevert(rln.registerBatch(pubkeys, { from: accounts[0], value: membershipDeposit.mul(bn(pubkeys.length)).add(one) }), "RLN, registerBatch: membership deposit is not satisfied");
		await expectRevert(rln.registerBatch(pubkeys, { from: accounts[0], value: membershipDeposit.mul(bn(pubkeys.length)).sub(one) }), "RLN, registerBatch: membership deposit is not satisfied");
	});

	it("withdraw", async () => {
		const rln = await RLN.new(membershipDeposit, 32, poseidonHasher);
		const secret = "0x01";
		const pubkey = poseidon.hash(secret);
		await rln.register(pubkey, { from: accounts[0], value: membershipDeposit });
		const receiver = randAddr();
		const index = 0;
		await rln.withdraw(secret, index, receiver);
		assert.equal((await rln.members(index)).toString(), "0");
		assert.equal(membershipDeposit.toString(), await web3.eth.getBalance(receiver));
	});

	it("withdraw / fail / twice", async () => {
		const rln = await RLN.new(membershipDeposit, 32, poseidonHasher);
		const secret = "0x01";
		const pubkey = poseidon.hash(secret);
		await rln.register(pubkey, { from: accounts[0], value: membershipDeposit });
		const receiver = randAddr();
		await rln.withdraw(secret, 0, receiver);
		await expectRevert(rln.withdraw(secret, 0, receiver), "RLN, _withdraw: member doesn't exist");
	});

	it("withdraw / fail / invalid size", async () => {
		const rln = await RLN.new(membershipDeposit, 32, poseidonHasher);
		const secret = "0x01";
		const pubkey = poseidon.hash(secret);
		await rln.register(pubkey, { from: accounts[0], value: membershipDeposit });
		const leaf = one.shln(32).add(one);
		await expectRevert(rln.withdraw(secret, leaf, randAddr()), "RLN, _withdraw: invalid pubkey index");
	});

	it("withdraw / fail / empty address", async () => {
		const rln = await RLN.new(membershipDeposit, 32, poseidonHasher);
		const secret = "0x01";
		const pubkey = poseidon.hash(secret);
		await rln.register(pubkey, { from: accounts[0], value: membershipDeposit });
		const receiver = "0x0000000000000000000000000000000000000000";
		await expectRevert(rln.withdraw(secret, 0, receiver), "RLN, _withdraw: empty receiver address");
	});

	it("withdraw / fail / bad preimage", async () => {
		const rln = await RLN.new(membershipDeposit, 32, poseidonHasher);
		const secretGood = "0x01";
		const secretBad = "0x02";
		const pubkey = poseidon.hash(secretGood);
		await rln.register(pubkey, { from: accounts[0], value: membershipDeposit });
		await expectRevert(rln.withdraw(secretBad, 0, randAddr()), "RLN, _withdraw: not verified");
	});

	it("withdraw batch", async () => {
		const rln = await RLN.new(membershipDeposit, 32, poseidonHasher);
		const secrets = ["0x01", "0x02", "0x03", "0x04"];
		const pubkeys = secrets.map((secret) => poseidon.hash(secret));
		const membershipFee = membershipDeposit.mul(bn(pubkeys.length));
		await rln.registerBatch(pubkeys, { from: accounts[0], value: membershipFee });
		const receiver = randAddr();
		await rln.withdrawBatch([secrets[1], secrets[2]], [1, 2], [receiver, receiver]);
		assert.equal((await rln.members(1)).toString(), "0");
		assert.equal((await rln.members(2)).toString(), "0");
		const expectedBalance = membershipDeposit.mul(bn(2));
		assert.equal(expectedBalance.toString(), await web3.eth.getBalance(receiver));
	});

	it("withdraw batch / fail / array sizes", async () => {
		const rln = await RLN.new(membershipDeposit, 32, poseidonHasher);
		const secrets = ["0x01", "0x02", "0x03", "0x04"];
		const pubkeys = secrets.map((secret) => poseidon.hash(secret));
		const membershipFee = membershipDeposit.mul(bn(pubkeys.length));
		await rln.registerBatch(pubkeys, { from: accounts[0], value: membershipFee });
		const receiver = randAddr();
		await expectRevert(rln.withdrawBatch([secrets[1], secrets[2]], [1, 2, 3], [receiver, receiver]), "RLN, withdrawBatch: batch size mismatch pubkey indexes");
		await expectRevert(rln.withdrawBatch([secrets[1], secrets[2]], [1, 2], [receiver, receiver, receiver]), "RLN, withdrawBatch: batch size mismatch receivers");
	});
});
