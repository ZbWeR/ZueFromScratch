import { isFunction } from "../utils/general";
import { ComponentOptions, Container } from "types/renderer";
import { ComponentInstance } from "../types/renderer";
import { warn } from "../utils/debug";
import { watch } from "../reactivity/watch";
import { computed } from "../reactivity/computed";

/**
 * 更新属性
 * @param el - 真实 DOM
 * @param key - 属性名称
 * @param prevValue - 旧的属性值
 * @param nextValue - 新的属性值
 */
export function patchProps(el: Container, key: string, prevValue: any, nextValue: any) {
  // 事件
  if (/^on/.test(key)) {
    const eventName = key.slice(2).toLowerCase();
    const invokers = el._invokers || (el._invokers = {});
    let invoker = invokers[key];

    if (nextValue) {
      if (!invoker) {
        // 不存在就伪造一个 invoker 并缓存到 el._invokers 中
        // 闭包的应用
        invoker = el._invokers[key] = (e) => {
          // 屏蔽触发时间早于绑定时间的事件
          if (e.timeStamp < invoker.attached!) return;
          // 同一类型的事件绑定多个处理函数
          if (Array.isArray(invoker.value)) {
            invoker.value.forEach((fn) => fn(e));
          } else {
            invoker!.value!(e);
          }
        };
        invoker.value = nextValue;
        invoker.attached = performance.now();
        el.addEventListener(eventName, invoker);
      } else {
        // 存在只需要更新 value 的值即可,无需移除再添加
        invoker.value = nextValue;
      }
    } else if (invoker) {
      // 新的事件绑定不存在，则移除绑定
      el.removeEventListener(eventName, invoker);
    }
  }

  // 对 class 进行特殊处理
  else if (key === "class") {
    const newName = normalizeClass(nextValue);
    el.className = el.className ? `${el.className} ${newName}` : newName;
  }

  // 动态 class 处理
  else if (key === "_class_") {
    const newName = normalizeClass(nextValue);
    el.className = el.className ? `${el.className} ${newName}` : newName;
  }

  // 动态 style 处理
  else if (key === "_style_") {
    if (Array.isArray(nextValue)) {
      nextValue.forEach((item) => {
        Object.assign(el.style, item);
      });
    } else if (typeof nextValue === "object") {
      Object.assign(el.style, nextValue);
    }
  }

  // 普通属性处理
  else if (shouldSetAsDOMProps(el, key)) {
    const type = typeof el[key as keyof HTMLElement];
    if (type === "boolean" && nextValue === "") (el as any)[key] = true;
    else (el as any)[key] = nextValue;
  } else {
    el.setAttribute(key, nextValue);
  }
}

/**
 * 判断某个属性能否以 DOM 的形式进行设置
 * @param el - 目标 DOM
 * @param key - 目标属性名称
 */
function shouldSetAsDOMProps(el: Container, key: string): boolean {
  // 处理【只读】类型的 DOM Property
  if (key === "form" && el.tagName === "INPUT") return false;
  return key in el;
}

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
 * Example: [3,5,6,2,5,4,19,5,6,7,12]
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

// 微型任务缓冲队列，使用 Set 实现自动去重
const queue: Set<Function> = new Set();
let isFlushing = false;
const p = Promise.resolve();

/**
 * 作为 effect 的调度函数，用于延迟执行副作用函数。
 * @param job - 待执行的函数
 */
export function queueJob(job: Function) {
  queue.add(job);
  if (!isFlushing) {
    isFlushing = true;
    p.then(() => {
      try {
        queue.forEach((job) => job());
      } finally {
        isFlushing = false;
        queue.clear();
      }
    });
  }
}

/**
 * 解析 props 数据
 * @param options - 组件选项对象中声明接收的 props
 * @param propsData - 为组件传递的 props
 */
export function resolveProps(
  options: Record<string, any> | undefined,
  propsData: Record<string, any> | undefined
) {
  options = options || {};
  propsData = propsData || {};

  const props: Record<string, any> = {};
  const attrs: Record<string, any> = {};

  for (const key in propsData) {
    // 事件属性都添加到 props 数据中
    if (key in options || key.startsWith("on")) {
      props[key] = propsData[key];
    } else {
      attrs[key] = propsData[key];
    }
  }

  return [props, attrs];
}

/**
 * 判断子组件的 props 是否需要更新
 * @param prevProps - 旧 props
 * @param nextProps - 新 props
 */
export function hasPropsChanged(
  prevProps: Record<string, any> | undefined,
  nextProps: Record<string, any> | undefined
) {
  prevProps = prevProps || {};
  nextProps = nextProps || {};

  const nextKeys = Object.keys(nextProps);
  if (nextKeys.length !== Object.keys(prevProps).length) return true;

  for (const key in nextKeys) {
    if (nextProps[key] !== prevProps[key]) return true;
  }
  return false;
}

/**
 * 处理选项式 API
 * @param instance - 组件实例
 */
export function resolveOptions(instance: ComponentInstance, options: ComponentOptions) {
  const { methods, computed: computedFns, watch: watchFns } = options;

  // 处理 methods 方法
  if (methods) {
    for (const key in methods) {
      const method = methods[key];
      if (isFunction(method)) {
        instance.state[key] = method.bind(instance.proxy);
      } else {
        warn(
          `Method "${key}" has type "${typeof method}" in the component definition. ` +
            `Did you reference the function correctly?`,
          "Components"
        );
      }
    }
  }

  // 处理计算属性
  if (computedFns) {
    for (const key in computedFns) {
      const fn = computedFns[key];
      if (isFunction(fn)) {
        // 将计算属性绑定到 instance.state 中

        const get = fn.bind(instance.proxy);
        const c = computed(get);
        Object.defineProperty(instance.state, key, {
          enumerable: true,
          configurable: true,
          get: () => c.value,
        });
      }
    }
  }

  // 处理 watch
  if (watchFns) {
    for (const key in watchFns) {
      const handler = watchFns[key];
      if (isFunction(handler)) {
        const isObject = typeof (instance.proxy as any)[key] === "object";
        const watchTarget = isObject
          ? (instance.proxy as any)[key]
          : () => (instance.proxy as any)[key];
        watch(watchTarget, handler.bind(instance.proxy));
      }
    }
  }
}
