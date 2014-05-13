var fs = require('fs'),
	path = require('path'),
	Promise = require('bluebird'),
	whenReadFile = Promise.promisify(fs.readFile),
	whenWriteFile = Promise.promisify(fs.writeFile),
	es6Transpiler = require('es6-transpiler');

var whenJsHintRc = whenReadFile(__dirname + '/.jshintrc');

return Promise.all(process.argv.slice(2).map(function (fileName) {
	return Promise.all([whenJsHintRc, whenReadFile(fileName)]).then(function (files) {
		var es5 = es6Transpiler.run({
			globals: JSON.parse(files[0]).globals,
			src: files[1]
		});

		if (es5.errors.length) {
			throw new Error([fileName + ':'].concat(es5.errors).join('\n'));
		}

		return whenWriteFile(path.basename(fileName, '.js') + '.es5.js', es5.src).then(function () {
			console.log('%s => %s', fileName, path.basename(fileName, '.js') + '.es5.js');
		});
	});
})).catch(function (err) {
	throw err
});