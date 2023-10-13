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

export type RefObj<T = any> = {
  value: T;
  __z_isRef?: boolean;
};
