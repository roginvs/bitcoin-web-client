import { arrayToBigint, parseHexToBuf } from "./bitcoin/utils/array-bigint.mjs";
import { html } from "./htm.mjs";
import { useState } from "./thirdparty/hooks.mjs";
import { BitcoinWallet } from "./wallet.mjs";
import { WalletView } from "./walletview.mjs";

/**
 *
 * @param {{}} props
 */
export function App(props) {
  const [wallet] = useState(() => {
    const privateKeyHex = localStorage.getItem("private_key");
    if (!privateKeyHex) {
      console.warn(`TODO: no saved private key`);
      return new BitcoinWallet(new Uint8Array([3]));
    }
    const privKey = arrayToBigint(parseHexToBuf(privateKeyHex));
    return new BitcoinWallet(privKey);
  });

  return html`<div class="container"><${WalletView} wallet=${wallet} /></div>`;
}
