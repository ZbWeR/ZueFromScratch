import { describe, expect, test, vi } from "vitest";
import { Comment, Text } from "renderer/vnode";
import { createVNode, createTextVNode, stringVal } from "renderer/vnode_utils";
import { reactive } from "../../../src/reactivity/reactive";

describe("renderer - utils", () => {
  // 生成简单的 VNode
  test("should return a simple VNode given a tag", () => {
    const vnode = createVNode("div", {}, "hello world");
    expect(vnode.type).toBe("div");
    expect(vnode.children).toBe("hello world");
  });

  // 生成文本或注释节点
  test("should return a text VNode given a text", () => {
    const vnode1 = createTextVNode("text", "hello world");
    expect(vnode1.type).toBe(Text);
    expect(vnode1.children).toBe("hello world");

    const vnode2 = createTextVNode("comment", "comment here");
    expect(vnode2.type).toBe(Comment);
    expect(vnode2.children).toBe("comment here");
  });

  // 将目标内容转化为文本内容
  test("should return a string given a value", () => {
    expect(stringVal(100)).toBe("100");

    const obj = reactive({ foo: 1 });
    expect(stringVal(obj)).toBe('{"foo":1}');
  });

  // 处理 jsAST 生成代码中的属性值部分
  test("should return a props object given a props object", () => {
    const spy = vi.fn();
    const vnode = createVNode(
      "h1",
      {
        on: {
          click: spy,
        },
        attrs: {
          id: "app",
        },
      },
      "hello world"
    );
    expect(vnode.props!["onClick"]).toBe(spy);
    expect(vnode.props!["id"]).toBe("app");
  });

  // 嵌套 VNode
  test("should return a nested VNode given a nested VNode", () => {
    const vnode = createVNode("div", {}, [
      createVNode("h1", {}, "hello world"),
      createVNode("p", {}, "喵喵喵"),
    ]) as any;
    expect(vnode.children).toHaveLength(2);
    expect(vnode.children[0].type).toBe("h1");
    expect(vnode.children[0].children).toBe("hello world");
    expect(vnode.children[1].type).toBe("p");
    expect(vnode.children[1].children).toBe("喵喵喵");
  });
});
