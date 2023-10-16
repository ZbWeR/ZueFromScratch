import { VNode, Container, RendererOptions } from "types/renderer";
import { patchProps } from "./patch";

const defaultRendererOptions: RendererOptions = {
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
  patchProps,
};

// 创建一个渲染器
export function createRenderer(userOptions?: RendererOptions) {
  // options with defaults
  const options = { ...defaultRendererOptions, ...userOptions };
  const { createElement, insert, setElementText, patchProps } = options;

  function render(vnode: VNode, container: Container) {
    if (vnode) {
      // 新旧 vnode 同时传递给 patch 进行打补丁
      patch(container._vnode, vnode, container);
    } else {
      // 旧 vnode 存在而新 vnode 不存在说明是【卸载】操作
      if (container._vnode) {
        unmount(container._vnode);
      }
    }
    container._vnode = vnode;
  }

  /**
   * 比较新旧两个虚拟节点差异，根据差异更新真实 DOM
   * @param oldVnode - VNode 旧值
   * @param newVnode - VNode 新值
   * @param container - 父元素容器
   */
  function patch(oldVnode: VNode | undefined, newVnode: VNode, container: Container) {
    if (oldVnode && oldVnode.type !== newVnode.type) {
      unmount(oldVnode);
      oldVnode = undefined;
    }
    const { type } = newVnode;

    // 普通标签元素
    if (type === "string") {
      if (!oldVnode) {
        mountElement(newVnode, container);
      } else {
        // TODO: 更新
        // patchElement(oldVnode, newVnode);
      }
    }
    // TODO:组件元素
    else if (type === "object") {
      console.log("【组件】类型的虚拟节点尚未处理");
    }
  }

  /**
   * 将虚拟节点转换为真实 DOM 并将其插入到父元素中
   * @param vnode - VNode
   * @param container - 父元素容器
   */
  function mountElement(vnode: VNode, container: Container) {
    // 【创建】并记录虚拟节点对应的真实 DOM
    const el = (vnode.el = createElement(vnode.type));

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

  /**
   * 将虚拟节点从真实DOM中卸载
   * @param vnode - VNode
   */
  function unmount(vnode: VNode) {
    const el = vnode.el;
    const parent = el?.parentNode;
    parent && parent.removeChild(el);
  }

  // 通常用于服务端渲染
  function hydrate(vnode: VNode, container: Container) {}

  return {
    render,
    hydrate,
  };
}
