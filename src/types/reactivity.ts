export interface watchOptions {
  immediate?: boolean;
  flush?: "pre" | "post" | "sync";
}

export interface watchCallBackFunction {
  (newValue: any, oldValue: any, onInvalidate: (fn: () => void) => any): void;
}
