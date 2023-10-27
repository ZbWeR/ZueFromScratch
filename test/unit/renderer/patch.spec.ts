// @vitest-environment happy-dom

import { expect, describe, test, beforeAll, vi } from "vitest";
import { createRenderer } from "../../../src/renderer/index";
import { nodesMap, componentNode } from "./data";

describe("createRenderer", () => {
  let renderer: ReturnType<typeof createRenderer>;
  beforeAll(() => {
    renderer = createRenderer();
  });

  // 基本挂载与卸载
  test("Should successfully mount virtual DOM onto the target element", () => {
    const { firstVnode } = nodesMap;
    const div = document.createElement("div");

    // 挂载
    renderer.render(firstVnode, div);
    expect(div.innerHTML).toBe("<div><p>喵喵喵</p><i>Yes</i><div>No</div></div>");
    // 卸载
    renderer.render(null, div);
    expect(div.innerHTML).toBe("");
  });

  // 带有属性与class的挂载与更新
  test("Should correctly mount and update a virtual DOM node with attributes and class", () => {
    const { oldNodes, newNodes } = nodesMap.withProps;
    const rootDiv = document.createElement("div");
    renderer.render(oldNodes, rootDiv);

    let renderDiv = rootDiv.firstElementChild;
    const btn: HTMLButtonElement = renderDiv?.firstElementChild as HTMLButtonElement;
    let p = renderDiv?.getElementsByTagName("p")[0] as HTMLParagraphElement;

    expect(btn.disabled).toBe(true);
    expect(btn.innerHTML).toBe("禁用按钮");
    expect(p.innerHTML).toBe("喵喵喵");
    expect(p.className).toBe("foo bar");

    renderer.render(newNodes, rootDiv);
    renderDiv = rootDiv.firstElementChild;
    const input = renderDiv?.getElementsByTagName("input")[0] as HTMLInputElement;
    p = renderDiv?.getElementsByTagName("p")[0] as HTMLParagraphElement;

    expect(renderDiv?.className).toBe("foo");
    expect(p.className).toBe("foo bar");
    expect(input.getAttribute("form")).toBe("form1");
  });

  // 具有绑定事件的 DOM 挂载与更新
  test("Should correctly mount and update a virtual DOM node with bound events", () => {
    const { oldNodes, newNodes } = nodesMap.withEvent;
    const div = document.createElement("div");
    const originalConsoleLog = console.log;
    console.log = vi.fn();

    // 绑定多个函数
    renderer.render(oldNodes, div);
    let p: any = div.firstElementChild;
    let events = Object.keys(p._listeners);
    expect(events).toEqual(["click", "contextmenu"]);
    (<HTMLParagraphElement>p).dispatchEvent(new MouseEvent("click"));
    expect(console.log).toBeCalledWith("only one clickFunction");

    renderer.render(newNodes, div);
    // 取消绑定
    let contextmenuFuncs = p._listeners.contextmenu;
    expect(contextmenuFuncs.length).toEqual(0);

    // 同一类型事件多个处理函数
    (<HTMLParagraphElement>p).dispatchEvent(new MouseEvent("click"));
    expect(console.log).toBeCalledTimes(3);
    expect(console.log).toBeCalledWith("clicked 2");

    console.log = originalConsoleLog;
  });

  // 文本节点与注释节点
  test("Should correctly mount and update a virtual DOM node of text and comment types", () => {
    const { oldNodes, newNodes } = nodesMap.textAndComment;
    const div = document.createElement("div");

    renderer.render(oldNodes, div);
    expect(div.innerHTML).toBe("<div>文本<p>段落</p></div>");
    renderer.render(newNodes, div);
    expect(div.innerHTML).toBe("<div>喵喵喵</div>");
  });

  // Fragment
  test("Should correctly mount and update a virtual DOM node of Fragment types", () => {
    const { oldNodes, newNodes } = nodesMap.fragment;
    const ul = document.createElement("ul");

    renderer.render(oldNodes, ul);
    expect(ul.innerHTML).toBe("喵喵喵");
    renderer.render(newNodes, ul);
    expect(ul.innerHTML).toBe("<li>1</li><li>2</li><li>3</li>");
  });

  // 更新：新子节点为数组，旧子节点为文本，以及反过来
  test("Should correctly update when the child node of the old virtual DOM is text or null and the new DOM is an array", () => {
    const { oldNodes, newNodes } = nodesMap.oldChildIsText;
    const div = document.createElement("div");

    // 新子节点为数组，旧子节点为文本
    renderer.render(oldNodes, div);
    expect(div.innerHTML).toBe("<div>喵喵喵</div>");
    renderer.render(newNodes, div);
    expect(div.innerHTML).toBe("<div><p>喵喵喵</p><p>汪汪汪</p></div>");

    // 新子节点为文本，旧子节点为数组
    const div_ = document.createElement("div");
    renderer.render(newNodes, div_);
    expect(div_.innerHTML).toBe("<div><p>喵喵喵</p><p>汪汪汪</p></div>");
    renderer.render(oldNodes, div_);
    expect(div_.innerHTML).toBe("<div>喵喵喵</div>");
  });

  // 更新: 新的子节点为空
  test("Should correctly update when the child node of the new virtual DOM is null and the old Dom is not null", () => {
    const { oldNodes, newNodes } = nodesMap.newIsEmpty;
    const div = document.createElement("div");

    renderer.render(oldNodes, div);
    expect(div.innerHTML).toBe("<div><h1>列表</h1><ul><li>1</li><li>2</li></ul></div>");
    renderer.render(newNodes, div);
    expect(div.innerHTML).toBe("<div><h1></h1><ul></ul></div>");
  });

  // fastDiff 内部添加新元素
  test("Should correctly handle the addition of new elements within child nodes", () => {
    const { oldNodes, newNodes } = nodesMap.add;
    const div = document.createElement("div");

    renderer.render(oldNodes, div);
    expect(div.innerHTML).toBe("<root><p>1</p><p>2</p><p>3</p></root>");
    renderer.render(newNodes, div);
    expect(div.innerHTML).toBe("<root><p>1</p><p>4</p><p>5</p><p>2</p><p>3</p></root>");
  });

  // fastDiff 删除旧元素
  test("Should correctly handle the removal of old elements", () => {
    const { oldNodes, newNodes } = nodesMap.remove;
    const div = document.createElement("div");

    renderer.render(oldNodes, div);
    expect(div.innerHTML).toBe("<root><p>1</p><p>2</p><p>3</p><p>4</p></root>");
    renderer.render(newNodes, div);
    expect(div.innerHTML).toBe("<root><p>1</p><p>4</p></root>");
  });

  // fastDiff 正常比较
  test("Should correctly handle the comparison of new and old nodes in general cases", () => {
    const { oldNodes, newNodes } = nodesMap.normal;
    const div = document.createElement("div");

    renderer.render(oldNodes, div);
    expect(div.innerHTML).toBe(
      "<root><p>1</p><p>2</p><p>3</p><p>4</p><p>6</p><p>5</p></root>"
    );
    renderer.render(newNodes, div);
    expect(div.innerHTML).toBe(
      "<root><p>1</p><p>3</p><p>4</p><p>2</p><p>7</p><p>5</p></root>"
    );
  });

  // fastDiff 已更新节点数量大于待更新节点数量
  test("Should immediately unmount nodes when the number of updated nodes exceeds the number to be updated", () => {
    const { oldNodes, newNodes } = nodesMap.edge;
    const div = document.createElement("div");
    renderer.render(oldNodes, div);
    renderer.render(newNodes, div);
  });

  // TODO: 事件更新时机
});

// TODO: 测试组件挂载与更新，生命周期等等
describe("createRenderer of Components", () => {
  let renderer: ReturnType<typeof createRenderer>;
  beforeAll(() => {
    renderer = createRenderer();
  });

  // test("temp", () => {
  //   const div = document.createElement("div");
  //   const tmpNode = { ...componentNode };

  //   renderer.render(tmpNode, div);
  //   expect(div.textContent).toBe("count is: 1");

  //   let myComponent: any = div.firstElementChild;
  //   myComponent.dispatchEvent(new MouseEvent("click"));

  //   expect(div.textContent).toBe("count is: 1");
  // });
});
