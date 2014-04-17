# when-traverse [![Build Status](https://travis-ci.org/RReverser/when-traverse.svg?branch=master)](https://travis-ci.org/RReverser/when-traverse)

> Asynchronously traverse tree of mixed promises and values

## Why

Consider this function as `Promise.map` + `Promise.all` for trees.

Often enough, we have tree structures, and when we want to transform them asynchronously, we have no other options but use sync variants of functions or write ugly hacks by collecting arrays of inner promises, handling them with `Promise.all`, collecting new promises (if there are), waiting for them with `Promise.all` again and do a lot of other silly stuff.

This function allows you to wait for tree of mixed promises and simple values, replace some nodes with asynchronous content, remove nodes depending on asynchronous conditions etc.

It handles each node as soon as it becomes available for processing, thus resulting in low overall latency.

## Dependencies

Function assumes that DOM API compliant `Promise` exists in global namespace (true for latest versions of Chrome and Firefox).

If it's not, for AMD and Node.js [polyfill](https://github.com/jakearchibald/es6-promise) will be loaded and used.

## Install

Use with AMD, Node.js or simple `<script src>`.

## Usage

### Let's assume you have following asynchronous tree:

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
```

### Then you can process it as follows:

```javascript
whenTraverse(tree, {
  enter: function (node) {
    /*
      is called when node object itself is resolved but didn't enter subtree yet;
      return nothing, new node to enter into, whenTraverse.SKIP or whenTraverse.REMOVE from here
      (can be Promise of any listed above as well)
    */
  },
  leave: function (node) {
    /*
      is called when node with all the children are resolved and subtree is left;
      return nothing, new node to enter into, whenTraverse.SKIP or whenTraverse.REMOVE from here
      (can be Promise of any listed above as well)
    */
  }
}).then(function (tree) {
  // got resolved tree here:

  // 1) nodes that were marked with `whenTraverse.SKIP` and their children are still left intouched;
  // 2) nodes that were marked with `whenTraverse.REMOVE` are completely deleted from tree;
  // 3) other nodes are left as-is or replaced with new nodes returned from either `enter` or `leave`
});
```

or

```javascript
// shorthand for `whenTraverse(tree, {leave: function () { ... }});
// process each node only when it's completely resolved with subtree
whenTraverse(tree, function leave(node) {
  // process each node here
}).then(function (tree) {
  // got resolved tree here
});
```

or

```javascript
// no changes, only waiting for all the promises in tree
whenTraverse(tree).then(function (tree) {
  // got resolved tree here
});
```

Check out [test.js](https://github.com/RReverser/when-traverse/blob/master/test.js) for more code.

## License

[MIT](http://opensource.org/licenses/MIT) © Ingvar Stepanyan
