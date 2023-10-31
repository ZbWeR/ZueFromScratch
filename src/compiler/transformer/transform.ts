import { TemplateNode, TransformContext } from "types/complier";
import {
  transformElement,
  transformText,
  transformRoot,
  transformComment,
  transformInterpolation,
} from "./nodeTransforms";

/**
 * 遍历给定的 AST，并使用提供的转换函数对每个节点进行转换。
 * @param ast - 当前待转换的 ast 节点
 * @param context - 转换上下文
 */
function traverseNode(ast: TemplateNode, context: TransformContext) {
  context.currentNode = ast;
  // 记录回调函数,以便在退出阶段调用
  const exitFns: Function[] = [];

  // 调用转换插件
  const transforms = context.nodeTransforms;
  for (const transform of transforms) {
    const onExit = transform(context.currentNode, context);

    if (onExit) exitFns.push(onExit);
    // 检查当前节点是否被移除
    if (!context.currentNode) return;
  }

  // 递归转换子节点
  if ("children" in context.currentNode) {
    const children = context.currentNode.children;
    if (children) {
      for (let i = 0; i < children.length; i++) {
        // 处理上下文信息
        context.parent = context.currentNode;
        context.childIndex = i;
        traverseNode(children[i], context);
      }
    }
  }

  // 退出阶段调用此前记录的回调函数
  // 逆序调用保证 A_in -> B_in -> B_out -> A_out 的顺序
  let i = exitFns.length;
  while (i--) exitFns[i]();
}
/**
 * 对给定的抽象语法树（AST）进行转换。
 * @param ast - 待转换的 AST。这是一个 TemplateNode 对象，表示 AST 的根节点。
 */
export function transform(ast: TemplateNode) {
  const context: TransformContext = {
    currentNode: null,
    parent: null,
    childIndex: -1,

    // 【转换插件】
    nodeTransforms: [
      transformElement,
      transformText,
      transformRoot,
      transformComment,
      transformInterpolation,
    ],
  };

  traverseNode(ast, context);

  return ast.jsNode;
}
