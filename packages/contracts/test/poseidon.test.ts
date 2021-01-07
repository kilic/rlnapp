import { assert } from "chai";
import { TestPoseidon, TestPoseidon__factory } from "../wrappers";

import { ethers } from "hardhat";

const BigNumber = ethers.BigNumber;

describe("Poseidon Hasher", () => {
  let poseidonHasher: TestPoseidon;
  before(async () => {
    const accounts = await ethers.getSigners();
    const poseidonHasherFactory = new TestPoseidon__factory(accounts[0]);
    poseidonHasher = await poseidonHasherFactory.deploy();
  });

  it("Expected result", async () => {
    const expected = BigNumber.from(
      "0x2ff267fd23782a5625e6d804f0a7fa700b8dc6084e2e7a5aff7cd4b1c506d30b"
    );
    const result = await poseidonHasher.test([0, 0]);
    assert.isTrue(expected.eq(result));
  });

  it("Gas cost", async () => {
    const gasCost = await poseidonHasher.callStatic.poseidonGasCost();
    console.log("poseidon hash gas costs:", gasCost.toNumber());
  });
});
