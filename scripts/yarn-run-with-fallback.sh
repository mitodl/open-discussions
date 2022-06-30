#!/bin/bash

# Goal here is to not copy-paste many package.json scripts.
#
# `./yarn-run-with-fallback.sh script1 script2` will run script 1 if it exists
# and script 2 if it does not. This is useful when combined with foreach and
# global yarn commands (See https://yarnpkg.com/getting-started/qa#how-to-share-scripts-between-workspaces).
#
# For example
#
#   yarn workspaces foreach exec ${PROJECT_CWD}/scripts/yarn-run-with-fallback.sh some-script global:some-script
#
# will run `some-script` in every workspace in which it exists, and will
# fallback to `globa:some-script` if it does not exist in that workspace.
#
# NOTES:
# ======
# INIT_CWD and PROJECT_CWD are two yarn environment variables.
# See https://yarnpkg.com/advanced/lifecycle-scripts#environment-variables 

if [[ "$INIT_CWD" == "$PROJECT_CWD" ]]; then
    echo "skipping; this is root"
    exit 0
fi

cd $INIT_CWD

echo "Commands for workspace $INIT_CWD:"
yarn run

# `yarn run` by itself lists the available scripts in a workspace. This grep is
# potentially a bit fragile. A better way to determine if a script exists in a
# particular workspace would be nice.
if yarn run 2>/dev/null | grep -q "YN0000: $1 "; then
    yarn run $1
else
    echo "Workspace '$npm_package_name' did not provide command '$1', using '$2' instead."
    yarn run $2
fi