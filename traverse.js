(factory => {
	let hasPromise = typeof Promise !== 'undefined' &&
		typeof Promise.cast !== 'undefined' &&
		typeof Promise.resolve !== 'undefined' &&
		typeof Promise.all !== 'undefined';

	if (typeof define === 'function' && define.amd) {
		// loading Promise polyfill only when it's not available natively
		define(hasPromise ? [] : ['//cdnjs.cloudflare.com/ajax/libs/bluebird/1.2.2/bluebird.js'], () => factory(Promise));
	} else if (typeof exports === 'object') {
		module.exports = factory(hasPromise ? Promise : require('bluebird'));
	} else {
		this.whenTraverse = factory(Promise);
	}
})(Promise => {
	'use strict';

	/* polyfilling missing methods in some current browser implementations */

	let resolve = Promise.resolve.bind(Promise) || (arg => new Promise(resolve => resolve(arg)));
	let asPromise = Promise.cast.bind(Promise) || (arg => arg instanceof Promise ? arg : resolve(arg));

	let isObject = node => typeof node === 'object' && node !== null;
	let isSkipped = node => node === WhenTraverse.SKIP || node === WhenTraverse.REMOVE;

	class WhenTraverse {
		constructor(node, options) {
			if (!(this instanceof WhenTraverse)) {
				return new WhenTraverse(node, options);
			}

			switch (typeof options) {
				case 'object':
					let enter = this._wrapWhen(options.enter);
					let leave = this._wrapWhen(options.leave);

					this.visit = (node, key, parentNode) => (
						enter(node, key, parentNode)
						.then(node => this.into(node))
						.then(node => isSkipped(node) ? node : leave(node, key, parentNode))
					);

					break;

				case 'function':
					this.visit = this._wrapWhen(options);
					break;

				case 'undefined':
					this.visit = this.into;
					break;

				default:
					throw new TypeError('Unsupported visitor config.');
			}

			return this.visit(node);
		}

		_wrapWhen(func) {
			return func ? ((node, key, parentNode) =>
				asPromise(func.call(this, node, key, parentNode))
				.then(newValue => newValue === undefined ? node : newValue)
			) : resolve;
		}

		into(node) {
			if (!isObject(node) || isSkipped(node)) {
				return Promise.resolve(node);
			}

			return Promise.all(Object.keys(node).map(key => {
				let subNode = node[key];

				return asPromise(subNode)
					.then(subNode => this.visit(subNode, key, node))
					.then(newSubNode => {
						if (!isSkipped(newSubNode)) {
							if (newSubNode !== subNode) {
								node[key] = newSubNode;
							}
						} else {
							if (newSubNode === WhenTraverse.REMOVE) {
								delete node[key];
							}
						}
					});
			})).then(() => node);
		}
	}

	// defining non-modifiable constants
	['SKIP', 'REMOVE'].forEach(name => Object.defineProperty(WhenTraverse, name, {enumerable: true, value: {}}));

	return WhenTraverse;
});