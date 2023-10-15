import { VNode, Container, RendererOptions } from "types/renderer";
import { normalizeClass } from "./utils";

const rendererOptions: RendererOptions = {
  // 创建元素
  createElement: (tag: string) => {
    return document.createElement(tag);
  },
  // 插入元素
  insert: (el: Container, parent: Container, anchor = null) => {
    parent.insertBefore(el, anchor);
  },
  // 设置文本内容
  setElementText: (el: Container, text: string) => {
    el.textContent = text;
  },
  // 设置元素属性
  patchProps: (el: Container, key: string, prevValue: any, nextValue: any) => {
    // 对 class 进行特殊处理
    if (key === "class") {
      el.className = normalizeClass(nextValue) || "";
    }

    // TODO: 对 style 进行特殊优化

    // 普通属性处理
    else if (shouldSetAsDOMProps(el, key)) {
      const type = typeof el[key as keyof HTMLElement];
      if (type === "boolean" && nextValue === "") (el as any)[key] = true;
      else (el as any)[key] = nextValue;
    } else {
      el.setAttribute(key, nextValue);
    }
  },
};

// const rendererOptions: RendererOptions = {
//   createElement: (tag: string) => {
//     console.log(`创建元素 ${tag}`);
//     return { tag };
//   },
//   insert: (el: any, parent: any, anchor = null) => {
//     console.log(`将元素 ${JSON.stringify(el)} 添加到 ${JSON.stringify(parent)} 下`);
//   },
//   setElementText: (el: any, text: string) => {
//     console.log(`设置 ${JSON.stringify(el)} 的文本内容: ${text}`);
//   },
// };

// 创建一个渲染器
export function createRenderer(options: RendererOptions = rendererOptions) {
  const { createElement, insert, setElementText, patchProps } = options;

  function render(vnode: VNode, container: Container) {
    if (vnode) {
      // 新旧 vnode 同时传递给 patch 进行打补丁
      patch(container._vnode, vnode, container);
    } else {
      // 旧 vnode 存在而新 vnode 不存在说明是卸载操作
      if (container._vnode) container.innerHTML = "";
    }
    container._vnode = vnode;
  }

  // 打补丁
  function patch(oldVnode: VNode | undefined, newVnode: VNode, container: Container) {
    // 挂载
    if (!oldVnode) {
      mountElement(newVnode, container);
    } else {
      // TODO: 更新
    }
  }

  // 将 vnode 挂载到容器中
  function mountElement(vnode: VNode, container: Container) {
    // 【创建】
    const el = createElement(vnode.type);

    // 【设置】
    if (typeof vnode.children === "string") {
      setElementText(el, vnode.children);
    }
    // 如果 children 是数组则遍历每一个子节点并调用 patch 挂载.
    else if (Array.isArray(vnode.children)) {
      vnode.children.forEach((child) => patch(undefined, child, el));
    }
    // 设置属性
    if (vnode.props) {
      Object.keys(vnode.props).forEach((key) => {
        patchProps(el, key, null, vnode.props![key]);
      });
    }

    // 【插入】
    insert(el, container, null);
  }

  // 通常用于服务端渲染
  function hydrate(vnode: VNode, container: Container) {}

  return {
    render,
    hydrate,
  };
}

/**
 * 判断某个属性能否以 DOM 的形式进行设置
 * @param el - 目标 DOM
 * @param key - 目标属性名称
 * @param val - 属性值
 */
function shouldSetAsDOMProps(el: Container, key: string): boolean {
  // 处理【只读】类型的 DOM Property
  if (key === "form" && el.tagName === "INPUT") return false;
  return key in el;
}
