import { JavascriptNode, GeneratorContext } from "types/complier";
import { genNode } from "./genHelpers";

/**
 * 生成代码的主函数
 * @param node - JavaScript AST
 * @returns 生成的代码字符串
 */
export function generate(node: JavascriptNode, __TEST__ = false) {
  // 初始化代码生成上下文
  const context: GeneratorContext = {
    code: "", // 生成的代码字符串
    currentIndent: 0, // 当前的缩进级别

    // 拼接代码
    push: (code) => (context.code += code),

    // 【开发环境中格式美化,测试环境不美化】
    // 添加新的一行，并根据当前缩进级别添加空格
    newline: () => {
      if (__DEV__ && !__TEST__) {
        context.code += "\n" + `  `.repeat(context.currentIndent);
      }
    },
    // 增加缩进级别，并添加新的一行
    indent: () => {
      if (__DEV__ && !__TEST__) {
        context.currentIndent++;
        context.newline();
      }
    },
    // 减少缩进级别，并添加新的一行
    deIndent: () => {
      if (__DEV__ && __TEST__) {
        context.currentIndent--;
        context.newline();
      }
    },
  };

  // 生成节点对应的代码
  genNode(node, context);
  return context.code;
}
