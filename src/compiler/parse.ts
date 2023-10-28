import { ParserState, ASTNode, Token } from "types/complier";
import { isAlpha } from "../utils/general";

function tokenize(str: string) {
  let currentState = ParserState.initial;
  const chars: string[] = []; // 缓存字符
  const tokens: Token[] = [];

  while (str) {
    const char = str[0];
    switch (currentState) {
      case ParserState.initial:
        if (char === "<") {
          currentState = ParserState.tagOpen;
          str = str.slice(1);
        } else if (isAlpha(char)) {
          currentState = ParserState.text;
          chars.push(char);
          str = str.slice(1);
        }
        break;
      case ParserState.tagOpen:
        if (isAlpha(char)) {
          currentState = ParserState.tagName;
          chars.push(char);
          str = str.slice(1);
        } else if (char === "/") {
          currentState = ParserState.tagEnd;
          str = str.slice(1);
        }
        break;
      case ParserState.tagName:
        if (isAlpha(char)) {
          chars.push(char);
          str = str.slice(1);
        } else if (char === ">") {
          currentState = ParserState.initial;
          tokens.push({
            type: "tag",
            name: chars.join(""),
          });
          chars.length = 0;
          str = str.slice(1);
        }
        break;
      case ParserState.text:
        if (isAlpha(char)) {
          chars.push(char);
          str = str.slice(1);
        } else if (char === "<") {
          currentState = ParserState.tagOpen;
          tokens.push({
            type: "text",
            content: chars.join(""),
          });
          chars.length = 0;
          str = str.slice(1);
        }
        break;
      case ParserState.tagEnd:
        if (isAlpha(char)) {
          currentState = ParserState.tagEndName;
          chars.push(char);
          str = str.slice(1);
        }
        break;
      case ParserState.tagEndName:
        if (isAlpha(char)) {
          chars.push(char);
          str = str.slice(1);
        } else if (char === ">") {
          currentState = ParserState.initial;
          tokens.push({
            type: "tagEnd",
            name: chars.join(""),
          });
          chars.length = 0;
          str = str.slice(1);
        }
        break;
    }
  }

  return tokens;
}

/**
 * 由模板字符串构造模板 AST
 * @param str - 模板字符串
 */
export function parse(str: string) {
  const tokens = tokenize(str);
  const root: ASTNode = {
    type: "Root",
    children: [],
  };
  const elementStack: ASTNode[] = [root];

  while (tokens.length) {
    const parent = elementStack[elementStack.length - 1];
    const t = tokens[0];
    switch (t.type) {
      // 开始标签
      case "tag":
        const elementNode: ASTNode = {
          type: "Element",
          tag: t.name,
          children: [],
        };
        parent.children!.push(elementNode);
        elementStack.push(elementNode);
        break;
      // 文本内容
      case "text":
        const textNode: ASTNode = {
          type: "Text",
          content: t.content,
        };
        parent.children!.push(textNode);
        break;
      // 结束标签
      case "tagEnd":
        elementStack.pop();
        break;
    }
    tokens.shift();
  }

  return root;
}

export function dump(node: ASTNode, indent = 0) {
  const type = node.type;
  const desc = type === "Root" ? "" : type === "Element" ? node.tag : node.content;
  console.log(`${"-".repeat(indent)}${type}: ${desc}`);
  if (node.children) node.children.forEach((child) => dump(child, indent + 1));
}
