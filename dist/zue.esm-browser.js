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
    if (!activeEffect)
        return;
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
function trigger(target, key, type) {
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
        // 清除依赖，避免分支切换时遗留的副作用函数干扰运行
        cleanup(effectFn);
        activeEffect = effectFn;
        // 处理副作用函数嵌套
        effectStack.push(effectFn);
        const res = fn();
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
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

function handler(isShadow = false, // 浅响应只有第一层为响应式
isReadonly = false // 只读数据
) {
    return {
        // 拦截读取
        get(target, key, receiver) {
            // 代理对象可以通过 raw 访问原始数据
            if (key === "raw")
                return target;
            // 收集副作用函数:只读属性不会触发副作用故不用收集
            if (!isReadonly)
                track(target, key);
            // 处理深浅响应
            const res = Reflect.get(target, key, receiver);
            if (isShadow)
                return res;
            if (typeof res === "object" && res !== null) {
                return isReadonly ? readonly(res) : reactive(res);
            }
            return res;
        },
        // 拦截设置操作，修改/新增
        set(target, key, newVal, receiver) {
            // 只读数据拦截设置操作
            if (isReadonly) {
                warn(`属性 ${String(key)} 是只读的`, target);
                return true;
            }
            const oldVal = target[key];
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
                    trigger(target, key, type);
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
function createReactive(data, isShadow = false, isReadonly = false) {
    if (typeof data !== "object" || data === null) {
        error(`${data} must be an object`, "createReactive");
        return data;
    }
    return new Proxy(data, handler(isShadow, isReadonly));
}
/**
 * 创建一个深层响应式对象
 * @param data - 原始对象
 * @returns 原值的响应式代理
 */
function reactive(data) {
    return createReactive(data);
}
/**
 * 创建一个浅层响应式对象，避免深层次的转换行为
 * @param data - 原始对象
 * @returns 原值的浅层响应式代理
 */
function shadowReactive(data) {
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
function shadowReadonly(data) {
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

export { computed, reactive, readonly, shadowReactive, shadowReadonly, watch };
