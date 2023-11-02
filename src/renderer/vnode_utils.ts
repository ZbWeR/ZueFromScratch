import { VNode } from "types/renderer";
import { Comment, Text, VNodeUtil } from "./vnode";

/**
 * 创建一个虚拟 DOM, 函数别名 _h
 * @param type - 虚拟 DOM 的类型
 * @param props - 虚拟 DOM 的属性
 * @param children - 虚拟 DOM 的子节点
 */
export function createVNode(
  type: string,
  props: Record<string, any>,
  children: string | VNode[]
): VNode {
  const builder = VNodeUtil.builder().setTye(type).setChildren(children);

  // 处理 props 数据, 包括 attrs 与事件,以及对 z-show 进行处理
  const propsData = resolveProps(props);

  // 处理 z-if
  if (propsData["_if_"] !== undefined && !propsData["_if_"]) builder.setIf(false);
  else builder.setIf(true);
  delete propsData["_if_"];

  builder.setProps(propsData);
  return builder.build();
}

/**
 * 创建一个文本或注释节点, 函数别名 _t
 * @param type - 节点类型
 * @param value - 文本内容
 */
export function createTextVNode(type: string, value: string): VNode {
  if (type === "text") {
    return VNodeUtil.builder().setTye(Text).setChildren(value).build();
  } else {
    return VNodeUtil.builder().setTye(Comment).setChildren(value).build();
  }
}

/**
 * 将目标内容转化为文本内容, 函数别名 _s
 * @param value 目标值
 */
export function stringVal(value: any): string {
  return value === null
    ? ""
    : typeof value === "object"
    ? JSON.stringify(value).toString()
    : String(value);
}

/**
 * 处理 jsAST 生成代码中的属性值部分
 * @param props - 原始 props
 */
function resolveProps(props: Record<string, any>) {
  let propsData: Record<string, any> = {};

  // attrs 可以直接添加
  propsData = { ...props.attrs };
  // on 事件需要处理
  if (props.on) {
    for (const event in props.on) {
      const eventName = "on" + event[0].toUpperCase() + event.slice(1);
      propsData[eventName] = props.on[event];
    }
  }
  // z-show 通过 CSS 控制节点显示隐藏
  const showDisplay =
    propsData["_show_"] !== undefined && !propsData["_show_"] ? "none" : "";

  if (Array.isArray(propsData["_style_"])) {
    propsData["_style_"].push({ display: showDisplay });
  } else if (propsData["_style_"] && typeof propsData["_style_"] === "object") {
    const oldValue = propsData["_style_"]["display"];
    if (oldValue) {
      propsData["_style_"]["display"] = showDisplay === "" ? oldValue : showDisplay;
    } else {
      propsData["_style_"]["display"] = showDisplay;
    }
  } else {
    propsData["_style_"] = { display: showDisplay };
  }

  delete propsData["_show_"];

  // z-if 不会进行节点的渲染，需要对虚拟 DOM 进行标记

  return propsData;
}
