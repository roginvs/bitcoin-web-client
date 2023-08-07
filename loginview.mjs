import { importPrivateKeyWifP2WPKH } from "./bitcoin/utils/wif.mjs";
import { html } from "./htm.mjs";
import { useState } from "./thirdparty/hooks.mjs";
import { generateRandomWif } from "./wallet.mjs";

/**
 * @param {{ onLogin: (keys: ArrayBuffer[], rememberMe: boolean) => void}} props
 */
export function LoginView({ onLogin }) {
  const [wifs, setWifs] = useState("");

  const onGenerate = () => {
    setWifs([1].map(() => generateRandomWif()).join("\n"));
  };
  const onNext = () => {
    if (!wifs) {
      return;
    }

    const keys = wifs
      .split(/\r\n|\n|\t/)
      .map((x) => x.trim())
      .filter((x) => x)
      .filter((x) => x.startsWith("p2wpkh:"))
      .map((x) => importPrivateKeyWifP2WPKH(x));
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
      <input type="checkbox" id="remember_me_checkbox"></input>
      <label for="remember_me_checkbox">Remember me</label>
    </div>  

    <div style="display: flex; justify-content: space-between; width: 100%">
      <button style="width: 200px" onClick=${onGenerate}>Generate random</button>
      <button style="width: 200px" onClick=${onNext} disabled=${!wifs}>Next</button>
    </div>
  </div>`;
}
