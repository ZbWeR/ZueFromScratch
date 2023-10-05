/**
 * 副作用函数接口。
 * 它是一个扩展了Function的接口，具有一个deps属性，该属性是一个Set数组，数组中的每个元素都是EffectFunction的实例。
 */
export interface EffectFunction<T = any> extends Function {
  deps: Array<Set<EffectFunction>>;
}

/**
 * DepsMap接口。
 * 它是一个扩展了Map的接口，键是PropertyKey类型，值是EffectFunction实例的Set集合。
 */
export interface DepsMap extends Map<PropertyKey, Set<EffectFunction>> {}
