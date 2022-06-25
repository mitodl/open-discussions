#!/bin/bash
set -ef -o pipefail
if [[ "$NODE_ENV" != "" && "$NODE_ENV" != "development" ]]
then
    yarn workspace util-components run build
fi
