import { ZueInstance } from "types/zue";
import { ComponentOptions, Container, VNode } from "../types/renderer";
import { error } from "../utils/debug";
import { compile } from "../compiler/index";
import { createRenderer } from "../renderer/index";

export class zue implements ZueInstance {
  $options!: ComponentOptions;
  $el!: HTMLElement;
  $renderer = createRenderer();

  constructor(options: ComponentOptions) {
    this.$options = options;
  }

  public mount(el?: string | HTMLElement) {
    let container: Container;
    if (typeof el === "string") {
      container = document.querySelector(el) as Container;
      if (!container) error(`Cannot find element: ${el}`);
    } else {
      container = el || document.body;
    }

    this.$el = container;
    const source = this.$options.template || container.outerHTML || "";
    // 编译模板内容获得渲染函数
    this.$options.render = compile(source, this) as () => VNode;

    const rootVnode: VNode = {
      type: this.$options,
      children: [],
    };
    // 清除原始内容并渲染
    this.$el.innerHTML = "";
    this.$renderer.render(rootVnode, this.$el);
  }
}

export function createApp(options: ComponentOptions) {
  // TODO: 脱 ref
  return new zue(options);
}
