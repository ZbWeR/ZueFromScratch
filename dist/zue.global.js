var zue = (function (exports) {
  'use strict';

  var TriggerType;
  (function (TriggerType) {
      TriggerType["SET"] = "SET";
      TriggerType["ADD"] = "ADD";
      TriggerType["DELETE"] = "DELETE";
  })(TriggerType || (TriggerType = {}));

  // 当前激活的副作用函数
  let activeEffect;
  // 副作用函数运行栈：处理嵌套
  const effectStack = [];
  // 副作用函数桶：用于收集依赖
  const effectBucket = new WeakMap();
  // 可迭代对象的 key 值
  const iterateBucket = new WeakMap();
  /**
   * 收集依赖：在副作用函数与被操作的目标字段之间建立依赖联系。
   * @param target - 原始对象
   * @param key - 原始对象的键, k 可以为 symbol 类型是为了兼容 for...in... 操作
   */
  function track(target, key) {
      // 修改数组长度的原型方法禁止追踪 length 属性避免栈溢出
      if (!activeEffect || !exports.shouldTrack)
          return;
      // console.log("track", target, key);
      // 【for...in...】记录对象 target 的可迭代键，以便后续调用
      if (typeof key === "symbol")
          iterateBucket.set(target, key);
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
  function trigger(target, key, type, newVal) {
      var _a;
      const depsMap = effectBucket.get(target);
      if (!depsMap)
          return;
      const effects = depsMap.get(key);
      // 避免由于 effects 不断的增加/删除引起的无限递归。
      const effectToRun = new Set();
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
                  if (fn !== activeEffect)
                      effectToRun.add(fn);
              });
      }
      //【数组】：当 key 为 length 时，应该触发所有 index 大等于 newVal 的副作用
      if (Array.isArray(target) && key === "length") {
          depsMap.forEach((effects, index) => {
              if (Number(index) >= newVal) {
                  effects.forEach((fn) => {
                      if (fn !== activeEffect)
                          effectToRun.add(fn);
                  });
              }
          });
      }
      // 【for...in...】只有删除/增加属性的操作才会触发
      if (type === TriggerType.ADD || type === TriggerType.DELETE) {
          const iterateKey = iterateBucket.get(target);
          iterateKey &&
              ((_a = depsMap.get(iterateKey)) === null || _a === void 0 ? void 0 : _a.forEach((fn) => {
                  if (fn !== activeEffect)
                      effectToRun.add(fn);
              }));
      }
      effectToRun.forEach((fn) => {
          var _a;
          if ((_a = fn.options) === null || _a === void 0 ? void 0 : _a.scheduler) {
              fn.options.scheduler(fn);
          }
          else {
              fn();
          }
      });
  }
  /**
   * 注册副作用函数
   * @param fn - 原始函数
   */
  function effect(fn, options = {}) {
      const effectFn = () => {
          activeEffect = effectFn;
          let lastShouldTrack = exports.shouldTrack;
          exports.shouldTrack = true;
          // 清除依赖，避免分支切换时遗留的副作用函数干扰运行
          cleanup(effectFn);
          // 处理副作用函数嵌套
          effectStack.push(effectFn);
          const res = fn();
          effectStack.pop();
          activeEffect = effectStack[effectStack.length - 1];
          exports.shouldTrack = lastShouldTrack;
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
  function cleanup(fn) {
      fn.deps.forEach((dep) => dep.delete(fn));
      fn.deps.length = 0;
  }
  exports.shouldTrack = true;
  // 重写数组方法
  const arrayInstrumentations = {};
  // 重写查找方法
  ["includes", "indexOf", "lastIndexOf"].forEach((method) => {
      const originMethod = Array.prototype[method];
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
      const originMethod = Array.prototype[method];
      arrayInstrumentations[method] = function (...args) {
          exports.shouldTrack = false;
          const res = originMethod.apply(this, args);
          exports.shouldTrack = true;
          return res;
      };
  });

  function warn(message, source) {
      {
          console.warn(`[Zue-warn]: at ${source} \n ${message}`);
      }
  }
  function error(message, source) {
      {
          console.error(`[Zue-error]: at ${source} \n ${message}`);
      }
  }

  function handler(isShallow = false, // 浅响应只有第一层为响应式
  isReadonly = false // 只读数据
  ) {
      return {
          // 拦截读取
          get(target, key, receiver) {
              // console.log("get: ", key);
              // 代理对象可以通过 raw 访问原始数据
              if (key === "raw")
                  return target;
              // 拦截数组查找方法
              if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
                  return Reflect.get(arrayInstrumentations, key, receiver);
              }
              // 收集副作用函数:只读属性不会触发副作用故不用收集
              if (!isReadonly && typeof key !== "symbol")
                  track(target, key);
              // 处理深浅响应
              const res = Reflect.get(target, key, receiver);
              if (isShallow)
                  return res;
              if (typeof res === "object" && res !== null) {
                  return isReadonly ? readonly(res) : reactive(res);
              }
              return res;
          },
          // 拦截设置操作，修改/新增
          set(target, key, newVal, receiver) {
              // console.log("set", target, key, newVal);
              // 只读数据拦截设置操作
              if (isReadonly) {
                  warn(`属性 ${String(key)} 是只读的`, target);
                  return true;
              }
              const oldVal = target[key];
              // 判断是修改属性值还是添加新的属性
              const type = Array.isArray(target)
                  ? // 对于数组来说，索引大等于长度则为增加操作
                      Number(key) >= target.length
                          ? TriggerType.ADD
                          : TriggerType.SET
                  : // 对于普通对象来说，不存在该属性则为增加操作
                      Object.prototype.hasOwnProperty.call(target, key)
                          ? TriggerType.SET
                          : TriggerType.ADD;
              // 设置属性值
              const res = Reflect.set(target, key, newVal, receiver);
              //  触发副作用函数
              //  屏蔽由原型引起的不必要更新
              if (receiver.raw === target) {
                  // 新旧不同才更新，注意特别处理 NaN === NaN -> false
                  if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
                      // 第四个参数：【数组】通过length影响数组元素
                      trigger(target, key, type, newVal);
                  }
              }
              return res;
          },
          // 拦截删除属性操作：会影响 for...in 的执行
          deleteProperty(target, key) {
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
                  trigger(target, key, TriggerType.DELETE);
              }
              return res;
          },
          // 拦截 in 操作符
          has(target, key) {
              track(target, key);
              return Reflect.has(target, key);
          },
          // 拦截 for...in 操作
          ownKeys(target) {
              track(target, Array.isArray(target) ? "length" : Symbol("iterateKey"));
              return Reflect.ownKeys(target);
          },
      };
  }
  /**
   * 创建响应式对象
   * @param data - 原始对象
   * @param isShallow - 浅层响应
   * @param isReadonly - 只读属性
   * @returns 原始值的代理对象
   */
  function createReactive(data, isShallow = false, isReadonly = false) {
      if (typeof data !== "object" || data === null) {
          error(`${data} must be an object`, "createReactive");
          return data;
      }
      return new Proxy(data, handler(isShallow, isReadonly));
  }
  /**
   * 创建一个深层响应式对象
   * @param data - 原始对象
   * @returns 原值的响应式代理
   */
  const reactiveMap = new Map();
  function reactive(data) {
      const existingProxy = reactiveMap.get(data);
      if (existingProxy)
          return existingProxy;
      const proxy = createReactive(data);
      reactiveMap.set(data, proxy);
      return proxy;
  }
  /**
   * 创建一个浅层响应式对象，避免深层次的转换行为
   * @param data - 原始对象
   * @returns 原值的浅层响应式代理
   */
  function shallowReactive(data) {
      return createReactive(data, true);
  }
  /**
   * 创建一个只读对象
   * @param data - 原始对象
   * @returns 原值的只读代理
   */
  function readonly(data) {
      return createReactive(data, false, true);
  }
  /**
   * 创建一个渐层只读对象
   * @param data - 原始对象
   * @returns 原值的浅层只读代理
   */
  function shallowReadonly(data) {
      return createReactive(data, true, true);
  }

  function computed(getter) {
      // 实现数据缓存
      let value;
      let dirty = true;
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
          get value() {
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

  /**
   * 深度遍历对象，绑定监听器到所有属性上
   * @param value - 当前对象或值
   * @param seen - 用于存储已遍历属性,防止无限循环
   * @returns 返回遍历对象
   */
  function traverse(value, seen = new Set()) {
      if (typeof value !== "object" || value === null || seen.has(value))
          return;
      seen.add(value);
      // TODO:数组等其他结构
      for (const key in value) {
          traverse(value[key], seen);
      }
      return value;
  }
  /**
   * 监听一个源数据，并在源数据发生变化时执行回调函数。
   * @param source - 要监听的源数据，可以是一个值也可以是一个 getter 函数
   * @param callBack - 回调函数
   * @param options - 配置选项
   */
  function watch(source, callBack, options = {}) {
      let getter;
      if (typeof source === "function")
          getter = source;
      else
          getter = () => traverse(source);
      // 利用 lazy 获取新值与旧值
      let oldValue, newValue;
      let cleanup;
      function onInvalidate(fn) {
          // 将过期回调 fn 存储到 cleanup 中，它将在回调函数执行前调用
          cleanup = fn;
      }
      const job = () => {
          newValue = effectFn();
          // 在回调函数执行前，先调用过期回调
          if (cleanup) {
              cleanup();
          }
          callBack(newValue, oldValue, onInvalidate);
          // TODO:暂时使用浅拷贝
          oldValue = Object.assign({}, newValue);
      };
      // 创建副作用函数，源数据变化时执行 scheduler
      const effectFn = effect(() => getter(), {
          lazy: true,
          scheduler: () => {
              // 根据 flush 选项决定何时执行 job
              if (options.flush === "post") {
                  const p = Promise.resolve();
                  p.then(job);
              }
              else {
                  job();
              }
          },
      });
      // 立即执行
      if (options.immediate) {
          job();
      }
      else {
          // 手动调用拿到旧值，即第一次执行的值
          const result = effectFn();
          oldValue = typeof result === "object" ? Object.assign({}, result) : result;
      }
  }

  /**
   * 创建一个可以代理原始值的响应式对象
   * @param val - 目标值
   */
  function ref(val) {
      const wrapper = {
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
  function toRef(obj, key) {
      const wrapper = {
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
  function toRefs(obj) {
      const ret = {};
      for (const key in obj) {
          ret[key] = toRef(obj, key);
      }
      return ret;
  }
  /**
   * 创建一个代理对象，实现自动脱 ref
   * @param target - 目标对象
   */
  function proxyRefs(target) {
      return new Proxy(target, {
          // 如果是 ref 就返回 .value
          get(target, key, receiver) {
              const value = Reflect.get(target, key, receiver);
              return value && value.__z_isRef ? value.value : value;
          },
          // 如果是 ref 就设置 .value
          set(target, key, newVal, receiver) {
              const value = target[key];
              if (value && value.__z_isRef) {
                  value.value = newVal;
                  return true;
              }
              return Reflect.set(target, key, newVal, receiver);
          },
      });
  }

  const Text = Symbol();
  const Fragment = Symbol();

  function isFunction(val) {
      return typeof val === "function";
  }

  /**
   * 更新属性
   * @param el - 真实 DOM
   * @param key - 属性名称
   * @param prevValue - 旧的属性值
   * @param nextValue - 新的属性值
   */
  function patchProps(el, key, prevValue, nextValue) {
      // 事件
      if (/^on/.test(key)) {
          const eventName = key.slice(2).toLowerCase();
          const invokers = el._invokers || (el._invokers = {});
          let invoker = invokers[key];
          if (nextValue) {
              if (!invoker) {
                  // 不存在就伪造一个 invoker 并缓存到 el._invokers 中
                  // 闭包的应用
                  invoker = el._invokers[key] = (e) => {
                      // 屏蔽触发时间早于绑定时间的事件
                      if (e.timeStamp < invoker.attached)
                          return;
                      // 同一类型的事件绑定多个处理函数
                      if (Array.isArray(invoker.value)) {
                          invoker.value.forEach((fn) => fn(e));
                      }
                      else {
                          invoker.value(e);
                      }
                  };
                  invoker.value = nextValue;
                  invoker.attached = performance.now();
                  el.addEventListener(eventName, invoker);
              }
              else {
                  // 存在只需要更新 value 的值即可,无需移除再添加
                  invoker.value = nextValue;
              }
          }
          else if (invoker) {
              // 新的事件绑定不存在，则移除绑定
              el.removeEventListener(eventName, invoker);
          }
      }
      // 对 class 进行特殊处理
      else if (key === "class") {
          el.className = normalizeClass(nextValue) || "";
      }
      // TODO: 对 style 进行特殊优化
      // 普通属性处理
      else if (shouldSetAsDOMProps(el, key)) {
          const type = typeof el[key];
          if (type === "boolean" && nextValue === "")
              el[key] = true;
          else
              el[key] = nextValue;
      }
      else {
          el.setAttribute(key, nextValue);
      }
  }
  /**
   * 判断某个属性能否以 DOM 的形式进行设置
   * @param el - 目标 DOM
   * @param key - 目标属性名称
   */
  function shouldSetAsDOMProps(el, key) {
      // 处理【只读】类型的 DOM Property
      if (key === "form" && el.tagName === "INPUT")
          return false;
      return key in el;
  }
  /**
   * 将 className 标准化为一个类名字符串
   * @param className - 可以是字符串、布尔映射对象或者他们的数组)
   * @returns {string} 标准化后的类名字符串
   */
  function normalizeClass(className) {
      if (typeof className === "string")
          return className;
      if (Array.isArray(className))
          return className.map((item) => normalizeClass(item)).join(" ");
      return Object.entries(className)
          .filter(([_, value]) => value)
          .map(([key, _]) => key)
          .join(" ");
  }
  /**
   * 获取给定序列的最长递增子序列的下标数组
   * @param arr - 给定序列
   * Example: [3,5,6,2,5,4,19,5,6,7,12]
   */
  function getLISIndex(arr) {
      // tails[i] 表示长度为 i 的最长递增子序列的尾部元素在原始序列中的【下标】
      let tails = [0];
      // prev[i] 最长递增子序列中 i 的前驱节点
      let prev = [];
      let n = arr.length;
      for (let i = 0, l, r, mid; i < n; i++) {
          if (arr[i] > arr[tails[tails.length - 1]]) {
              // 记录前驱节点
              prev[i] = tails[tails.length - 1];
              // 严格递增直接加入最长递增子序列
              tails.push(i);
              continue;
          }
          // 二分查找：第一个比当前值小的节点并替换
          (l = 0), (r = tails.length - 1);
          while (l <= r) {
              mid = Math.floor((l + r) / 2);
              // 如果 mid 比当前值还小，则说明 [mid+1,r] 中还可能存在比当前值小的
              if (arr[i] > arr[tails[mid]])
                  l = mid + 1;
              else
                  r = mid - 1;
          }
          tails[l] = i;
          // 更新前驱节点： 当前下标的前驱为被替换节点的前一个
          if (l > 0)
              prev[i] = tails[l - 1];
      }
      // 根据前驱寻找最长递增子序列
      n = tails.length;
      let prevValue = tails[n - 1];
      while (n-- > 0) {
          tails[n] = prevValue;
          prevValue = prev[prevValue];
      }
      return tails;
  }
  // 微型任务缓冲队列，使用 Set 实现自动去重
  const queue = new Set();
  let isFlushing = false;
  const p = Promise.resolve();
  /**
   * 作为 effect 的调度函数，用于延迟执行副作用函数。
   * @param job - 待执行的函数
   */
  function queueJob(job) {
      queue.add(job);
      if (!isFlushing) {
          isFlushing = true;
          p.then(() => {
              try {
                  queue.forEach((job) => job());
              }
              finally {
                  isFlushing = false;
                  queue.clear();
              }
          });
      }
  }
  /**
   * 解析 props 数据
   * @param options - 组件选项对象中声明接收的 props
   * @param propsData - 为组件传递的 props
   */
  function resolveProps(options, propsData) {
      options = options || {};
      propsData = propsData || {};
      const props = {};
      const attrs = {};
      for (const key in propsData) {
          // 事件属性都添加到 props 数据中
          if (key in options || key.startsWith("on")) {
              props[key] = propsData[key];
          }
          else {
              attrs[key] = propsData[key];
          }
      }
      return [props, attrs];
  }
  /**
   * 判断子组件的 props 是否需要更新
   * @param prevProps - 旧 props
   * @param nextProps - 新 props
   */
  function hasPropsChanged(prevProps, nextProps) {
      prevProps = prevProps || {};
      nextProps = nextProps || {};
      const nextKeys = Object.keys(nextProps);
      if (nextKeys.length !== Object.keys(prevProps).length)
          return true;
      for (const key in nextKeys) {
          if (nextProps[key] !== prevProps[key])
              return true;
      }
      return false;
  }
  /**
   * 处理选项式 API
   * @param instance - 组件实例
   */
  function resolveOptions(instance, options) {
      const { methods } = options;
      if (methods) {
          for (const key in methods) {
              const method = methods[key];
              if (isFunction(method)) {
                  instance.state[key] = method.bind(instance.proxy);
              }
              else {
                  warn(`Method "${key}" has type "${typeof method}" in the component definition. ` +
                      `Did you reference the function correctly?`, "Components");
              }
          }
      }
  }

  const defaultRendererOptions = {
      createElement: (tag) => {
          return document.createElement(tag);
      },
      setElementText: (el, text) => {
          el.textContent = text;
      },
      insert: (el, parent, anchor = null) => {
          parent.insertBefore(el, anchor);
      },
      createText: (text) => {
          return document.createTextNode(text);
      },
      setText: (el, text) => {
          el.nodeValue = text;
      },
  };

  // 创建一个渲染器
  function createRenderer(userOptions) {
      // options with defaults
      const options = Object.assign(Object.assign({}, defaultRendererOptions), userOptions);
      const { createElement, insert, setElementText, createText, setText } = options;
      /**
       * 渲染虚拟节点
       * @param vnode - VNode
       * @param container - 容器
       */
      function render(vnode, container) {
          if (vnode) {
              // 新旧 vnode 同时传递给 patch 进行打补丁
              patch(container._vnode, vnode, container);
          }
          else {
              // 旧 vnode 存在而新 vnode 不存在说明是【卸载】操作
              if (container._vnode) {
                  unmount(container._vnode);
              }
          }
          container._vnode = vnode;
      }
      /**
       * 比较新旧两个虚拟节点差异，根据差异更新真实 DOM
       * @param oldVnode - VNode 旧值
       * @param newVnode - VNode 新值
       * @param container - 父元素容器
       * @param anchor - 插入锚点
       */
      function patch(oldVnode, newVnode, container, anchor = null) {
          if (oldVnode && oldVnode.type !== newVnode.type) {
              unmount(oldVnode);
              oldVnode = undefined;
          }
          const { type } = newVnode;
          // 普通标签元素
          if (typeof type === "string") {
              if (!oldVnode) {
                  mountElement(newVnode, container, anchor);
              }
              else {
                  patchElement(oldVnode, newVnode);
              }
          }
          // 文本节点
          else if (type === Text) {
              if (!oldVnode) {
                  // 旧节点不存在则新建
                  const el = (newVnode.el = createText(newVnode.children));
                  insert(el, container);
              }
              else {
                  // 旧节点存在则比较并覆盖
                  const el = (newVnode.el = oldVnode.el);
                  if (newVnode.children !== oldVnode.children)
                      setText(el, newVnode.children);
              }
          }
          // 处理多根节点模板
          else if (type === Fragment) {
              if (!oldVnode)
                  newVnode.children.forEach((c) => patch(null, c, container));
              else
                  patchChildren(oldVnode, newVnode, container);
          }
          // TODO:组件元素
          else if (typeof type === "object") {
              if (!oldVnode)
                  mountComponent(newVnode, container, anchor);
              else
                  patchComponent(oldVnode, newVnode);
          }
      }
      /**
       * 更新元素
       * @param n1 - VNode 旧值
       * @param n2 - VNode 新值
       */
      function patchElement(n1, n2) {
          const el = (n2.el = n1.el);
          const oldProps = n1.props;
          const newProps = n2.props;
          // 更新属性值
          for (const key in newProps) {
              if (newProps[key] !== (oldProps === null || oldProps === void 0 ? void 0 : oldProps[key])) {
                  patchProps(el, key, oldProps === null || oldProps === void 0 ? void 0 : oldProps[key], newProps[key]);
              }
          }
          for (const key in oldProps) {
              if (!newProps || !(key in newProps))
                  patchProps(el, key, oldProps[key], null);
          }
          // 更新子节点
          patchChildren(n1, n2, el);
      }
      /**
       * 更新元素子节点
       * @param n1 - VNode 旧值
       * @param n2 - VNode 新值
       * @param container - 父元素容器
       */
      function patchChildren(n1, n2, container) {
          // 新节点为文本节点
          if (typeof n2.children === "string") {
              // 旧节点为数组则依次卸载
              if (Array.isArray(n1.children))
                  n1.children.forEach((item) => unmount(item));
              // 更新文本内容
              setElementText(container, n2.children);
          }
          // 新节点为数组
          else if (Array.isArray(n2.children)) {
              // 旧节点也为数组则进行 diff 比较
              if (Array.isArray(n1.children)) {
                  fastDiff(n1, n2, container);
              }
              // 旧节点为空或者文本类型直接置空，随后依次挂载
              else {
                  setElementText(container, "");
                  n2.children.forEach((item) => patch(null, item, container));
              }
          }
          // 新节点为空节点
          else {
              // 旧节点为数组则依次卸载
              if (Array.isArray(n1.children))
                  n1.children.forEach((item) => unmount(item));
              // 旧节点为文本类型直接置空
              else if (typeof n1.children === "string")
                  setElementText(container, "");
          }
      }
      /**
       * 比较两个虚拟节点数组的差异，并更新
       * @param n1 - 旧 VNode 数组
       * @param n2 - 新 VNode 数组
       * @param container - 父元素容器
       */
      function fastDiff(n1, n2, container) {
          const oldChildren = n1.children;
          const newChildren = n2.children;
          // 更新相同的前置节点
          let prevIndex = 0;
          let oldEnd = oldChildren.length - 1;
          let newEnd = newChildren.length - 1;
          let oldVNode = oldChildren[prevIndex];
          let newVNode = newChildren[prevIndex];
          while (prevIndex <= oldEnd && prevIndex <= newEnd && oldVNode.key === newVNode.key) {
              patch(oldVNode, newVNode, container);
              prevIndex++;
              oldVNode = oldChildren[prevIndex];
              newVNode = newChildren[prevIndex];
          }
          // 更新相同的后置节点
          oldVNode = oldChildren[oldEnd];
          newVNode = newChildren[newEnd];
          while (prevIndex <= oldEnd && prevIndex <= newEnd && oldVNode.key === newVNode.key) {
              patch(oldVNode, newVNode, container);
              oldVNode = oldChildren[--oldEnd];
              newVNode = newChildren[--newEnd];
          }
          // 新VNode剩余：挂载
          if (prevIndex <= newEnd && prevIndex > oldEnd) {
              const anchorIndex = newEnd + 1;
              const anchor = anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null;
              while (prevIndex <= newEnd)
                  patch(null, newChildren[prevIndex++], container, anchor);
          }
          // 旧VNode剩余：卸载
          else if (prevIndex <= oldEnd && prevIndex > newEnd) {
              while (prevIndex <= oldEnd) {
                  unmount(oldChildren[prevIndex++]);
              }
          }
          // 同时剩余
          else if (prevIndex <= oldEnd) {
              // 1.构造 source
              const count = newEnd - prevIndex + 1;
              const source = new Array(count).fill(-1);
              // 2.构造索引表
              const oldStart = prevIndex;
              const newStart = prevIndex;
              let lastMaxPos = 0;
              let moved = false;
              const keyIndex = {};
              for (let i = newStart; i <= newEnd; i++) {
                  keyIndex[newChildren[i].key] = i;
              }
              // 3.更新节点 & 判断是否需要移动
              let patched = 0;
              for (let i = oldStart; i <= oldEnd; i++) {
                  oldVNode = oldChildren[i];
                  if (patched < count) {
                      const k = keyIndex[oldVNode.key];
                      // 在索引表中存在说明没有被移除
                      if (k !== undefined) {
                          newVNode = newChildren[k];
                          patch(oldVNode, newVNode, container);
                          patched++;
                          source[k - newStart] = i;
                          if (k < lastMaxPos)
                              moved = true;
                          else
                              lastMaxPos = k;
                      }
                      // 不在索引表中则应当被卸载
                      else {
                          unmount(oldVNode);
                      }
                  }
                  // 已更新节点数大于需要更新的节点数，则后续节点都应被卸载，性能优化的小手段
                  else {
                      unmount(oldVNode);
                  }
              }
              // 4. 构造最长递增子序列进行移动
              if (moved) {
                  const seq = getLISIndex(source);
                  let s = seq.length - 1;
                  let i = count - 1;
                  for (i; i >= 0; i--) {
                      // 新增的节点
                      if (source[i] === -1) {
                          const pos = i + newStart;
                          const newVNode = newChildren[pos];
                          const anchor = pos + 1 < newChildren.length ? newChildren[pos + 1].el : null;
                          patch(null, newVNode, container, anchor);
                      }
                      // 需要移动的节点
                      else if (i !== seq[s]) {
                          const pos = i + newStart;
                          const newVNode = newChildren[pos];
                          const anchor = pos + 1 < newChildren.length ? newChildren[pos + 1].el : null;
                          insert(newVNode.el, container, anchor);
                      }
                      // 不需要移动
                      else {
                          s--;
                      }
                  }
              }
          }
      }
      /**
       * Vue2.x 的双端 diff 算法
       */
      // function v2Diff(n1: VNode, n2: VNode, container: Container | null) {
      //   const oldChildren = n1.children as VNode[];
      //   const newChildren = n2.children as VNode[];
      //   const visited = Symbol("visited");
      //   // 四个索引值
      //   let oldStartIdx = 0,
      //     oldEndIdx = oldChildren.length - 1,
      //     newStartIdx = 0,
      //     newEndIdx = newChildren.length - 1;
      //   // 对应的 vnode 节点
      //   let oldStartVNode = oldChildren[oldStartIdx],
      //     oldEndVNode = oldChildren[oldEndIdx],
      //     newStartVNode = newChildren[newStartIdx],
      //     newEndVNode = newChildren[newEndIdx];
      //   while (newStartIdx <= newEndIdx && oldStartIdx <= oldEndIdx) {
      //     // 跳过已处理节点
      //     if (oldStartVNode.key === visited) {
      //       oldStartVNode = oldChildren[++oldStartIdx];
      //       continue;
      //     }
      //     if (oldEndVNode.key === visited) {
      //       oldEndVNode = oldChildren[--oldEndIdx];
      //       continue;
      //     }
      //     // 比较
      //     if (oldStartVNode.key === newStartVNode.key) {
      //       // 头头比较
      //       patch(oldStartVNode, newStartVNode, container);
      //       oldStartVNode = oldChildren[++oldStartIdx];
      //       newStartVNode = newChildren[++newStartIdx];
      //     }
      //     // 尾尾比较
      //     else if (oldEndVNode.key === newEndVNode.key) {
      //       patch(oldEndVNode, newEndVNode, container);
      //       oldEndVNode = oldChildren[--oldEndIdx];
      //       newEndVNode = newChildren[--newEndIdx];
      //     }
      //     // 头尾比较
      //     else if (oldStartVNode.key === newEndVNode.key) {
      //       patch(oldStartVNode, newEndVNode, container);
      //       insert(oldStartVNode.el, container, oldEndVNode.el?.nextSibling);
      //       oldStartVNode = oldChildren[++oldStartIdx];
      //       newEndVNode = newChildren[--newEndIdx];
      //     }
      //     // 尾头比较
      //     else if (oldEndVNode.key === newStartVNode.key) {
      //       patch(oldEndVNode, newStartVNode, container);
      //       insert(oldEndVNode.el, container, oldStartVNode.el);
      //       oldEndVNode = oldChildren[--oldEndIdx];
      //       newStartVNode = newChildren[++newStartIdx];
      //     }
      //     // 非理想状况
      //     else {
      //       const idxInOld = oldChildren.findIndex((node) => node.key === newStartVNode.key);
      //       if (idxInOld > 0) {
      //         const VNodeToMove = oldChildren[idxInOld];
      //         patch(VNodeToMove, newStartVNode, container);
      //         insert(VNodeToMove.el, container, oldStartVNode.el);
      //         oldChildren[idxInOld].key = visited; // 标记已访问
      //       } else patch(null, newStartVNode, container, oldStartVNode.el);
      //       newStartVNode = newChildren[++newStartIdx];
      //     }
      //   }
      //   // 添加新的节点
      //   if (newStartIdx <= newEndIdx) {
      //     for (let i = newStartIdx; i <= newEndIdx; i++)
      //       patch(null, newChildren[i], container, oldStartVNode?.el || null);
      //   }
      //   // 卸载旧的节点
      //   if (oldStartIdx <= oldEndIdx) {
      //     for (let i = oldStartIdx; i <= oldEndIdx; i++) {
      //       unmount(oldChildren[i]);
      //     }
      //   }
      // }
      /**
       * 挂载组件
       * @param vnode - VNode
       * @param container - 父元素容器
       * @param anchor - 插入锚点
       */
      function mountComponent(vnode, container, anchor) {
          // 获取组件的选项对象，通常包含一个返回值为虚拟 DOM 的渲染函数
          const componentOptions = vnode.type;
          const { render, data, props: propsOptions, 
          // 生命周期
          beforeCreate, created, beforeMount, mounted, beforeUpdate, updated, } = componentOptions;
          // 【生命周期】数据观测前
          beforeCreate && beforeCreate();
          // 获取自身状态数据与传递的 props
          const state = data ? reactive(data()) : null;
          const [props, attrs] = resolveProps(propsOptions, vnode.props);
          const instance = {
              state,
              props: shallowReactive(props),
              isMounted: false,
              subTree: null,
              proxy: null,
          };
          vnode.component = instance;
          // 创建渲染上下文对象，本质上是对组件实例的代理
          const renderContext = new Proxy(instance, {
              get(t, k) {
                  const { state, props } = t;
                  if (state && k in state)
                      return state[k];
                  else if (props && k in props)
                      return props[k];
                  else {
                      console.error("属性不存在");
                  }
              },
              set(t, k, v) {
                  const { state, props } = t;
                  if (state && k in state) {
                      state[k] = v;
                  }
                  else if (props && k in props) {
                      console.error(`尝试修改 prop ${String(k)}. Props 是只读的`);
                  }
                  else {
                      console.error("属性不存在");
                  }
                  return true;
              },
          });
          instance.proxy = renderContext;
          // 处理 methods 等选项 API
          resolveOptions(instance, componentOptions);
          // 【生命周期】关联副作用前
          created && created.call(renderContext);
          effect(() => {
              const subTree = render.call(renderContext, renderContext);
              // isMounted 用于避免副作用函数执行导致同一组件被多次挂载。
              if (!instance.isMounted) {
                  // 【生命周期】挂载前
                  beforeMount && beforeMount.call(renderContext);
                  // 初次挂载
                  // console.dir(subTree, { depth: null });
                  patch(null, subTree, container, anchor);
                  instance.isMounted = true;
                  // 【生命周期】挂载后
                  mounted && mounted.call(renderContext);
              }
              else {
                  console.log("【重新渲染】");
                  // console.dir(subTree, { depth: null });
                  // 【生命周期】更新前
                  beforeUpdate && beforeUpdate.call(renderContext);
                  // 副作用引起的自更新
                  patch(instance.subTree, subTree, container, anchor);
                  // 【生命周期】更新后
                  updated && updated.call(renderContext);
              }
              instance.subTree = subTree;
          }, { scheduler: queueJob });
      }
      /**
       * 更新组件
       * @param n1 - 旧 VNode
       * @param n2 - 新 VNode
       * @param anchor - 插入锚点
       */
      function patchComponent(n1, n2, anchor) {
          var _a;
          // 设置新 VNode 的组件实例
          const instance = (n2.component = n1.component);
          // 获取原来的 props 数据
          const { props } = instance;
          if (hasPropsChanged(n1.props, n2.props)) {
              // 解析当前 props 的数据
              const [nextProps] = resolveProps((_a = n2.type) === null || _a === void 0 ? void 0 : _a.props, n2.props);
              // 由于 props 本身是浅相应的，故修改 props 即可引发组件重新渲染
              // 更新 props
              for (const k in nextProps) {
                  props[k] = nextProps[k];
              }
              // 删除 props
              for (const k in props) {
                  if (!(k in nextProps))
                      delete props[k];
              }
          }
      }
      /**
       * 将虚拟节点转换为真实 DOM 并将其插入到父元素中
       * @param vnode - VNode
       * @param container - 父元素容器
       * @param anchor - 插入锚点
       */
      function mountElement(vnode, container, anchor) {
          // 【创建】并记录虚拟节点对应的真实 DOM
          const el = (vnode.el = createElement(vnode.type));
          // 【设置】
          if (typeof vnode.children === "string") {
              setElementText(el, vnode.children);
          }
          // 如果 children 是数组则遍历每一个子节点并调用 patch 挂载.
          else if (Array.isArray(vnode.children)) {
              vnode.children.forEach((child) => patch(null, child, el));
          }
          // 设置属性
          if (vnode.props) {
              Object.keys(vnode.props).forEach((key) => {
                  patchProps(el, key, null, vnode.props[key]);
              });
          }
          // 【插入】
          insert(el, container, anchor);
      }
      /**
       * 将虚拟节点从真实DOM中卸载
       * @param vnode - VNode
       */
      function unmount(vnode) {
          const el = vnode.el;
          const parent = el === null || el === void 0 ? void 0 : el.parentNode;
          parent && parent.removeChild(el);
      }
      // TODO: 通常用于服务端渲染
      // function hydrate(vnode: VNode, container: Container) {}
      return {
          render,
          // hydrate,
      };
  }

  exports.arrayInstrumentations = arrayInstrumentations;
  exports.computed = computed;
  exports.createRenderer = createRenderer;
  exports.effect = effect;
  exports.proxyRefs = proxyRefs;
  exports.reactive = reactive;
  exports.readonly = readonly;
  exports.ref = ref;
  exports.shallowReactive = shallowReactive;
  exports.shallowReadonly = shallowReadonly;
  exports.toRef = toRef;
  exports.toRefs = toRefs;
  exports.track = track;
  exports.trigger = trigger;
  exports.watch = watch;

  return exports;

})({});
