FROM python:3.11.4 AS base
LABEL maintainer "ODL DevOps <mitx-devops@mit.edu>"

# Add package files, install updated node and pip
WORKDIR /tmp

# Install packages
COPY apt.txt /tmp/apt.txt
RUN apt-get update
RUN apt-get install -y $(grep -vE "^\s*#" apt.txt  | tr "\n" " ")

# pip
RUN curl --silent --location https://bootstrap.pypa.io/get-pip.py | python3 -

# copy in trusted certs
COPY --chmod=644 certs/*.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates 

# Poetry env configuration
ENV  \
  # poetry:
  POETRY_VERSION=1.8.2 \
  POETRY_VIRTUALENVS_CREATE=false \
  POETRY_CACHE_DIR='/tmp/cache/poetry' \
  POETRY_HOME='/home/mitodl/.local' \
  VIRTUAL_ENV="/opt/venv"

ENV PATH="$VIRTUAL_ENV/bin:$POETRY_HOME/bin:$PATH"

# Add, and run as, non-root user.
RUN mkdir /app
RUN adduser --disabled-password --gecos "" mitodl
RUN mkdir /var/media && chown -R mitodl:mitodl /var/media
RUN mkdir "${VIRTUAL_ENV}" && chown -R mitodl:mitodl "${VIRTUAL_ENV}"


USER mitodl
# Install poetry
RUN pipx install "poetry==$POETRY_VERSION"

# Install project packages
WORKDIR /app
COPY pyproject.toml poetry.lock /app
RUN python3 -m venv "$VIRTUAL_ENV"
RUN poetry install

USER root
RUN apt-get clean && apt-get purge


# Set pip cache folder, as it is breaking pip when it is on a shared volume
ENV XDG_CACHE_HOME /tmp/.cache

# Add project
COPY . /app

FROM base AS django

USER mitodl

# django-server target
# =======================================
FROM django AS django-server

EXPOSE 8063
ENV PORT 8063
CMD uwsgi uwsgi.ini
