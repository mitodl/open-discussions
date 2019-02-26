#!/bin/bash
set -eo pipefail

export NEXT=$(date | md5sum | cut -c -6)
export PROJECT_NAME="open_discussions"
echo "Next hash is $NEXT"

export WEB_IMAGE=mitodl/${PROJECT_NAME}_web_travis_${NEXT}

docker build -t $WEB_IMAGE -f Dockerfile .

docker push $WEB_IMAGE

sed -r -i "s|^FROM mitodl.+$|FROM $WEB_IMAGE|" travis/Dockerfile-travis-web
