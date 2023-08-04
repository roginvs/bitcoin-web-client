import { html } from "./htm.mjs";
import { useState } from "./thirdparty/hooks.mjs";
import { BitcoinWallet } from "./wallet.mjs";
import { WalletView } from "./walletview.mjs";

/**
 *
 * @param {{}} props
 */
export function App(props) {
  const [wallet] = useState(new BitcoinWallet(new Uint8Array([3])));

  return html`<${WalletView} wallet=${wallet} />`;
}
