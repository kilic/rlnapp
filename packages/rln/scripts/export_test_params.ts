import { RLNWasm } from '@rln/circuit';

import * as fs from 'fs';
import * as path from 'path';

async function run() {
	const depth = 4;
	const circuit = RLNWasm.new(depth);
	console.time('new circuit');
	const circuitParameters = circuit.export_circuit_parameters();
	console.timeEnd('new circuit');
	const dir = path.join(__dirname, `../test_parameters/circuit_${depth}.params`);

	fs.appendFile(dir, Buffer.from(circuitParameters), function (err) {
		if (err) {
			console.log('cannot write');
		}
	});
}

run();
