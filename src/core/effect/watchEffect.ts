import { DepsMap, EffectFunction } from "../../types/watchEffect";

// 当前激活的副作用函数
let activeEffect: EffectFunction | undefined;
// 副作用函数运行栈：处理嵌套
const effectStack: EffectFunction[] = [];
// 副作用函数桶：用于收集依赖
const effectBucket: WeakMap<any, DepsMap> = new WeakMap();

/**
 * 收集依赖：在副作用函数与被操作的目标字段之间建立依赖联系。
 * @param target - 原始对象
 * @param key - 原始对象的键
 */
export function track<T, K extends keyof T>(target: T, key: K) {
  if (!activeEffect) return;
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
 */
export function trigger<T, K extends keyof T>(target: T, key: K) {
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
  effectToRun.forEach((fn) => fn());
}

/**
 * 注册副作用函数
 * @param fn - 原始函数
 */
export function effect(fn: Function): EffectFunction {
  const effectFn: EffectFunction = () => {
    // 清除依赖，避免分支切换时遗留的副作用函数干扰运行
    cleanup(effectFn);
    activeEffect = effectFn;
    // 处理副作用函数嵌套
    effectStack.push(effectFn);
    fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
  };
  // 辅助清除依赖：存储所有与该副作用函数有关的依赖集合
  effectFn.deps = [];
  effectFn();
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
