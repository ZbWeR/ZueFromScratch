import { effect, track, trigger } from "../core/effect/watchEffect";

export function computed<T>(getter: () => T): { readonly value: T } {
  // 实现数据缓存
  let value: any;
  let dirty: boolean = true;

  const effectFn = effect(getter, {
    lazy: true,
    scheduler: () => {
      if (!dirty) {
        dirty = true;
        // 处理 effect 嵌套
        trigger(obj, "value");
      }
    },
  });

  const obj = {
    get value(): T {
      if (dirty) {
        value = effectFn();
        dirty = false;
      }
      // 处理 effect 嵌套
      track(obj, "value");
      return value;
    },
  };

  return obj;
}
