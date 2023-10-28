import {
  StringLiteral,
  ArrayExpression,
  CallExpression,
  FunctionDecl,
  ReturnStatement,
  GeneratorContext,
  ExpressionNode,
} from "types/complier";

/**
 * 根据节点类型生成对应的代码
 * @param node - 抽象语法树节点
 * @param context - 代码生成上下文 */
export function genNode(node: ExpressionNode, context: GeneratorContext) {
  console.log(node);
  switch (node.type) {
    case "FunctionDecl":
      genFunctionDecl(node, context);
      break;
    case "ReturnStatement":
      genReturnStatement(node, context);
      break;
    case "CallExpression":
      genCallExpression(node, context);
      break;
    case "StringLiteral":
      genStringLiteral(node, context);
      break;
    case "ArrayExpression":
      genArrayExpression(node, context);
      break;
  }
}

/** 生成一个节点列表 */
function genNodeList(nodes: ExpressionNode[], context: GeneratorContext) {
  const { push } = context;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    genNode(node, context);
    if (i !== nodes.length - 1) push(", ");
  }
}

/** 生成一个完整的函数代码 */
function genFunctionDecl(node: FunctionDecl, context: GeneratorContext) {
  const { push, indent, deIndent } = context;
  push(`function ${node.id.name}`);
  push(` (`);

  // 为函数的参数生成代码
  genNodeList(node.params, context);

  push(`)`);
  push(` {`);
  indent();

  // 为函数体生成代码
  node.body.forEach((n) => genNode(n, context));

  deIndent();
  push(`}`);
}

/** 生成数组表达式 */
function genArrayExpression(node: ArrayExpression, context: GeneratorContext) {
  const { push } = context;
  push("[");
  // 生成数组元素
  genNodeList(node.elements, context);
  push("]");
}

/** 生成字符串字面量 */
function genStringLiteral(node: StringLiteral, context: GeneratorContext) {
  const { push } = context;
  push(`'${node.value}'`);
}

/** 生成返回语句 */
function genReturnStatement(node: ReturnStatement, context: GeneratorContext) {
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
