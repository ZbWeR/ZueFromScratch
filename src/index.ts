import { log } from "./logger.js";
import message from "./message.js";

const msg = message.hi;

export function hi() {
  log(msg);
  if (__DEV__) log("喵喵喵");
}
