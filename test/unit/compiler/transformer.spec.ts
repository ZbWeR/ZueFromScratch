import { describe, expect, test } from "vitest";
import { transform } from "compiler/transformer/transform";
import { parse } from "compiler/parser/index";

describe("compiler - parser", () => {
  // 简单的转换
  test("Should correctly transform easy case", () => {
    const template = parse("<h1>hello world</h1>");
    const ast = transform(template) as any;

    expect(ast.body[0].type).toBe("ReturnStatement");
    expect(ast.body[0].return.type).toBe("CallExpression");
    expect(ast.body[0].return.callee.name).toBe("_h");
    expect(ast.body[0].return.arguments[0]).toEqual({
      type: "StringLiteral",
      value: "h1",
    });
  });

  // 转换注释
  test("Should correctly transform comments within HTML", () => {
    const template = parse("<h1>hello world      <!-- this is a comment --></h1>");
    const ast = transform(template) as any;

    expect(ast.body[0].return.callee.name).toBe("_h");
    expect(ast.body[0].return.arguments[2].elements[0]).toEqual({
      type: "CallExpression",
      callee: { type: "Identifier", name: "_t" },
      arguments: [
        { type: "StringLiteral", value: "text" },
        { type: "StringLiteral", value: "hello world      " },
      ],
    });
    expect(ast.body[0].return.arguments[2].elements[1]).toEqual({
      type: "CallExpression",
      callee: { type: "Identifier", name: "_t" },
      arguments: [
        { type: "StringLiteral", value: "comment" },
        { type: "StringLiteral", value: " this is a comment " },
      ],
    });
  });

  // 转换插值
  test("Should correctly transform interpolation within HTML", () => {
    const template = parse("<div>{{ person.name }}</div>");
    const ast = transform(template) as any;

    expect(ast.body[0].return.arguments[2].elements[0]).toEqual({
      type: "CallExpression",
      callee: { type: "Identifier", name: "_t" },
      arguments: [
        { type: "StringLiteral", value: "text" },
        {
          type: "CallExpression",
          callee: { type: "Identifier", name: "_s" },
          arguments: [{ type: "ExpressionLiteral", value: " person.name " }],
        },
      ],
    });
  });

  // 转换属性
  test("Should correctly transform attributes within HTML", () => {
    const template = parse('<div class="container" id="app"></div>');
    const ast = transform(template) as any;

    expect(ast.body[0].return.arguments[1].elements[0]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "directives" },
      last: {
        type: "ObjectExpression",
        elements: [],
      },
    });
    expect(ast.body[0].return.arguments[1].elements[0]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "directives" },
      last: {
        type: "ObjectExpression",
        elements: [],
      },
    });
    expect(ast.body[0].return.arguments[1].elements[1]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "on" },
      last: {
        type: "ObjectExpression",
        elements: [],
      },
    });
    expect(ast.body[0].return.arguments[1].elements[2]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "attrs" },
      last: {
        type: "ObjectExpression",
        elements: [
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "class" },
            last: { type: "StringLiteral", value: "container" },
          },
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "id" },
            last: { type: "StringLiteral", value: "app" },
          },
        ],
      },
    });
  });

  //复杂嵌套转换
  test("Should correctly transform complex nested HTML", () => {
    const template = parse("<div><h1>hello world</h1></div>");
    const ast: any = transform(template);
    const res = {
      type: "FunctionDeclaration",
      id: { type: "Identifier", name: "render" },
      body: [
        {
          type: "ReturnStatement",
          return: {
            type: "CallExpression",
            callee: { type: "Identifier", name: "_h" },
            arguments: [
              { type: "StringLiteral", value: "div" },
              {
                type: "ObjectExpression",
                elements: [],
              },
              {
                type: "ArrayExpression",
                elements: [
                  {
                    type: "CallExpression",
                    callee: { type: "Identifier", name: "_h" },
                    arguments: [
                      { type: "StringLiteral", value: "h1" },
                      {
                        type: "ObjectExpression",
                        elements: [],
                      },
                      {
                        type: "ArrayExpression",
                        elements: [
                          {
                            type: "CallExpression",
                            callee: { type: "Identifier", name: "_t" },
                            arguments: [
                              { type: "StringLiteral", value: "text" },
                              { type: "StringLiteral", value: "hello world" },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    };
    expect(ast).toEqual(res);
  });

  // 测试 z-model 指令的转换
  test("Should correctly transform directives", () => {
    const template = parse('<input z-model="name" class="app" />');
    const ast = transform(template) as any;

    expect(ast.body[0].return.arguments[0]).toEqual({
      type: "StringLiteral",
      value: "input",
    });

    // z-model 初步识别
    expect(ast.body[0].return.arguments[1].elements[0]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "directives" },
      last: {
        type: "ObjectExpression",
        elements: [
          {
            type: "KeyValuePair",
            first: {
              type: "StringLiteral",
              value: "z-model",
            },
            last: {
              type: "ExpressionLiteral",
              value: "name",
            },
          },
        ],
      },
    });

    // 绑定事件
    expect(ast.body[0].return.arguments[1].elements[1]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "on" },
      last: {
        type: "ObjectExpression",
        elements: [
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "input" },
            last: {
              type: "ExpressionLiteral",
              value:
                "($event) => { if($event.target.composing) return; name = $event.target.value }",
            },
          },
        ],
      },
    });

    // 绑定响应式数据
    expect(ast.body[0].return.arguments[1].elements[2]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "attrs" },
      last: {
        type: "ObjectExpression",
        elements: [
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "class" },
            last: { type: "StringLiteral", value: "app" },
          },
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "value" },
            last: { type: "ExpressionLiteral", value: "name" },
          },
        ],
      },
    });
  });

  // 测试 z-if 指令
  test("Should correctly transform z-if directive", () => {
    const template = parse('<div z-if="isShow">hello world</div>');
    const ast = transform(template) as any;

    // z-if 初步识别
    expect(ast.body[0].return.arguments[1].elements[0]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "directives" },
      last: {
        type: "ObjectExpression",
        elements: [
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "z-if" },
            last: { type: "ExpressionLiteral", value: "isShow" },
          },
        ],
      },
    });

    // 绑定响应式数据
    expect(ast.body[0].return.arguments[1].elements[2]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "attrs" },
      last: {
        type: "ObjectExpression",
        elements: [
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "_if_" },
            last: { type: "ExpressionLiteral", value: "isShow" },
          },
        ],
      },
    });
  });

  // 测试 z-show 指令
  test("Should correctly transform z-show directive", () => {
    const template = parse('<div z-show="!isHidden">hello world</div>');
    const ast = transform(template) as any;

    // z-show 初步识别
    expect(ast.body[0].return.arguments[1].elements[0]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "directives" },
      last: {
        type: "ObjectExpression",
        elements: [
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "z-show" },
            last: { type: "ExpressionLiteral", value: "!isHidden" },
          },
        ],
      },
    });

    // 绑定响应式数据
    expect(ast.body[0].return.arguments[1].elements[2]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "attrs" },
      last: {
        type: "ObjectExpression",
        elements: [
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "_show_" },
            last: { type: "ExpressionLiteral", value: "!isHidden" },
          },
        ],
      },
    });
  });

  // 测试 z-html 指令
  test("Should correctly transform z-html directive", () => {
    const template = parse('<div z-html="html"></div>');
    const ast = transform(template) as any;

    // z-html 初步识别
    expect(ast.body[0].return.arguments[1].elements[0]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "directives" },
      last: {
        type: "ObjectExpression",
        elements: [
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "z-html" },
            last: { type: "ExpressionLiteral", value: "html" },
          },
        ],
      },
    });

    // 绑定响应式数据
    expect(ast.body[0].return.arguments[1].elements[2]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "attrs" },
      last: {
        type: "ObjectExpression",
        elements: [
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "innerHTML" },
            last: { type: "ExpressionLiteral", value: "html" },
          },
        ],
      },
    });
  });

  // 测试 z-bind 指令
  test("Should correctly transform z-bind directive", () => {
    const template = parse('<div z-bind:style="myStyle" :class="customClass"></div>');
    const ast = transform(template) as any;

    // 不会对 z-bind 进行识别,已经在 parse 阶段处理
    expect(ast.body[0].return.arguments[1].elements[0]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "directives" },
      last: {
        type: "ObjectExpression",
        elements: [],
      },
    });

    // 绑定响应式数据
    expect(ast.body[0].return.arguments[1].elements[2]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "attrs" },
      last: {
        type: "ObjectExpression",
        elements: [
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "_style_" },
            last: { type: "ExpressionLiteral", value: "myStyle" },
          },
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "_class_" },
            last: { type: "ExpressionLiteral", value: "customClass" },
          },
        ],
      },
    });
  });

  // 测试事件绑定
  test("Should correctly transform event binding", () => {
    const template = parse('<div @click="handleClick"></div>');
    const ast = transform(template) as any;

    expect(ast.body[0].return.arguments[1].elements[1]).toEqual({
      type: "KeyValuePair",
      first: { type: "StringLiteral", value: "on" },
      last: {
        type: "ObjectExpression",
        elements: [
          {
            type: "KeyValuePair",
            first: { type: "StringLiteral", value: "click" },
            last: {
              type: "ExpressionLiteral",
              value:
                "(typeof handleClick === 'function') ? handleClick : () => { handleClick }",
            },
          },
        ],
      },
    });
  });
});
