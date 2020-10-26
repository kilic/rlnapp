pragma solidity 0.6.10;


// Mostly taken from
// https://github.com/zkopru-network/zkopru/tree/develop/packages/contracts/contracts/libraries

library BN256 {
	uint256 constant Q = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
	uint256 constant P = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

	function q() internal pure returns (uint256) {
		return Q;
	}

	function negatePoint(uint256[2] memory p) internal pure returns (uint256[2] memory) {
		if (p[0] == 0 && p[1] == 0) {
			return [uint256(0), uint256(0)];
		} else {
			return [p[0], P - p[1]];
		}
	}

	function addPoint(uint256[2] memory p1, uint256[2] memory p2) internal view returns (uint256[2] memory r) {
		uint256[4] memory input;
		input[0] = p1[0];
		input[1] = p1[1];
		input[2] = p2[0];
		input[3] = p2[1];
		bool success;

		// solium-disable-next-line security/no-inline-assembly
		assembly {
			success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
			// Use "invalid" to make gas estimation work
			switch success
				case 0 {
					invalid()
				}
		}

		require(success, 'pairing-add-failed');
	}

	function mulPoint(uint256[2] memory p, uint256 s) internal view returns (uint256[2] memory r) {
		uint256[3] memory input;
		input[0] = p[0];
		input[1] = p[1];
		input[2] = s;
		bool success;
		// solium-disable-next-line security/no-inline-assembly
		assembly {
			success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
			// Use "invalid" to make gas estimation work
			switch success
				case 0 {
					invalid()
				}
		}
		require(success, 'pairing-mul-failed');
	}

	function pair(
		uint256[2] memory a1,
		uint256[4] memory a2,
		uint256[2] memory b1,
		uint256[4] memory b2,
		uint256[2] memory c1,
		uint256[4] memory c2,
		uint256[2] memory d1,
		uint256[4] memory d2
	) internal view returns (bool) {
		uint256[24] memory input = [a1[0], a1[1], a2[0], a2[1], a2[2], a2[3], b1[0], b1[1], b2[0], b2[1], b2[2], b2[3], c1[0], c1[1], c2[0], c2[1], c2[2], c2[3], d1[0], d1[1], d2[0], d2[1], d2[2], d2[3]];

		uint256[1] memory out;
		bool success;

		// solium-disable-next-line security/no-inline-assembly
		assembly {
			// success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
			success := staticcall(sub(gas(), 2000), 8, input, mul(24, 0x20), out, 0x20)
			// Use "invalid" to make gas estimation work
			switch success
				case 0 {
					invalid()
				}
		}

		require(success, 'pairing-opcode-failed');

		return out[0] != 0;
	}
}
