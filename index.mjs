console.info("lol");

import { h, Component, render } from "./thirdparty/preact.mjs";
import { html } from "./htm.mjs";
import { App } from "./app.mjs";

render(html`<${App} />`, document.body);
