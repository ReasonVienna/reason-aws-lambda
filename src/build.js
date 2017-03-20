// @flow

import type { Logger } from "./types";

const execSync = require("child_process").execSync;
const fs = require("fs");
const path = require("path");
const buildArtifact = require("./buildArtifact");

type LambdaFunction = {
  path: string, // Relative filepath to the reasonProject context
  handler: string
};

type BuildArgs = {
  cwd?: string, // The directory of the project, which runs the build
  context?: string, // ReasonProject directory
  functions: {
    [key: string]: LambdaFunction
  },
  logger?: Logger,
  buildDir?: string
};

const DEFAULT_LOGGER = {
  log: console.log,
  error: console.error
};

async function build(args: BuildArgs): Promise<Array<string>> {
  const {
    cwd = process.cwd(),
    context = cwd,
    functions,
    logger: {
      log,
      error
    } = DEFAULT_LOGGER,
    buildDir = path.join(cwd, "_build")
  } = args;

  if (!fs.existsSync(buildDir)) {
    log(`Creating build directory '${buildDir}'...`);
    fs.mkdirSync(buildDir);
  }

  const promises = Object.keys(functions).map(async name => {
    const fn = functions[name];

    const zipFile = path.join(buildDir, `${name}.zip`);

    const ret = await buildArtifact({
      reFile: fn.path,
      zipFile,
      context
    });

    log(`Created zip ${zipFile}`);

    return ret;
  });

  return Promise.all(promises);
}

module.exports = build;
