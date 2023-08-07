import { arrayToBigint } from "./bitcoin/utils/arraybuffer-bigint.mjs";
import { bufToHex, parseHexToBuf } from "./bitcoin/utils/arraybuffer-hex.mjs";
import { html } from "./htm.mjs";
import { LoginView } from "./loginview.mjs";
import { useState } from "./thirdparty/hooks.mjs";
import { BitcoinWallet } from "./wallet.mjs";
import { WalletView } from "./walletview.mjs";

const LOCAL_STORAGE_PRIVATE_KEY_KEY = "bitcoin_wallet_private_key";
/**
 *
 * @param {{}} props
 */
export function App(props) {
  const [wallet, setWallet] = useState(() => {
    const privateKeysHex = localStorage.getItem(LOCAL_STORAGE_PRIVATE_KEY_KEY);
    if (!privateKeysHex) {
      return null;
    }
    const privKeys = privateKeysHex
      .split(" ")
      .map((keyHex) => arrayToBigint(parseHexToBuf(keyHex)));
    return new BitcoinWallet(privKeys);
  });

  const onLogout = () => {
    localStorage.removeItem(LOCAL_STORAGE_PRIVATE_KEY_KEY);
    document.location.reload();
  };

  const onLogin = (
    /** @type {ArrayBuffer[]} */ keys,
    /** @type {boolean} */ isRemember
  ) => {
    if (isRemember) {
      localStorage.setItem(
        LOCAL_STORAGE_PRIVATE_KEY_KEY,
        keys.map((key) => bufToHex(key)).join(" ")
      );
    }
    setWallet(new BitcoinWallet(keys.map((key) => arrayToBigint(key))));
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
