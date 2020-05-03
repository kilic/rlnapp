const PoseidonTestContract = artifacts.require("TestPoseidon");

contract("Poseidon Hasher", () => {
	let poseidon;
	before(async () => {
		poseidon = await PoseidonTestContract.new();
	});

	it("Expected result", async () => {
		const expected = "11c140edb3a166c1f0677f4918618dfe5fd1ee02217bdd0f0caccdc01f6c617";
		const result = await poseidon.test([0, 0]);
		assert.equal(result.toString(16), expected);
	});

	it("Expected result", async () => {
		const gasCost = await poseidon.poseidonGasCost.call();
		console.log("poseidon hash gas costs:", gasCost.toNumber());
	});
});
