import { describe, expect, test } from "vitest";
import { generate } from "compiler/generator/generate";
import { parse } from "compiler/parser/index";
import { transform } from "compiler/transformer/transform";

describe("compiler - generator", () => {
  // 基本功能测试
  test("Should generate correct code for simple case", () => {
    const template = parse("<div>hello world</div>");
    const ast = transform(template);
    const code = generate(ast!, true);
    expect(code).toBe(
      "with(this) {return _h('div', {  }, [ _t('text', 'hello world') ])}"
    );
  });

  // 嵌套测试
  test("Should generate correct code for nested case", () => {
    const template = parse("<div><h1>hello world</h1></div>");
    const ast = transform(template);
    const code = generate(ast!, true);
    expect(code).toBe(
      "with(this) {return _h('div', {  }, [ _h('h1', {  }, [ _t('text', 'hello world') ]) ])}"
    );
  });

  // 注释
  test("Should generate correct code for comments", () => {
    const template = parse("<div><!-- comment here --></div>");
    const ast = transform(template);
    const code = generate(ast!, true);
    expect(code).toBe(
      "with(this) {return _h('div', {  }, [ _t('comment', ' comment here ') ])}"
    );
  });

  // 插值
  test("Should generate correct code for interpolations", () => {
    const template = parse("<div>{{msg}}</div>");
    const ast = transform(template);
    const code = generate(ast!, true);
    expect(code).toBe("with(this) {return _h('div', {  }, [ _t('text', _s((msg))) ])}");
  });

  // 属性与动态属性测试
  test("Should generate correct code for attributes", () => {
    const template = parse("<div id='app' :class='dynamicClass'>hello world</div>");
    const ast = transform(template);
    const code = generate(ast!, true);
    expect(code).toBe(
      "with(this) {return _h('div', { 'directives':{  }, 'on':{  }, 'attrs':{ 'id':'app', '_class_':(dynamicClass) } }, [ _t('text', 'hello world') ])}"
    );
  });

  // 事件测试
  test("Should generate correct code for events", () => {
    const template = parse("<div @click='handleClick'>hello world</div>");
    const ast = transform(template);
    const code = generate(ast!, true);
    expect(code).toBe(
      "with(this) {return _h('div', { 'directives':{  }, 'on':{ 'click':((typeof handleClick === 'function') ? handleClick : () => { handleClick }) }, 'attrs':{  } }, [ _t('text', 'hello world') ])}"
    );
  });

  // z-show 指令测试
  test("Should generate correct code for z-show directive", () => {
    const template = parse("<div z-show='show'>hello world</div>");
    const ast = transform(template);
    const code = generate(ast!, true);
    expect(code).toBe(
      "with(this) {return _h('div', { 'directives':{ 'z-show':(show) }, 'on':{  }, 'attrs':{ '_show_':(show) } }, [ _t('text', 'hello world') ])}"
    );
  });

  // z-if 指令测试
  test("Should generate correct code for z-if directive", () => {
    const template = parse("<div z-if='show'>hello world</div>");
    const ast = transform(template);
    const code = generate(ast!, true);
    expect(code).toBe(
      "with(this) {return _h('div', { 'directives':{ 'z-if':(show) }, 'on':{  }, 'attrs':{ '_if_':(show) } }, [ _t('text', 'hello world') ])}"
    );
  });

  // v-html 指令测试
  test("Should generate correct code for v-html directive", () => {
    const template = parse("<div z-html='html'></div>");
    const ast = transform(template);
    const code = generate(ast!, true);
    expect(code).toBe(
      "with(this) {return _h('div', { 'directives':{ 'z-html':(html) }, 'on':{  }, 'attrs':{ 'innerHTML':(html) } }, [  ])}"
    );
  });
});
