import { effect } from "../../src/core/effect/watchEffect";
import { test, expect, vi, describe } from "vitest";

describe("Effect", () => {
  test("should call the Function passed to it", () => {
    const spy = vi.fn();
    effect(spy);
    expect(spy).toHaveBeenCalled();
  });

  test("should return an EffectFunction with deps property", () => {
    const spy = vi.fn();
    const effectSpy = effect(spy);
    expect(effectSpy).toHaveProperty("deps");
    expect(effectSpy.deps).toBeInstanceOf(Array);
  });
});
