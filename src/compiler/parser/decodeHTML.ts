import { maxCRNameLength, CCR_REPLACEMENTS, namedCharacterReferences } from "./reference";
import {
  HTML_REFERENCE_HEAD,
  IS_ASCII_OR_NUMBER,
  HEX_REFERENCE,
  DECIMAL_REFERENCE,
} from "./regexp";

/**
 * 解析 HTML 中的引用字符
 * @param rawText 需要解码的文本
 * @param asAttr 是否用于解码属性值
 */
export function decodeHTMLText(rawText: string, asAttr = false): string {
  let offset = 0;
  const end = rawText.length;
  let decodedText = "";

  // 消费指定长度文本
  function advance(length: number) {
    offset += length;
    rawText = rawText.slice(length);
  }

  while (offset < end) {
    // 捕获字符引用的起始部分
    // 1. & 命名字符引用
    // 2. &# 十进制数字字符引用
    // 3. &#x 十六进制数字字符引用
    const head = HTML_REFERENCE_HEAD.exec(rawText);
    if (!head) {
      // 未匹配成功,说明 rawText 中不存在任何字符引用,直接返回即可.
      // ? 未经测试
      decodedText += rawText;
      break;
    }

    // 截取并消费 & 之前的内容
    decodedText += rawText.slice(0, head.index);
    advance(head.index);

    if (head[0] === "&") {
      // 处理命名字符引用

      let name = "";
      let value = "";

      if (IS_ASCII_OR_NUMBER.test(head[1])) {
        // 合法的字符引用

        // 按长度逆序寻找引用字符名称.
        for (let i = maxCRNameLength; !value && i > 0; i--) {
          name = rawText.slice(1, 1 + i);
          value = namedCharacterReferences[name];
        }

        if (value) {
          const semi = name.endsWith(";");

          if (!semi && asAttr && /[=a-z0-9]/i.test(rawText[1 + name.length] || "")) {
            // 处理属性值
            // 例如: <a href="foo.com?a=1&lt=2"></a> , &lt 不应该被解析
            decodedText += "&" + name;
            advance(1 + name.length);
          } else {
            // 一般情况
            decodedText += value;
            advance(1 + name.length);
          }
        } else {
          // 在引用表中没有查找到,说明为普通文本
          decodedText += "&" + name;
          advance(1 + name.length);
        }
      } else {
        // 不合法的字符引用,则作为普通文本
        decodedText += "&";
        advance(1);
      }
    } else {
      // 处理数字字符引用
      const hex = head[0] === "&#x";
      const pattern = hex ? HEX_REFERENCE : DECIMAL_REFERENCE;
      const body = pattern.exec(rawText);

      if (body) {
        let codePoint = parseInt(body[1], hex ? 16 : 10);

        if (codePoint === 0) {
          codePoint = 0xfffd;
        } else if (codePoint > 0x10ffff) {
          codePoint = 0xfffd;
        } else if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
          codePoint = 0xfffd;
        } else if (
          (codePoint > 0xfdd0 && codePoint <= 0xfdef) ||
          (codePoint & 0xfffe) === 0xfffe
        ) {
          /*do nothing*/
        } else if (
          (codePoint >= 0x01 && codePoint <= 0x08) ||
          codePoint === 0x0b ||
          (codePoint >= 0x0d && codePoint <= 0x1f) ||
          (codePoint >= 0x7f && codePoint <= 0x9f)
        ) {
          codePoint = CCR_REPLACEMENTS[codePoint] || codePoint;
        }

        // 解码并消费
        const char = String.fromCodePoint(codePoint);
        decodedText += char;
        advance(body[0].length);
      } else {
        // 当作普通文本能处理
        decodedText += head[0];
        advance(head[0].length);
      }
    }
  }

  return decodedText;
}
