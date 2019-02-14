#!/usr/bin/env bash

set -eo pipefail
indent() {
    RE="s/^/       /"
    [ $(uname) == "Darwin" ] && sed -l "$RE" || sed -u "$RE"
}

MANAGE_FILE=$(find . -maxdepth 3 -type f -name 'manage.py' | head -1)
# trim "./" from the path
MANAGE_FILE=${MANAGE_FILE:2}

echo "-----> Generating cache tables"
python $MANAGE_FILE createcachetable 2>&1 | indent
