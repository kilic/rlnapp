const { RLN } = require('@rln/rln');

module.exports = function initRLN(depth) {
	var fs = require('fs');
	var path = require('path');
	const dir = path.join(__dirname, `../../rln/test_parameters/circuit_${depth}.params`);
	const parameters = fs.readFileSync(dir);
	const rln = RLN.restore(depth, parameters);
	return rln;
};
