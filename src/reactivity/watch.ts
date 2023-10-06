import { effect } from "../core/effect/watchEffect.js";
import { watchOptions, watchCallBackFunction } from "../types/reactivity";

/**
 * 深度遍历对象，绑定监听器到所有属性上
 * @param value - 当前对象或值
 * @param seen - 用于存储已遍历属性,防止无限循环
 * @returns 返回遍历对象
 */
function traverse(value: any, seen = new Set()) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  // TODO:数组等其他结构
  for (const key in value) {
    traverse(value[key], seen);
  }

  return value;
}
/**
 * 监听一个源数据，并在源数据发生变化时执行回调函数。
 * @param source - 要监听的源数据，可以是一个值也可以是一个 getter 函数
 * @param callBack - 回调函数
 * @param options - 配置选项
 */
export function watch<T>(
  source: T | (() => T),
  callBack: watchCallBackFunction,
  options: watchOptions = {}
) {
  let getter: () => T;

  if (typeof source === "function") getter = <() => T>source;
  else getter = () => traverse(source);

  // 利用 lazy 获取新值与旧值
  let oldValue: T, newValue: T;
  let cleanup: () => void | undefined;

  function onInvalidate(fn: () => any): void {
    // 将过期回调 fn 存储到 cleanup 中，它将在回调函数执行前调用
    cleanup = fn;
  }

  const job = () => {
    newValue = effectFn();
    // 在回调函数执行前，先调用过期回调
    if (cleanup) {
      cleanup();
    }
    callBack(newValue, oldValue, onInvalidate);
    // TODO:暂时使用浅拷贝
    oldValue = { ...newValue };
  };

  // 创建副作用函数，源数据变化时执行 scheduler
  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler: () => {
      // 根据 flush 选项决定何时执行 job
      if (options.flush === "post") {
        const p = Promise.resolve();
        p.then(job);
      } else {
        job();
      }
    },
  });

  // 立即执行
  if (options.immediate) {
    job();
  } else {
    // 手动调用拿到旧值，即第一次执行的值
    const result = effectFn();
    oldValue = typeof result === "object" ? { ...result } : result;
  }
}
