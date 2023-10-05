import path from "node:path";
import { fileURLToPath } from "node:url";

import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";
import typescript from "rollup-plugin-typescript2";

const __filename = fileURLToPath(import.meta.url);
const ROOT_PATH = path.dirname(__filename);
const resolve = (p) => path.resolve(ROOT_PATH, p);
const name = "zue";

const outputConfigs = {
  cjs: {
    file: resolve(`dist/${name}.cjs.js`),
    format: `cjs`,
  },
  global: {
    file: resolve(`dist/${name}.global.js`),
    format: `iife`,
    name: "zue",
  },
  "esm-bundler": {
    file: resolve(`dist/${name}.esm-bundler.js`),
    format: `esm`,
  },
  "esm-browser": {
    file: resolve(`dist/${name}.esm-browser.js`),
    format: `esm`,
  },
};

// 获取各种导出格式的配置信息
const rollupConfigs = Object.keys(outputConfigs).map((format) =>
  createConfig(format, outputConfigs[format])
);

/**
 * 导出配置信息
 * @param {string} format - 打包格式
 * @param {object} output - 详细打包信息
 * @returns rollup 配置信息
 */
function createConfig(format, output) {
  const isProductionBuild = process.env.__DEV__ === "false";
  const isBundlerESMBuild = /esm-bundler/.test(format);
  const isBrowserBuild = format in ["global", "esm-browser"];

  // 入口文件配置
  let entryFile = resolve("src/index.ts");
  // 导出文件名调整
  if (isProductionBuild) output.file = output.file.replace(".js", ".prod.js");

  // ts 插件配置
  const tsInfo = {
    tsconfig: resolve("tsconfig.json"),
    tsconfigOverride: {
      compilerOptions: {
        target: isBrowserBuild ? "es5" : "es6",
        outDir: resolve("dist"),
        sourceMap: !!process.env.SOURCE_MAP,
      },
    },
  };
  // replace 插件配置
  const replacements = {
    __TEST__: `false`,
    // esm-bundler 中 __DEV__ 不能直接替换为常量.
    __DEV__: isBundlerESMBuild
      ? `!!(process.env.NODE_ENV !== 'production')`
      : String(!isProductionBuild),
  };

  // 通用插件选项
  const plugins = [
    replace({ values: replacements, preventAssignment: true }),
    typescript(tsInfo),
  ];

  // terser 插件配置（Prod）
  if (isProductionBuild) {
    plugins.push(
      terser({
        compress: { arguments: true, dead_code: true },
        keep_classnames: true,
        keep_fnames: true,
      })
    );
  }

  return {
    input: entryFile,
    output: {
      ...output,
      // 开发环境默认开启 sourcemap
      sourcemap: !!process.env.SOURCE_MAP,
    },
    plugins,
  };
}

export default rollupConfigs;
