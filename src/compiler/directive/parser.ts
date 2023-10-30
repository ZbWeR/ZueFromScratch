import { ElementProp } from "types/complier";
import { decodeHTMLText } from "compiler/parser/decodeHTML";

/**
 * 解析指令属性
 * @param name - 属性名称
 * @param value - 属性值
 */
export function parseDirectives(name: string, value: string): ElementProp {
  let prop: ElementProp;

  if (name.startsWith("@") || name.startsWith("z-on:") || name.startsWith("on")) {
    // 处理事件绑定
    prop = {
      type: "Event",
      name: name.startsWith("@")
        ? name.slice(1, name.length)
        : name.startsWith("z-on:")
        ? name.slice(5, name.length)
        : name.slice(2, name.length),
      exp: {
        type: "Expression",
        content: value,
      },
    };
  } else if (name.startsWith(":") || name.startsWith("z-bind:")) {
    // 处理绑定属性
    const attrName = name.startsWith(":")
      ? name.slice(1, name.length)
      : name.slice(7, name.length);

    prop = {
      type: "ReactiveProp",
      name: attrName,
      exp: {
        type: "Expression",
        content: value,
      },
    };

    // 处理 style和class动态属性
    if (attrName === "style" || attrName === "class") {
      prop.name = `_${attrName}_`;
    }
  } else if (name.startsWith("z-")) {
    // 处理其他指令
    prop = {
      type: "Directive",
      name,
      exp: {
        type: "Expression",
        content: value,
      },
    };
  } else {
    // 普通的 HTML 属性
    prop = {
      type: "Attribute",
      name,
      value: decodeHTMLText(value),
    };
  }
  return prop;
}
