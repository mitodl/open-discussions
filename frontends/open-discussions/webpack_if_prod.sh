#!/bin/bash
set -ef -o pipefail
if [[ "$NODE_ENV" != "" && "$NODE_ENV" != "development" ]]
then
    yarn workspace discussions run build
fi
