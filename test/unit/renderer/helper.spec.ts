import { expect, describe, test } from "vitest";
import { getLISIndex, normalizeClass } from "../../../src/renderer/render_helper";

describe("renderer - helpers", () => {
  // 最长递增子序列
  test("should return the longest ascending subsequence given a sequence", () => {
    let res = getLISIndex([10, 9, 2, 5, 3, 7, 101, 18]);
    expect(res.length).toBe(4);
    expect(res).toEqual([2, 4, 5, 7]);

    res = getLISIndex([2, 3, 1, -1]);
    expect(res.length).toBe(2);
    expect(res).toEqual([0, 1]);

    res = getLISIndex([3, 5, 6, 2, 5, 4, 19, 5, 6, 7, 12]);
    expect(res.length).toBe(6);
    expect(res).toEqual([3, 5, 7, 8, 9, 10]);
  });

  // className 标准化
  test("should return a string for the function normalizeClass, regardless of the original structure of the given className", () => {
    // 纯字符串
    expect(normalizeClass("foo bar")).toBe("foo bar");
    // 布尔映射
    expect(normalizeClass({ foo: true, bar: false })).toBe("foo");
    // 纯字符串与布尔映射组成的数组
    const arr = [
      "foo bar",
      {
        bze: true,
        flex: false,
      },
      "bg-sky-500",
    ];
    expect(normalizeClass(arr)).toBe("foo bar bze bg-sky-500");
  });
});
