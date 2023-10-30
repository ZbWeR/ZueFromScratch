import { describe, expect, test } from "vitest";
import * as rex from "compiler/parser/regexp";

describe("Compiler - parser - regexp", () => {
  // RAWTEXT 标签
  test("Should correctly identify HTML tag that fit the  RAWTEXT mode.", () => {
    expect(rex.IS_RAWTEXT_HTML_TAG.test("style")).toBe(true);
    expect(rex.IS_RAWTEXT_HTML_TAG.test("xmp")).toBe(true);
    expect(rex.IS_RAWTEXT_HTML_TAG.test("iframe")).toBe(true);
    expect(rex.IS_RAWTEXT_HTML_TAG.test("div-h1-ul-script")).toBe(false);
  });

  // 连续空白字符
  test("Should correctly identify a series of consecutive whitespace at the start of a string", () => {
    let match = rex.BLANK_CHARS.exec("     <div");
    expect(match![0].length).toBe(5);
    match = rex.BLANK_CHARS.exec("1     <div");
    expect(match).toBe(null);
  });

  // HTML 标签的名称
  test("Should correctly capture the name of the HTML tag.", () => {
    // 开始标签
    let match = rex.HTML_START_TAG_NAME.exec("<div id='app'>喵喵喵</div>");
    expect(match![1]).toBe("div");

    // 结束标签
    match = rex.HTML_END_TAG_NAME.exec("</div>");
    expect(match![1]).toBe("div");
  });

  // HTML 属性
  test("Should correctly identify the props of the HTML tag.", () => {
    // 属性名称
    let match = rex.HTML_PROP_NAME.exec("id='app'>喵喵喵</id=>");
    expect(match![0]).toBe("id");
    match = rex.HTML_PROP_NAME.exec("@click='app'>喵喵喵</id=>");
    expect(match![0]).toBe("@click");

    // 非引用的属性值
    match = rex.HTML_PROP_VALUE_WITHOUT_QUOTE.exec("handler id='app'>喵喵喵</id=>");
    expect(match![0]).toBe("handler");
  });

  // HTML 实体
  test("Should correctly identify the starting portion of the HTML entity", () => {
    // 命名字符引用
    let match = rex.HTML_REFERENCE_HEAD.exec("A&lt;B");
    expect(match![0]).toBe("&");

    // 数字字符引用
    match = rex.HTML_REFERENCE_HEAD.exec("A&#60;B");
    expect(match![0]).toBe("&#");
    match = rex.HTML_REFERENCE_HEAD.exec("A&#x3c;B");
    expect(match![0]).toBe("&#x");
  });

  // ASCII 字母或数字 / 10 进制 / 16 进制
  test("Should correctly identify ASCII letters or numbers", () => {
    expect(rex.IS_ASCII_OR_NUMBER.test(",")).toBe(false);
    expect(rex.IS_ASCII_OR_NUMBER.test("A")).toBe(true);
    expect(rex.IS_ASCII_OR_NUMBER.test("9")).toBe(true);

    let match = rex.HEX_REFERENCE.exec("&#x3c;");
    expect(match![1]).toBe("3c");
    expect(rex.HEX_REFERENCE.test("&#60;")).toBe(false);

    match = rex.DECIMAL_REFERENCE.exec("&#60;");
    expect(match![1]).toBe("60");
    expect(rex.DECIMAL_REFERENCE.test("&#x3c;")).toBe(false);
  });
});
