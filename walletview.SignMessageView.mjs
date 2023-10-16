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
  const [address, setAddress] = useState(wallet.getAddresses()[0]);

  const signature = wallet.signMessage(msg, address);

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

      <div
        class="tx_confirm_row"
        style="justify-content: center; margin-bottom: 5px;  margin-top: 0px;"
      >
        Choose wallet address:
      </div>
      <select
        value=${address}
        onInput=${(/** @type {any} */ e) => {
          setAddress(e.target.value);
        }}
      >
        ${wallet
          .getAddresses()
          .map(
            (addr) => html`<option key=${addr} value=${addr}>${addr}</option>`
          )}
      </select>

      <div
        class="tx_confirm_row"
        style="justify-content: center; margin-bottom: 5px;  margin-top: 20px;"
      >
        Signature:
      </div>
      <textarea
        style="width: 100%; resize: none; margin-bottom: 10px"
        placeholder=""
        title=""
        rows="8"
        readonly="true"
        value=${signature}
      />

      <div class="flex_column_center">
        <button onClick=${onClose} style="width: 150px">Back</button>
      </div>
    </div>
  `;
}
