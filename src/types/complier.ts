/**
 * 解析器状态
 * - `DATA`: 标签与 HTML 实体
 * - `RCDATA`: HTML 实体
 * - `RAWTEXT` | `CDATA`: 纯文本
 */
export enum ParseTextMode {
  DATA,
  RCDATA,
  RAWTEXT,
  CDATA,
}

/** 模板解析上下文 */
export interface ParserContext {
  source: string;
  mode: ParseTextMode;

  // 相关方法
  advanceBy: (num: number) => void;
  advanceSpaces: () => void;
}

/** 基础模板 AST 节点 */
export interface BaseTemplateNode {
  type: string;

  // jsNode 属性
  jsNode?: JavascriptNode;
}

/** 模板 AST 文本节点 */
export interface TemplateTextNode extends BaseTemplateNode {
  type: "Text";
  content: string;
}

/** 模板 AST 注释节点 */
export interface TemplateCommentNode extends BaseTemplateNode {
  type: "Comment";
  content: string;
}

/** 模板 AST HTML 标签节点 */
export interface TemplateElementNode extends BaseTemplateNode {
  type: "Element";

  // 标签名称
  tag: string;
  // 属性
  props: ElementProp[];
  // 是否为自闭合标签
  isSelfClosing: boolean;
  // 子节点
  children: TemplateNode[];
}

/** HTML 标签节点的属性 */
export interface ElementProp extends BaseTemplateNode {
  type: "Attribute" | "Directive" | "Event" | "ReactiveProp";
  name: string;

  // 属性值
  value?: string;
  // 指令表达式
  exp?: TemplateExpression;
}

/** 模板 AST 插值节点 */
export interface TemplateInterpolation extends BaseTemplateNode {
  type: "Interpolation";
  content: TemplateExpression;
}

/** 模板 AST 表达式节点 */
export interface TemplateExpression extends BaseTemplateNode {
  type: "Expression";
  content: string;
}

/** 模板 AST 根节点 */
export interface TemplateRootNode extends BaseTemplateNode {
  type: "Root";
  children: TemplateNode[];
}

// 模板 AST 节点
export type TemplateNode =
  | TemplateTextNode
  | TemplateElementNode
  | TemplateRootNode
  | TemplateInterpolation
  | TemplateExpression
  | TemplateCommentNode;

/** AST 转换上下文 */
export interface TransformContext {
  currentNode: TemplateNode | null;
  childIndex: number;
  parent: TemplateNode | null;
  nodeTransforms: Function[];
}

// js 抽象语法树
export interface JavascriptNode {
  type:
    | "FunctionDeclaration"
    | "CallExpression"
    | "StringLiteral"
    | "ArrayExpression"
    | "ExpressionLiteral"
    | "Identifier"
    | "ElementDescriptor"
    | "ReturnStatement"
    | "KeyValuePair"
    | "ObjectExpression";
}

export interface FunctionDeclaration extends JavascriptNode {
  type: "FunctionDeclaration";
  id: IdentifierNode;
  body: JavascriptNode[];
}

export interface IdentifierNode extends JavascriptNode {
  type: "Identifier";
  name: string;
}

export interface CallExpression extends JavascriptNode {
  type: "CallExpression";
  callee: IdentifierNode;
  arguments: JavascriptNode[];
}

export interface StringLiteral extends JavascriptNode {
  type: "StringLiteral";
  value: string;
}

export interface ArrayExpression extends JavascriptNode {
  type: "ArrayExpression";
  elements: JavascriptNode[];
}

export interface ReturnStatementNode extends JavascriptNode {
  type: "ReturnStatement";
  return: JavascriptNode;
}

export interface PairNode extends JavascriptNode {
  type: "KeyValuePair";
  first: JavascriptNode;
  last: JavascriptNode;
}

export interface ArgumentNode extends JavascriptNode {
  type: "StringLiteral" | "ArrayExpression" | "ExpressionLiteral" | "ObjectExpression";
  value?: string | TemplateExpression;
  elements?: JavascriptNode[];
}

export interface TransformDirectiveContext {
  attrs: PairNode[];
  events: PairNode[];

  createKeyValueObjectNode: (
    key: string,
    value: string | ArgumentNode,
    type: "Expression" | "StringLiteral"
  ) => PairNode;
}

type DirectiveHandler = (
  directive: ElementProp,
  context: TransformDirectiveContext
) => void;
export interface DirectiveTransformer {
  model: DirectiveHandler;
  show: DirectiveHandler;
  if: DirectiveHandler;
  html: DirectiveHandler;
  [key: string]: DirectiveHandler;
}

/** AST 生成器上下文 */
export interface GeneratorContext {
  /** 存放最终生成的渲染函数代码 */
  code: string;
  /** 缩进级别,缩进长度为 2  */
  currentIndent: number;

  // 相关方法
  push: (code: string) => void;
  newline: () => void;
  indent: () => void;
  deIndent: () => void;
}
