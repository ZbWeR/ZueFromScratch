import { VNode, Container, RendererOptions } from "types/renderer";
import { patchProps } from "./patch";
import { defaultRendererOptions, Text, Fragment } from "./default";
import { getLISIndex } from "./utils";

// 创建一个渲染器
export function createRenderer(userOptions?: RendererOptions) {
  // options with defaults
  const options = { ...defaultRendererOptions, ...userOptions };
  const { createElement, insert, setElementText, createText, setText } = options;

  /**
   * 渲染虚拟节点
   * @param vnode - VNode
   * @param container - 容器
   */
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
   * @param anchor - 插入锚点
   */
  function patch(
    oldVnode: VNode | undefined | null,
    newVnode: VNode,
    container: Container | null,
    anchor: Container | null = null
  ) {
    if (oldVnode && oldVnode.type !== newVnode.type) {
      unmount(oldVnode);
      oldVnode = undefined;
    }
    const { type } = newVnode;

    // 普通标签元素
    if (typeof type === "string") {
      if (!oldVnode) {
        mountElement(newVnode, container, anchor);
      } else {
        patchElement(oldVnode, newVnode);
      }
    }
    // 文本节点
    else if (type === Text) {
      if (!oldVnode) {
        // 旧节点不存在则新建
        const el = (newVnode.el = createText(<string>newVnode.children));
        insert(el, container);
      } else {
        // 旧节点存在则比较并覆盖
        const el = (newVnode.el = oldVnode.el);
        if (newVnode.children !== oldVnode.children)
          setText(el, <string>newVnode.children);
      }
    }
    // 处理多根节点模板
    else if (type === Fragment) {
      if (!oldVnode)
        (<VNode[]>newVnode.children).forEach((c) => patch(null, c, container));
      else patchChildren(oldVnode, newVnode, container);
    }
    // TODO:组件元素
    else if (typeof type === "object") {
      console.log("【组件】类型的虚拟节点尚未处理");
    }
  }

  /**
   * 更新元素
   * @param n1 - VNode 旧值
   * @param n2 - VNode 新值
   */
  function patchElement(n1: VNode, n2: VNode) {
    const el = (n2.el = n1.el!);
    const oldProps = n1.props;
    const newProps = n2.props;

    // 更新属性值
    for (const key in newProps) {
      if (newProps[key] !== oldProps?.[key]) {
        patchProps(el, key, oldProps?.[key], newProps![key]);
      }
    }
    for (const key in oldProps) {
      if (!newProps || !(key in newProps)) patchProps(el, key, oldProps[key], null);
    }
    // 更新子节点
    patchChildren(n1, n2, el);
  }

  /**
   * 更新元素子节点
   * @param n1 - VNode 旧值
   * @param n2 - VNode 新值
   * @param container - 父元素容器
   */
  function patchChildren(n1: VNode, n2: VNode, container: Container | null) {
    // 新节点为文本节点
    if (typeof n2.children === "string") {
      // 旧节点为数组则依次卸载
      if (Array.isArray(n1.children)) n1.children.forEach((item) => unmount(item));
      // 更新文本内容
      setElementText(container, n2.children);
    }
    // 新节点为数组
    else if (Array.isArray(n2.children)) {
      // 旧节点也为数组则进行 diff 比较
      if (Array.isArray(n1.children)) {
        //TODO: diff 算法
        fastDiff(n1, n2, container);
      }
      // 旧节点为空或者文本类型直接置空，随后依次挂载
      else {
        setElementText(container, "");
        n2.children.forEach((item) => patch(null, item, container));
      }
    }
    // 新节点为空节点
    else {
      // 旧节点为数组则依次卸载
      if (Array.isArray(n1.children)) n1.children.forEach((item) => unmount(item));
      // 旧节点为文本类型直接置空
      else if (typeof n1.children === "string") setElementText(container, "");
    }
  }

  /**
   * 比较两个虚拟节点数组的差异，并更新
   * @param n1 - 旧 VNode 数组
   * @param n2 - 新 VNode 数组
   * @param container - 父元素容器
   */
  function fastDiff(n1: VNode, n2: VNode, container: Container | null) {
    const oldChildren = n1.children as VNode[];
    const newChildren = n2.children as VNode[];

    // ? 重复更新，当所有 key 都一致时
    // 更新相同的前置节点
    let prevIndex: number = 0;
    let oldEnd: number = oldChildren.length - 1;
    let newEnd: number = newChildren.length - 1;

    let oldVNode: VNode = oldChildren[prevIndex];
    let newVNode: VNode = newChildren[prevIndex];
    while (prevIndex <= oldEnd && prevIndex <= newEnd && oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container);
      prevIndex++;
      oldVNode = oldChildren[prevIndex];
      newVNode = newChildren[prevIndex];
    }
    // 更新相同的后置节点

    oldVNode = oldChildren[oldEnd];
    newVNode = newChildren[newEnd];
    while (prevIndex <= oldEnd && prevIndex <= newEnd && oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container);
      oldVNode = oldChildren[--oldEnd];
      newVNode = newChildren[--newEnd];
    }

    // console.log(prevIndex, oldEnd, newEnd);

    // 新VNode剩余：挂载
    if (prevIndex <= newEnd && prevIndex > oldEnd) {
      const anchorIndex = newEnd + 1;
      const anchor =
        anchorIndex < newChildren.length ? newChildren[anchorIndex].el! : null;
      while (prevIndex <= newEnd)
        patch(null, newChildren[prevIndex++], container, anchor);
    }

    // 旧VNode剩余：卸载
    else if (prevIndex <= oldEnd && prevIndex > newEnd) {
      while (prevIndex <= oldEnd) {
        unmount(oldChildren[prevIndex++]);
      }
    }
    // 同时剩余
    else if (prevIndex <= oldEnd) {
      // 1.构造 source
      const count: number = newEnd - prevIndex + 1;
      if (count <= 0) return;
      const source: number[] = new Array(count).fill(-1);

      // 2.构造索引表
      const oldStart: number = prevIndex;
      const newStart: number = prevIndex;
      let lastMaxPos: number = 0;
      let moved: boolean = false;

      const keyIndex: any = {};
      for (let i = newStart; i <= newEnd; i++) {
        keyIndex[newChildren[i].key] = i;
      }
      // 3.更新节点 & 判断是否需要移动
      let patched = 0;
      for (let i = oldStart; i <= oldEnd; i++) {
        oldVNode = oldChildren[i];

        if (patched <= count) {
          const k = keyIndex[oldVNode.key];
          // 在索引表中存在说明没有被移除
          if (k !== undefined) {
            newVNode = newChildren[k];
            patch(oldVNode, newVNode, container);
            patched++;
            source[k - newStart] = i;

            if (k < lastMaxPos) moved = true;
            else lastMaxPos = k;
          }
          // 不在索引表中则应当被卸载
          else {
            unmount(oldVNode);
          }
        }
        // 已更新节点数大于需要更新的节点数，则后续节点都应被卸载，性能优化的小手段
        else {
          unmount(oldVNode);
        }
      }

      // 4. 构造最长递增子序列进行移动
      if (moved) {
        const seq = getLISIndex(source);
        let s = seq.length - 1;
        let i = count - 1;
        for (i; i >= 0; i--) {
          // 新增的节点
          if (source[i] === -1) {
            const pos = i + newStart;
            const newVNode = newChildren[pos];
            const anchor = pos + 1 < newChildren.length ? newChildren[pos + 1].el : null;
            patch(null, newVNode, container, anchor);
          }
          // 需要移动的节点
          else if (i !== seq[s]) {
            const pos = i + newStart;
            const newVNode = newChildren[pos];
            const anchor = pos + 1 < newChildren.length ? newChildren[pos + 1].el : null;
            insert(newVNode.el, container, anchor);
          }
          // 不需要移动
          else {
            s--;
          }
        }
      }
    }
  }

  /**
   * 将虚拟节点转换为真实 DOM 并将其插入到父元素中
   * @param vnode - VNode
   * @param container - 父元素容器
   * @param anchor - 插入锚点
   */
  function mountElement(
    vnode: VNode,
    container: Container | null,
    anchor: Container | null
  ) {
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
    insert(el, container, anchor);
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

  // TODO: 通常用于服务端渲染
  // function hydrate(vnode: VNode, container: Container) {}

  return {
    render,
    // hydrate,
  };
}
