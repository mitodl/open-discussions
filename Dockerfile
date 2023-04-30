FROM python:3.9.13 as base
LABEL maintainer "ODL DevOps <mitx-devops@mit.edu>"

# Add package files, install updated node and pip
WORKDIR /tmp

# Install packages
COPY apt.txt /tmp/apt.txt
RUN apt-get update
RUN apt-get install -y $(grep -vE "^\s*#" apt.txt  | tr "\n" " ")

# pip
RUN curl --silent --location https://bootstrap.pypa.io/get-pip.py | python3 -

# Add, and run as, non-root user.
RUN mkdir /app
RUN adduser --disabled-password --gecos "" mitodl
RUN mkdir /var/media && chown -R mitodl:mitodl /var/media

# Install project packages
COPY requirements.txt /tmp/requirements.txt
COPY test_requirements.txt /tmp/test_requirements.txt
RUN pip install -r requirements.txt -r test_requirements.txt

# Add project
COPY . /app
WORKDIR /app
RUN chown -R mitodl:mitodl /app

RUN apt-get clean && apt-get purge

# Set pip cache folder, as it is breaking pip when it is on a shared volume
ENV XDG_CACHE_HOME /tmp/.cache

FROM base as django

USER mitodl

FROM base as django-server

EXPOSE 8013
ENV PORT 8013
CMD uwsgi uwsgi.ini

FROM base as jupyter-notebook

RUN pip install --force-reinstall jupyter

USER mitodl
