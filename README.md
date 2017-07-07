# promises-flow

[![Build Status][travis-img]][travis-url]
[![Code Coverage][codecov-img]][codecov-url]

[travis-img]: https://travis-ci.org/eugeny-dementev/promises-flow.svg?branch=master
[travis-url]: https://travis-ci.org/eugeny-dementev/promises-flow

[codecov-img]: https://codecov.io/github/eugeny-dementev/promises-flow/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/eugeny-dementev/promises-flow?branch=master

Promises flow control with dependencies

## install

```
npm install promises-flow
```

## Usage

```js
const promisesFlow = require('promises-flow');

promisesFlow
  .run({
    main: Promise.result('Hello'),
    dependent: {
      deps: ['main'],
      cb ({ main }) {
        return main + ' world';
      }
    },
  })
  .then(({ main, dependent }) => {
    console.log(dependent); // Hello world
  })
  .catch(/*...*/);
```

## API

```js
promisesFlow
  .run(Object) -> Promise
```

Each property of object (Promises Object) passed to run method should be a Promise (flow executors) or an object with two properties: 
```
{
  deps: Array<String>,
  cb: Function,
}
```

Strings in `deps` array define dependencies and properties of object that will be passed to `cb` function.

`cb` function can return static values or Promise instance.

In result `.run()` returns promise with resolved object which contains all promises object properties with result of execution.

## Errors

`.run()` throws 3 errors which help to configure promisesFlow correctly: 
- Empty deps[]
- Not existed dependency: 'depName'
- Recursive dependency: 'depName

Each error produced by promisesFlow wrapped to `PromisesFlowError(propertyName)` instance with property name of passed to `.run()` object where error happens.

Errors that throws by inner code will be also wrapped with `PromisesFlowError(propertyName)`.

### Example

```js
promisesFlow
  .run({
    init: Promise.resolve(),
    someField: {
      deps: ['init'],
      cb ({ init }) {
        return init.value;
      },
    },
  })
  .catch((err) => {
    console.log(err);
    /*
    { PromisesFlowError(someField): TypeError: Cannot read property 'value' of undefined
        at cb (promises-error.js:15:20)
        at <anonymous>
        at process._tickCallback (internal/process/next_tick.js:169:7)
        at Function.Module.runMain (module.js:607:11)
        at startup (bootstrap_node.js:158:16)
        at bootstrap_node.js:575:3 name: 'PromisesFlowError(someField)' }
    */
  });
```
