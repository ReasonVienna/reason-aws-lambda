// @flow

const path = require("path");
const exec = require("child_process").exec;
const fs = require("fs");
const archiver = require("archiver");

import type { Logger } from "./types";

type BuildArtifactArgs = {
  reFile: string,
  zipFile: string,
  context: string,
  logger?: Logger
};

type ReasonBuildArgs = {
  nativeFile: string,
  context: string,
  logger?: Logger
};

const DEFAULT_LOGGER = {
  log: console.log,
  error: console.error
};

function execReasonBuild(args: ReasonBuildArgs): Promise<number> {
  const {
    nativeFile,
    context,
    logger: {
      log,
      error
    } = DEFAULT_LOGGER
  } = args;

  const reasonProjectBin = path.join(context, "node_modules", ".bin");
  const PATH = `${process.env.PATH || ""}:${reasonProjectBin}`;

  const env = Object.assign({}, process.env, { PATH });

  const cb = (err, stdout, stderr) => {
    if (err) {
      return;
    }
    error(stderr);
  };

  const child = exec(
    `eval $(dependencyEnv) && nopam && rebuild -use-ocamlfind -cflag -w -cflag -40 -I . ${nativeFile}`,
    { stdio: [0, 1, 2], env }
  );

  return new Promise((res, rej) => {
    child.on("exit", code => {
      if (code != 0) {
        rej(new Error(`Reason build exited with error code ${code}`));
        return;
      }
      res(code);
    });
    child.on("error", err => {
      rej(err);
    });
  });
}

async function buildArtifact(args: BuildArtifactArgs): Promise<string> {
  const {
    reFile,
    zipFile,
    context,
    logger: {
      log,
      error
    } = DEFAULT_LOGGER
  } = args;

  const name = path.basename(reFile, ".re");
  const nativeFile = path.join(path.dirname(reFile), `${name}.native`);

  try {
    await execReasonBuild({
      nativeFile,
      context,
      logger: args.logger
    });
  } catch (e) {}

  // Package the function
  const output = fs.createWriteStream(zipFile);
  const archive = archiver("zip", {
    store: true // Sets the compression method to STORE.
  });
  archive.pipe(output);

  // Add the Binary to the zip and make it executable
  const compiledNativeFile = path.join(context, "_build", nativeFile);
  archive.append(fs.createReadStream(compiledNativeFile), {
    name: "Index.native",
    mode: parseInt("0755", 8)
  });

  ["handler.js", "byline.js"].forEach(filename => {
    const filepath = path.join(__dirname, "shim", filename);
    archive.append(fs.createReadStream(filepath), { name: filename });
  });

  archive.finalize();

  await new Promise((res, rej) => {
    output.on("close", () => res());
    archive.on("error", err => rej(err));
  });

  return zipFile;
}

module.exports = buildArtifact;
