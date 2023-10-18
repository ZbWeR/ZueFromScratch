import { RendererOptions, Container } from "types/renderer";

export const defaultRendererOptions: RendererOptions = {
  createElement: (tag: string) => {
    return document.createElement(tag);
  },
  setElementText: (el: Container, text: string) => {
    el.textContent = text;
  },
  insert: (el: Container, parent: Container, anchor = null) => {
    parent.insertBefore(el, anchor);
  },
  createText: (text: string) => {
    return document.createTextNode(text);
  },
  setText: (el: Container, text: string) => {
    el.nodeValue = text;
  },
};

export const Text: symbol = Symbol();
export const Comment: symbol = Symbol();
export const Fragment: symbol = Symbol();
