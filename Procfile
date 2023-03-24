release: bash scripts/heroku-release-phase.sh
web: bin/start-nginx bin/start-pgbouncer newrelic-admin run-program uwsgi uwsgi.ini
worker: bin/start-pgbouncer newrelic-admin run-program celery -A open_discussions.celery:app worker -Q spam,digest_emails,edx_content,default --concurrency=2 -B -l $OPEN_DISCUSSIONS_LOG_LEVEL
extra_worker_2x: bin/start-pgbouncer newrelic-admin run-program celery -A open_discussions.celery:app worker -Q spam,digest_emails,edx_content,default --concurrency=2 -l $OPEN_DISCUSSIONS_LOG_LEVEL
extra_worker_performance: bin/start-pgbouncer newrelic-admin run-program celery -A open_discussions.celery:app worker -Q spam,digest_emails,edx_content,default -l $OPEN_DISCUSSIONS_LOG_LEVEL
