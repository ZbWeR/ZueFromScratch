// WeakMap 实例,用于存储副作用函数与代理目标的依赖关系.
const bucket = new WeakMap();

/**
 * 生成代理处理器
 * @function
 * @returns {Object} 一个包含get和set方法的对象
 */
function proxyHandler() {
  return {
    // 读取时进行依赖收集
    get(target, key) {
      track(target, key);
      return target[key];
    },
    // 设置时触发副作用函数
    set(target, key, newVal) {
      target[key] = newVal;
      trigger(target, key);
    },
  };
}

let activeEffect; // 通过副作用函数注册

/**
 * 依赖收集
 * @function
 * @param {Object} target - 被代理的对象
 * @param {string | symbol} key - 对象的属性名
 */
function track(target, key) {
  if (!activeEffect) return;
  let depsMap = bucket.get(target);
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  deps.add(activeEffect);
}

/**
 * 触发收集的副作用函数
 * @function
 * @param {Object} target - 被代理的对象
 * @param {String | Symbol} key - 对象的属性名
 */
function trigger(target, key) {
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const effects = depsMap.get(key);

  const effectsToRun = new set();
  effects &&
    effects.forEach((effectFn) => {
      // 【无限循环处理】形如obj.foo++导致的栈溢出
      if (effectFn !== activeEffect) effectsToRun.add(effectFn);
    });

  effectsToRun.forEach((effectFn) => effectFn());
}

/**
 * 使一个对象变为响应式
 * @function
 * @param {Object} obj - 需要变为响应式的对象
 */
function reactive(obj) {}
