import { h, Component, render } from "./thirdparty/preact.mjs";
import htm from "./thirdparty/htm.mjs";

// Initialize htm with Preact
export const html = htm.bind(h);
