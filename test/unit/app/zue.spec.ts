// @vitest-environment happy-dom

import { describe, expect, test, vi } from "vitest";
import { createApp } from "../../../src";

describe("zue", () => {
  // 简单的程序
  test("Should create a simple app", () => {
    const app = createApp({
      template: "<div>hello world</div>",
    }).mount();

    expect(document.body.innerHTML).toBe("<div>hello world</div>");
  });

  // 挂载到指定元素
  test("Should mount to a specified element", () => {
    const div = document.createElement("div");
    const app = createApp({
      template: "<div>hello world</div>",
    }).mount(div);

    expect(div.innerHTML).toBe("<div>hello world</div>");
  });

  // 包含嵌套语法与静态属性的模板结构
  test("Should create a app with nested syntax and static attributes", () => {
    const app = createApp({
      template: `<div id='container'>
  <p class='text-sky'>Hello World</p>
  <h1>喵喵喵</h1>
</div>
`,
    }).mount();
    const div = document.querySelector("#container");
    const p = div?.querySelector("p");
    expect(p?.innerHTML).toBe("Hello World");
    expect(p?.className).toBe("text-sky");
    expect(div?.querySelector("h1")?.innerHTML).toBe("喵喵喵");
  });

  // 插值语法测试
  test("Should create a app with interpolation", () => {
    const app = createApp({
      template: `<div id='container'>{{ name }}</div>`,
      data() {
        return { name: "喵喵喵" };
      },
    }).mount();
    const div = document.querySelector("#container");
    expect(div?.innerHTML).toBe("喵喵喵");
  });

  // 事件测试
  test("Should create a app with event", () => {
    const spy = vi.fn();
    const app = createApp({
      template: `<div id='container' z-on:click='spy'></div>`,
      methods: {
        spy,
      },
    }).mount();
    const div = document.querySelector("#container");
    div?.dispatchEvent(new MouseEvent("click"));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  // z-bind: 包含动态属性的模板结构
  test("Should create an app with dynamic attributes", () => {
    const app = createApp({
      template: `<div :id='name' :class='customClass' class='font-bold' z-bind:style='hidden'></div>`,
      data() {
        return {
          name: "app",
          customClass: {
            "bg-sky-400": true,
            "text-sky-400": false,
          },
          hidden: {
            display: "block",
            fontSize: "12px",
          },
        };
      },
    }).mount();
    const div = document.querySelector("div");
    expect(div?.id).toBe("app");
    expect(div?.className).toBe("bg-sky-400 font-bold");
    expect(div?.style.fontSize).toBe("12px");
    expect(div?.style.display).toBe("block");
  });

  // z-show
  test("Should create an app with z-show directive", () => {
    const app = createApp({
      template: `<div id='container'><p z-show='show'></p><h1 z-show='!show'>喵!</h1></div>`,
      data() {
        return { show: false };
      },
    }).mount();
    const div = document.querySelector("#container");
    expect(div?.querySelector("p")?.innerHTML).toBe("");
    expect(div?.querySelector("h1")?.innerHTML).toBe("喵!");
  });

  // z-if
  test("Should create an app with z-if directive", () => {
    const app = createApp({
      template: `<div id='container'><p z-if='show'></p><h1 z-if='!show'>喵!</h1></div>`,
      data() {
        return { show: false };
      },
    }).mount();
    const div = document.querySelector("#container");
    // z-if 不会被渲染
    expect(div?.querySelector("p")).toBe(null);
    expect(div?.querySelector("h1")?.innerHTML).toBe("喵!");
  });

  // z-html
  test("Should create an app with z-html directive", () => {
    const app = createApp({
      template: `<div id='container' z-html='content'></div>`,
      data() {
        return { content: "<h1>喵喵喵</h1>" };
      },
    }).mount();

    const div = document.querySelector("#container");
    expect(div?.innerHTML).toBe("<h1>喵喵喵</h1>");
    expect(div?.querySelector("h1")).not.toBe(null);
  });

  //? 响应式能力由于 happy-dom 局限暂无法测试.
});
