release: bash scripts/heroku-release-phase.sh
web: bin/start-nginx bin/start-pgbouncer newrelic-admin run-program uwsgi uwsgi.ini
worker: bin/start-pgbouncer newrelic-admin run-program celery -A open_discussions.celery:app worker -Q spam,digest_emails,default -B -l $OPEN_DISCUSSIONS_LOG_LEVEL
extra_worker: bin/start-pgbouncer newrelic-admin run-program celery -A open_discussions.celery:app worker -Q spam,digest_emails,default -l $OPEN_DISCUSSIONS_LOG_LEVEL
