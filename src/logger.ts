export const log = (msg: string) => {
  console.log("----- INFO -----");
  console.log(msg);
  console.log("----------------");
};

export const error = (msg: string) => {
  console.error("------ error -----");
  console.error(msg);
  console.error("------------------");
};
