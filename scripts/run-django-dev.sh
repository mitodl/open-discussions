#!/usr/bin/env bash
#
# This script runs the django app, waiting on the react applications to build

health_urls=(
    "http://watch:8052/health"
)
wait_time=600

if [[ $NODE_ENV == "production" ]] ; then
    # kick off healthchecks as background tasks so they can check concurrently
    for url in "${health_urls[@]}"
    do
        echo "Waiting on: ${url}"
        ./scripts/wait-for.sh ${url} --timeout ${wait_time} -- echo "${url} is available"

        if [[ $? -ne 0 ]]; then
            echo "Service at ${url} failed to start"
            exit 1
        fi
    done
fi


python3 manage.py collectstatic --noinput --clear
python3 manage.py migrate --noinput
python3 manage.py createcachetable

uwsgi uwsgi.ini --honour-stdin