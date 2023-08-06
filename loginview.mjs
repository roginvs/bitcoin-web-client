import { importPrivateKeyWifP2WPKH } from "./bitcoin/utils/wif.mjs";
import { html } from "./htm.mjs";
import { useState } from "./thirdparty/hooks.mjs";
import { generateRandomWif } from "./wallet.mjs";

/**
 * @param {{ onLogin: (key: ArrayBuffer, rememberMe: boolean) => void}} props
 */
export function LoginView({ onLogin }) {
  const [wif, setWif] = useState("");

  const onGenerate = () => {
    setWif(generateRandomWif());
  };
  const onNext = () => {
    if (!wif) {
      return;
    }
    const key = importPrivateKeyWifP2WPKH(wif);
    const isRemember = /** @type {HTMLInputElement} */ (
      document.getElementById("remember_me_checkbox")
    ).checked;
    onLogin(key, isRemember);
  };

  return html`<div class="view flex_column_center">
    <div style="margin-bottom: 10px;">
      <b>Welcome to web Bitcoin wallet!</b>
    </div>

    <label>Enter your WIF wallet: </label>
    <textarea
      style="width: 100%; resize: none; margin-bottom: 10px"
      type="text"
      placeholder=""
      title=""
      rows="5"
      value=${wif}
      onInput=${(/** @type {any} */ e) => {
        setWif(e.target.value);
      }}
    />

    <div style="display: flex; align-items: center; margin-bottom: 15px">
      <input type="checkbox" id="remember_me_checkbox"></input>
      <label for="remember_me_checkbox">Remember me</label>
    </div>  

    <div style="display: flex; justify-content: space-between; width: 100%">
      <button style="width: 200px" onClick=${onGenerate}>Generate random</button>
      <button style="width: 200px" onClick=${onNext} disabled=${!wif}>Next</button>
    </div>
  </div>`;
}
