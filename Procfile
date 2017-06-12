web: bin/start-nginx bin/start-pgbouncer-stunnel newrelic-admin run-program uwsgi uwsgi.ini
worker: celery -A mit_open worker -B
extra_worker: celery -A mit_open worker
