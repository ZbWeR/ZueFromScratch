/**
 * 模板解析状态机
 */
export enum ParserState {
  initial,
  tagOpen,
  tagName,
  text,
  tagEnd,
  tagEndName,
}

export interface Token {
  type: string;
  name?: string; // 标签名称
  content?: string; // 文字内容
}

export interface ASTNode {
  type: "Root" | "Element" | "Text";

  // type为Element时具有的属性
  tag?: string;
  children?: ASTNode[];
  // type为Text时具有的属性
  content?: string;

  // 模板AST转换后的JS AST
  jsNode?: ExpressionNode;
}

/** AST 转换上下文 */
export interface TransformContext {
  currentNode: ASTNode | null;
  childIndex: number;
  parent: ASTNode | null;
  nodeTransforms: Function[];

  // 相关方法
  replaceNode: (node: ASTNode) => void;
  removeNode: () => void;
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

/** 字符串字面量 */
export interface StringLiteral {
  type: "StringLiteral";
  value: string;
}

/** 函数标识 */
export interface Identifier {
  type: "Identifier";
  name: string;
}

/** 表达式组成的数组 */
export interface ArrayExpression {
  type: "ArrayExpression";
  elements: ExpressionNode[];
}

/** 函数调用表达式 */
export interface CallExpression {
  type: "CallExpression";
  /** 被调用函数的标识 */
  callee: Identifier;
  /** 参数 */
  arguments: ExpressionNode[];
}

/** 函数表达式 */
export interface FunctionDecl {
  type: "FunctionDecl";
  id: Identifier;
  params: ExpressionNode[];
  body: ExpressionNode[];
}

export interface ReturnStatement {
  type: "ReturnStatement";
  return: ExpressionNode;
}

/** 表达式节点 */
export type ExpressionNode =
  | StringLiteral
  | ArrayExpression
  | CallExpression
  | FunctionDecl
  | ReturnStatement;
