import {
  IS_RAWTEXT_HTML_TAG,
  HTML_START_TAG_NAME,
  HTML_END_TAG_NAME,
  HTML_PROP_NAME,
  HTML_PROP_VALUE_WITHOUT_QUOTE,
} from "./regexp";

import {
  ParseTextMode,
  ParserContext,
  TemplateNode,
  TemplateElementNode,
  ElementProp,
  TemplateTextNode,
  TemplateCommentNode,
  TemplateInterpolation,
} from "types/complier";

import { error } from "../../utils/debug";
import { decodeHTMLText } from "./decodeHTML";
import { selfClosingTags } from "./reference";
import { parseDirectives } from "../directive/parser";

/**
 * 解析器主函数,递归解析子节点
 * @param context - 解析器上下文
 * @param ancestors - 祖先节点栈
 */
export function parseChildren(context: ParserContext, ancestors: TemplateNode[]) {
  let nodes: TemplateNode[] = [];

  while (!isEnd(context, ancestors)) {
    let node: TemplateNode | null = null;
    if (context.mode === ParseTextMode.DATA || context.mode === ParseTextMode.RCDATA) {
      if (context.mode === ParseTextMode.DATA && context.source[0] === "<") {
        if (context.source[1] === "!") {
          if (context.source.startsWith("<!--")) {
            // 注释
            node = parseComment(context);
          } else if (context.source.startsWith("<![CDATA[")) {
            // !暂不支持CDATA
            // node = parseCDATA(context,ancestors);
            error("暂不支持CDATA", context.source);
          }
        } else if (context.source[1] === "/") {
          console.error("无效的结束标签");
          continue;
        } else if (/[a-z]/i.test(context.source[1])) {
          // 处理 HTML 元素
          node = parseElement(context, ancestors);
        }
      } else if (context.source.startsWith("{{")) {
        // 处理插值
        node = parseInterpolation(context);
      }
    }

    // node 不存在说明为其他两种模式, 一律当作文本处理
    if (!node) {
      node = parseText(context);
      if (node.content.trim().trimEnd() === "") continue;
    }
    nodes.push(node);
  }
  return nodes;
}

/**
 * 解析完整的 HTML 元素
 * @param context - 解析器上下文
 * @param ancestors - 祖先节点栈
 */
function parseElement(
  context: ParserContext,
  ancestors: TemplateNode[]
): TemplateElementNode {
  const { advanceSpaces } = context;

  // 1. 解析开始标签（此过程中会分析是否为自闭合标签）
  const element = parseTag(context);
  if (element.isSelfClosing) return element;

  // 根据标签名称切换到正确的文本模式
  if (element.tag === "textarea" || element.tag === "title") {
    context.mode = ParseTextMode.RCDATA;
  } else if (IS_RAWTEXT_HTML_TAG.test(element.tag)) {
    // 正则判断是否为纯文本标签
    context.mode = ParseTextMode.RAWTEXT;
  } else {
    context.mode = ParseTextMode.DATA;
  }

  // 2. 解析标签中的内容
  advanceSpaces();
  ancestors.push(element);
  element.children = parseChildren(context, ancestors);
  ancestors.pop();

  // 3. 解析结束标签
  if (context.source.startsWith(`</${element.tag}`)) {
    parseTag(context, "end");
  } else {
    console.error(`${element.tag} 标签缺少闭合标签`);
  }

  return element;
}

/**
 * 解析 HTML 标签
 * @param context - 解析器上下文
 * @param type - 指定要解析的标签类型。该参数可以是以下值之一：
 *   - "start"：表示开始标签。
 *   - "end"：表示结束标签。
 */
function parseTag(context: ParserContext, type = "start"): TemplateElementNode {
  const { advanceBy, advanceSpaces } = context;

  // 1. 根据标签类型,正则匹配标签名称
  const match =
    type === "start"
      ? HTML_START_TAG_NAME.exec(context.source)
      : HTML_END_TAG_NAME.exec(context.source);

  if (!match) {
    error("正则匹配标签名称出错", context.source);
    throw new Error();
  }

  const tagName = match[1];
  advanceBy(match[0].length);
  advanceSpaces();

  // 2. 解析标签中的 props
  const props = parseAttributes(context);
  advanceSpaces();

  // 3. 判断是否为自闭合标签
  const isSelfClosing = selfClosingTags.includes(tagName);
  advanceBy(isSelfClosing && context.source.startsWith("/>") ? 2 : 1);
  advanceSpaces();

  return {
    type: "Element",
    tag: tagName,
    props,
    isSelfClosing,
    children: [],
  };
}

