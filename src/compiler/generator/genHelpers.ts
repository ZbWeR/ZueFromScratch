import { ArgumentNode, PairNode } from "../../types/complier";
import {
  StringLiteral,
  ArrayExpression,
  CallExpression,
  FunctionDeclaration,
  ReturnStatementNode,
  GeneratorContext,
  JavascriptNode,
} from "types/complier";

/**
 * 根据节点类型生成对应的代码
 * @param node - 抽象语法树节点
 * @param context - 代码生成上下文 */
export function genNode(node: JavascriptNode, context: GeneratorContext) {
  switch (node.type) {
    case "FunctionDeclaration":
      genFunctionDecl(node as FunctionDeclaration, context);
      break;
    case "ReturnStatement":
      genReturnStatement(node as ReturnStatementNode, context);
      break;
    case "CallExpression":
      genCallExpression(node as CallExpression, context);
      break;
    case "StringLiteral":
      genStringLiteral(node as StringLiteral, context);
      break;
    case "ArrayExpression":
      genArrayExpression(node as ArrayExpression, context);
      break;
    case "ObjectExpression":
      genObjectExpression(node as ArgumentNode, context);
      break;
    case "ExpressionLiteral":
      genExpressionLiteral(node as ArgumentNode, context);
      break;
    case "KeyValuePair":
      genKeyValuePair(node as PairNode, context);
      break;
  }
}

/**
 * 生成一个完成的函数代码，通常用于生成渲染函数
 * @param node - 函数声明节点
 * @param context - 代码生成上下文
 */
function genFunctionDecl(node: FunctionDeclaration, context: GeneratorContext) {
  const { push, indent, deIndent } = context;
  // push(`function ${node.id.name}`);
  push("with(this)");
  push(` {`);
  indent();

  // 为函数体生成代码
  node.body.forEach((n) => genNode(n, context));

  deIndent();
  push(`}`);
}

/** 生成函数返回语句 */
function genReturnStatement(node: ReturnStatementNode, context: GeneratorContext) {
  const { push } = context;
  push(`return `);
  genNode(node.return, context);
}

/** 生成函数调用代码 */
function genCallExpression(node: CallExpression, context: GeneratorContext) {
  const { push } = context;
  const { callee, arguments: args } = node;
  push(`${callee.name}(`);
  genNodeList(args, context);
  push(`)`);
}

/** 生成参数列表 */
function genNodeList(nodes: JavascriptNode[], context: GeneratorContext) {
  const { push } = context;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    genNode(node, context);
    if (i !== nodes.length - 1) push(", ");
  }
}

/** 生成字符串字面量 */
function genStringLiteral(node: StringLiteral, context: GeneratorContext) {
  const { push } = context;

  // 去除换行符并转义单引号
  node.value = node.value.replace(/\n/g, "").replace(/'/g, "\\'");

  push(`'${node.value}'`);
}

/** 生成数组字面量 */
function genArrayExpression(node: ArrayExpression, context: GeneratorContext) {
  const { push } = context;

  push("[ ");
  genNodeList(node.elements, context);
  push(" ]");
}

/** 生成对象字面量 */
function genObjectExpression(node: ArgumentNode, context: GeneratorContext) {
  const { push } = context;

  push("{ ");
  genNodeList(node.elements!, context);
  push(" }");
}

/** 生成表达式字面量 */
function genExpressionLiteral(node: ArgumentNode, context: GeneratorContext) {
  const { push } = context;

  push(`(${node.value!})`);
}

/** 生成键值对 */
function genKeyValuePair(node: PairNode, context: GeneratorContext) {
  const { push } = context;

  genNode(node.first, context);
  push(":");
  genNode(node.last, context);
}
