class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.maxFailures = options.maxFailures || 3;
    this.resetAfterMs = options.resetAfterMs || 60000;
    this.timeout = options.timeout || 5000;
    this.failures = 0;
    this.lastFailure = null;
    this.state = 'CLOSED'; // CLOSED = ok, OPEN = broken, HALF_OPEN = testing
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetAfterMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`[${this.name}] Circuit breaker OPEN - provider midlertidig utilgjengelig`);
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`[${this.name}] Timeout`)), this.timeout)
        ),
      ]);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.maxFailures) {
      this.state = 'OPEN';
      console.warn(`[${this.name}] Circuit breaker OPENED after ${this.failures} failures`);
    }
  }

  getStatus() {
    return { name: this.name, state: this.state, failures: this.failures };
  }
}

module.exports = CircuitBreaker;
