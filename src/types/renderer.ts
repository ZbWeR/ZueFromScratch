/**
 * 虚拟 DOM
 */
export interface VNode {
  type: string | symbol | ComponentOptions;
  children: string | VNode[] | null;
  props?: Record<string | symbol, any>;
  el?: Container; // 对应的真实 DOM ,便于卸载操作
  key?: any; // 便于 diff 比较
  component?: ComponentInstance; // 对应组件实例
}

/**
 * 组件的选项对象
 */
export interface ComponentOptions {
  render: (...args: any[]) => VNode;

  name?: string;
  methods?: Record<string, unknown>;
  data?: (...args: any[]) => Record<string | symbol, any>;
  props?: Record<string | symbol, any>;

  // 声明周期
  beforeCreate?: () => void;
  created?: () => void;
  beforeMount?: () => void;
  mounted?: () => void;
  beforeUpdate?: () => void;
  updated?: () => void;
}

export interface ComponentInstance {
  state: any;
  props: Record<string | symbol, any>;
  isMounted: boolean;
  subTree: VNode | null;

  proxy: ComponentInstance | null;
}

/**
 * 伪造的事件处理函数
 * 用于优化节点更新时对事件属性的处理
 */
export interface Invoker extends Function {
  (e: Event): any;
  value?: (e: Event) => any;
  attached?: number;
}

/**
 * 与虚拟 DOM 相关联的真实 DOM 容器
 * 通常作为虚拟 DOM 的 el 属性
 */
export interface Container extends HTMLElement {
  _vnode?: VNode; // 当前对应的虚拟 DOM,节点更新时作为旧的虚拟 DOM 参与比较
  _invokers?: { [key: string]: Invoker }; // 事件处理函数,用于处理事件绑定
}

/**
 * 渲染配置项
 * 抽离浏览器等平台特有 API,以便实现跨平台的效果。
 */
export interface RendererOptions {
  createElement: (tag: any) => any;
  insert: (el: any, parent: any, anchor?: any) => any;
  setElementText: (el: any, text: any) => any;
  createText: (text: string) => any;
  setText: (el: any, text: string) => any;
  // patchProps: (el: any, key: any, prevValue: any, nextValue: any) => any;
}
