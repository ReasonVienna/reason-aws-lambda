// @flow

const pkgJson = require("../package");
const path = require("path");
const exec = require("child_process").exec;
const fs = require("fs");
const archiver = require("archiver");

import type { Logger } from "./types";

type BuildArtifactArgs = {
  reFile: string,
  zipFile: string,
  context: string,
  pkgs?: Array<string>,
  includeDirs?: Array<string>,
  logger?: Logger
};

type ReasonBuildArgs = {
  nativeFile: string,
  context: string,
  pkgs: Array<string>,
  includeDirs: Array<string>,
  logger?: Logger
};

const DEFAULT_LOGGER = {
  log: console.log,
  error: console.error
};

const AWS_INCLUDE = `.${pkgJson.name}`;

function ensureInclude(context: string = ""): Promise<void> {
  return new Promise((res, rej) => {
    const fullPath = path.join(context, AWS_INCLUDE);

    try {
      const stats = fs.statSync(fullPath);
    } catch (err) {
      rej(
        new Error(
          `Directory ${fullPath} does not exist... run XXX to set it up`
        )
      );
    }

    res();
  });
}

function execReasonBuild(args: ReasonBuildArgs): Promise<number> {
  const {
    nativeFile,
    context,
    pkgs,
    includeDirs,
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

  const buildPkgStr = `-pkgs ${pkgs.join(",")}`;

  const cmd = `eval $(dependencyEnv) && nopam && rebuild ${buildPkgStr} -use-ocamlfind -cflag -w -cflag -40 -Is ${includeDirs.join(",")} ${nativeFile}`;

  log(cmd);
  const child = exec(cmd, { stdio: [0, 0, 0], env, cwd: context });

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
    pkgs = [],
    includeDirs = [],
    logger: {
      log,
      error
    } = DEFAULT_LOGGER
  } = args;

  const name = path.basename(reFile, ".re");
  const nativeFile = path.join(path.dirname(reFile), `${name}.native`);

  // TODO: Would be ideal if we could use the node_modules path by default
  // const awsInclude = path.join('node_modules', pkgJson.name, 'include');

  try {
    await ensureInclude(context);
    await execReasonBuild({
      nativeFile,
      pkgs: ["yojson"].concat(pkgs),
      includeDirs: ["src", AWS_INCLUDE].concat(includeDirs),
      context,
      logger: args.logger
    });
  } catch (err) {
    throw new Error(`Could not compile '${reFile}': ${err.message}`);
  }

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
