export interface VNode {
  type: string;
  props?: { [key: string]: any };
  children: string | VNode[];
}

export interface Container extends HTMLElement {
  _vnode?: VNode;
  _invokers?: object;
}

export interface RendererOptions {
  createElement: (tag: any) => any;
  insert: (el: any, parent: any, anchor?: any) => any;
  setElementText: (el: any, text: any) => any;
  patchProps: (el: any, key: any, prevValue: any, nextValue: any) => any;
}
