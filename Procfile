web: bin/start-nginx bin/start-pgbouncer-stunnel newrelic-admin run-program uwsgi uwsgi.ini
worker: celery -A open_discussions worker -B -l $OPEN_DISCUSSIONS_LOG_LEVEL
extra_worker: celery -A open_discussions worker -l $OPEN_DISCUSSIONS_LOG_LEVEL
