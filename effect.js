let activeEffect; // 存储当前激活的副作用函数
const effectStack = []; // effect 栈

/**
 * @typedef {Object} EffectFn
 * @property {Set[]} deps - 一个包含Set对象的数组
 */

/**
 * 创建副作用函数
 * @function
 * @param {Function} fn - 原始函数
 */
function effect(fn) {
  const effectFn = () => {
    // 【分支切换】:调用前删除原有依赖
    cleanup(effectFn);

    // 【副作用嵌套】：压栈与出栈
    activeEffect = effectFn;
    effectStack.push(effectFn);
    fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
  };

  // deps,用于存储所有与该副作用函数有关的依赖集合
  effectFn.deps = [];
  // 执行副作用函数
  effectFn();
}

/**
 * 清理函数，用于清除effectFn的所有依赖项，并重置依赖项数组的长度为0。
 * @function
 * @param {EffectFn} effectFn - 需要清理的函数对象
 */
function cleanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn);
  }
  effectFn.deps.length = 0;
}
