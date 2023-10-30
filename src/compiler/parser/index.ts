import { ParseTextMode, ParserContext, TemplateNode } from "types/complier";
import { parseChildren } from "./parser";
import { BLANK_CHARS } from "./regexp";

/**
 * 解析 HTML 模板字符串，将其转化为模板 AST
 * @param str - 模板字符串
 * @returns 模板 AST
 */
export function parse(str: string): TemplateNode {
  // 创建解析器上下文
  const context: ParserContext = {
    source: str,
    mode: ParseTextMode.DATA,

    advanceBy: (num) => (context.source = context.source.slice(num)),
    advanceSpaces: () => {
      const match = BLANK_CHARS.exec(context.source);
      match && context.advanceBy(match[0].length);
    },
  };

  // 清除两端空白
  context.advanceSpaces();
  context.source.trimEnd();

  const nodes = parseChildren(context, []);

  return {
    type: "Root",
    children: nodes,
  };
}
