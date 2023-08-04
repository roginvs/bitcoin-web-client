import { html } from "./htm.mjs";
import { useState } from "./thirdparty/hooks.mjs";
import { BitcoinWallet } from "./wallet.mjs";

/**
 *
 * @param {{wallet: BitcoinWallet}} props
 */
export function WalletView({ wallet }) {
  return html`<h1>Hello ${wallet.getAddress()}!</h1>`;
}
