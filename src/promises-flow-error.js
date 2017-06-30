class PromisesFlowError extends Error {
  constructor (property, error) {
    super(error);
    const stack = error.stack;
    this.name = `PromisesFlowError(${property})`;
    this.stack = stack ? `${this.name}: ${stack}` : this.stack;
  }
}

module.exports = PromisesFlowError;
