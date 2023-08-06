let failedTests = 0;
function incFailedTests() {
  if (failedTests === 0) {
    setTimeout(() => {
      alert(`${failedTests} tests failed!`);
    }, 100);
  }
  failedTests++;
}
/**
 * Very simple and straightforward testing suite
 *
 * @template T
 * @param {T} a
 * @param {T} b
 * @param {string} [msg]
 */
export function eq(a, b, msg) {
  if (a === b) {
    console.log(`ok ${msg || ""}`);
  } else if (
    typeof a === "object" &&
    typeof b === "object" &&
    JSON.stringify(a) === JSON.stringify(b) &&
    JSON.stringify(a) !== "{}"
  ) {
    console.log(`ok (objects) ${msg || ""}`);
  } else {
    console.log(`%cFAIL ${msg || ""}: ${a} !== ${b}`, "color: red;");
    incFailedTests();
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
  } catch (/** @type {any} */ e) {
    console.log(`%cFAIL ${msg} ${e.name} ${e.message}`, "color: red;");
    console.log(e.stack);
    incFailedTests();
  }
}
