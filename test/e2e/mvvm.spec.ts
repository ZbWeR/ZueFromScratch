// TODO:
import { describe, expect, test, vi, beforeEach, beforeAll, afterAll } from "vitest";
import puppeteer, { Browser, Page } from "puppeteer";

describe("zue - e2e", () => {
  let browser: Browser;
  let page: Page;

  // 用于获取dom文本内容
  const getText = async (selector: string) => {
    return await page.$eval(selector, (x) => x.textContent);
  };

  // 获取指定样式
  const getStyle = async (selector: string, styleList: string[]) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const style: any = window.getComputedStyle(element);
    const res: any = {};
    for (const styleName of styleList) {
      res[styleName] = style[styleName];
    }
    return res;
  };

  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
    await page.goto(`file://${__dirname}/mvvm.html`);
  });

  afterAll(async () => {
    await browser.close();
  });

  // z-model 双向绑定测试
  test("z-model", async () => {
    // 初始状态
    expect(await getText("#case-1 h1")).toBe("hello");

    // 触发输入事件
    await page.type("#case-1 input", " world");
    expect(await page.$eval("#case-1 input", (x) => x.value)).toBe("hello world");
    expect(await getText("#case-1 h1")).toBe("hello world");
  });

  // z-if 条件渲染与 @ 事件绑定测试
  test("z-if & events", async () => {
    // 初始状态
    expect(await getText("#case-2 button")).toBe("is showing");
    expect(await getText("#case-2 h1")).toBe("0");

    // 触发点击事件
    await page.click("#case-2 button");
    expect(await getText("#case-2 button")).toBe("not showing");
    expect(await getText("#case-2 h1")).toBe("1");

    await page.click("#case-2 button");
    expect(await getText("#case-2 button")).toBe("is showing");
    expect(await getText("#case-2 h1")).toBe("2");
  });

  // z-show 与 z-html 指令测试
  test("z-show & z-html", async () => {
    // 初始状态
    expect(await page.$eval("#case-3 #raw-html", (e) => e.innerHTML)).toBe(
      "<h1>hello</h1>"
    );

    // 触发点击事件
    await page.click("#case-3 button");
    let elementStyle = await page.evaluate(getStyle, "#case-3 #raw-html", ["display"]);
    expect(elementStyle).toEqual({ display: "none" });

    await page.click("#case-3 button");
    elementStyle = await page.evaluate(getStyle, "#case-3 #raw-html", ["display"]);
    expect(elementStyle).toEqual({ display: "block" });
  });

  // 动态属性与动态样式测试
  test("z-bind & dynamic style and class", async () => {
    // 属性
    let elementStyle = await page.evaluate(getStyle, "#case-4 p", [
      "font-size",
      "font-weight",
    ]);
    expect(elementStyle).toEqual({
      "font-size": "12px",
      "font-weight": "700",
    });
    // 样式
    expect(await page.$eval("#case-4 p", (e) => e.className)).toBe(
      "bg-sky-400 text-black"
    );
  });
});
