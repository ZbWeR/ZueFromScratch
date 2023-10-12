export interface watchOptions {
  immediate?: boolean;
  flush?: "pre" | "post" | "sync";
}

export interface watchCallBackFunction {
  (newValue: any, oldValue: any, onInvalidate: (fn: () => void) => any): void;
}

export interface ArrayInstrumentations {
  [method: string]: (this: { raw: any[] }, ...args: any[]) => any;
}

export interface Ref<T = any> {
  value: T;
}
