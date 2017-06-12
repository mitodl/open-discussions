# mit_open
MIT Open

## Major Dependencies
- Docker
  - OSX recommended install method: [Download from Docker website](https://docs.docker.com/mac/)
- docker-compose
  - Recommended install: pip (`pip install docker-compose`)
- Virtualbox (https://www.virtualbox.org/wiki/Downloads)
- _(OSX only)_ Node/NPM
  - OSX recommended install method: [Installer on Node website](https://nodejs.org/en/download/)

## (OSX only) Getting your machine Docker-ready

#### Create your docker container:

The following commands create a Docker machine named ``mit_open``, start the
container, and configure environment variables to facilitate communication
with the edX instance.

    docker-machine create --driver virtualbox mit_open
    docker-machine start mit_open
    # 'docker-machine env (machine)' prints export commands for important environment variables
    eval "$(docker-machine env mit_open)"


## Docker Container Configuration and Start-up

#### 1) Create your ``.env`` file

This file should be copied from the sample in the codebase:

    cp .env.sample .env

Set the ``EDXORG_BASE_URL``, ``EDXORG_CLIENT_ID``, and ``EDXORG_CLIENT_SECRET``
variables in the ``.env`` file appropriately.

#### 2) _(OSX only)_ Set up and run the webpack dev server on your host machine

First, you'll need to add another variable into ``.env``:

    WEBPACK_DEV_SERVER_HOST='localhost'

In the development environment, our static assets are served from the webpack
dev server. When this environment variable is set, the script sources will
look for the webpack server at that host instead of the host where Docker is running.

Now, in a separate terminal tab, use the webpack helper script to install npm modules and run the dev server:

    ./webpack_dev_server.sh --install

The ``--install`` flag is only needed if you're starting up for the first time, or if updates have been made
to the packages in ``./package.json``. If you've installed those packages and there are no ``./package.json``
updates, you can run this without the ``--install`` flag: ``./webpack_dev_server.sh``

**DEBUGGING NOTE:** If you see an error related to node-sass when you run this script, try running
``npm rebuild node-sass``

#### 3) Run the container

For first-time container start-up, start it with a full build:

    docker-compose up --build

In another terminal tab, navigate to the mit_open directory
and add a superuser in the now-running Docker container:

    docker-compose run web python3 manage.py createsuperuser

Starting the container after this can be done without the ``--build``
param: ``docker-compose up``

You should now be able to do the following:

1. Visit mit_open in your browser on port `8063`. _(OSX Only)_ Docker auto-assigns
 the container IP. Run ``docker-machine ip`` to see it. Your mit_open URL will
 be something like this: ``192.168.99.100:8063``.

## Running Commands and Testing

As shown above, manage commands can be executed on the Docker-contained
mit_open app. For example, you can run a Python shell with the following command:

    docker-compose run web python3 manage.py shell

Tests should be run in the Docker container, not the host machine. They can be run with the following commands:

    # Run the full suite
    ./test_suite.sh
    # Run Python tests only
    docker-compose run web tox
    # Run the JS tests with coverage report
    docker-compose run watch npm run-script coverage
    # run the JS tests without coverage report
    docker-compose run watch npm test
    # run a single JS test file
    docker-compose run watch npm run-script singleTest /path/to/test.js
    # Run the JS linter
    docker-compose run watch npm run-script lint
