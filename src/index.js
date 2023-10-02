import { log } from "./logger";
import message from "./message";

const msg = message.hi;

export function hi() {
  log(msg);
  if (__DEV__) log("喵喵喵");
}
