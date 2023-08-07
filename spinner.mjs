import { html } from "./htm.mjs";

export function Spinner() {
  return html`<span class="saving">
    <span>.</span><span>.</span><span>.</span>
  <//>`;
}
