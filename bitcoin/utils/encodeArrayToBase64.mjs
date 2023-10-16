import { describe, eq } from "../tests.mjs";

/**
 * Encode an array of numbers as Base64.
 * @param {number[]} numbers
 * @returns {string} Base64 encoded string.
 */
export function encodeArrayToBase64(numbers) {
  // Convert numbers to a Uint8Array
  const uint8Array = new Uint8Array(numbers);

  // Convert Uint8Array to a string
  let binary = "";
  uint8Array.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  // Encode string to Base64
  return btoa(binary);
}
describe("encodeArrayToBase64", () => {
  // Test #1: Basic test
  const input1 = [0x48, 0x65, 0x6c, 0x6c, 0x6f]; // 'Hello' in ASCII values
  const expectedOutput1 = "SGVsbG8="; // 'Hello' encoded in Base64
  eq(encodeArrayToBase64(input1), expectedOutput1, "Test #1");

  // Test #2: Empty array
  eq(encodeArrayToBase64([]), "", "Test #2");

  // Test #3: Large values in array
  const input3 = [0xff, 0xff, 0xff];
  const expectedOutput3 = "////";
  eq(encodeArrayToBase64(input3), expectedOutput3, "Test #3");
});
