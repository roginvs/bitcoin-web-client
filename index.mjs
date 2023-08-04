console.info("lol");

import { h, Component, render } from "./thirdparty/preact.mjs";
import htm from "./thirdparty/htm.mjs";
import { useState } from "./thirdparty/hooks.mjs";

// Initialize htm with Preact
const html = htm.bind(h);

/**
 *
 * @param {{name: string}} props
 */
function App(props) {
  return html`<h1>Hello ${props.name}!</h1>`;
}

render(html`<${App} name="World" />`, document.body);
