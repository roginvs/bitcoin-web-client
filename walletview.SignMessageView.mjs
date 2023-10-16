
import { html } from "./htm.mjs";
import { useState } from "./thirdparty/hooks.mjs";
import { BitcoinWallet } from "./wallet.mjs";

/**
 * @param {{
 *   wallet: BitcoinWallet,
 *   onClose: () => void,
 * }} props
 */
export function SignMessageView({ wallet, onClose }) {
  const [msg, setMsg] = useState("");

  const signature = "kek";

  return html`
    <div class="send_view">
      <div
        class="tx_confirm_row"
        style="justify-content: center; margin-bottom: 5px;  margin-top: 20px;"
      >
        Enter message to sign:
      </div>
      <textarea
        style="width: 100%; resize: none; margin-bottom: 10px"
        placeholder=""
        title=""
        rows="10"
        value=${msg}
        onInput=${(/** @type {any} */ e) => {
          setMsg(e.target.value);
        }}
      />

      <textarea
        style="width: 100%; resize: none; margin-bottom: 10px"
        placeholder=""
        title=""
        rows="8"
        readonly="true"
        value=${signature}
      />
      <div
        class="tx_confirm_row"
        style="justify-content: center; margin-bottom: 5px;  margin-top: 20px;"
      >
        Signature:
      </div>
      <div class="flex_column_center">
        <button onClick=${onClose} style="width: 150px">Back</button>
      </div>
    </div>
  `;
}
