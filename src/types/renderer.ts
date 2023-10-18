export interface VNode {
  type: string | symbol;
  children: string | VNode[];
  props?: { [key: string]: any };
  el?: Container; // 对应的真实 DOM ,便于卸载操作
  key?: any; // 便于 diff 比较
}

export interface Invoker extends Function {
  (e: Event): any;
  value?: (e: Event) => any;
  attached?: number;
}

export interface Container extends HTMLElement {
  _vnode?: VNode;
  _invokers?: { [key: string]: Invoker }; // 事件处理函数,用于处理事件绑定
}

export interface RendererOptions {
  createElement: (tag: any) => any;
  insert: (el: any, parent: any, anchor?: any) => any;
  setElementText: (el: any, text: any) => any;
  createText: (text: string) => any;
  setText: (el: any, text: string) => any;
  // patchProps: (el: any, key: any, prevValue: any, nextValue: any) => any;
}
