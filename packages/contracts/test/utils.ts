import { ContractTransaction } from "ethers";
import { assert, expect } from "chai";

export async function expectRevert(
  tx: Promise<ContractTransaction>,
  revertReason: string
) {
  await tx.then(
    () => {
      assert.fail(`Expect tx to fail with reason: ${revertReason}`);
    },
    (error) => {
      expect(error.message).to.have.string(revertReason);
    }
  );
}
