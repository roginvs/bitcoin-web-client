import { getTxSize } from "./bitcoin/financial/txsize.mjs";
import { readTx } from "./bitcoin/protocol/messages.parse.mjs";
import { bufToHex } from "./bitcoin/utils/arraybuffer-hex.mjs";
import { pkScriptToAddress } from "./bitcoin/utils/pkscript_to_address.mjs";
import { html } from "./htm.mjs";
import { Spinner } from "./spinner.mjs";
import { useCallback, useEffect, useState } from "./thirdparty/hooks.mjs";
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
 * @typedef {Record<string, number>} FeeEstimates
 */

const SAT_IN_BTC = 100000000;
/**
 * @param {{
 *   wallet: BitcoinWallet,
 *   txRaw: import("./bitcoin/protocol/messages.types.js").TransactionPayload,
 *   spendingSum: number,
 *   onClose: () => void,
 *   feeEstimates: FeeEstimates | null
 * }} props
 */
function WalletTxSendView({
  wallet,
  txRaw,
  spendingSum,
  onClose,
  feeEstimates,
}) {
  const tx = readTx(txRaw)[0];

  console.info(tx);

  const myAddress = wallet.getAddress();

  const outsideValue = tx.txOut
    .filter((txout) => pkScriptToAddress(txout.script) !== myAddress)
    .reduce((acc, cur) => acc + Number(cur.value), 0);
  const changeValue = tx.txOut
    .filter((txout) => pkScriptToAddress(txout.script) === myAddress)
    .reduce((acc, cur) => acc + Number(cur.value), 0);

  const fee = spendingSum - changeValue - outsideValue;

  const txSize = getTxSize(txRaw);

  const [status, setStatus] = useState(
    /** @type {null | "busy" | "ok" | "failed"} */ (null)
  );

  const onBroadcast = () => {
    setStatus("busy");
    wallet
      .sendTx(txRaw)
      .then(() => {
        setStatus("ok");
      })
      .catch((e) => {
        console.warn(e);
        setStatus("failed");
      });
  };

  const onOkClick = () => {
    {
      const link = document.createElement("a");
      const txIdArray = [...new Uint8Array(tx.txid)].reverse();

      link.href = `https://www.blockchain.com/ru/explorer/transactions/btc/${bufToHex(
        new Uint8Array(txIdArray).buffer
      )}`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 1000);
    }
    onClose();
  };

  const feeRate = fee / txSize.vbytes;
  const feeEstimate = feeEstimates
    ? Object.keys(feeEstimates)
        .sort((a, b) => +a - +b)
        .find((blockN) => feeEstimates[blockN] < feeRate) || ">1008"
    : "";

  return html` <div class="send_view">
    <div
      class="tx_confirm_row"
      style="justify-content: center; margin-bottom: 5px;  margin-top: 20px;"
    >
      Receiving endpoints:
    </div>
    ${tx.txOut.map((txout) => {
      const dstAddr = pkScriptToAddress(txout.script);
      const isMyAddress = dstAddr === myAddress;
      return html`
        <div class="tx_confirm_row">
          ${isMyAddress
            ? html` <span style="color: #AAAAAA">${dstAddr} (change)</span>
                <span>${satToBtcStr(Number(txout.value))}</span>`
            : html`<span>${dstAddr}</span
                ><b>${satToBtcStr(Number(txout.value))}</b>`}
        </div>
      `;
    })}

    <div
      class="tx_confirm_row"
      style="justify-content: center; margin-bottom: 5px; margin-top: 20px;"
    >
      Information:
    </div>
    <div class="tx_confirm_row">
      <span>Transaction value:</span>
      <b>${satToBtcStr(spendingSum)} btc</b>
    </div>
    <div class="tx_confirm_row">
      <span>Transferred:</span>
      <b>${satToBtcStr(outsideValue)} btc</b>
    </div>
    <div class="tx_confirm_row">
      <span>Change:</span>
      <b>${satToBtcStr(changeValue)} btc</b>
    </div>
    <div class="tx_confirm_row">
      <span>Fee:</span>
      <b>${satToBtcStr(fee)} btc</b>
    </div>

    <div class="tx_confirm_row">
      <span>Transaction size:</span>
      <b>${txSize.vbytes} vbytes</b>
    </div>
    <div class="tx_confirm_row">
      <span>Fee rate:</span>
      <b>${feeRate.toFixed(2)} sat/vbytes</b>
    </div>
    <div class="tx_confirm_row">
      <span>Estimated confirmation:</span>
      <b>${feeEstimate} blocks</b>
    </div>

    ${status === null
      ? html`
          <div
            class="tx_confirm_row"
            style="justify-content: center; margin-bottom: 5px; margin-top: 20px; gap: 10px;"
          >
            <button style="width: 100px" onClick=${onBroadcast}>
              Broadcast
            </button>
            <button style="width: 100px" onClick=${onClose}>Cancel</button>
          </div>
        `
      : status === "busy"
      ? html`<${Spinner} />`
      : status === "ok"
      ? html`<button onClick=${onOkClick}>Ok!</button> `
      : status === "failed"
      ? html`<button onClick=${onClose}>FAILED TO BROADCAST!</button> `
      : ""}
  </div>`;
}

/**
 * @param {{wallet: BitcoinWallet, onLogout: () => void}} props
 */
