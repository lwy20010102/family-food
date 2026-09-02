import { spawn } from "node:child_process";

// Render may append `-- -p $PORT` to the package command. The Next CLI treats
// that form as a project-directory argument, so pass the platform port here
// and intentionally ignore package-manager passthrough arguments.
const nextCommand = process.platform === "win32" ? "next.cmd" : "next";
const args = ["start"];
if (process.env.PORT) {
  args.push("-p", process.env.PORT);
}

const child = spawn(nextCommand, args, {
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
