import { RLNWasm } from '@rln/circuit';
import { Tree, Hasher } from '@rln/tree';
import * as ethers from 'ethers';
import { FR, FP } from './ecc';
const assert = require('assert');

const POSEIDON_PARAMETERS = {}; // use default
const poseidonHasher = Hasher.new(POSEIDON_PARAMETERS);
const keccakHasher = ethers.utils.solidityKeccak256;
const FR_SIZE = 32;
const FP_SIZE = 32;
const G1_SIZE = FP_SIZE * 2;
const G2_SIZE = FP_SIZE * 4;
const RAW_PROOF_SIZE = G1_SIZE + G2_SIZE + G1_SIZE;
const RAW_PUBLIC_INPUTS_SIZE = FR_SIZE * 5;

export interface SolProof {
	a: string[];
	b: string[];
	c: string[];
}

export interface SolVerifyingKey {
	alpha1: string[];
	beta2: string[];
	gamma2: string[];
	delta2: string[];
	ic: string[][];
}

export interface RLNOutput {
	proof: Uint8Array;
	publicInputs: Uint8Array;
}

function g1ToHex(data: Buffer, o: number): string[] {
	const x = '0x' + data.toString('hex', o, o + FP_SIZE);
	const y = '0x' + data.toString('hex', o + FP_SIZE, o + 2 * FP_SIZE);
	return [x, y];
}

function g2ToHex(data: Buffer, o: number): string[] {
	const x0 = '0x' + data.toString('hex', o, o + FP_SIZE);
	const x1 = '0x' + data.toString('hex', o + 1 * FP_SIZE, o + 2 * FP_SIZE);
	const y0 = '0x' + data.toString('hex', o + 2 * FP_SIZE, o + 3 * FP_SIZE);
	const y1 = '0x' + data.toString('hex', o + 3 * FP_SIZE, o + 4 * FP_SIZE);
	return [x0, x1, y0, y1];
}

export class RLNUtils {
	public static rawVerifyingKeyToSol(rawVk: Uint8Array): SolVerifyingKey {
		const buf = Buffer.from(rawVk);
		const alpha1 = g1ToHex(buf, 0);
		// skip beta1
		const beta2 = g2ToHex(buf, 2 * G1_SIZE);
		const gamma2 = g2ToHex(buf, 2 * G1_SIZE + G2_SIZE);
		// skip delta1
		const delta2 = g2ToHex(buf, 3 * G1_SIZE + 2 * G2_SIZE);

		let off = 3 * G1_SIZE + 3 * G2_SIZE;
		const icLen = buf.readUInt32BE(off);
		off = off + 4;
		const remainingLen = rawVk.length - off;
		assert(remainingLen == icLen * G1_SIZE);

		let ic: string[][] = [];
		for (let i = 0; i < icLen; i++) {
			ic.push(g1ToHex(buf, off + i * G1_SIZE));
		}

		return {
			alpha1,
			beta2,
			gamma2,
			delta2,
			ic
		};
	}

	public static rawProofToSol(rawProof: Uint8Array): SolProof {
		assert(rawProof.length == RAW_PROOF_SIZE);

		const ax = '0x' + FP.fromRprBE(rawProof, 0 * FP_SIZE).toString(16);
		const ay = '0x' + FP.fromRprBE(rawProof, 1 * FP_SIZE).toString(16);
		const bx0 = '0x' + FP.fromRprBE(rawProof, 2 * FP_SIZE).toString(16);
		const bx1 = '0x' + FP.fromRprBE(rawProof, 3 * FP_SIZE).toString(16);
		const by0 = '0x' + FP.fromRprBE(rawProof, 4 * FP_SIZE).toString(16);
		const by1 = '0x' + FP.fromRprBE(rawProof, 5 * FP_SIZE).toString(16);
		const cx = '0x' + FP.fromRprBE(rawProof, 6 * FP_SIZE).toString(16);
		const cy = '0x' + FP.fromRprBE(rawProof, 7 * FP_SIZE).toString(16);

		return {
			a: [ax, ay],
			b: [bx0, bx1, by0, by1],
			c: [cx, cy]
		};
	}