/**
 * 解析标签属性
 * @param context - 解析器上下文
 */
function parseAttributes(context: ParserContext) {
  const { advanceBy, advanceSpaces } = context;
  const props: ElementProp[] = [];

  while (!context.source.startsWith(">") && !context.source.startsWith("/>")) {
    // 1. 正则获取属性名称
    const match = HTML_PROP_NAME.exec(context.source);
    if (!match) {
      console.error("属性名称匹配失败");
      break; // 如果没有匹配到属性名称，就跳出循环
    }
    const name = match[0];

    // 消费名称
    advanceBy(name.length);
    advanceSpaces();
    // !等号不一定存在... 例如 disabled 属性,暂不支持吧
    // 消费等号
    advanceBy(1);
    advanceSpaces();

    // 2. 获取属性值
    let value: string | undefined = "";
    const quote = context.source[0];
    const isQuoted = quote === '"' || quote === "'";

    if (isQuoted) {
      advanceBy(1); // 消费引号
      const endQuoteIndex = context.source.indexOf(quote);

      if (endQuoteIndex > -1) {
        value = context.source.slice(0, endQuoteIndex);
        advanceBy(value.length); // 消费属性值
        advanceBy(1); // 消费引号
      } else {
        // 缺少引号错误
        console.error("引号未成功闭合");
      }
    } else {
      // 属性值不被引号包裹
      const match = HTML_PROP_VALUE_WITHOUT_QUOTE.exec(context.source);
      value = match?.[0];
      advanceBy(value?.length || 0);
    }
    advanceSpaces();
    const prop = parseDirectives(name, value || "");

    props.push(prop);
  }

  return props;
}

/**
 * 解析纯文本
 * @param context - 解析器上下文
 */
function parseText(context: ParserContext): TemplateTextNode {
  const { advanceBy } = context;
  // 获取 文本插值 或 标签开始标志 或 CDATA模式结束标签 中较小的索引
  const endTokens = ["<", "{{"];
  let endIndex = context.source.length;
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i], 1);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }
  // 获取文本内容
  const rawText = context.source.slice(0, endIndex);
  advanceBy(rawText.length);

  // RCDATA 与 DATA 文本模式下需要对 HTML 实体进行解码
  const content =
    context.mode === ParseTextMode.DATA || context.mode === ParseTextMode.RCDATA
      ? decodeHTMLText(rawText)
      : rawText;

  // 解码 HTML 文本
  return {
    type: "Text",
    content,
  };
}

/**
 * 解析插值语法
 * @param context - 解析器上下文
 */
function parseInterpolation(context: ParserContext): TemplateInterpolation {
  const { advanceBy } = context;

  advanceBy("{{".length);
  const closeIndex = context.source.indexOf("}}");

  if (closeIndex < 0) {
    // 插值语法未正确闭合
    error("插值语法未正确闭合", context.source);
    throw new Error();
  }

  const content = context.source.slice(0, closeIndex);
  advanceBy(content.length);
  advanceBy("}}".length);

  return {
    type: "Interpolation",
    content: {
      type: "Expression",
      content: decodeHTMLText(content),
    },
  };
}

/**
 * 解析注释语法
 * @param context - 解析器上下文
 */
function parseComment(context: ParserContext): TemplateCommentNode {
  const { advanceBy } = context;

  advanceBy("<!--".length);
  const closeIndex = context.source.indexOf("-->");
  if (closeIndex < 0) {
    // 注释未正确闭合
    error("注释未正确闭合", context.source);
    throw new Error();
  }
  const content = context.source.slice(0, closeIndex);
  advanceBy(content.length);
  advanceBy("-->".length);

  return {
    type: "Comment",
    content: content,
  };
}

/**
 * 判断状态机是否停止.合适的停止时机如下：
 * - 模板内容解析完毕
 * - 遇到结束标签判断是否与祖先标签相同
 * @param context - 解析器上下文
 * @param ancestors - 祖先节点栈
 */
function isEnd(context: ParserContext, ancestors: TemplateNode[]) {
  if (!context.source) return true;

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (ancestor.type === "Element" && context.source.startsWith(`</${ancestor.tag}`))
      return true;
  }
  return false;
}
