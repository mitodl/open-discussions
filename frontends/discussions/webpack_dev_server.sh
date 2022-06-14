#!/bin/bash
set -ef -o pipefail

if [[ "$1" == "--install" ]] ; then
yarn install && echo "Finished yarn install"
fi
echo "woof"
# Start the webpack dev server on the appropriate host and port
yarn workspace open-discussions run dev-server
