/* tslint:disable */
/* eslint-disable */
/**
*/
export class RLNWasm {
  free(): void;
/**
* @param {number} merkle_depth 
* @param {Uint8Array} raw_circuit_parameters 
* @returns {RLNWasm} 
*/
  static new(merkle_depth: number, raw_circuit_parameters: Uint8Array): RLNWasm;
/**
* @param {Uint8Array} input 
* @returns {Uint8Array} 
*/
  generate_proof(input: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} raw_proof 
* @param {Uint8Array} raw_public_inputs 
* @returns {boolean} 
*/
  verify(raw_proof: Uint8Array, raw_public_inputs: Uint8Array): boolean;
}
