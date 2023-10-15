type BooleanClassMap = { [key: string]: boolean };
type ClassName = string | BooleanClassMap | (string | BooleanClassMap)[];

/**
 * 将 className 标准化为一个类名字符串
 * @param className - 可以是字符串、布尔映射对象或者他们的数组)
 * @returns {string} 标准化后的类名字符串
 */
export function normalizeClass(className: ClassName): string {
  if (typeof className === "string") return className;

  if (Array.isArray(className))
    return className.map((item) => normalizeClass(item)).join(" ");

  return Object.entries(className)
    .filter(([_, value]) => value)
    .map(([key, _]) => key)
    .join(" ");
}
