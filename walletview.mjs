import { ExportView } from "./walletview.ExportView.mjs";
import { SignMessageView } from "./walletview.SignMessageView.mjs";
import { getTxSize } from "./bitcoin/financial/txsize.mjs";
import { readTx } from "./bitcoin/protocol/messages.parse.mjs";
import { bufToHex } from "./bitcoin/utils/arraybuffer-hex.mjs";
import { pkScriptToAddress } from "./bitcoin/utils/pkscript_to_address.mjs";
import { html } from "./htm.mjs";
import { Spinner } from "./spinner.mjs";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "./thirdparty/hooks.mjs";
import { BitcoinWallet } from "./wallet.mjs";
import { btcStrToSat, satToBtcStr } from "./btc_and_sat.mjs";

/**
 * @param {string} url
 */
function openLinkInNewWindow(url) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 1000);
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

  const myAddresses = wallet.getAddresses();

  const outsideValue = tx.txOut
    .filter(
      (txout) => !myAddresses.includes(pkScriptToAddress(txout.script) || "")
    )
    .reduce((acc, cur) => acc + Number(cur.value), 0);
  const changeValue = tx.txOut
    .filter((txout) =>
      myAddresses.includes(pkScriptToAddress(txout.script) || "")
    )
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
      const txIdArray = [...new Uint8Array(tx.txid)].reverse();

      const txHex = bufToHex(new Uint8Array(txIdArray).buffer);
      // openLinkInNewWindow(
      //   `https://www.blockchain.com/explorer/transactions/btc/${txHex}`
      // );
      openLinkInNewWindow(
        `https://blockchair.com/bitcoin/transaction/${txHex}`
      );
    }
    onClose();
  };

  const feeRate = fee / txSize.vbytes;
  const feeEstimate = feeEstimates
    ? Object.keys(feeEstimates)
        .sort((a, b) => +a - +b)
        .find((blockN) => feeEstimates[blockN] < feeRate) || ">1008"
    : "";

  return html`<div class="send_view">
    <div
      class="tx_confirm_row"
      style="justify-content: center; margin-bottom: 5px;  margin-top: 20px;"
    >
      Receiving endpoints:
    </div>
    ${tx.txOut.map((txout) => {
      const dstAddr = pkScriptToAddress(txout.script);
      const isMyAddress = myAddresses.includes(dstAddr || "");
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
      ? html`<button onClick=${() => setStatus(null)}>
          FAILED TO BROADCAST!
        </button> `
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
  const balance = useMemo(
    () =>
      utxos
        ? utxos
            .filter((utxo) => !utxo.isDust)
            .filter((utxo) => !utxo.isIgnored)
            .reduce((acc, cur) => acc + cur.value, 0)
        : null,
    [utxos]
  );

  const loadUtxos = useCallback(
    () =>
      wallet
        .getUtxo()
        .then((utxos) => {
          setUtxos((oldUtxos) =>
            utxos
              .sort(
                (a, b) =>
                  (a.confirmedAt?.getTime() || 0) -
                    (b.confirmedAt?.getTime() || 0) ||
                  (a.confirmations || 0) - (b.confirmations || 0)
              )
              .map((utxo) => {
                const isOldIgnored = oldUtxos?.find(
                  (old) => old.txid === utxo.txid && old.vout === utxo.vout
                )?.isIgnored;
                return isOldIgnored
                  ? {
                      ...utxo,
                      isIgnored: true,
                    }
                  : utxo;
              })
          );
        })
        .catch((e) => alert(`${e.message}`)),
    [wallet]
  );
  useEffect(() => {
    loadUtxos();
  }, [loadUtxos]);

  const [valueStr, setValueStr] = useState("0.0003");
  const [feeStr, setFeeStr] = useState("0.00005");

  const fee = btcStrToSat(feeStr.trim());
  const value = btcStrToSat(valueStr.trim());

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

  const [dstAddr, setDstAddr] = useState(wallet.getAddress(0));

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
    /** @type {FeeEstimates | null} */ (null)
  );

  const [feeButtons, setFeeButtons] = useState(
    /** @type {null | number[]} */ (null)
  );

  const isHaveUtxos = !!utxos;
  useEffect(() => {
    if (!isHaveUtxos) {
      // Fetch this after we got utxos
      return;
    }
    fetch("https://blockstream.info/api/fee-estimates")
      .then((res) => res.json())
      .then((/** @type {FeeEstimates}*/ estimates) => {
        setFeeEstimates(estimates);
        const simpleTxSizeVbytes = 150;
        setFeeButtons(
          ["25", "10", "1"].map((targetBlocks) =>
            Math.round(estimates[targetBlocks] * simpleTxSizeVbytes)
          )
        );
      })
      .catch(() => {
        setFeeButtons([1500, 5000, 10000]);
      });
  }, [isHaveUtxos]);

  const [btcPrice, setBtcPrice] = useState(/** @type {number | null} */ null);
  useEffect(() => {
    if (!isHaveUtxos) {
      // Fetch this after we got utxos
      return;
    }
    fetch("https://api.blockchain.com/v3/exchange/tickers/BTC-EUR", {
      headers: {
        accept: "application/json",
      },
    })
      .then((res) => res.json())
      .then((prices) => setBtcPrice(prices.price_24h));
  }, [isHaveUtxos]);

  const euroPrice = (/** @type {number | null} */ sat) => {
    return sat && btcPrice
      ? ((sat / SAT_IN_BTC) * btcPrice).toFixed(2) + " EUR"
      : "";
  };

  const [otherView, setOtherView] = useState(
    /** @type {null | "export" | "signmessage"} */ (null)
  );

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

  const [viewUtxos, setViewUtxos] = useState(false);

  return html`<div class="view flex_column_center">
    <div>Your addresses:</div>
    <div style="margin-bottom: 10px; text-align: center;">
      ${wallet.getAddresses().map((addr) => html`<div><b>${addr}</b><//>`)}
    </div>
    <h3>
      ${balance !== null
        ? html`<b>${satToBtcStr(balance)} btc = ${balance} sat</b>`
        : html`<${Spinner} />`}
    <//>
    <div style="margin-bottom: 10px;">
      ${balance !== null ? euroPrice(balance) : ""}
    </div>
    ${utxos
      ? html`
          ${viewUtxos
            ? html`<div class="utxo_list">
                ${utxos.map(
                  (utxo, utxoIndex) =>
                    html`<div class="utxo_list_row">
                      <div title=${utxo.wallet}>
                        <input
                          type="checkbox"
                          checked=${!utxo.isIgnored}
                          style="margin-right: 5px"
                          title="Use this utxo for now"
                          onClick=${() => {
                            setUtxos(
                              utxos.map((utxoChange, indexChange) =>
                                indexChange !== utxoIndex
                                  ? utxoChange
                                  : {
                                      ...utxo,
                                      isIgnored: !utxo.isIgnored,
                                    }
                              )
                            );
                          }}
                        />

                        ${utxo.wallet.slice(0, 6)}..${utxo.wallet.slice(-4)}
                      </div>

                      <div style="min-width: 6em; text-align: right">
                        ${utxo.isDust
                          ? html`<s title="dust">${utxo.value}</s>`
                          : utxo.value}
                        ${" "}sat
                      </div>
                      <div style="min-width: 12em; text-align: center">
                        ${utxo.confirmedAt
                          ? utxo.confirmedAt.toLocaleString("en-GB")
                          : utxo.confirmations
                          ? `${utxo.confirmations} height`
                          : utxo.isConfirmed
                          ? `confirmed`
                          : "<not confirmed>"}
                      </div>
                      <div>
                        <a
                          target="_blank"
                          href="https://www.blockchain.com/explorer/transactions/btc/${utxo.txid}"
                          >${utxo.txid.slice(0, 8)}</a
                        >
                      </div>
                    </div>`
                )}
              </div> `
            : html`<a
                onClick=${(/** @type {MouseEvent} */ e) => {
                  e.preventDefault();
                  setViewUtxos(true);
                }}
                href=""
                style="margin-bottom: 15px; color: grey"
                >Show coins</a
              >`}
          ${otherView === "export"
            ? html`<${ExportView}
                wallet=${wallet}
                onClose=${() => {
                  setOtherView(null);
                }}
              />`
            : otherView === "signmessage"
            ? html`<${SignMessageView}
                wallet=${wallet}
                onClose=${() => {
                  setOtherView(null);
                }}
              />`
            : readyTxWithSum && balance && fee && value
            ? html`<${WalletTxSendView}
                wallet=${wallet}
                txRaw=${readyTxWithSum[0]}
                spendingSum=${readyTxWithSum[1]}
                onClose=${() => {
                  setReadyTxWithSum(null);
                  loadUtxos();
                }}
                feeEstimates=${feeEstimates}
              />`
            : html`<div class="send_view">
                  <label>Send to address:</label>
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
                  <label
                    title=${feeEstimates
                      ? Object.keys(feeEstimates)
                          .sort((a, b) => +a - +b)
                          .map(
                            (blocks) =>
                              `In ${blocks} blocks: ${feeEstimates[blocks]} sat/vbyte`
                          )
                          .join("\n")
                      : ""}
                    >Fee (${euroPrice(fee)}):
                  </label>
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
                    ${feeButtons?.map(
                      (feeSat) =>
                        html`<button
                          class="btn"
                          onClick=${() => setFeeStr(satToBtcStr(feeSat))}
                        >
                          ${feeSat}sat
                        </button>`
                    )}
                  </div>
                  <button
                    class="btn"
                    disabled=${!isSendAvailable}
                    onClick=${onSendClick}
                  >
                    Create transaction
                  </button>
                </div>

                <div
                  class="bottom_controls"
                  style="margin-top: 15px; color: grey; width: 100%"
                >
                  <a
                    href=""
                    onClick=${(/** @type {MouseEvent} */ e) => {
                      e.preventDefault();
                      setOtherView("signmessage");
                    }}
                    >Sign message</a
                  >

                  <a
                    href=""
                    onClick=${(/** @type {MouseEvent} */ e) => {
                      e.preventDefault();
                      setOtherView("export");
                    }}
                    >Export key</a
                  >
                  <a href="" style="margin-left: auto" onClick=${onLogoutClick}
                    >Logout</a
                  >
                </div> `}
        `
      : ""}
  </div>`;
}
