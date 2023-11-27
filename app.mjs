import { ECPrivateKeyBigints } from "./bitcoin/myCrypto.mjs";
import { bufToHex, parseHexToBuf } from "./bitcoin/utils/arraybuffer-hex.mjs";
import { parsePrefixedWif } from "./bitcoin/utils/wif.mjs";
import { html } from "./htm.mjs";
import { loadSavedKeysFromStorage, saveKeysToStorage } from "./keysStorage.mjs";
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
    // todo read
    const keys = loadSavedKeysFromStorage();
    if (!keys) {
      return;
    }
    return new BitcoinWallet(keys);
  });

  const onLogout = () => {
    saveKeysToStorage(null);
    document.location.reload();
  };

  const onLogin = (
    /** @type {ReturnType<typeof parsePrefixedWif>[]} */ keys,
    /** @type {boolean} */ isRemember
  ) => {
    if (isRemember) {
      saveKeysToStorage(keys);
    }
    setWallet(new BitcoinWallet(keys));
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
