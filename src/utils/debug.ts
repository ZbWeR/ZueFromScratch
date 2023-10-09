export function warn(message: string, source: any) {
  if (__DEV__) {
    console.warn(`[Zue-warn]: at ${source} \n ${message}`);
  }
}

export function error(message: string, source?: any) {
  if (__DEV__) {
    console.error(`[Zue-error]: at ${source} \n ${message}`);
  }
}
