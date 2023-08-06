import { html } from "./htm.mjs";
import { Spinner } from "./spinner.mjs";
import { useEffect, useState } from "./thirdparty/hooks.mjs";
import { BitcoinWallet, isDust } from "./wallet.mjs";

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
 * @param {string} str
 */
function btcStrToSat(str) {
  let dotIdx = str.indexOf(".");
  if (dotIdx < 0) {
    dotIdx = str.length;
  }
  const beforeDot = str.slice(0, dotIdx);
  const afterDot = str.slice(dotIdx + 1).padEnd(8, "0");
  if (afterDot.length > 8) {
    return null;
  }
  return parseInt(beforeDot + afterDot);
}

/**
 *
 * @param {{wallet: BitcoinWallet}} props
 */
export function WalletView({ wallet }) {
  const [utxos, setUtxos] = useState(
    /** @type {null | import("./wallet.defs.js").Utxo[]} */
    (null)
  );
  const [balance, setBalance] = useState(/** @type {null | number} */ (null));
  useEffect(() => {
    wallet.getUtxo().then((utxos) => {
      setUtxos(utxos);
      setBalance(
        utxos
          .filter((utxo) => !isDust(utxo))
          .reduce((acc, cur) => acc + cur.value, 0)
      );
    });
  }, [wallet]);

  const [valueStr, setValueStr] = useState("0.0002");
  const [feeStr, setFeeStr] = useState("0.00005");

  const fee = btcStrToSat(feeStr);
  const value = btcStrToSat(valueStr);

  const onMaxClick = () => {
    if (!balance) {
      setValueStr("0");
      return;
    }
    if (fee === null) {
      setValueStr("0");
      return;
    }
    const value = balance - fee;
    if (value < 0) {
      setValueStr("0");
      return;
    }
    setValueStr(satToBtcStr(value));
  };

  const [dstAddr, setDstAddr] = useState(
    "bc1q3sy4uhguqr43avkc2a26a8xrukp4z9l4jyzt4l"
  );

  const isSendAvailable =
    dstAddr &&
    balance &&
    fee !== null &&
    value !== null &&
    fee > 0 &&
    value > 0 &&
    fee + value <= balance;

  const [readyTx, setReadyTx] = useState(
    /** @type {import("./bitcoin/protocol/messages.types.js").TransactionPayload| null} */ (
      null
    )
  );
  const onSendClick = () => {
    if (!utxos || !value || !fee) {
      return;
    }
    const tx = wallet.createTx(utxos, dstAddr, value, fee);
    setReadyTx(tx);
  };

  return html`<div class="view flex_column_center">
    <div style="margin-bottom: 10px;"><b>${wallet.getAddress()}</b></div>
    <div style="margin-bottom: 10px;">
      ${balance !== null
        ? html`${satToBtcStr(balance)} btc = ${balance} sat`
        : html`<${Spinner} />`}
    </div>
    ${utxos
      ? html`
          <div class="utxo_list">
            ${utxos.map(
              (utxo) =>
                html`<div>
                  ${isDust(utxo)
                    ? html`<s title="dust">${utxo.value}</s>`
                    : utxo.value}
                  ${" "}sat at${" "}
                  ${new Date(
                    utxo.status.block_time * 1000
                  ).toLocaleString()}${" "}
                  <a
                    target="_blank"
                    href="https://www.blockchain.com/ru/explorer/transactions/btc/${utxo.txid}"
                    >${utxo.txid.slice(0, 8)}</a
                  >
                </div>`
            )}
          </div>

          ${!(readyTx && balance && fee && value)
            ? html`<div class="send_view">
                <input
                  type="text"
                  placeholder="Enter address"
                  value=${dstAddr}
                  onInput=${(/** @type {any} */ e) => {
                    setDstAddr(e.target.value);
                  }}
                />
                <div class="flex_row">
                  <input
                    style="width: 100%"
                    type="text"
                    placeholder="Enter btc amount"
                    value=${valueStr}
                    onInput=${(/** @type {any} */ e) => {
                      setValueStr(e.target.value);
                    }}
                  />
                  <button class="btn" onClick=${onMaxClick}>max</button>
                </div>
                <div class="flex_row">
                  <input
                    style="width: 100%"
                    type="text"
                    placeholder="Fee"
                    value=${feeStr}
                    onInput=${(/** @type {any} */ e) => {
                      setFeeStr(e.target.value);
                    }}
                  />
                  <button class="btn" onClick=${() => setFeeStr("0.00005")}>
                    5000sat
                  </button>
                  <button class="btn" onClick=${() => setFeeStr("0.0001")}>
                    10000sat
                  </button>
                </div>
                <button
                  class="btn"
                  disabled=${!isSendAvailable}
                  onClick=${onSendClick}
                >
                  Send
                </button>
              </div>`
            : html`
                <div class="send_view">
                  <div class="tx_confirm_row">
                    <span>Destination:</span>
                    <b>${dstAddr}</b>
                  </div>
                  <div class="tx_confirm_row">
                    <span>Value in BTC:</span>
                    <b>${valueStr}</b>
                  </div>

                  <div class="tx_confirm_row">
                    <span>Fee:</span>
                    <b>${satToBtcStr(fee)}</b>
                  </div>
                  <div class="tx_confirm_row">
                    <span>Remaining:</span>
                    <b>${satToBtcStr(balance - value - fee)}</b>
                  </div>
                </div>
              `}
        `
      : ""}
  </div>`;
}
