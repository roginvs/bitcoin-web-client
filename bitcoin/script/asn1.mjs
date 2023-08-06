import { describe, eq } from "../tests.mjs";
import { bufToHex, parseHexToBuf } from "../utils/arraybuffer-hex.mjs";
import { joinBuffers } from "../utils/joinBuffers.mjs";

/**
 *
 * @param {ArrayBuffer} buf
 */
export function packIntForAsn(buf) {
  const bufView = new Uint8Array(buf);
  if (bufView[0] !== 0 && !(bufView[0] & 0b10000000)) {
    // Valid case - not a zero and not negative
    return bufView;
  }
  if (bufView[0] === 0 && bufView[1] & 0b10000000) {
    // Ok, correct case, not negative because have leading zero
    return bufView;
  }

  let i = 0;
  while (i < bufView.length - 1 && bufView[i] === 0) {
    // Stop at previous to keep one
    i++;
  }

  const noLeadingZeros = new Uint8Array(bufView.buffer.slice(i));
  if (noLeadingZeros[0] & 0b10000000) {
    // Still negative, so need to add zero
    return joinBuffers(new Uint8Array([0]), noLeadingZeros);
  } else {
    // Ok, looks fine
    return noLeadingZeros;
  }
}

/**
 *
 * @param {ArrayBuffer} r
 * @param {ArrayBuffer} s
 * @returns
 */
export function packAsn1PairOfIntegers(r, s) {
  const rPrefixed = packIntForAsn(r);
  const sPrefixed = packIntForAsn(s);
  if (r.byteLength & 0b10000000) {
    throw new Error(`TODO: Longer integers`);
  }
  if (s.byteLength & 0b10000000) {
    throw new Error(`TODO: Longer integers`);
  }

  return joinBuffers(
    new Uint8Array([0x30, rPrefixed.length + sPrefixed.length + 2 + 2]),
    new Uint8Array([0x02, rPrefixed.length]),
    rPrefixed,
    new Uint8Array([0x02, sPrefixed.length]),
    sPrefixed
  );
}

/**
 * @typedef {any} Asn1
 */

/**
 * Very simple asn1 parsing, just for validation purposes
 * @param {ArrayBuffer} buf
 * @returns {[Asn1, ArrayBuffer]}
 */
export function asn1parse(buf) {
  const bufView = new Uint8Array(buf);
  if (bufView.byteLength === 0) {
    throw new Error(`Empty buf!`);
  }
  const type = bufView[0];
  if ((type & 0b11111) === 0b11111) {
    throw new Error("Long types are not supported");
  }
  if (bufView.length < 1) {
    throw new Error(`Where is length?`);
  }
  const len = bufView[1];
  if (len & 0b10000000) {
    throw new Error(`Long length is not supported ${len.toString(16)}`);
  }
  if (bufView.length < 1 + 1 + len) {
    throw new Error("Buf is not enough length");
  }
  let data = bufView.buffer.slice(2, 2 + len);

  /** @type {Asn1} */
  let result;
  if (type === 0x30) {
    result = [];
    /** @type {Asn1} */
    let val;
    while (data.byteLength > 0) {
      [val, data] = asn1parse(data);
      result.push(val);
    }
  } else if (type === 0x06) {
    result = {
      type: "oid",
      value: data,
    };
  } else if (type === 0x02) {
    result = {
      type: "integer",
      value: data,
    };
  } else if (type === 0x03) {
    if (new Uint8Array(data)[0] !== 0) {
      throw new Error(`Non byte bitstrings are not supported`);
    }
    result = {
      type: "bitstring",
      value: data.slice(1),
    };
  } else if (type === 0x04) {
    result = {
      type: "octetstring",
      value: data,
    };
  } else {
    throw new Error(`Unknown type 0x${type.toString(16)}`);
  }

  const rest = bufView.buffer.slice(2 + len);
  return [result, rest];
}

/**
 *
 * @param {ArrayBuffer} rspair
 */
export function repackSignature(rspair) {
  const [pair, rest] = asn1parse(rspair);
  if (pair.length !== 2) {
    throw new Error(`Not a pair`);
  }
  if (pair[0].type !== "integer" || pair[1].type !== "integer") {
    throw new Error("Not an integer");
  }
  return joinBuffers(packAsn1PairOfIntegers(pair[0].value, pair[1].value));
}

/**
 *
 * @param {ArrayBuffer} pub
 */
export function create_spki_der_from_pubkey(pub) {
  /*
      asn1 is TLV
      0x30 - SEQUENCE
      0x06 - OBJECT_ID
      0x03 - BITSTRING (0x03 <len> <unused bits=0> <data>)
  
    */
  const asn1prefixForDemoKey = parseHexToBuf(
    "3036301006072a8648ce3d020106052b8104000a032200"
  );

  const myLenInThisExample = 33;
  if (pub.byteLength !== myLenInThisExample) {
    const diff = pub.byteLength - myLenInThisExample;
    // Need to adjust sequence lengths
    new Uint8Array(asn1prefixForDemoKey)[1] += diff;
    new Uint8Array(asn1prefixForDemoKey)[21] += diff;
  }
  return joinBuffers(new Uint8Array(asn1prefixForDemoKey), new Uint8Array(pub));
}

describe(`Asn tools`, () => {
  for (const b of [
    new Uint8Array([]),
    new Uint8Array([0xaa, 0xbb, 0xdd]),
    new Uint8Array(35).fill(123),
  ]) {
    {
      const asn1 = create_spki_der_from_pubkey(b);
      const [data, rest] = asn1parse(asn1);

      eq(
        rest.byteLength,
        0,

        `create_spki_der_from_pubkey ${bufToHex(b)}`
      );
    }
  }

  {
    const packed = packAsn1PairOfIntegers(
      parseHexToBuf("03bb"),
      parseHexToBuf("ffff")
    );
    eq(bufToHex(packed), "3009020203bb020300ffff", `Packs 2 integers`);
    eq(asn1parse(packed)[1].byteLength, 0);
  }

  eq(
    bufToHex(repackSignature(parseHexToBuf("3008020203bb0202ffffabcd"))),
    "3009020203bb020300ffff",
    `Repacks signature`
  );

  {
    const data = {
      "000000": "00",
      FF: "00FF",
      "00CE": "00CE",
      1234: "1234",
      "0000001234": "1234",
      "000000FA": "00FA",
    };
    for (const [src, expected] of Object.entries(data)) {
      eq(
        bufToHex(packIntForAsn(parseHexToBuf(src))).toUpperCase(),
        expected,
        `Packs ${src} -> ${expected}`
      );
    }
  }
});
