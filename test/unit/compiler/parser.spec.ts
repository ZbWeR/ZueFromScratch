import { describe, expect, test } from "vitest";
import { parse } from "compiler/parser/index";

describe("compiler - parser", () => {
  // 解析 HTML 标签,包括属性值与文本
  test("Should correctly parse HTML tags, including correct identification of tag names, attributes, values and Text.", () => {
    const ast = parse('<div id="app" class="handler">hello world</div>');
    expect(ast).toEqual({
      type: "Root",
      children: [
        {
          type: "Element",
          tag: "div",
          isSelfClosing: false,
          children: [{ type: "Text", content: "hello world" }],
          props: [
            { type: "Attribute", name: "id", value: "app" },
            { type: "Attribute", name: "class", value: "handler" },
          ],
        },
      ],
    });
  });

  // 字符引用
  test("Should correctly identifying HTML entities and converting them to their corresponding characters.", () => {
    const ast = parse(`
    <div>
      <p>命名字符引用: &nbsp;&lt;&gt;&amp;</p>
      <p>数字字符引用: &#60;&#x3c;</p>
      <p>其他: &123 &喵喵喵 &#zbwer</p>
    </div>`);
    expect(ast).toEqual({
      type: "Root",
      children: [
        {
          type: "Element",
          tag: "div",
          isSelfClosing: false,
          props: [],
          children: [
            {
              type: "Element",
              tag: "p",
              isSelfClosing: false,
              props: [],
              children: [{ type: "Text", content: `命名字符引用:  <>&` }],
            },
            {
              type: "Element",
              tag: "p",
              isSelfClosing: false,
              props: [],
              children: [{ type: "Text", content: `数字字符引用: <<` }],
            },
            {
              type: "Element",
              tag: "p",
              isSelfClosing: false,
              props: [],
              children: [{ type: "Text", content: `其他: &123 &喵喵喵 &#zbwer` }],
            },
          ],
        },
      ],
    });
  });

  // 注释
  test("Should correctly parse comments within HTML", () => {
    const ast = parse("<div>Hello<!-- 喵喵喵 --></div>");
    expect(ast).toEqual({
      type: "Root",
      children: [
        {
          type: "Element",
          tag: "div",
          isSelfClosing: false,
          children: [
            { type: "Text", content: "Hello" },
            { type: "Comment", content: " 喵喵喵 " },
          ],
          props: [],
        },
      ],
    });
  });

  // 插值语法
  test("Should correctly parse interpolation syntax", () => {
    const ast = parse("<div>{{ msg }}</div>");
    expect(ast).toEqual({
      type: "Root",
      children: [
        {
          type: "Element",
          tag: "div",
          isSelfClosing: false,
          children: [
            {
              type: "Interpolation",
              content: {
                type: "Expression",
                content: " msg ",
              },
            },
          ],
          props: [],
        },
      ],
    });
  });

  // 自闭合标签
  test("Should correctly parse self-closing tags", () => {
    const ast = parse("<div><br/><hr></div>");
    expect(ast).toEqual({
      type: "Root",
      children: [
        {
          type: "Element",
          tag: "div",
          isSelfClosing: false,
          children: [
            {
              type: "Element",
              tag: "br",
              isSelfClosing: true,
              children: [],
              props: [],
            },
            {
              type: "Element",
              tag: "hr",
              isSelfClosing: true,
              children: [],
              props: [],
            },
          ],
          props: [],
        },
      ],
    });
  });

  // 无引号属性
  test("Should correctly parse unquoted attributes", () => {
    const ast = parse("<h1 class=test>hello world</h1>") as any;
    expect(ast.children[0].type).toBe("Element");
    expect(ast.children[0].tag).toBe("h1");
    expect(ast.children[0].props).toContainEqual({
      type: "Attribute",
      name: "class",
      value: "test",
    });
  });

  // 属性中指令解析
  test("Should correctly parse directives", () => {
    const ast = parse(
      "<div z-if='show' z-on:click='handler'  :style='dynamicStyle' z-bind:id='app'>hello world</div>"
    ) as any;

    expect(ast.children[0].type).toBe("Element");
    expect(ast.children[0].tag).toBe("div");
    expect(ast.children[0].props[0]).toEqual({
      type: "Directive",
      name: "z-if",
      exp: {
        type: "Expression",
        content: "show",
      },
    });
    expect(ast.children[0].props[1]).toEqual({
      type: "Event",
      name: "click",
      exp: {
        type: "Expression",
        content: "handler",
      },
    });
    expect(ast.children[0].props[2]).toEqual({
      type: "ReactiveProp",
      name: "_style_",
      exp: {
        type: "Expression",
        content: "dynamicStyle",
      },
    });
    expect(ast.children[0].props[3]).toEqual({
      type: "ReactiveProp",
      name: "id",
      exp: {
        type: "Expression",
        content: "app",
      },
    });
  });

  // 属性中的 HTML 实体
  test("Should correctly parse HTML entities in attributes", () => {
    const ast = parse('<input value="A&amp;B" />');
    expect(ast).toEqual({
      type: "Root",
      children: [
        {
          type: "Element",
          tag: "input",
          isSelfClosing: true,
          children: [],
          props: [
            {
              type: "Attribute",
              name: "value",
              value: "A&B",
            },
          ],
        },
      ],
    });
  });
});
