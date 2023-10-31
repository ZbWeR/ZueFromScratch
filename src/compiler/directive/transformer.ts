import { error } from "../../utils/debug";
import {
  ElementProp,
  TransformDirectiveContext,
  DirectiveTransformer,
} from "types/complier";

/**
 * 转换属性中的指令表达式
 * @param nodes - 当前节点的属性列表
 * @param context - 指令转换器上下文
 */
export function transformDirectiveExpression(
  props: ElementProp[],
  context: TransformDirectiveContext
) {
  props
    .filter((prop) => prop.type === "Directive")
    .forEach((directive) => {
      // 获取指令名称并调用对应的转换函数
      const directiveName = directive.name.slice(2);
      if (directiveName in directiveHandler) {
        directiveHandler[directiveName](directive, context);
      } else {
        error(`指令: ${directiveName} 错误或暂不支持`);
        throw new Error();
      }
    });
}

/**
 * 指令解析处理函数
 * - model: 双向绑定
 * - show: 显示隐藏
 * - if: 条件渲染
 * - html: HTML 渲染
 */
const directiveHandler: DirectiveTransformer = {
  // 双向绑定
  model: (directive: ElementProp, context: TransformDirectiveContext) => {
    const { createKeyValueObjectNode } = context;

    // 1. 创建 z-model 指令的属性节点
    context.attrs.push(
      createKeyValueObjectNode("value", directive.exp!.content, "Expression")
    );

    // 2. 创建 v-model 指令的事件节点
    const fn = `($event) => { if($event.target.composing) return; ${
      directive.exp!.content
    } = $event.target.value }`;
    context.events.push(createKeyValueObjectNode("input", fn, "Expression"));
  },

  // 显示隐藏
  show: (directive: ElementProp, context: TransformDirectiveContext) => {
    const { createKeyValueObjectNode } = context;
    context.attrs.push(
      createKeyValueObjectNode("_show_", directive.exp!.content, "Expression")
    );
  },

  // 条件渲染
  if: (directive: ElementProp, context: TransformDirectiveContext) => {
    const { createKeyValueObjectNode } = context;
    context.attrs.push(
      createKeyValueObjectNode("_if_", directive.exp!.content, "Expression")
    );
  },

  // HTML 渲染
  html: (directive: ElementProp, context: TransformDirectiveContext) => {
    const { createKeyValueObjectNode } = context;
    context.attrs.push(
      createKeyValueObjectNode("innerHTML", directive.exp!.content, "Expression")
    );
  },
};