	public static rawPublicInputsToSol(rawProof: Uint8Array): string[] {
		assert(rawProof.length == RAW_PUBLIC_INPUTS_SIZE);
		const root = '0x' + FR.fromRprLE(rawProof, 0 * FP_SIZE).toString(16);
		const epoch = '0x' + FR.fromRprLE(rawProof, 1 * FP_SIZE).toString(16);
		const shareX = '0x' + FR.fromRprLE(rawProof, 2 * FP_SIZE).toString(16);
		const shareY = '0x' + FR.fromRprLE(rawProof, 3 * FP_SIZE).toString(16);
		const nullifier = '0x' + FR.fromRprLE(rawProof, 4 * FP_SIZE).toString(16);
		console.log(root);
		console.log(epoch);
		console.log(shareX);
		console.log(shareY);
		console.log(nullifier);
		return [root, epoch, shareX, shareY, nullifier];
	}
}

export class RLN {
	static async new(depth: number): Promise<RLN> {
		console.time('circuit_init');
		const circuit = RLNWasm.new(depth);
		console.timeEnd('circuit_init');
		return new RLN(circuit);
	}

	static async restore(circuit: RLNWasm) {
		return new RLN(circuit);
	}

	private constructor(private circuit: RLNWasm) {}

	public verifyingKey(): Uint8Array {
		return this.circuit.verifier_key();
	}

	public verify(proof: Uint8Array, inputs: Uint8Array): boolean {
		return this.circuit.verify(proof, inputs);
	}

	public generateRLN(tree: Tree, epoch: number, signal: string, target: string, key: string, memberIndex: number): RLNOutput {
		// signal
		const targetAddress = ethers.utils.getAddress(target);
		const signalHash1 = keccakHasher(['string'], [signal]);
		const signalHash2 = keccakHasher(['address', 'string'], [targetAddress, signalHash1]);

		// TODO: we likely to change hash to field
		const x = FR.e(signalHash2);

		const a0 = FR.e(key);
		const _epoch = FR.e(epoch);
		const a1 = FR.e(poseidonHasher.hash2(a0, _epoch));
		const y = FR.add(FR.mul(x, a1), a0);

		const nullifier = FR.e(poseidonHasher.hash(a1));

		// membership
		assert(poseidonHasher.hash(key) == tree.getLeaf(memberIndex));

		const witness = tree.witness(memberIndex);
		const witnessLength = witness.path.length;
		let serializedAuthPath = Buffer.alloc(1 + witnessLength * (FR_SIZE + 1));
		const buf = Buffer.alloc(FR_SIZE);
		serializedAuthPath.writeUInt8(witnessLength);
		for (let i = 0; i < witnessLength; i++) {
			const offsetDirection = 1 + i * (FR_SIZE + 1);
			serializedAuthPath.writeUInt8(witness.path[i] ? 0x01 : 0x00, offsetDirection);
			FR.toRprLE(buf, 0, FR.e(witness.nodes[i]));
			const offsetNode = offsetDirection + 1;
			buf.copy(serializedAuthPath, offsetNode);
		}

		// RLN inputs
		// share_x, share_y, epoch, nullifier, root, key, auth_path

		const pathLength = serializedAuthPath.byteLength;
		const input = Buffer.alloc(FR_SIZE * 6 + pathLength + 1);

		const _root = FR.e(tree.root);

		FR.toRprLE(input, 0 * FR_SIZE, x);
		FR.toRprLE(input, 1 * FR_SIZE, y);
		FR.toRprLE(input, 2 * FR_SIZE, _epoch);
		FR.toRprLE(input, 3 * FR_SIZE, nullifier);
		FR.toRprLE(input, 4 * FR_SIZE, _root);
		FR.toRprLE(input, 5 * FR_SIZE, a0);

		serializedAuthPath.copy(input, 6 * FR_SIZE);

		console.time('prover');
		const proof = this.circuit.generate_proof(input);
		console.timeEnd('prover');

		// Public inputs
		// root, epoch, share_x, share_y, nullifier

		const publicInputs = Buffer.alloc(FR_SIZE * 5);

		FR.toRprLE(publicInputs, 0 * FR_SIZE, _root);
		FR.toRprLE(publicInputs, 1 * FR_SIZE, _epoch);
		FR.toRprLE(publicInputs, 2 * FR_SIZE, x);
		FR.toRprLE(publicInputs, 3 * FR_SIZE, y);
		FR.toRprLE(publicInputs, 4 * FR_SIZE, nullifier);

		return { proof, publicInputs };
	}
}
