#!/usr/bin/env bash

SCRIPTPATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

SRC="${SCRIPTPATH}/data/*"
DEST=$(dirname $SCRIPTPATH | xargs dirname)

# Copy static test data from scripts/test/data to project root.
cp -R $SRC $DEST