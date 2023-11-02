import { error } from "../../utils/debug";
import { transformDirectiveExpression } from "../directive/transformer";
import {
  ReturnStatementNode,
  FunctionDeclaration,
  TemplateRootNode,
} from "../../types/complier";
import {
  IdentifierNode,
  JavascriptNode,
  ArgumentNode,
  PairNode,
} from "../../types/complier";
import {
  TemplateNode,
  TransformContext,
  StringLiteral,
  ArrayExpression,
  CallExpression,
} from "types/complier";

/**
 * 创建 StringLiteral 类型的节点
 * @param value - 字符串字面量
 */
function createStringLiteral(value: string): StringLiteral {
  return {
    type: "StringLiteral",
    value,
  };
}

/**
 * 创建函数标识 IdentifierNode 类型的节点
 * @param name - 函数名称
 */
function createIdentifier(name: string): IdentifierNode {
  return {
    type: "Identifier",
    name,
  };
}

/**
 * 创建表达式数组 ArrayExpression 类型的节点
 * @param elements - jsAST 数组
 */
function createArrayExpression(elements: JavascriptNode[]): ArrayExpression {
  return {
    type: "ArrayExpression",
    elements,
  };
}

/**
 * 创建函数调用表达式节点
 * @param callee - 调用函数的名称
 * @param arg - 传入的参数
 */
function createCallExpression(callee: string, arg: JavascriptNode[]): CallExpression {
  return {
    type: "CallExpression",
    callee: createIdentifier(callee),
    arguments: arg,
  };
}

// ! 不知道是干啥的函数
function createExpressionLiteral(value: string): ArgumentNode {
  return {
    type: "ExpressionLiteral",
    value,
  };
}

/**
 * 创建键值对型JsAST
 * @param first 键
 * @param last 值
 */
function createPairNode(first: JavascriptNode, last: JavascriptNode): PairNode {
  return {
    type: "KeyValuePair",
    first,
    last,
  };
}

/**
 * 创建一个预构建的[key: string]: any型键值对JsAST
 * @param key - 属性名称
 * @param value - 属性值
 * @param type 值类型
 */
export function createKeyValueObjectNode(
  key: string,
  value: string | ArgumentNode,
  type: "Expression" | "StringLiteral"
): PairNode {
  const first: ArgumentNode = createStringLiteral(key);
  let last: ArgumentNode | null = null;

  // 若存在type，按type创建值ast对象
  if (typeof value === "string") {
    last =
      type === "StringLiteral"
        ? createStringLiteral(value)
        : createExpressionLiteral(value);
  } else {
    // 若value为已构建好的ast则直接传入
    last = value;
  }

  return createPairNode(first, last);
}

/**
 * 转换文本节点
 * @param node - 目标节点
 */
export function transformText(node: TemplateNode) {
  if (node.type !== "Text") return;

  node.jsNode = createCallExpression("_t", [
    createStringLiteral("text"),
    createStringLiteral(node.content),
  ]);
}

/**
 * 转换注释节点
 * @param node - 目标节点
 */
export function transformComment(node: TemplateNode) {
  if (node.type !== "Comment") return;
  node.jsNode = createCallExpression("_t", [
    createStringLiteral("comment"),
    createStringLiteral(node.content),
  ]);
}

/**
 * 转换插值节点
 * @param node - 目标节点
 */
export function transformInterpolation(node: TemplateNode) {
  if (node.type !== "Interpolation") return;

  // ? 探究一下在干啥
  const callExp = createCallExpression("_s", [
    createExpressionLiteral(node.content.content),
  ]);

  node.jsNode = createCallExpression("_t", [createStringLiteral("text"), callExp]);
}

/**
 * 转换标签节点
 * @param node - 目标节点
 */
export function transformElement(node: TemplateNode) {
  return () => {
    if (node.type !== "Element") return;

    // 1. 创建 h 函数调用语句，第一个参数为标签名称
    const callExp = createCallExpression("_h", [createStringLiteral(node.tag)]);

    // 2. 处理 h 函数调用的参数，即标签的属性
    if (node.props.length > 0) {
      // 分类依次转换属性
      const attrs: PairNode[] = [];
      const events: PairNode[] = [];
      const directives: PairNode[] = [];

      // 遍历属性并转换
      node.props.forEach((prop) => {
        if (prop.type === "Directive") {
          // 指令节点
          directives.push(
            createKeyValueObjectNode(prop.name, prop.exp!.content, "Expression")
          );
        } else if (prop.type === "Event") {
          // 事件

          // 判断是否为函数名？如果为函数名则直接使用，否则将其包装为函数
          const VARIABLE_NAME_VALIDATOR =
            /^([^\x00-\xff]|[a-zA-Z_$])([^\x00-\xff]|[a-zA-Z0-9_$])*$/i;
          const content = VARIABLE_NAME_VALIDATOR.test(prop.exp!.content)
            ? prop.exp!.content
            : "null";
          const isFunction = `(typeof ${content} === 'function')`;
          const functionWrapper = `() => { ${prop.exp!.content} }`;
          const result = `${isFunction} ? ${content} : ${functionWrapper}`;

          events.push(createKeyValueObjectNode(prop.name, result, "Expression"));
          // 事件
        } else if (prop.type === "ReactiveProp") {
          // 响应式数据
          attrs.push(
            createKeyValueObjectNode(prop.name, prop.exp!.content, "Expression")
          );
        } else {
          // 普通属性
          attrs.push(createKeyValueObjectNode(prop.name, prop.value!, "StringLiteral"));
        }
      });

      // 解析指令
      transformDirectiveExpression(node.props, {
        attrs,
        events,
        createKeyValueObjectNode,
      });

      // 将属性分类后的结果添加到 h 函数调用的参数中
      const elementDescriptor: ArgumentNode = {
        type: "ObjectExpression",
        elements: [
          {
            type: "KeyValuePair",
            first: createStringLiteral("directives"),
            last: {
              type: "ObjectExpression",
              elements: directives,
            } as ArgumentNode,
          } as PairNode,
          {
            type: "KeyValuePair",
            first: createStringLiteral("on"),
            last: {
              type: "ObjectExpression",
              elements: events,
            } as ArgumentNode,
          } as PairNode,
          {
            type: "KeyValuePair",
            first: createStringLiteral("attrs"),
            last: {
              type: "ObjectExpression",
              elements: attrs,
            } as ArgumentNode,
          } as PairNode,
        ],
      };
      callExp.arguments.push(elementDescriptor);
    } else {
      // 参数不存在
      // ? 能否修改为 ArrayExpression
      callExp.arguments.push({ type: "ObjectExpression", elements: [] } as ArgumentNode);
    }

    // 3. 第三个参数为全部子节点
    // ? c.jsNode 是否不为空
    callExp.arguments.push(createArrayExpression(node.children.map((c) => c.jsNode!)));

    node.jsNode = callExp;
  };
}

/** 转换 Root 节点 */
export function transformRoot(node: TemplateNode) {
  return () => {
    if (node.type !== "Root") return;
    // 暂不考虑多根子节点
    const vnodeJSAST = (node as TemplateRootNode).children[0].jsNode;

    // 错误处理
    if (!vnodeJSAST) {
      error("Root 节点的子节点 jsNode 转换出错", node);
      throw new Error();
    }

    node.jsNode = {
      type: "FunctionDeclaration",
      id: createIdentifier("render"),
      body: [
        {
          type: "ReturnStatement",
          return: vnodeJSAST,
        } as ReturnStatementNode,
      ],
    } as FunctionDeclaration;
  };
}
