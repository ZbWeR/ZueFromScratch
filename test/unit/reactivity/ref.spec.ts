import { expect, vi, describe, test } from "vitest";
import { ref, toRefs, proxyRefs } from "../../../src/reactivity/ref";
import { reactive } from "../../../src/reactivity/reactive";
import { effect } from "../../../src/core/effect/watchEffect";

describe("ref", () => {
  // 原始值代理功能
  test("should return the same value as the original when accessing the proxy object through the value property", () => {
    let refVal = ref(1);
    expect(refVal.value).toBe(1);
    refVal = ref("喵喵喵");
    expect(refVal.value).toBe("喵喵喵");
    refVal = ref(true);
    expect(refVal.value).toBe(true);
    refVal = ref(null);
    expect(refVal.value).toBe(null);
    refVal = ref(undefined);
    expect(refVal.value).toBe(undefined);
    refVal = ref({ foo: 1 });
    expect(refVal.value).toEqual({ foo: 1 });
  });

  // 相应丢失问题
  test("should trigger effects related to the plain object created from the reactive object when modifying the reactive object.", () => {
    const obj = reactive({ foo: 1, bar: 2 });
    const newObj = { ...toRefs(obj) };
    const spy = vi.fn(() => newObj.bar.value);
    effect(spy);

    // 由于创建出的普通对象是原对象的响应式应用
    // 所以修改时也应当作用于原对象。
    newObj.foo.value = "喵喵喵";
    expect(obj.foo).toEqual("喵喵喵");
    // 对响应式对象修改，与该对象创建出的普通对象有关的副作用应当被触发。
    obj.bar = 666;
    expect(newObj.bar.value).toBe(666);
    expect(spy).toBeCalledTimes(2);
  });

  // 脱 ref 直接访问
  test("should allow direct access to the value of a ref when it is wrapped with proxyRefs", () => {
    let obj = reactive({ foo: 1, bar: 2 });
    obj = proxyRefs({ ...toRefs(obj) });

    // 无需 .value 就能访问
    expect(obj.foo).toBe(1);
    // 无需 .value 就能设置
    obj.foo = "喵喵喵";
    expect(obj.foo).toBe("喵喵喵");
  });

  // 非ref对象使用 proxyRefs
  test("should do nothing when a non-ref type object is passed to proxyRefs", () => {
    let obj = { name: "Jack", age: 18 };
    obj = proxyRefs({ ...obj });
    expect(obj.name).toBe("Jack");
    obj.age = 20;
    expect(obj.age).toBe(20);
  });
});
