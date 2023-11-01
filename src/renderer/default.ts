import { RendererOptions, Container } from "types/renderer";
import { Text, Comment } from "./vnode";

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
  createText: (text: string, type: Symbol = Text) => {
    if (type === Text) return document.createTextNode(text);
    else return document.createComment(text);
  },
  setText: (el: Container, text: string) => {
    el.nodeValue = text;
  },
};
