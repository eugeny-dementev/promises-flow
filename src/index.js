const isPromise = require('is-promise');

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

  const bad = [];

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

        return;
      } else {
        const deps = target.deps
          .filter((dep) => (
            dep != name
            && results[dep]
          ));

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
            .then(target.cb);

          results[name]
            .resolve(promise);
        } else {
          bad.push(name);

          results[name]
            .resolve(undefined);
        }
      }
    });

  return Promise
    .all(keys
      .filter((key) => !bad
        .includes(key))
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
