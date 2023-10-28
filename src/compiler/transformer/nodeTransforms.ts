import {
  ASTNode,
  TransformContext,
  StringLiteral,
  Identifier,
  ExpressionNode,
  ArrayExpression,
  CallExpression,
  FunctionDecl,
  ReturnStatement,
} from "types/complier";

/** 创建字符串字面量节点 */
function createStringLiteral(value: string): StringLiteral {
  return {
    type: "StringLiteral",
    value,
  };
}

/** 创建函数标识节点 */
function createIdentifier(name: string): Identifier {
  return {
    type: "Identifier",
    name,
  };
}

/** 创建表达式节点数组 */
function createArrayExpression(elements: ExpressionNode[]): ArrayExpression {
  return {
    type: "ArrayExpression",
    elements,
  };
}

/** 创建函数调用表达式节点 */
function createCallExpression(callee: string, arg: any[]): CallExpression {
  return {
    type: "CallExpression",
    callee: createIdentifier(callee),
    arguments: arg,
  };
}

/** 转换文本节点 */
export function transformText(node: ASTNode, context: TransformContext) {
  if (node.type !== "Text") return;
  node.jsNode = createStringLiteral(node.content!);
}

/** 转换标签节点 */
export function transformElement(node: ASTNode, context: TransformContext) {
  return () => {
    if (node.type !== "Element") return;
    // 1. 创建 h 函数调用语句，第一个参数为标签名称
    const callExp = createCallExpression("h", [createStringLiteral(node.tag!)]);
    // 2. 处理 h 函数调用的参数
    node.children?.length === 1
      ? callExp.arguments.push(node.children[0].jsNode!)
      : callExp.arguments.push(
          createArrayExpression(node.children!.map((c) => c.jsNode!))
        );

    node.jsNode = callExp;
  };
}

/** 转换 Root 节点 */
export function transformRoot(node: ASTNode, context: TransformContext) {
  return () => {
    if (node.type !== "Root") return;
    // 暂不考虑多根子节点
    const vnodeJSAST = node.children![0].jsNode;

    node.jsNode = {
      type: "FunctionDecl",
      id: createIdentifier("render"),
      params: [],
      body: [
        {
          type: "ReturnStatement",
          return: vnodeJSAST,
        } as ReturnStatement,
      ],
    } as FunctionDecl;
  };
}
