#!/usr/bin/env bash
set -euf -o pipefail

docker-compose run --rm web ./scripts/test/python_tests.sh
docker-compose run --rm watch yarn lint-check
docker-compose run --rm watch yarn typecheck
