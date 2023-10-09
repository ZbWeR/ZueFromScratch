import { test, vi, expect, describe } from "vitest";

import {
  reactive,
  shadowReactive,
  readonly,
  shadowReadonly,
} from "../../../src/reactivity/reactive";
import { effect } from "../../../src/core/effect/watchEffect";

describe("reactive", () => {
  // 测试 proxy 是否代理成功
  test("should return a reactive object", () => {
    const data = reactive({ name: "jack", age: 18 });
    expect(data.name).toBe("jack");
    data.age = 20;
    expect(data.age).toBe(20);
  });

  // 测试 track 与 trigger 基本功能
  test("should track and trigger effects", () => {
    const data = reactive({ name: "jack", age: 18 });
    const mockNameFn = vi.fn();
    const mockAgeFn = vi.fn();
    effect(() => mockNameFn(data.name));
    effect(() => mockAgeFn(data.age));
    // 收集依赖时被调用.
    expect(mockNameFn).toBeCalledTimes(1);
    data.name = "tom";
    // 分发依赖时被调用.
    expect(mockNameFn).toBeCalledTimes(2);
    expect(mockAgeFn).toBeCalledTimes(1);
  });

  // 测试 Reflect 与 receiver 是否成功改变 this 指向
  test("should correctly bind 'this' to the proxy object", () => {
    const obj = {
      foo: 1,
      get bar() {
        return this.foo;
      },
    };
    const reactiveObj = reactive(obj);
    const effectFn = vi.fn(() => reactiveObj.bar);
    effect(effectFn);

    expect(effectFn).toBeCalledTimes(1);
    reactiveObj.foo++;
    expect(effectFn).toBeCalledTimes(2);
  });

  // 测试对 key in obj 的拦截, 增加属性
  test("should trigger effects containing 'in' operator when a property is added to the reactive data", () => {
    const reactiveObj: any = reactive({ foo: 1 });
    const effectFn = vi.fn(() => "bar" in reactiveObj);
    effect(effectFn);

    expect(effectFn).toBeCalledTimes(1);
    expect(effectFn).toReturnWith(false);

    reactiveObj.bar = 2;
    expect(effectFn).toBeCalledTimes(2);
    expect(effectFn).toReturnWith(true);
  });

  // 相同值的设置操作不引起更新
  test("should not trigger effects when the new value is the same as the old value, including the special case of NaN", () => {
    const reactiveObj = reactive({ name: "jack", age: NaN });
    const getName = vi.fn(() => reactiveObj.name);
    const getAge = vi.fn(() => reactiveObj.age);
    effect(getName);
    effect(getAge);

    // 新值与旧值相同不会触发副作用
    reactiveObj.name = "jack";
    expect(getName).toBeCalledTimes(1);
    reactiveObj.name = "Tom";
    expect(getName).toBeCalledTimes(2);
    // NaN 特殊情况测试
    reactiveObj.age = NaN;
    expect(getAge).toBeCalledTimes(1);
    reactiveObj.age = 18;
    expect(getAge).toBeCalledTimes(2);
  });

  // 测试对 for...in.. 的拦截, 增加/删除/设置操作
  test("should trigger effects when properties are added or deleted, but not set, in the use of the for...in... syntax within the effect function", () => {
    const reactiveObj: any = reactive({ name: "jack", age: 18 });
    const effectFn = vi.fn(() => {
      for (const key in reactiveObj) key;
    });
    effect(effectFn);

    // 设置操作不会触发副作用
    reactiveObj.age = 20;
    expect(effectFn).toBeCalledTimes(1);
    // 增加与删除
    reactiveObj.phone = 13333333333;
    expect(effectFn).toBeCalledTimes(2);
    delete reactiveObj.phone;
    expect(effectFn).toBeCalledTimes(3);
  });

  // 测试由原型引起的更新是否会重复触发副作用
  test("should not repeatedly trigger effects due to updates caused by the prototype", () => {
    const child: any = reactive({});
    const parent = reactive({ bar: 1 });
    Object.setPrototypeOf(child, parent);
    let effectFn = vi.fn(() => child.bar);
    effect(effectFn);

    expect(effectFn).toBeCalledTimes(1);
    // 为 child 设置也会被 parent 的 proxy 拦截
    child.bar = 2;
    // parent 的 proxy 不会触发副作用
    expect(effectFn).toBeCalledTimes(2);
  });

  // 测试深层代理是否成功
  test("should trigger effects when operations are performed on deep properties", () => {
    const reactiveObj = reactive({ foo: { bar: 1 }, val: 2 });
    const effectFn = vi.fn(() => reactiveObj.foo.bar);
    effect(effectFn);

    expect(effectFn).toBeCalledTimes(1);
    reactiveObj.foo.bar = 2;
    expect(effectFn).toBeCalledTimes(2);
  });

  // 非法参数应当抛出错误
  test("should throw an error when a primitive value that is not an object is passed in", () => {
    const spyErr = vi.spyOn(console, "error");

    reactive(1);
    expect(spyErr).toBeCalledTimes(1);
    reactive("喵喵喵");
    expect(spyErr).toBeCalledTimes(2);
    reactive(false);
    expect(spyErr).toBeCalledTimes(3);
    reactive(null);
    expect(spyErr).toBeCalledTimes(4);
  });
});

// 浅层代理测试
describe("shadowReactive", () => {
  test("should not trigger effects when operations are performed on deep properties", () => {
    const reactiveObj = shadowReactive({ foo: { bar: 1 }, val: 2 });
    const getBar = vi.fn(() => reactiveObj.foo.bar);
    const getVal = vi.fn(() => reactiveObj.val);
    effect(getBar);
    effect(getVal);

    // obj.foo.bar 不是响应的
    expect(getBar).toBeCalledTimes(1);
    reactiveObj.foo.bar = 2;
    expect(getBar).toBeCalledTimes(1);
    // obj.foo 是响应的
    reactiveObj.foo = { bar: 3 };
    expect(getBar).toBeCalledTimes(2);
  });
});

// 只读代理对象测试
describe("readonly", () => {
  // 只读对象不能被设置/删除
  test("should print a warning message when an attempt is made to set or delete a property of a read-only object", () => {
    const readonlyObj = readonly({ name: "Jake", age: 36, foo: { bar: 1 } });
    const spyWarn = vi.spyOn(console, "warn");

    readonlyObj.name = "Tom";
    expect(spyWarn).toBeCalledTimes(1);
    delete readonlyObj.age;
    expect(spyWarn).toBeCalledTimes(2);
    // 深层只读
    readonlyObj.foo.bar = 2;
    expect(spyWarn).toBeCalledTimes(3);
  });
  // 浅层只读
  test("should not print a warning message when operating on deep properties of a shallow read-only object", () => {
    const readonlyObj = shadowReadonly({ foo: { bar: 1 } });
    const spyWarn = vi.spyOn(console, "warn");

    // 深层设置不触发只读拦截
    readonlyObj.foo.bar = 2;
    expect(spyWarn).toBeCalledTimes(0);
    readonlyObj.foo = { bar: 2 };
    expect(spyWarn).toBeCalledTimes(1);
  });
});
