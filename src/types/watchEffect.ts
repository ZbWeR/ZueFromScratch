/**
 * 副作用函数接口。
 * 它是一个扩展了Function的接口，具有一个deps属性，该属性是一个Set数组，数组中的每个元素都是EffectFunction的实例。
 */
export interface EffectFunction<T = any> extends Function {
  deps: Array<Set<EffectFunction>>;
  options?: EffectOptions;
}

/**
 * DepsMap接口。
 * 它是一个扩展了Map的接口，键是PropertyKey类型，值是EffectFunction实例的Set集合。
 */
export interface DepsMap extends Map<PropertyKey, Set<EffectFunction>> {}

/**
 * EffectOptions 接口。
 * 它有两个可选属性：scheduler 和 lazy。
 * scheduler 是一个 Function 类型的属性，用于安排副作用函数的执行。
 * lazy 是一个 boolean 类型的属性，如果为 true，则副作用函数在初始化时不会立即执行，而是在需要时执行。
 */
export interface EffectOptions {
  scheduler?: Function;
  lazy?: boolean;
}

export enum TriggerType {
  SET = "SET",
  ADD = "ADD",
  DELETE = "DELETE",
}
