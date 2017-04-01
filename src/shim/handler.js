"use strict";

process.env["PATH"] = process.env["PATH"] +
  ":" +
  process.env["LAMBDA_TASK_ROOT"];

const fs = require("fs");
const os = require("os");
const child = require("child_process");
const byline = require("./byline");
let callback;

const proc = child.spawn("./Index.native", {
  stdio: ["pipe", "pipe", process.stderr]
});

const out = byline(proc.stdout);

out.on("data", line => {
  var msg = JSON.parse(line);
  callback(null, msg);
});

proc.on("error", err => {
  callback(new Error(`Failed execution: ${err.message}`));
  process.exit(1);
});

proc.on("exit", (code, signal) => {
  console.error("ERROR: ", code, " ", signal);
  process.exit(1);
});

module.exports.run = (event, context, cb) => {
  callback = cb;

  context.callbackWaitsForEmptyEventLoop = false;
  proc.stdin.write(JSON.stringify(event) + "\n");
};
