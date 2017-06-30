const isPromise = require('is-promise');
const PromisesFlowError = require('./promises-flow-error')

/**
 * Receive the map object with promises or flow structures objects
 * @example promisesFlow
 *   .run({
 *     elems: Promise.resolve([1, 2, 3]),
 *     incremented: {
 *       deps: ['elems'],
 *       cb: function elemsHandler ({ elems }) {
 *         return elems.map(elem => elem + 1);
 *       },
 *     },
 *     decremented: {
 *       deps: ['incremented'],
 *       cb: function incrementedElemsHandler ({ incremented }) {
 *         return incremented.map(elem => elem - 2);
 *       },
 *     }
 *   })
 *   .then(({ elems, incremented, decremented }) => { })
 *   .catch((error) => `handle error from any of promise`);
 */
exports.run = function (mapObject) {
  const keys = Object
    .keys(mapObject);

  const results = keys
    .reduce((result, key) => Object
      .assign(result, {
        [key]: prepareOpenAPIPromise(),
      }), {});

  keys
    .forEach((name) => {
      const target = mapObject[name];

      if (isPromise(target)) {
        target
          .then((result) => {
            results[name]
              .resolve(result);
          })
          .catch((e) => {
            results[name]
              .reject(new PromisesFlowError(name, e));
          });

        return;
      } else if (isFlowObject(target)) {
        const deps = target
          .deps
          .filter((dep) => (
            typeof dep === 'string'
          ));

        deps.forEach((dep) => {
          // Check for recursive dependency
          if (dep == name) {
            throw new PromisesFlowError(
              name,
              `Recursive dependency: '${dep}'`
            );
          }
          
          // Check for not existed dependency
          if (!results[dep]) {
            throw new PromisesFlowError(
              name,
              `Not existed dependency: '${dep}'`
            );
          }
        });

        if (deps.length) {
          const depsPromises = deps
            .map((dep) => results[dep]
              .then((result) => ({
                [dep]: result,
              })));

          const promise = Promise
            .all(depsPromises)
            .then((depsResults) => Object
              .assign(...depsResults))
            .then(target.cb)
            .catch((e) => {
              throw new PromisesFlowError(name, e);
            });

          results[name]
            .resolve(promise);
        } else {
          throw new PromisesFlowError(
            name,
            'Empty deps[]'
          );
        }
      } else {
        throw new PromisesFlowError(
          name,
          'Property must be a Promise or an object: { deps: Array<String>, cb: Function }',
        );
      }
    });

  return Promise
    .all(keys
      .map((key) => results[key]
        .then((result) => ({
          [key]: result,
        }))))
    .then((results) => Object
      .assign(...results));
}

function prepareOpenAPIPromise () {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  promise.resolve = resolve;
  promise.reject = reject;

  return promise;
}

function isFlowObject (obj) {
  return (
    obj
    && typeof obj === 'object'
    && Array.isArray(obj.deps)
    && typeof obj.cb === 'function'
  );
}
