import { Comment, Text, Fragment } from "../../../src/renderer/VNode";

export const nodesMap = {
  // 年轻人的第一次挂载
  firstVnode: {
    type: "div",
    children: [
      { type: "p", children: "喵喵喵" },
      { type: "i", children: "Yes" },
      { type: "div", children: "No" },
    ],
  },
  // 带有属性与 class 的挂载与更新
  withProps: {
    oldNodes: {
      type: "div",
      children: [
        {
          type: "button",
          children: "禁用按钮",
          props: {
            disabled: "",
            id: "btn",
          },
        },
        { type: "p", children: "喵喵喵", props: { class: "foo bar" } },
      ],
    },
    newNodes: {
      type: "div",
      props: { class: { foo: true, bar: false } },
      children: [
        { type: "p", children: "汪汪汪", props: { class: ["foo", { bar: true }] } },
        { type: "input", props: { form: "form1" } },
      ],
    },
  },
  // 事件绑定
  withEvent: {
    oldNodes: {
      type: "p",
      props: {
        onClick: () => console.log("only one clickFunction"),
        oncontextmenu: () => console.log("contextmenu"),
      },
      children: "text",
    },
    newNodes: {
      type: "p",
      props: {
        onClick: [() => console.log("clicked 1"), () => console.log("clicked 2")],
      },
      children: "喵喵喵",
    },
  },

  // 文本节点与注释节点
  textAndComment: {
    oldNodes: {
      type: "div",
      children: [
        { type: Text, children: "文本" },
        { type: Comment, children: "注释" },
        { type: "p", children: "段落" },
      ],
    },
    newNodes: {
      type: "div",
      children: [{ type: Text, children: "喵喵喵" }],
    },
  },
  // Fragment
  fragment: {
    oldNodes: {
      type: Fragment,
      children: [{ type: Text, children: "喵喵喵" }],
    },
    newNodes: {
      type: Fragment,
      children: [
        { type: "li", children: "1" },
        { type: "li", children: "2" },
        { type: "li", children: "3" },
      ],
    },
  },

  // 新增元素
  add: {
    oldNodes: {
      type: "root",
      children: [
        { type: "p", key: 1, children: "1" },
        { type: "p", key: 2, children: "2" },
        { type: "p", key: 3, children: "3" },
      ],
    },
    newNodes: {
      type: "root",
      children: [
        { type: "p", key: 1, children: "1" },
        { type: "p", key: 4, children: "4" },
        { type: "p", key: 5, children: "5" },
        { type: "p", key: 2, children: "2" },
        { type: "p", key: 3, children: "3" },
      ],
    },
  },
  remove: {
    oldNodes: {
      type: "root",
      children: [
        { type: "p", key: 1, children: "1" },
        { type: "p", key: 2, children: "2" },
        { type: "p", key: 3, children: "3" },
        { type: "p", key: 4, children: "4" },
      ],
    },
    newNodes: {
      type: "root",
      children: [
        { type: "p", key: 1, children: "1" },
        { type: "p", key: 4, children: "4" },
      ],
    },
  },
  normal: {
    oldNodes: {
      type: "root",
      children: [
        { type: "p", key: 1, children: "1" },
        { type: "p", key: 2, children: "2" },
        { type: "p", key: 3, children: "3" },
        { type: "p", key: 4, children: "4" },
        { type: "p", key: 6, children: "6" },
        { type: "p", key: 5, children: "5" },
      ],
    },
    newNodes: {
      type: "root",
      children: [
        { type: "p", key: 1, children: "1" },
        { type: "p", key: 3, children: "3" },
        { type: "p", key: 4, children: "4" },
        { type: "p", key: 2, children: "2" },
        { type: "p", key: 7, children: "7" },
        { type: "p", key: 5, children: "5" },
      ],
    },
  },

  edge: {
    oldNodes: {
      type: "root",
      children: [
        { type: "p", key: 1, children: "1" },
        { type: "p", key: 2, children: "2" },
        { type: "p", key: 3, children: "3" },
        { type: "p", key: 4, children: "4" },
        { type: "p", key: 6, children: "6" },
        { type: "p", key: 7, children: "7" },
        { type: "p", key: 5, children: "5" },
      ],
    },
    newNodes: {
      type: "root",
      children: [
        { type: "p", key: 1, children: "1" },
        { type: "p", key: 3, children: "3" },
        { type: "p", key: 4, children: "4" },
        { type: "p", key: 5, children: "5" },
      ],
    },
  },

  // 新子节点为数组，旧子节点为文本，以及反过来
  oldChildIsText: {
    oldNodes: {
      type: "div",
      children: "喵喵喵",
    },
    newNodes: {
      type: "div",
      children: [
        { type: "p", children: "喵喵喵" },
        { type: "p", children: "汪汪汪" },
      ],
    },
  },
  // 新的子节点为空
  newIsEmpty: {
    oldNodes: {
      type: "div",
      children: [
        { type: "h1", children: "列表" },
        {
          type: "ul",
          children: [
            { type: "li", children: "1" },
            { type: "li", children: "2" },
          ],
        },
      ],
    },
    newNodes: {
      type: "div",
      children: [
        { type: "h1", children: null },
        { type: "ul", children: null },
      ],
    },
  },
};
