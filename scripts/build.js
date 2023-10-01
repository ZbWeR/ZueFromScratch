import fs from "node:fs";
import minimist from "minimist";
import chalk from "chalk";
import { execa } from "execa";

const argv = minimist(process.argv.slice(2));
const devOnly = argv.devOnly || argv.d;
const sourceMap = argv.sourceMap || argv.s;

build();

/**
 * 向 rollup 传递环境变量
 */
async function build() {
  try {
    let startTime = new Date();
    // 调用 rollup
    const { stderr } = await execa(
      "rollup",
      [
        "-c",
        "--environment",
        [
          `NODE_ENV:${devOnly ? "development" : "production"}`,
          `__DEV__:${devOnly ? "true" : "false"}`,
          sourceMap ? `SOURCE_MAP:true` : ``,
        ]
          .filter(Boolean)
          .join(","),
      ],
      { stdio: "pipe" }
    );
    // 输出构建相关信息
    await logTimeAndSize(stderr);

    let costTime = new Date() - startTime;
    console.log(chalk.bgGreenBright(`\n构建用时：${costTime} ms`));
  } catch (err) {
    console.error(err);
  }
}

/**
 * 输出文件信息：大小,耗时,路径
 * @param {string} stdout - 来自 rollup 的输出信息
 */
async function logTimeAndSize(stdout) {
  // 剔除颜色转义字符
  const str = stdout.replace(/\u001b\[\d+m/g, "");
  // 捕获文件名称与构建耗时
  const fileRegex = /created\s(.*?)\sin\s(\d+)ms/g;
  const matches = Array.from(str.matchAll(fileRegex), (match) => [
    match[1],
    match[2],
  ]);

  for (let match of matches) {
    const [filePath, costTime] = match;
    // 读取文件获得大小
    const { size } = await fs.promises.stat(filePath);
    const tmpStr = `Size: ${chalk.cyan(
      (size / 1024).toFixed(2) + "kb"
    )}, Time: ${chalk.cyan(costTime + "ms")}, File: ${chalk.cyan(filePath)}`;
    console.log(chalk.green(tmpStr));
  }
}
