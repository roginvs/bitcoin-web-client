let failedTests = 0;
/**
 * Very simple and straightforward testing suite
 *
 * @template T
 * @param {T} a
 * @param {T} b
 * @param {string?} msg
 */
export function eq(a, b, msg) {
  if (a !== b) {
    console.log(`%cFAIL ${msg}`, "color: red;");
    if (failedTests === 0) {
      setTimeout(() => {
        alert(`${failedTests} tests failed!`);
      }, 100);
    }
    failedTests++;
  } else {
    console.log(`ok ${msg}`);
  }
}

/**
 *
 * @param {string} msg
 * @param {() => void | Promise<void>} cb
 */
export function describe(msg, cb) {
  if (location.hostname !== "127.0.0.1") {
    return;
  }
  console.log(`=== ${msg} ===`);
  try {
    cb();
  } catch (e) {
    console.log(`%cFAIL ${msg}`, "color: red;");
  }
}