export function WalletView({ wallet, onLogout }) {
  const [utxos, setUtxos] = useState(
    /** @type {null | import("./wallet.defs.js").Utxo[]} */
    (null)
  );
  const [balance, setBalance] = useState(/** @type {null | number} */ (null));

  const loadUtxos = useCallback(
    () =>
      wallet.getUtxo().then((utxos) => {
        setUtxos(utxos);
        setBalance(
          utxos
            .filter((utxo) => !isDust(utxo))
            .reduce((acc, cur) => acc + cur.value, 0)
        );
      }),
    [wallet]
  );
  useEffect(() => {
    loadUtxos();
  }, [loadUtxos]);

  const [valueStr, setValueStr] = useState("0.0003");
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

  useEffect(() => {
    onMaxClick();
  }, [balance]);

  const [dstAddr, setDstAddr] = useState(wallet.getAddress());

  const isSendAvailable =
    dstAddr &&
    balance &&
    fee !== null &&
    value !== null &&
    fee > 0 &&
    value > 0 &&
    fee + value <= balance;

  const [readyTxWithSum, setReadyTxWithSum] = useState(
    /** @type {readonly [import("./bitcoin/protocol/messages.types.js").TransactionPayload, number]| null} */ (
      null
    )
  );
  const onSendClick = () => {
    if (!utxos || !value || !fee) {
      return;
    }
    const tx = wallet.createTx(utxos, dstAddr, value, fee);
    setReadyTxWithSum(tx);
  };

  const [feeEstimates, setFeeEstimates] = useState(
    /** @type {FeeEstimates | null} */ null
  );
  useEffect(() => {
    fetch("https://blockstream.info/api/fee-estimates")
      .then((res) => res.json())
      .then((estimates) => setFeeEstimates(estimates));
  }, []);

  const [btcPrice, setBtcPrice] = useState(/** @type {number | null} */ null);
  useEffect(() => {
    fetch("https://api.blockchain.com/v3/exchange/tickers/BTC-EUR", {
      headers: {
        accept: "application/json",
      },
    })
      .then((res) => res.json())
      .then((prices) => setBtcPrice(prices.price_24h));
  }, []);

  const euroPrice = (/** @type {number | null} */ sat) => {
    return sat && btcPrice
      ? ((sat / SAT_IN_BTC) * btcPrice).toFixed(2) + " EUR"
      : "";
  };

  const onExport = (/** @type {MouseEvent} */ e) => {
    e.preventDefault();

    prompt("Here your private key:", wallet.exportPrivateKey());
  };
  const onLogoutClick = (/** @type {MouseEvent} */ e) => {
    e.preventDefault();
    if (!confirm("Did you save you private key?")) {
      return;
    }
    if (!confirm("There will be no way to recover it. Proceed?")) {
      return;
    }
    onLogout();
  };

  return html`<div class="view flex_column_center">
    <div style="margin-bottom: 10px;"><b>${wallet.getAddress()}</b></div>
    <div style="">
      ${balance !== null
        ? html`${satToBtcStr(balance)} btc = ${balance} sat`
        : html`<${Spinner} />`}
    </div>
    <div style="margin-bottom: 10px;">
      ${balance !== null ? euroPrice(balance) : ""}
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
                  ${utxo.status.block_time
                    ? new Date(utxo.status.block_time * 1000).toLocaleString()
                    : "<not confirmed>"}${" "}
                  <a
                    target="_blank"
                    href="https://www.blockchain.com/ru/explorer/transactions/btc/${utxo.txid}"
                    >${utxo.txid.slice(0, 8)}</a
                  >
                </div>`
            )}
          </div>

          ${!(readyTxWithSum && balance && fee && value)
            ? html`<div class="send_view">
                <label>Address:</label>
                <input
                  type="text"
                  placeholder="Enter address"
                  title="Destination address"
                  value=${dstAddr}
                  onInput=${(/** @type {any} */ e) => {
                    setDstAddr(e.target.value);
                  }}
                  style="margin-bottom: 5px"
                />
                <label>Amount (${euroPrice(value)}):</label>
                <div class="flex_row" style="margin-bottom: 5px">
                  <input
                    style="width: 100%"
                    type="text"
                    placeholder="Enter btc amount"
                    title="Amount"
                    value=${valueStr}
                    onInput=${(/** @type {any} */ e) => {
                      setValueStr(e.target.value);
                    }}
                  />
                  <button class="btn" onClick=${onMaxClick}>max</button>
                </div>
                <label>Fee (${euroPrice(fee)}): </label>
                <div class="flex_row" style="margin-bottom: 10px">
                  <input
                    style="width: 100%"
                    type="text"
                    placeholder="Fee"
                    title="Fee"
                    value=${feeStr}
                    onInput=${(/** @type {any} */ e) => {
                      setFeeStr(e.target.value);
                    }}
                  />
                  <button class="btn" onClick=${() => setFeeStr("0.000025")}>
                    2500sat
                  </button>
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
                  Create transaction
                </button>
              </div>`
            : html`<${WalletTxSendView}
                wallet=${wallet}
                txRaw=${readyTxWithSum[0]}
                spendingSum=${readyTxWithSum[1]}
                onClose=${() => {
                  setReadyTxWithSum(null);
                  setUtxos(null);
                  loadUtxos();
                }}
                feeEstimates=${feeEstimates}
              />`}
        `
      : ""}

    <div
      class="tx_confirm_row"
      style="margin-top: 15px; color: grey; width: 100%"
    >
      <a href="" onClick=${onExport}>Export key</a>
      <a href="" onClick=${onLogoutClick}>Logout</a>
    </div>
  </div>`;
}
