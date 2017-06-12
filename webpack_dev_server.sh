#!/bin/bash
set -ef -o pipefail

if [[ $(uname -s) == "Darwin" ]] ; then
  IS_OSX_HOST_MACHINE="true"
else
  IS_OSX_HOST_MACHINE="false"
fi

if [[ "$IS_OSX_HOST_MACHINE" == 'true' ]] ; then
  WEBPACK_HOST='127.0.0.1'
elif [ -z "$WEBPACK_DEV_SERVER_HOST" ] ; then
  WEBPACK_HOST='0.0.0.0'
else
  WEBPACK_HOST="$WEBPACK_DEV_SERVER_HOST"
fi

if [ -z "$WEBPACK_DEV_SERVER_PORT" ] ; then
  WEBPACK_PORT='8062'
else
  WEBPACK_PORT="$WEBPACK_DEV_SERVER_PORT"
fi

# The webpack server should only be run in one of two cases:
#    1) The WEBPACK_DEV_SERVER_HOST env variable is not set. This means that the webpack server will run within the
#       Docker container, so we'll want to run the server when this script is invoked.
#    2) We're on an OSX host machine. Our current workflow for developing on a Docker container involves running
#       the webpack server on the host machine rather than the container.
# If neither of those are true, running this script is basically a no-op.

if [[ ! -z "$WEBPACK_DEV_SERVER_HOST" && "$IS_OSX_HOST_MACHINE" == 'false' ]] ; then
  echo -e "EXITING WEBPACK STARTUP SCRIPT\nOSX Users: The webpack dev server should be run on your host machine."
elif [[ -z "$WEBPACK_DEV_SERVER_HOST" || "$IS_OSX_HOST_MACHINE" == 'true' ]] ; then
  if [[ "$1" == "--install" ]] ; then
    yarn install --pure-lockfile && echo "Finished yarn install"
  fi
  # Start the webpack dev server on the appropriate host and port
  node ./hot-reload-dev-server.js --host "$WEBPACK_HOST" --port "$WEBPACK_PORT"
fi
