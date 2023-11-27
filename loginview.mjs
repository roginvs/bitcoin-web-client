import { Secp256k1 } from "./bitcoin/my-elliptic-curves/curves.named.mjs";
import { arrayToBigint } from "./bitcoin/utils/arraybuffer-bigint.mjs";
import { encodePrefixedWif, parsePrefixedWif } from "./bitcoin/utils/wif.mjs";
import { html } from "./htm.mjs";
import { useState } from "./thirdparty/hooks.mjs";

/**
 *
 * @param {ReturnType<typeof parsePrefixedWif>['type']} type
 * @returns
 */
function generateRandomWif(type) {
  const keyBuf = new Uint8Array(32);
  crypto.getRandomValues(keyBuf);
  const key = arrayToBigint(keyBuf);
  if (key >= Secp256k1.n || key <= BigInt(1)) {
    throw new Error(`Bad luck!`);
  }
  return encodePrefixedWif(
    {
      type,
      key: keyBuf.buffer,
    },
    true
  );
}

/**
 * @param {{ onLogin: (keys: ReturnType<typeof parsePrefixedWif>[], rememberMe: boolean) => void}} props
 */
export function LoginView({ onLogin }) {
  const [wifs, setWifs] = useState("");

  const onGenerate = () => {
    setWifs(
      [generateRandomWif("p2wpkh"), generateRandomWif("p2tr")].join("\n")
    );
  };
  const onNext = () => {
    if (!wifs) {
      return;
    }

    const keys = wifs
      .split(/\r\n|\n|\t/)
      .map((x) => x.trim())
      .filter((x) => x)
      .map((x) => parsePrefixedWif(x));
    const isRemember = /** @type {HTMLInputElement} */ (
      document.getElementById("remember_me_checkbox")
    ).checked;
    onLogin(keys, isRemember);
  };

  return html`<div class="view flex_column_center">
    <div style="margin-bottom: 10px;">
      <b>Welcome to web Bitcoin wallet!</b>
    </div>

    <label>Enter your WIF wallets, one per line: </label>
    <textarea
      style="width: 100%; resize: none; margin-bottom: 10px"
      type="text"
      placeholder="p2wpkh:xxxxxxxxx"
      title=""
      rows="15"
      value=${wifs}
      onInput=${(/** @type {any} */ e) => {
        setWifs(e.target.value);
      }}
    />

    <div style="display: flex; align-items: center; margin-bottom: 15px">
      <input type="checkbox" id="remember_me_checkbox" />
      <label for="remember_me_checkbox">Remember me</label>
    </div>

    <div style="display: flex; justify-content: space-between; width: 100%">
      <button style="width: 200px" onClick=${onGenerate}>
        Generate random
      </button>
      <button style="width: 200px" onClick=${onNext} disabled=${!wifs}>
        Next
      </button>
    </div>
  </div>`;
}
