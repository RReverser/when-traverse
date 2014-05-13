'use strict';

let whenTraverse = require('./'),
	Promise = require('bluebird'),
	util = require('util');

Promise.prototype.inspect = () => 'Promise';

// delayed promise helper (for tests only)
var delayed = (timeout, value) => new Promise(resolve => setTimeout(() => resolve(value), timeout));

// test wrapped providing test object, sample tree and time difference function
var whenTraverseTest = callback => test => {
	let tree = {
		a: 0,
		b: delayed(100, {
			b1: delayed(200, 2),
			b2: delayed(300, 3)
		}),
		c: delayed(400, 4),
		d: {
			shouldNotGoHere: delayed(500, 5)
		}
	};

	let startTime = Date.now();
	let timeDiff = () => Date.now() - startTime;

	callback(test, tree, timeDiff).then(() => test.done(), err => { throw err });
};

exports['enter+leave'] = whenTraverseTest((test, tree, getElapsed) =>
	whenTraverse(tree, {
		enter: (node, key, parentNode) => {
			let elapsed = getElapsed();

			console.log('Entered %s (key: %s) after %d ms', util.inspect(node), key, elapsed);

			// check timings

			let shouldElapse;

			if (typeof node === 'number') {
				shouldElapse = node * 100;
			} else
			if (node === tree || node === tree.d) {
				shouldElapse = 0;
			} else
			if ('b1' in node) {
				shouldElapse = 100;
			}

			test.equal(Math.round(elapsed / 100) * 100, shouldElapse);

			if (typeof node === 'object' && 'shouldNotGoHere' in node) {
				return whenTraverse.SKIP;
			}
		},
		leave: (node, key, parentNode) => {
			// skip-values returned from `enter` should not come into `leave`
			test.notEqual(node, whenTraverse.SKIP);
			test.notEqual(node, whenTraverse.REMOVE);
			test.notEqual(node, tree.d);

			let elapsed = getElapsed();

			console.log('Left %s (key: %s) after %d ms', util.inspect(node), key, elapsed);

			// check timings

			let shouldElapse;

			if (typeof node === 'number') {
				shouldElapse = node * 100;
			} else
			if ('b1' in node) {
				shouldElapse = 300;
			} else
			if (node === tree) {
				shouldElapse = 400;
			}

			test.equal(Math.round(elapsed / 100) * 100, shouldElapse);

			if (node === 3) {
				return whenTraverse.REMOVE;
			}
		}
	}).then(newTree => {
		// got resolved tree here (everything is resolved except `d` and descendants):

		// should be same object
		test.equal(newTree, tree);

		// should have non-skipped values resolved
		test.equal(newTree.a, 0);
		test.deepEqual(newTree.b, {
			b1: 2
			// b2: 3 [REMOVE]
		});
		test.equal(newTree.c, 4);

		// d.shouldNotGoHere should not be resolved as `d` was skipped (but it should exist as Promise)
		test.ok(newTree.d.shouldNotGoHere instanceof Promise);
	})
);

exports['own visitor'] = whenTraverseTest((test, tree, getElapsed) =>
	// can't use arrow syntax since access to bound `this` is needed
	whenTraverse(tree, function (node, key, parentNode) {
		console.log('Visited %s (key: %s) after %d ms', util.inspect(node), key, getElapsed());

		if (node === 3) {
			return whenTraverse.REMOVE;
		}

		return this.into(node);
	}).then(newTree => {
		// got resolved tree here (everything is resolved except `d` and descendants):

		// should be same object
		test.equal(newTree, tree);

		// should have non-skipped values resolved
		test.equal(newTree.a, 0);
		test.deepEqual(newTree.b, {
			b1: 2
			// b2: 3 [REMOVE]
		});
		test.equal(newTree.c, 4);
		test.deepEqual(newTree.d, {
			shouldNotGoHere: 5
		});
	})
);

exports['just waiting'] = whenTraverseTest((test, tree) =>
	whenTraverse(tree).then(newTree => {
		// got resolved tree here (everything is resolved except `d` and descendants):

		// should be same object
		test.equal(newTree, tree);

		test.deepEqual(newTree, {
			a: 0,
			b: {
				b1: 2,
				b2: 3
			},
			c: 4,
			d: {
				shouldNotGoHere: 5
			}
		});
	})
);

exports['double-processing'] = whenTraverseTest((test, tree, getElapsed) =>
	whenTraverse(tree, {
		enter: (node, key, parentNode) => {
			if (typeof node === 'object' && 'shouldNotGoHere' in node) {
				return whenTraverse.SKIP;
			}
		}
	}).then(whenTraverse(tree, {
		enter: (node, key, parentNode) => {
			let elapsed = getElapsed();

			console.log('Double-entered %s (key: %s) after %d ms', util.inspect(node), key, elapsed);

			// check timings

			let shouldElapse;

			if (typeof node === 'number') {
				shouldElapse = node * 100;
			} else
			if (node === tree || node === tree.d) {
				shouldElapse = 0;
			} else
			if ('b1' in node) {
				shouldElapse = 100;
			}

			test.equal(Math.round(elapsed / 100) * 100, shouldElapse);
		}
	}))
);