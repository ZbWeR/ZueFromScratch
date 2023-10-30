// RAWTEXT 文本模式的标签
export const IS_RAWTEXT_HTML_TAG = /style|xmp|iframe|noembed|noframes|noscript/;

// 匹配字符串开始的一段连续空白字符
export const BLANK_CHARS = /^[\t\r\n\f ]+/;

// 捕获开始标签的名称
export const HTML_START_TAG_NAME = /^<([a-z][^\t\r\n\f />]*)/i;

// 捕获结束标签的名称
export const HTML_END_TAG_NAME = /^<\/([a-z][^\t\r\n\f />]*)/i;

// HTML 属性名称
export const HTML_PROP_NAME = /^[^\t\r\n\f />][^\t\r\n\f =/>]*/;

// HTML 不被引号包裹的属性值
export const HTML_PROP_VALUE_WITHOUT_QUOTE: RegExp = /^[^\t\r\n\f >]+/;

// 识别字符引用的起始部分
export const HTML_REFERENCE_HEAD = /&(?:#x?)?/i;

// ASCII 字母或数字
export const IS_ASCII_OR_NUMBER = /[0-9a-z]/i;

// 捕获十六进制
export const HEX_REFERENCE = /^&#x([0-9a-f]+);?/i;

// 捕获十进制
export const DECIMAL_REFERENCE = /^&#([0-9]+);?/;
