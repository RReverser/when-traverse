'use strict';

var whenTraverse = require('./'),
	Promise = require('es6-promise').Promise;

Promise.prototype.inspect = function () { return 'Promise' };

// delayed promise helper (for example only)
function delay(timeout, value) {
	return new Promise(function (resolve) {
		setTimeout(function () {
			resolve(value);
		}, timeout);
	});
}

// test wrapped providing test object, sample tree and time difference function
function whenTraverseTest(callback) {
	return function (test) {
		var tree = {
			a: 1,
			b: delay(100, {
				b1: delay(200, 2),
				b2: delay(300, 3)
			}),
			c: delay(400, 4),
			d: {
				shouldNotGoHere: delay(500, 5)
			}
		};

		var startTime = Date.now();
		var timeDiff = function () { return Date.now() - startTime };

		callback(test, tree, timeDiff).catch(function (err) {
			console.log(test.ifError.toString());
			test.ifError(err);
		}).then(function () {
			test.done();
		});
	};
}

exports['enter+leave'] = whenTraverseTest(function (test, tree, getElapsed) {
	return whenTraverse(tree, {
		enter: function (node) {
			console.log('Entered', node, 'after', getElapsed(), 'ms');

			if (typeof node === 'object' && 'shouldNotGoHere' in node) {
				return whenTraverse.SKIP;
			}
		},
		leave: function (node) {
			console.log('Left', node, 'after', getElapsed(), 'ms');

			if (node === 3) {
				return whenTraverse.REMOVE;
			}
		}
	}).then(function (newTree) {
		// got resolved tree here (everything is resolved except `d` and descendants):

		// should be same object
		test.equal(newTree, tree);

		// should have non-skipped values resolved
		test.equal(newTree.a, 1);
		test.deepEqual(newTree.b, {
			b1: 2
			// b2: 3 [REMOVE]
		});
		test.equal(newTree.c, 4);

		// d.shouldNotGoHere should not be resolved as `d` was skipped (but it should exist as Promise)
		test.ok(typeof newTree.d.shouldNotGoHere === 'object' && newTree.d.shouldNotGoHere.then instanceof Function);
	});
});

exports['leave shorthand'] = whenTraverseTest(function (test, tree, getElapsed)  {
	return whenTraverse(tree, function (node) {
		console.log('Left', node, 'after', getElapsed(), 'ms');

		if (node === 3) {
			return whenTraverse.REMOVE;
		}
	}).then(function (newTree) {
		// got resolved tree here (everything is resolved except `d` and descendants):

		// should be same object
		test.equal(newTree, tree);

		// should have non-skipped values resolved
		test.equal(newTree.a, 1);
		test.deepEqual(newTree.b, {
			b1: 2
			// b2: 3 [REMOVE]
		});
		test.equal(newTree.c, 4);
		test.deepEqual(newTree.d, {
			shouldNotGoHere: 5
		});
	});
});

exports['just waiting'] = whenTraverseTest(function (test, tree) {
	return whenTraverse(tree).then(function (newTree) {
		// got resolved tree here (everything is resolved except `d` and descendants):

		// should be same object
		test.equal(newTree, tree);

		test.deepEqual(newTree, {
			a: 1,
			b: {
				b1: 2,
				b2: 3
			},
			c: 4,
			d: {
				shouldNotGoHere: 5
			}
		});
	});
});