/**
 *
 * @param {number} hashCodeType
 */
export function readHashCodeType(hashCodeType) {
  const isSigHashNone = (hashCodeType & 0x1f) === 0x00000002;
  const isSigHashSingle = (hashCodeType & 0x1f) === 0x00000003;
  const isSigHashAnyoneCanPay = !!(hashCodeType & 0x00000080);
  return {
    isSigHashNone,
    isSigHashSingle,
    // isSigHashAll = ! isSigHashNone && ! isSigHashSingle
    isSigHashAnyoneCanPay,
  };
}
/**
 *
 * @param {ReturnType<typeof readHashCodeType>} hashCodeType
 */
export function packHashCodeType(hashCodeType) {
  return (
    (hashCodeType.isSigHashAnyoneCanPay ? 0x00000080 : 0) +
    (hashCodeType.isSigHashNone
      ? 0x02
      : hashCodeType.isSigHashSingle
      ? 0x03
      : 0)
  );
}
