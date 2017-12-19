#!/bin/bash
set -eo pipefail

docker build -t mitodl/open_discussions_web_travis_next -f Dockerfile .
docker build -t mitodl/open_discussions_watch_travis_next -f travis/Dockerfile-travis-watch-build .

docker push mitodl/open_discussions_web_travis_next
docker push mitodl/open_discussions_watch_travis_next
