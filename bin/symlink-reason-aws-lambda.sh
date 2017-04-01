#!/usr/bin/env bash

SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"

NODE_MODULES_DIR=$(npm root)

if [ ! -d "${NODE_MODULES_DIR}" ]; then
  echo "Could not find any 'node_modules' directory in this project ... try npm install?"
  exit 1
fi

# TODO: Read this from package.json
PACKAGE_NAME="reason-aws-lambda"
AWS_MODULE_DIR="${NODE_MODULES_DIR}/${PACKAGE_NAME}"

if [ ! -d "${AWS_MODULE_DIR}" ]; then
  echo "Seems like this project did not install '${PACKAGE_NAME}.... try npm install ${PACKAGE_NAME}'"
  exit 1
fi

SOURCE="${AWS_MODULE_DIR}/include"
TARGET=".${PACKAGE_NAME}"
ln -s $SOURCE $TARGET

echo "Created symlink ${SOURCE} -> ${TARGET}" 
