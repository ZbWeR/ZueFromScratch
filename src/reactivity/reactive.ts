import { TriggerType } from "types/watchEffect.js";
import { track, trigger } from "../core/effect/watchEffect.js";

function handler<T extends object>(): ProxyHandler<T> {
  return {
    // 拦截读取
    get(target: T, key: PropertyKey, receiver: any) {
      // 代理对象可以通过 raw 访问原始数据
      if (key === "raw") return target;

      // 收集副作用函数
      track(target, key as keyof T);
      return Reflect.get(target, key, receiver);
    },

    // 拦截设置操作，修改/新增
    set(target: T, key: PropertyKey, newVal: any, receiver: any) {
      const oldVal = target[key as keyof T];

      // 判断是修改属性值还是添加新的属性
      const type = Object.prototype.hasOwnProperty.call(target, key)
        ? TriggerType.SET
        : TriggerType.ADD;
      // 设置属性值
      const res = Reflect.set(target, key, newVal, receiver);

      //  触发副作用函数
      //  屏蔽由原型引起的不必要更新
      if (receiver.raw === target) {
        // 新旧不同才更新，注意特别处理 NaN === NaN -> false
        if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
          trigger(target, key as keyof T, type);
        }
      }

      return res;
    },

    // 拦截删除属性操作：会影响 for...in 的执行
    deleteProperty(target: T, key: PropertyKey) {
      // 检查被删除的属性是否是对象自己的属性
      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      // 完成删除操作
      const res = Reflect.deleteProperty(target, key);
      if (res && hadKey) {
        trigger(target, key as keyof T, TriggerType.DELETE);
      }
      return res;
    },

    // 拦截 in 操作符
    has(target: T, key: PropertyKey) {
      track(target, key as keyof T);
      return Reflect.has(target, key);
    },

    // 拦截 for...in 操作
    ownKeys(target: T) {
      track(target, Symbol("iterateKey"));
      return Reflect.ownKeys(target);
    },
  };
}

// function createReactive() {}

/**
 * 创建一个响应式对象
 * @param data - 原始对象
 */
export function reactive<T extends object>(data: T): T {
  return new Proxy(data, handler());
}
