import { effect } from "../../src/core/effect/watchEffect";
import { test, expect, vi, describe } from "vitest";

describe("Effect", () => {
  // 普通 effect 注册后立即执行
  test("should call the Function passed to it", () => {
    const spy = vi.fn();
    effect(spy);
    expect(spy).toHaveBeenCalled();
  });
  // 参数options: lazy 延迟执行
  test("should not call the Function passed to it until manually triggered", () => {
    const spy = vi.fn();
    const effectSpy = effect(spy, { lazy: true });
    expect(spy).not.toHaveBeenCalled();
    effectSpy();
    expect(spy).toHaveBeenCalled();
  });
  // 参数options: scheduler 调度函数
  // 将在其他函数中被测试,例如 computed 与 watch
});
