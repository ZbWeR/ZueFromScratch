import { TriggerType } from "types/watchEffect.js";
import { track, trigger } from "../core/effect/watchEffect";
import { warn, error } from "src/utils/debug";

function handler<T extends object>(
  isShadow: boolean = false, // 浅响应只有第一层为响应式
  isReadonly: boolean = false // 只读数据
): ProxyHandler<T> {
  return {
    // 拦截读取
    get(target: T, key: PropertyKey, receiver: any) {
      // 代理对象可以通过 raw 访问原始数据
      if (key === "raw") return target;

      // 收集副作用函数:只读属性不会触发副作用故不用收集
      if (!isReadonly) track(target, key as keyof T);
      // 处理深浅响应
      const res = Reflect.get(target, key, receiver);
      if (isShadow) return res;
      if (typeof res === "object" && res !== null) {
        return isReadonly ? readonly(res) : reactive(res);
      }
      return res;
    },

    // 拦截设置操作，修改/新增
    set(target: T, key: PropertyKey, newVal: any, receiver: any) {
      // 只读数据拦截设置操作
      if (isReadonly) {
        warn(`属性 ${String(key)} 是只读的`, target);
        return true;
      }

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
      // 只读数据拦截删除操作
      if (isReadonly) {
        warn(`属性 ${String(key)} 是只读的`, target);
        return true;
      }

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

/**
 * 创建响应式对象
 * @param data - 原始对象
 * @param isShadow - 浅层响应
 * @param isReadonly - 只读属性
 * @returns 原始值的代理对象
 */
function createReactive(
  data: any,
  isShadow: boolean = false,
  isReadonly: boolean = false
) {
  if (typeof data !== "object" || data === null) {
    error(`${data} must be an object`, "createReactive");
    return data;
  }
  return new Proxy(data, handler<any>(isShadow, isReadonly));
}

/**
 * 创建一个深层响应式对象
 * @param data - 原始对象
 * @returns 原值的响应式代理
 */
export function reactive(data: any) {
  return createReactive(data);
}

/**
 * 创建一个浅层响应式对象，避免深层次的转换行为
 * @param data - 原始对象
 * @returns 原值的浅层响应式代理
 */
export function shadowReactive(data: any) {
  return createReactive(data, true);
}

/**
 * 创建一个只读对象
 * @param data - 原始对象
 * @returns 原值的只读代理
 */
export function readonly(data: any) {
  return createReactive(data, false, true);
}

/**
 * 创建一个渐层只读对象
 * @param data - 原始对象
 * @returns 原值的浅层只读代理
 */
export function shadowReadonly(data: any) {
  return createReactive(data, true, true);
}
