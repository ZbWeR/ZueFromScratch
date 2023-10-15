import { test, vi, expect, describe, beforeEach } from "vitest";

import { reactive } from "../../../src/reactivity/reactive";
import { effect } from "../../../src/core/effect/watchEffect";
import { computed } from "../../../src/reactivity/computed";

describe("Computed", () => {
  let reactiveObj: ReturnType<typeof reactive>;
  let sumFun: ReturnType<typeof vi.fn>;
  let sumRes: ReturnType<typeof computed>;

  beforeEach(() => {
    reactiveObj = reactive({ foo: 1, bar: 2 });
    sumFun = vi.fn(() => reactiveObj.foo + reactiveObj.bar);
    sumRes = computed(sumFun);
  });

  // 测试 lazy 延迟执行
  test("should not call the computed function until its value is accessed", () => {
    expect(sumFun).toBeCalledTimes(0);
    sumRes.value; // 模拟 get 操作
    expect(sumFun).toBeCalledTimes(1);
  });
  // 测试数据缓存
  test("should only recompute the value when its dependencies change", () => {
    // 由于数据缓存仅调用一次
    sumRes.value;
    sumRes.value;
    sumRes.value;
    expect(sumFun).toBeCalledTimes(1);
    // 依赖变更后才会重新计算
    reactiveObj.foo = 2;
    sumRes.value;
    sumRes.value;
    expect(sumFun).toBeCalledTimes(2);
    expect(sumRes.value).toBe(4);
  });
  // 测试在 effect 中调用
  test("should call the function when its value accessed in a effectFunction", () => {
    const logFn = vi.fn(() => sumRes.value);
    effect(logFn);
    // 注册成 effect 后立即调用
    expect(logFn).toBeCalledTimes(1);
    // reactiveObj 变化引起 sumRes 变化进而引起 logFn 调用
    reactiveObj.foo++;
    expect(logFn).toBeCalledTimes(2);
  });
});
