import { arrayToBigint } from "./bitcoin/utils/arraybuffer-bigint.mjs";
import { bufToHex, parseHexToBuf } from "./bitcoin/utils/arraybuffer-hex.mjs";
import { html } from "./htm.mjs";
import { LoginView } from "./loginview.mjs";
import { useState } from "./thirdparty/hooks.mjs";
import { BitcoinWallet } from "./wallet.mjs";
import { WalletView } from "./walletview.mjs";

/**
 *
 * @param {{}} props
 */
export function App(props) {
  const [wallet, setWallet] = useState(() => {
    const privateKeyHex = localStorage.getItem("private_key");
    if (!privateKeyHex) {
      return null;
    }
    const privKey = arrayToBigint(parseHexToBuf(privateKeyHex));
    return new BitcoinWallet(privKey);
  });

  const onLogout = () => {
    localStorage.removeItem("private_key");
    document.location.reload();
  };

  const onLogin = (
    /** @type {ArrayBuffer} */ key,
    /** @type {boolean} */ isRemember
  ) => {
    if (isRemember) {
      localStorage.setItem("private_key", bufToHex(key));
    }
    setWallet(new BitcoinWallet(arrayToBigint(key)));
  };

  if (!wallet) {
    return html`<div class="container">
      <${LoginView} onLogin=${onLogin} />
    </div>`;
  }

  return html`<div class="container">
    <${WalletView} wallet=${wallet} onLogout=${onLogout} />
  </div>`;
}
