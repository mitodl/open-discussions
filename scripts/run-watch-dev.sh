#!/usr/bin/env bash
#
# This script runs the react devserver, or runs a build, dependent on NODE_ENV
set -e

yarn install --immutable --inline-builds

if [[ $NODE_ENV == "production" ]] ; then
    echo "Building frontends for production..."
    yarn run build
    # Start a simple HTTTP server that other containers can query to know that
    # webpack is finished building.
    ./scripts/http-ok.sh
else
    echo "Starting frontends in dev mode..."
    yarn run start-dev
fi