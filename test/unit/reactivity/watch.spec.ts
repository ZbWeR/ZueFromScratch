import { test, vi, expect, describe, beforeEach } from "vitest";

import { reactive } from "../../../src/reactivity/reactive";
import { watch } from "../../../src/reactivity/watch";

describe("Watch", () => {
  let reactiveObj: ReturnType<typeof reactive>;
  let cbFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    reactiveObj = reactive({ foo: 1, bar: 2 });
    cbFn = vi.fn((newVal, oldVal) => {
      expect(newVal).not.toBe(oldVal);
    });
  });

  // 参数source: 响应式数据
  test("should trigger the callback when the reactive source changes", () => {
    watch(reactiveObj, cbFn);
    // 初始时不该触发回调函数
    expect(cbFn).toBeCalledTimes(0);
    // 任意属性 set 操作都会触发回调
    reactiveObj.foo++;
    expect(cbFn).toBeCalledTimes(1);
    reactiveObj.bar++;
    expect(cbFn).toBeCalledTimes(2);
  });
  // 参数source: getter
  test("should trigger the callback when the getter source changes", () => {
    watch(() => reactiveObj.foo, cbFn);

    // 初始时不该触发回调函数
    expect(cbFn).toBeCalledTimes(0);
    // 只有 foo 的 set 操作都会触发回调
    reactiveObj.foo++;
    expect(cbFn).toBeCalledTimes(1);
    expect(cbFn).toBeCalledWith(2, 1, expect.any(Function));

    reactiveObj.bar++;
    expect(cbFn).toBeCalledTimes(1);
  });

  // 参数options: 立即执行
  test('should trigger the callback immediately after the watch function is called  with "immediate" option', () => {
    watch(reactiveObj, cbFn, { immediate: true });
    // 回调函数应该被立即执行
    expect(cbFn).toBeCalledTimes(1);
  });
  // 参数options: flush
  test('should trigger the callback asynchronously when the source changes and flush option is "post"', async () => {
    watch(reactiveObj, cbFn, { flush: "post" });
    reactiveObj.foo = 2;

    // 此时回调处于微队列中，不应该被调用
    expect(cbFn).toBeCalledTimes(0);
    // 等待事件循环结束
    await new Promise((resolve) => setImmediate(resolve));

    // 现在应该被调用了
    expect(cbFn).toBeCalledTimes(1);
    expect(cbFn).toBeCalledWith(
      { foo: 2, bar: 2 },
      { foo: 1, bar: 2 },
      expect.any(Function)
    );
  });
  // 回调函数的第三个参数 onInvalidate
  test("should trigger onInvalidate before the callBack is triggered", async () => {
    // 模拟获取数据接口, 1s 后返回
    function fetchData(value: number): Promise<number> {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(value);
        }, 1000);
      });
    }

    let finalData: number | undefined;
    // onInvalidate的意义：只记录最后一次返回的数据
    watch(reactiveObj, async (newVal, oldVal, onInvalidate) => {
      let expired = false;
      onInvalidate(() => (expired = true));
      const res = await fetchData(newVal.foo);
      if (!expired) {
        finalData = res;
      }
    });
    // 使用虚拟计时器
    vi.useFakeTimers();
    // 触发 watch 回调函数,此时 fetchData 还没有返回数据
    reactiveObj.foo = 2;
    await vi.advanceTimersByTimeAsync(200);
    expect(finalData).toBeUndefined();

    // 第二次触发 watch 回调函数，数据将在 1200ms 时返回
    reactiveObj.foo = 3;
    // 1000ms 时第一次 fetchData 返回数据
    // 但是由于该回调函数中 expired 为 true，返回的数据并没有被记录
    await vi.advanceTimersByTimeAsync(800);
    expect(finalData).toBeUndefined();

    // 1200ms 时第二次 fetchData 返回数据并记录
    await vi.advanceTimersByTimeAsync(200);
    expect(finalData).toBe(3);

    // 清除所有计时器并切换为真实计时器
    vi.clearAllTimers();
    vi.useRealTimers();
  });
});
