import { html } from "./htm.mjs";
import { Spinner } from "./spinner.mjs";
import { useEffect, useState } from "./thirdparty/hooks.mjs";
import { BitcoinWallet } from "./wallet.mjs";

/**
 *
 * @param {{wallet: BitcoinWallet}} props
 */
export function WalletView({ wallet }) {
  const [utxos, setUtxos] = useState(
    /** @type {null | import("./wallet.defs.mjs").Utxo[]} */
    (null)
  );
  const [balance, setBalance] = useState(/** @type {null | number} */ (null));
  useEffect(() => {
    wallet.getUtxo().then((utxos) => {
      setUtxos(utxos);
      setBalance(utxos.reduce((acc, cur) => acc + cur.value, 0));
    });
  }, [wallet]);

  return html`<div class="view">
    <div><b>${wallet.getAddress()}</b></div>
    <div style="margin-bottom: 10px;">
      ${balance !== null
        ? // TODO: Do not use arithmetic
          html`${balance} satoshi ~ ${balance / 100_000_000} btc`
        : html`<${Spinner} />`}
    </div>
    ${utxos
      ? html`
          <div class="utxo_list">
            ${utxos.map(
              (utxo) =>
                html`<div>
                  ${utxo.value} sat at${" "}
                  ${new Date(
                    utxo.status.block_time * 1000
                  ).toLocaleString()}${" "}
                  <a
                    href="https://www.blockchain.com/ru/explorer/transactions/btc/${utxo.txid}"
                    >${utxo.txid.slice(0, 8)}</a
                  >
                </div>`
            )}
          </div>

          todo: enter destination and etc
          <button class="btn">Send</button>
        `
      : ""}
  </div>`;
}
