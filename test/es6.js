const Lab = require('lab');
const lab = exports.lab = Lab.script();

const assert = require('assert');

const {
  test,
} = lab;

const promisesFlow = require('../src/index');

test('should return object with same properties as received', (done) => {
  const mapObject = {
    elems: Promise.resolve([1, 2, 3]),
    delayed: delay(100),
    depended: {
      deps: ['elems', 'delayed'],
      cb ({ elems, delayed }) {
        return null;
      },
    }
  };

  const taskKeys = Object
    .keys(mapObject)
    .sort();

  promisesFlow
    .run(mapObject)
    .then((result) => {
      const resultKeys = Object
        .keys(result)
        .sort();

      assert.equal(resultKeys.length, taskKeys.length);

      resultKeys
        .forEach((key, index) => assert.equal(key, taskKeys[index]));

      done();
    })
    .catch(done);
});

test('should allow deps to other promises elements', (done) => {
  const mapObject = {
    one: Promise.resolve(1),
    two: delay(100, 2),
    three: {
      deps: ['one', 'two'],
      cb ({ one, two }) {
        return one + two;
      },
    }
  };

  promisesFlow
    .run(mapObject)
    .then((results) => {
      assert.deepEqual(results, {
        one: 1,
        two: 2,
        three: 3,
      });

      done();
    })
    .catch(done);
});

test('should allow multichained deps for promises elements', (done) => {
  const mapObject = {
    one: Promise.resolve(1),
    two: {
      deps: ['one'],
      cb ({ one }) {
        return one + 1;
      }
    },
    three: {
      deps: ['one', 'two'],
      cb ({ one, two }) {
        return one + two;
      }
    },
  };

  promisesFlow
    .run(mapObject)
    .then((results) => {
      assert.deepEqual(results, {
        one: 1,
        two: 2,
        three: 3,
      });

      done();
    })
    .catch(done);
});

test('should allow return promise instance in cb function', (done) => {
  const expected = {
    one: 1,
    two: 2,
  };
  const mapObject = {
    one: Promise.resolve(1),
    two: {
      deps: ['one'],
      cb ({ one }) {
        return delay(100, one + one);
      },
    },
  };

  promisesFlow
    .run(mapObject)
    .then((result) => {
      assert.deepEqual(result, expected);

      done();
    })
    .catch(done);
});

test('should run all promises as soon as possible', (done) => {
  const runOrder = [];
  const expectedOrder = [2, 3, 1];

  function pushOrderValue (value) {
    runOrder
      .push(value);

    return value;
  }

  const mapObject = {
    one: delay(200, 1, pushOrderValue),
    two: delay(100, 2, pushOrderValue),
    three: {
      deps: ['two'],
      cb () {
        return delay(50, 3, pushOrderValue);
      }
    },
  };

  promisesFlow
    .run(mapObject)
    .then(() => {
      assert.deepEqual(runOrder, expectedOrder);

      done();
    })
    .catch(done);
});

test('should omit empty and recursive deps', (done) => {
  const expected = {
    one: 1,
  };

  const mapObject = {
    one: Promise.resolve(1),
    empty: {
      deps: [],
      cb () {
        return 2;
      }
    },
    recursive: {
      deps: ['recursive'],
      cb () {
        return 3;
      }
    },
    notExisted: {
      deps: ['notExistedDependency'],
      cb () {
        return 4;
      }
    }
  };

  promisesFlow
    .run(mapObject)
    .then((results) => {
      assert.deepEqual(results, expected);

      done();
    })
    .catch(done);
});

test('should work with not native promise implementation', (done) => {
  const expected = {
    one: 1,
    two: 2,
  };

  const mapObject = {
    one: promiseLikeDelay(100, 1),
    two: {
      deps: ['one'],
      cb ({ one }) {
        return one + 1;
      },
    },
  };

  promisesFlow
    .run(mapObject)
    .then((results) => {
      assert.deepEqual(results, expected);

      done();
    })
    .catch(done);
});

test('should allow to use not native promises as `cb` return value', (done) => {
  const expected = {
    one: 1,
    two: 2,
  };

  const mapObject = {
    one: Promise.resolve(1),
    two: {
      deps: ['one'],
      cb ({ one }) {
        return promiseLikeDelay(100, one + 1);
      },
    },
  };

  promisesFlow
    .run(mapObject)
    .then((results) => {
      assert.deepEqual(results, expected);

      done();
    })
    .catch(done);
});

function promiseLikeDelay (timeout, value) {
  return {
    then (cb) {
      setTimeout(cb, timeout, value);
    },
  };
}

function delay (timeout, value, cb = (value) => value) {
  return new Promise((resolve) => setTimeout(resolve, timeout, value))
    .then(cb);
}
