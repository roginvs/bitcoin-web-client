import { html } from "./htm.mjs";
import { Spinner } from "./spinner.mjs";
import { useEffect, useState } from "./thirdparty/hooks.mjs";
import { BitcoinWallet } from "./wallet.mjs";

const DUST_LIMIT = 1000;

/**
 *
 * @param {number} sat
 */
function satToBtcStr(sat) {
  let out = sat.toString();
  out = "0".repeat(Math.max(0, 9 - out.length)) + out;
  out = out.slice(0, -8) + "." + out.slice(-8);
  return out;
}

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
      setBalance(
        utxos
          .filter((utxo) => utxo.value >= DUST_LIMIT)
          .reduce((acc, cur) => acc + cur.value, 0)
      );
    });
  }, [wallet]);

  const onMaxClick = () => {
    console.info("kek");
  };

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

          <div class="send_view">
            <input type="text" placeholder="Enter address" />
            <div class="flex_row">
              <input
                style="width: 100%"
                type="text"
                placeholder="Enter btc amount"
              />
              <button class="btn" onClick=${onMaxClick}>max</button>
            </div>
            <div class="flex_row">
              <input
                style="width: 100%"
                type="text"
                placeholder="Fee"
                value="0.00005"
              />
              <button class="btn">5000sat</button>
              <button class="btn">10000sat</button>
            </div>
            <button class="btn">Send</button>
          </div>
        `
      : ""}
  </div>`;
}
