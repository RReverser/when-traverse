# when-traverse [![Build Status](https://travis-ci.org/RReverser/when-traverse.svg?branch=master)](https://travis-ci.org/RReverser/when-traverse)

> Asynchronously traverse tree of mixed promises and values

## Dependencies

Function assumes that DOM API compliant `Promise` exists in global namespace (true for latest versions of Chrome and Firefox).

If it's not, for AMD and Node.js [polyfill](https://github.com/jakearchibald/es6-promise) will be loaded and used.

## Install

Install [manually](https://github.com/RReverser/when-traverse) or with a package-manager.

```bash
$ npm install --save when-traverse
```

```bash
$ component install RReverser/when-traverse
```

## Usage

```js
// delayed promise helper (for example only)
function delay(timeout, value) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(value);
    }, timeout);
  });
}

// sample tree with nested simple and promised nodes
var tree = {
  a: 1,
  b: delay(1000, {
    'b1': delay(2000, 2),
    'b2': delay(3000, 3)
  }),
  c: delay(4000, 4),
  d: {
    shouldNotGoHere: delay(5000, 5)
  }
};

var startTime = Date.now();

whenTraverse(tree, {
  enter: function (node) {
    // is called when node object itself is resolved but didn't enter subtree yet
    // return new node to enter into, whenTraverse.SKIP or whenTraverse.REMOVE from here
  },
  leave: function (node) {
    // is called when node with all the children are resolved and subtree is left
    // return new node, whenTraverse.SKIP or whenTraverse.REMOVE from here
  }
}).then(function (tree) {
  // got resolved tree here:
  // 1) nodes that were marked with `whenTraverse.SKIP` and their children are still left intouched;
  // 2) nodes that were marked with `whenTraverse.REMOVE` are completely deleted from tree;
  // 3) other nodes are left intouched or replaced with new nodes returned from either `enter` or `leave`
});
```

Check out [test.js](https://github.com/RReverser/when-traverse/blob/master/traverse.js) for more code.

## License

[MIT](http://opensource.org/licenses/MIT) © Ingvar Stepanyan
