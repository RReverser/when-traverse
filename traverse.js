(function (root, factory) {
	var hasPromise = typeof Promise !== 'undefined';

	if (typeof define === 'function' && define.amd) {
		// loading Promise polyfill only when it's not available natively
		define(hasPromise ? [] : ['//s3.amazonaws.com/es6-promises/promise-0.1.1.min.js'], function () {
			return factory(Promise);
		});
	} else if (typeof exports === 'object') {
		module.exports = factory(hasPromise ? Promise : require('es6-promise').Promise);
	} else {
		root.whenTraverse = factory(Promise);
	}
}(this, function (Promise) {
	'use strict';

	/* polyfilling missing methods in some current browser implementations */

	var resolve = Promise.resolve.bind(Promise) || function (arg) {
		return new Promise(function (setValue) {
			setValue(arg);
		});
	};

	var asPromise = Promise.cast.bind(Promise) || function (arg) {
		return arg instanceof Promise ? arg : resolve(arg);
	};

	function when(value, func) {
		var promise = asPromise(value);

		if (func) {
			promise = promise.then(function (value) {
				return asPromise(func(value)).then(function (newValue) {
					return newValue === undefined ? value : newValue;
				});
			});
		}

		return promise;
	}

	function isObject(node) {
		return typeof node === 'object' && node !== null;
	}

	function isSkipped(node) {
		return node === whenTraverse.SKIP || node === whenTraverse.REMOVE;
	}

	function whenTraverse(node, options) {
		if (options instanceof Function) {
			options = {leave: options};
		}

		return when(node, options.enter).then(function (node) {
			if (!isObject(node) || isSkipped(node)) {
				return node;
			}

			var promises = Object.keys(node).map(function (key) {
				var subNode = node[key];

				return whenTraverse(subNode, options).then(function (newSubNode) {
					if (!isSkipped(newSubNode)) {
						if (newSubNode !== subNode) {
							node[key] = newSubNode;
						}
					} else {
						if (newSubNode === whenTraverse.REMOVE) {
							delete node[key];
						}
					}
				});
			});

			return Promise.all(promises).then(function () {
				return node;
			});
		}).then(function (node) {
			return when(node, options.leave);
		});
	}

	Object.defineProperties(whenTraverse, {
		SKIP: {enumerable: true, value: {}},
		REMOVE: {enumerable: true, value: {}}
	});

	return whenTraverse;
}));