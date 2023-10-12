import { reactive } from "./reactive";
import { Ref } from "types/reactivity";

export function ref(val: any): Ref {
  const wrapper = {
    value: val,
  };
  // 区分 ref 与普通对象
  Object.defineProperty(wrapper, "__z__isRef", {
    value: true,
  });
  return reactive(wrapper);
}

export function toRef<T, K extends keyof T>(obj: T, key: K): Ref {
  const wrapper = {
    get value() {
      return obj[key];
    },
    set value(value) {
      obj[key] = value;
    },
  };
  Object.defineProperty(wrapper, "__z__isRef", {
    value: true,
  });
  return wrapper;
}

export function toRefs<T extends object>(obj: T): { [K in keyof T]: Ref<T[K]> } {
  const ret: any = {};
  for (const key in obj) {
    ret[key] = ref(obj[key]);
  }
  return ret;
}

function proxyRefs(target: { [key: PropertyKey]: Ref<any> | any }) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      return value.__z__isRef ? value.value : value;
    },
    set(target, key, newVal, receiver) {
      const value = target[key];
      if (value.__z__isRef) {
        value.value = newVal;
        return true;
      }
      return Reflect.set(target, key, newVal, receiver);
    },
  });
}
