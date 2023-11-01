import { parse } from "./parser/index";
import { transform } from "./transformer/transform";
import { generate } from "./generator/generate";
import { JavascriptNode } from "../types/complier";

export function compile(source: string, instance: any) {
  const template = parse(source);
  const ast = transform(template) as JavascriptNode;
  const code = generate(ast);

  return createFunction(code, instance);
}

function createFunction(code: string, instance: any) {
  try {
    return new Function(code);
  } catch (e) {
    console.error(e);
  }
}
