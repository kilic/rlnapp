import { assert } from "chai";
import {
  RLN__factory,
  RLN,
  PoseidonHasher,
  PoseidonHasher__factory,
} from "../wrappers";

import { ethers } from "hardhat";
import { newPoseidonHasher } from "@rln/tree";
import { Signer, ethers as _ethers } from "ethers";
import { expectRevert } from "./utils";

const BigNumber = ethers.BigNumber;

const poseidon = newPoseidonHasher({});

const depth = 32;
const membershipDeposit = BigNumber.from(ethers.utils.parseEther("0.01"));
const zero = BigNumber.from(0);
const one = BigNumber.from(1);
const setSize = one.shl(depth);

function randAddr() {
  return ethers.utils.getAddress(
    ethers.utils.hexlify(ethers.utils.randomBytes(20))
  );
}

describe("Membership", () => {
  let poseidonHasher: PoseidonHasher;
  let RLN: RLN;
  let deployer: Signer;
  let provider;
  before(async () => {
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    const poseidonHasherFactory = new PoseidonHasher__factory(deployer);
    poseidonHasher = await poseidonHasherFactory.deploy();
    provider = poseidonHasher.provider;
  });

  beforeEach(async () => {
    const RLNFactory = new RLN__factory(deployer);
    RLN = await RLNFactory.deploy(
      membershipDeposit,
      depth,
      poseidonHasher.address
    );
    assert.isTrue(zero.eq(await RLN.pubkeyIndex()));
    assert.isTrue(membershipDeposit.eq(await RLN.MEMBERSHIP_DEPOSIT()));
    assert.isTrue(BigNumber.from(depth).eq(await RLN.DEPTH()));
    assert.isTrue(setSize.eq(await RLN.SET_SIZE()));
  });

  it("register", async () => {
    const pubkey = poseidon.hash("0x01");
    const tx = await RLN.register(pubkey, {
      value: membershipDeposit,
    });
    await tx.wait();
    assert.isTrue(one.eq(await RLN.pubkeyIndex()));
    assert.equal((await RLN.members(0)).toHexString(), pubkey);
    assert.isTrue(membershipDeposit.eq(await provider.getBalance(RLN.address)));
  });
  it("register / fail / membership deposit", async () => {
    const pubkey = poseidon.hash("0x01");
    await expectRevert(
      RLN.register(pubkey, {
        value: (await RLN.MEMBERSHIP_DEPOSIT()).add(one),
      }),
      "RLN, register: membership deposit is not satisfied"
    );
    await expectRevert(
      RLN.register(pubkey, {
        value: (await RLN.MEMBERSHIP_DEPOSIT()).sub(one),
      }),
      "RLN, register: membership deposit is not satisfied"
    );
  });
  it("register batch", async () => {
    const pubkeys = ["0x01", "0x02", "0x03", "0x04"].map((secret) =>
      poseidon.hash(secret)
    );
    let offset = (await RLN.pubkeyIndex()).toNumber();
    let balance0 = await provider.getBalance(RLN.address);

    const _membershipDeposit = membershipDeposit.mul(pubkeys.length);
    await RLN.registerBatch(pubkeys, {
      value: _membershipDeposit,
    });
    assert.isTrue(BigNumber.from(pubkeys.length).eq(await RLN.pubkeyIndex()));
    assert.isTrue(
      _membershipDeposit.eq(
        (await provider.getBalance(RLN.address)).sub(balance0)
      )
    );
    for (let i = 0; i < pubkeys.length; i++) {
      let ii = i + offset;
      assert.isTrue(BigNumber.from(pubkeys[ii]).eq(await RLN.members(ii)));
    }
  });
  it("register batch / fail / membership deposit", async () => {
    const pubkeys = ["0x01", "0x02", "0x03", "0x04", "0x05"].map((secret) =>
      poseidon.hash(secret)
    );
    await expectRevert(
      RLN.registerBatch(pubkeys, {
        value: membershipDeposit.mul(BigNumber.from(pubkeys.length)).add(one),
      }),
      "RLN, registerBatch: membership deposit is not satisfied"
    );
    await expectRevert(
      RLN.registerBatch(pubkeys, {
        value: membershipDeposit.mul(BigNumber.from(pubkeys.length)).sub(one),
      }),
      "RLN, registerBatch: membership deposit is not satisfied"
    );
  });
  it("withdraw", async () => {
    const secret = "0x01";
    const pubkey = poseidon.hash(secret);
    const index = await RLN.pubkeyIndex();
    await RLN.register(pubkey, { value: membershipDeposit });
    const receiver = randAddr();
    await RLN.withdraw(secret, index, receiver);
    assert.equal((await RLN.members(index)).toString(), "0");
    assert.isTrue(membershipDeposit.eq(await provider.getBalance(receiver)));
  });

  it("withdraw / fail / twice", async () => {
    const secret = "0x01";
    const pubkey = poseidon.hash(secret);
    const index = await RLN.pubkeyIndex();
    await RLN.register(pubkey, { value: membershipDeposit });
    const receiver = randAddr();
    await RLN.withdraw(secret, index, receiver);
    await expectRevert(
      RLN.withdraw(secret, index, receiver),
      "RLN, _withdraw: member doesn't exist"
    );
  });

  it("withdraw / fail / invalid size", async () => {
    const secret = "0x01";
    const pubkey = poseidon.hash(secret);
    await RLN.register(pubkey, { value: membershipDeposit });
    const index = one.shl(32).add(one);
    await expectRevert(
      RLN.withdraw(secret, index, randAddr()),
      "RLN, _withdraw: invalid pubkey index"
    );
  });

  it("withdraw / fail / empty address", async () => {
    const secret = "0x01";
    const pubkey = poseidon.hash(secret);
    await RLN.register(pubkey, { value: membershipDeposit });
    const receiver = "0x0000000000000000000000000000000000000000";
    await expectRevert(
      RLN.withdraw(secret, 0, receiver),
      "RLN, _withdraw: empty receiver address"
    );
  });

  it("withdraw / fail / invalid size", async () => {
    const secret = "0x01";
    const pubkey = poseidon.hash(secret);
    await RLN.register(pubkey, { value: membershipDeposit });
    const leaf = one.shl(32).add(one);
    await expectRevert(
      RLN.withdraw(secret, leaf, randAddr()),
      "RLN, _withdraw: invalid pubkey index"
    );
  });

  it("withdraw / fail / empty address", async () => {
    const secret = "0x01";
    const pubkey = poseidon.hash(secret);
    await RLN.register(pubkey, { value: membershipDeposit });
    const receiver = "0x0000000000000000000000000000000000000000";
    await expectRevert(
      RLN.withdraw(secret, 0, receiver),
      "RLN, _withdraw: empty receiver address"
    );
  });

  it("withdraw / fail / bad preimage", async () => {
    const secretGood = "0x01";
    const secretBad = "0x02";
    const pubkey = poseidon.hash(secretGood);
    const index = await RLN.pubkeyIndex();
    await RLN.register(pubkey, { value: membershipDeposit });
    await expectRevert(
      RLN.withdraw(secretBad, index, randAddr()),
      "RLN, _withdraw: not verified"
    );
  });

  it("withdraw batch", async () => {
    const secrets = ["0x01", "0x02", "0x03", "0x04"];
    const pubkeys = secrets.map((secret) => poseidon.hash(secret));
    const _membershipDeposit = membershipDeposit.mul(
      BigNumber.from(pubkeys.length)
    );
    const index = await RLN.pubkeyIndex();
    await RLN.registerBatch(pubkeys, {
      value: _membershipDeposit,
    });
    const receiver = randAddr();
    await RLN.withdrawBatch(
      [secrets[1], secrets[2]],
      [index.add(1), index.add(2)],
      [receiver, receiver]
    );
    assert.equal((await RLN.members(index.add(1))).toString(), "0");
    assert.equal((await RLN.members(index.add(2))).toString(), "0");
    const expectedBalance = membershipDeposit.mul(2);
    assert.equal(
      expectedBalance.toString(),
      await provider.getBalance(receiver)
    );
  });

  it("withdraw batch / fail / array sizes", async () => {
    const secrets = ["0x01", "0x02", "0x03", "0x04"];
    const pubkeys = secrets.map((secret) => poseidon.hash(secret));
    const _membershipDeposit = membershipDeposit.mul(pubkeys.length);
    await RLN.registerBatch(pubkeys, {
      value: _membershipDeposit,
    });
    const receiver = randAddr();
    await expectRevert(
      RLN.withdrawBatch(
        [secrets[1], secrets[2]],
        [1, 2, 3],
        [receiver, receiver]
      ),
      "RLN, withdrawBatch: batch size mismatch pubkey indexes"
    );
    await expectRevert(
      RLN.withdrawBatch(
        [secrets[1], secrets[2]],
        [1, 2],
        [receiver, receiver, receiver]
      ),
      "RLN, withdrawBatch: batch size mismatch receivers"
    );
  });
});
