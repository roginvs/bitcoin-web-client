import { html } from "./htm.mjs";
import { useState } from "./thirdparty/hooks.mjs";

/**
 *
 * @param {{name: string}} props
 */
export function App(props) {
  return html`<h1>Hello ${props.name}!</h1>`;
}
