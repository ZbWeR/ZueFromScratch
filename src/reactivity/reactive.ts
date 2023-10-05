import { track, trigger } from "../core/effect/watchEffect";

function handler(): ProxyHandler<any> {
  return {
    // 拦截读取
    get<T, K extends keyof T>(target: T, key: K) {
      // 收集副作用函数
      track(target, key);
      return target[key];
    },
    // 拦截设置
    set<T, K extends keyof T>(target: T, key: K, newVal: any) {
      target[key] = newVal;
      // 触发副作用函数
      trigger(target, key);
      return true;
    },
  };
}

/**
 * 创建一个响应式对象
 * @param data - 原始对象
 */
function reactive(data: object): object {
  return new Proxy(data, handler());
}
