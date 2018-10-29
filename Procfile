web: bin/start-nginx bin/start-pgbouncer-stunnel newrelic-admin run-program uwsgi uwsgi.ini
worker: newrelic-admin run-program celery -A open_discussions.celery:app worker -B -l $OPEN_DISCUSSIONS_LOG_LEVEL
extra_worker: newrelic-admin run-program celery -A open_discussions.celery:app worker -l $OPEN_DISCUSSIONS_LOG_LEVEL
