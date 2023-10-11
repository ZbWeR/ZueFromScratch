import { DepsMap, EffectFunction, EffectOptions, TriggerType } from "types/watchEffect";
import { ArrayInstrumentations } from "types/reactivity";

// 当前激活的副作用函数
let activeEffect: EffectFunction | undefined;
// 副作用函数运行栈：处理嵌套
const effectStack: EffectFunction[] = [];
// 副作用函数桶：用于收集依赖
const effectBucket: WeakMap<any, DepsMap> = new WeakMap();
// 可迭代对象的 key 值
const iterateBucket: WeakMap<any, symbol> = new WeakMap();

/**
 * 收集依赖：在副作用函数与被操作的目标字段之间建立依赖联系。
 * @param target - 原始对象
 * @param key - 原始对象的键, k 可以为 symbol 类型是为了兼容 for...in... 操作
 */
export function track<T, K extends keyof T>(target: T, key: K | symbol) {
  // 修改数组长度的原型方法禁止追踪 length 属性避免栈溢出
  if (!activeEffect || !shouldTrack) return;
  // console.log("track", target, key);

  // 【for...in...】记录对象 target 的可迭代键，以便后续调用
  if (typeof key === "symbol") iterateBucket.set(target, key);

  // 收集 target.key 相关的副作用函数
  let depsMap = effectBucket.get(target);
  if (!depsMap) {
    effectBucket.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  deps.add(activeEffect);

  // 反向收集，以便后续清除
  activeEffect.deps.push(deps);
}

/**
 * 触发执行副作用函数
 * @param target - 原始对象
 * @param key - 原始对象的键
 * @param type - 触发事件的类型
 */
export function trigger<T, K extends keyof T>(
  target: T,
  key: K,
  type?: TriggerType,
  newVal?: any
) {
  const depsMap = effectBucket.get(target);
  if (!depsMap) return;
  const effects = depsMap.get(key);

  // 避免由于 effects 不断的增加/删除引起的无限递归。
  const effectToRun: Set<EffectFunction> = new Set();
  effects &&
    effects.forEach((fn) => {
      // 处理 obj.foo ++ 同时触发 trigger 与 track 导致的无限递归。
      if (fn !== activeEffect) {
        effectToRun.add(fn);
      }
    });

  //【数组】：当操作类型为增加元素时，应该触发与 length 相关的副作用
  if (Array.isArray(target) && type === TriggerType.ADD) {
    const lengthEffect = depsMap.get("length");
    lengthEffect &&
      lengthEffect.forEach((fn) => {
        if (fn !== activeEffect) effectToRun.add(fn);
      });
  }

  //【数组】：当 key 为 length 时，应该触发所有 index 大等于 newVal 的副作用
  if (Array.isArray(target) && key === "length") {
    depsMap.forEach((effects, index) => {
      if (Number(index) >= newVal) {
        effects.forEach((fn) => {
          if (fn !== activeEffect) effectToRun.add(fn);
        });
      }
    });
  }

  // 【for...in...】只有删除/增加属性的操作才会触发
  if (type === TriggerType.ADD || type === TriggerType.DELETE) {
    const iterateKey = iterateBucket.get(target);
    iterateKey &&
      depsMap.get(iterateKey)?.forEach((fn) => {
        if (fn !== activeEffect) effectToRun.add(fn);
      });
  }

  effectToRun.forEach((fn) => {
    if (fn.options?.scheduler) {
      fn.options.scheduler(fn);
    } else {
      fn();
    }
  });
}

/**
 * 注册副作用函数
 * @param fn - 原始函数
 */
export function effect(fn: Function, options: EffectOptions = {}): EffectFunction {
  const effectFn: EffectFunction = () => {
    activeEffect = effectFn;
    let lastShouldTrack = shouldTrack;
    shouldTrack = true;
    // 清除依赖，避免分支切换时遗留的副作用函数干扰运行
    cleanup(effectFn);

    // 处理副作用函数嵌套
    effectStack.push(effectFn);
    const res = fn();
    effectStack.pop();

    activeEffect = effectStack[effectStack.length - 1];
    shouldTrack = lastShouldTrack;
    return res;
  };
  effectFn.options = options;
  // 辅助清除依赖：存储所有与该副作用函数有关的依赖集合
  effectFn.deps = [];
  // 非 lazy 时立即执行
  if (!options.lazy) {
    effectFn();
  }
  return effectFn;
}

/**
 * 将副作用函数从相关依赖集合中清除
 * @param fn - 副作用函数
 */
function cleanup(fn: EffectFunction) {
  fn.deps.forEach((dep) => dep.delete(fn));
  fn.deps.length = 0;
}

export let shouldTrack = true;

// 重写数组方法
export const arrayInstrumentations: ArrayInstrumentations = {};

// 重写查找方法
["includes", "indexOf", "lastIndexOf"].forEach((method) => {
  const originMethod: Function = (Array.prototype as any)[method];
  arrayInstrumentations[method] = function (...args) {
    let res = originMethod.apply(this, args);
    if (res === false || res === -1) {
      res = originMethod.apply(this.raw, args);
    }
    return res;
  };
});

// 重写隐式修改数组长度的方法
["push", "pop", "shift", "unshift", "splice"].forEach((method) => {
  const originMethod: Function = (Array.prototype as any)[method];
  arrayInstrumentations[method] = function (...args) {
    shouldTrack = false;
    const res = originMethod.apply(this, args);
    shouldTrack = true;
    return res;
  };
});
