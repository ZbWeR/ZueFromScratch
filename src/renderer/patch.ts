import { normalizeClass } from "./utils";
import { Container } from "types/renderer";

export function patchProps(el: Container, key: string, prevValue: any, nextValue: any) {
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
          if (e.timeStamp < invoker.attached!) return;
          // 同一类型的事件绑定多个处理函数
          if (Array.isArray(invoker.value)) {
            invoker.value.forEach((fn) => fn(e));
          } else {
            invoker!.value!(e);
          }
        };
        invoker.value = nextValue;
        invoker.attached = performance.now();
        el.addEventListener(eventName, invoker);
      } else {
        // 存在只需要更新 value 的值即可,无需移除再添加
        invoker.value = nextValue;
      }
    } else if (invoker) {
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
    const type = typeof el[key as keyof HTMLElement];
    if (type === "boolean" && nextValue === "") (el as any)[key] = true;
    else (el as any)[key] = nextValue;
  } else {
    el.setAttribute(key, nextValue);
  }
}

/**
 * 判断某个属性能否以 DOM 的形式进行设置
 * @param el - 目标 DOM
 * @param key - 目标属性名称
 */
function shouldSetAsDOMProps(el: Container, key: string): boolean {
  // 处理【只读】类型的 DOM Property
  if (key === "form" && el.tagName === "INPUT") return false;
  return key in el;
}
