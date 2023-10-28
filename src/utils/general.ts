/** 判断是否为函数类型 */
export function isFunction(val: unknown): val is Function {
  return typeof val === "function";
}
/** 判断是否为字母 */
export function isAlpha(char: string) {
  return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");
}
