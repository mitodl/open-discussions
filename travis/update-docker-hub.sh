#!/bin/bash
set -eo pipefail

docker build -t mitodl/mit_open_web_travis_next -f Dockerfile .
docker build -t mitodl/mit_open_watch_travis -f travis/Dockerfile-travis-watch-build .

docker push mitodl/mit_open_web_travis_next
docker push mitodl/mit_open_watch_travis
