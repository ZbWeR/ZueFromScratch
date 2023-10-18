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

/**
 * 获取给定序列的最长递增子序列的下标数组
 * @param arr - 给定序列
 */
export function getLISIndex(arr: number[]) {
  // tails[i] 表示长度为 i 的最长递增子序列的尾部元素在原始序列中的【下标】
  let tails: number[] = [0];
  // prev[i] 最长递增子序列中 i 的前驱节点
  let prev: number[] = [];
  let n: number = arr.length;

  for (let i = 0, l: number, r: number, mid: number; i < n; i++) {
    if (arr[i] > arr[tails[tails.length - 1]]) {
      // 记录前驱节点
      prev[i] = tails[tails.length - 1];
      // 严格递增直接加入最长递增子序列
      tails.push(i);
      continue;
    }

    // 二分查找：第一个比当前值小的节点并替换
    (l = 0), (r = tails.length - 1);
    while (l <= r) {
      mid = Math.floor((l + r) / 2);
      // 如果 mid 比当前值还小，则说明 [mid+1,r] 中还可能存在比当前值小的
      if (arr[i] > arr[tails[mid]]) l = mid + 1;
      else r = mid - 1;
    }
    tails[l] = i;
    // 更新前驱节点： 当前下标的前驱为被替换节点的前一个
    if (l > 0) prev[i] = tails[l - 1];
  }

  // 根据前驱寻找最长递增子序列
  n = tails.length;
  let prevValue = tails[n - 1];
  while (n-- > 0) {
    tails[n] = prevValue;
    prevValue = prev[prevValue];
  }

  return tails;
}
// [3,5,6,2,5,4,19,5,6,7,12]
