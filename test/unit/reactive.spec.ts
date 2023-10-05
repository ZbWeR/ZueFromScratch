import { reactive } from "../../src/reactivity/reactive";
import { effect } from "../../src/core/effect/watchEffect";
import { test, vi, expect, describe } from "vitest";

describe("Reactive", () => {
  test("should return a reactive object", () => {
    const data = reactive({ name: "jack", age: 18 });
    expect(data.name).toBe("jack");
    data.age = 20;
    expect(data.age).toBe(20);
  });

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
});
