export const log = (msg) => {
  console.log("----- INFO -----");
  console.log(msg);
  console.log("----------------");
};

export const error = (msg) => {
  console.error("------ error -----");
  console.error(msg);
  console.error("------------------");
};
