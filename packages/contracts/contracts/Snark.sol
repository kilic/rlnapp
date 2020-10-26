pragma solidity 0.6.10;

// Mostly taken from
// https://github.com/zkopru-network/zkopru/tree/develop/packages/contracts/contracts/libraries

import { BN256 } from './BN256.sol';


library Snark {
	struct VerifyingKey {
		uint256[2] alpha1;
		uint256[4] beta2;
		uint256[4] gamma2;
		uint256[4] delta2;
		uint256[2][] ic;
	}

	struct Proof {
		uint256[2] a;
		uint256[4] b;
		uint256[2] c;
	}

	function verify(
		VerifyingKey memory vk,
		uint256[] memory input,
		Proof memory proof
	) internal view returns (bool) {
		require(input.length + 1 == vk.ic.length, 'verifier-bad-input');
		// Compute the linear combination vkX
		uint256[2] memory vkX;

		// Make sure that proof.A, B, and C are each less than the prime q
		// Make sure that proof.A, B, and C are each less than the prime q
		require(proof.a[0] < BN256.P, 'verifier-aX-gte-prime-q');
		require(proof.a[1] < BN256.P, 'verifier-aY-gte-prime-q');

		require(proof.b[0] < BN256.P, 'verifier-bX0-gte-prime-q');
		require(proof.b[1] < BN256.P, 'verifier-bY0-gte-prime-q');
		require(proof.b[2] < BN256.P, 'verifier-bX1-gte-prime-q');
		require(proof.b[3] < BN256.P, 'verifier-bY1-gte-prime-q');

		require(proof.c[0] < BN256.P, 'verifier-cX-gte-prime-q');
		require(proof.c[1] < BN256.P, 'verifier-cY-gte-prime-q');

		for (uint256 i = 0; i < input.length; i++) {
			require(input[i] < BN256.Q, 'verifier-gte-snark-scalar-field');
			vkX = BN256.addPoint(vkX, BN256.mulPoint(vk.ic[i + 1], input[i]));
		}
		vkX = BN256.addPoint(vkX, vk.ic[0]);
		return BN256.pair(BN256.negatePoint(proof.a), proof.b, vk.alpha1, vk.beta2, vkX, vk.gamma2, proof.c, vk.delta2);
	}
}
