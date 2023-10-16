import { html } from "./htm.mjs";
import { BitcoinWallet } from "./wallet.mjs";

/**
 * @param {{
 *   wallet: BitcoinWallet,
 *   onClose: () => void,
 * }} props
 */
export function ExportView({ wallet, onClose }) {
  return html`
    <div class="send_view">
      <div
        class="tx_confirm_row"
        style="justify-content: center; margin-bottom: 5px;  margin-top: 20px;"
      >
        Those are private keys for your wallets:
      </div>
      <textarea
        style="width: 100%; resize: none; margin-bottom: 10px"
        placeholder=""
        title=""
        rows="8"
        readonly="true"
        value=${wallet.exportPrivateKeys().join("\n")}
      />

      <div class="flex_column_center">
        <button onClick=${onClose} style="width: 150px">Back</button>
      </div>
    </div>
  `;
}
