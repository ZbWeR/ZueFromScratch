import { reactive } from "./reactive";
import { RefObj } from "types/reactivity";

/**
 * 创建一个可以代理原始值的响应式对象
 * @param val - 目标值
 */
export function ref<T>(val: T): RefObj<T> {
  const wrapper: RefObj<T> = {
    value: val,
  };
  // 区分 ref 与普通对象
  Object.defineProperty(wrapper, "__z_isRef", {
    value: true,
  });

  return reactive(wrapper);
}

/**
 * 创建一个基于响应式对象的能够保留响应式能力的属性
 * @param obj - 目标响应式对象
 * @param key - 目标键
 */
export function toRef<T, K extends keyof T>(obj: T, key: K): RefObj<any> {
  const wrapper: RefObj<any> = {
    get value() {
      return obj[key];
    },
    set value(val) {
      obj[key] = val;
    },
  };
  Object.defineProperty(wrapper, "__z_isRef", {
    value: true,
  });
  return wrapper;
}

/**
 * 创建一个响应式对象的引用，使其所有键都能够保持响应式能力。
 * @param obj - 目标响应式对象
 */
export function toRefs<T extends object>(obj: T): { [K in keyof T]: RefObj<T[K]> } {
  const ret: any = {};
  for (const key in obj) {
    ret[key] = toRef(obj, key);
  }
  return ret;
}

/**
 * 创建一个代理对象，实现自动脱 ref
 * @param target - 目标对象
 */
export function proxyRefs<T extends object>(target: T): any {
  return new Proxy(target, {
    // 如果是 ref 就返回 .value
    get(target: any, key: string | symbol, receiver: any): any {
      const value = Reflect.get(target, key, receiver);
      return value && value.__z_isRef ? value.value : value;
    },
    // 如果是 ref 就设置 .value
    set(target: any, key: string | symbol, newVal: any, receiver: any): boolean {
      const value = target[key];
      if (value && value.__z_isRef) {
        value.value = newVal;
        return true;
      }
      return Reflect.set(target, key, newVal, receiver);
    },
  });
}
