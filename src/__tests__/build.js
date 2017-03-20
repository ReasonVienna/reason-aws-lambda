// @flow

jest.setMock(
  "../buildArtifact",
  jest.fn(({ zipFile }) => Promise.resolve(zipFile))
);

const path = require("path");
const build = require("../build");
const buildArtifact = _mock(require("../buildArtifact"));

jest.mock("fs");
jest.mock("../buildArtifact");

function _mock(fn: any): JestMockFn {
  return fn;
}

it("should create test.zip assuming cwd to be a ReasonProject", async () => {
  buildArtifact.mockClear();

  const logger = {
    log: jest.fn(),
    error: jest.fn()
  };

  const result = await build({
    cwd: "/some/cwd",
    functions: {
      test: {
        path: "src/Test.re",
        handler: "test"
      }
    },
    buildDir: path.join("/some/cwd", "_build"),
    logger
  });

  const {
    reFile,
    zipFile,
    context
  } = buildArtifact.mock.calls[0][0];

  expect(reFile).toEqual("src/Test.re");
  expect(zipFile).toEqual("/some/cwd/_build/test.zip");
  expect(context).toEqual("/some/cwd");

  expect(logger.log.mock.calls).toMatchSnapshot();
  expect(result).toEqual(["/some/cwd/_build/test.zip"]);
});

it("should create test.zip with a different context path", async () => {
  buildArtifact.mockClear();

  const logger = {
    log: jest.fn(),
    error: jest.fn()
  };

  const result = await build({
    context: "/reason",
    cwd: "/some/cwd",
    functions: {
      test: {
        path: "src/test.re",
        handler: "test"
      }
    },
    logger,
    buildDir: path.join("/some/cwd", "_build")
  });

  expect(logger.log.mock.calls).toMatchSnapshot();
  expect(result).toEqual(["/some/cwd/_build/test.zip"]);
});
