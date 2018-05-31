# open_discussions
This provides a discussion forum for use with other MIT applications.

## Installation specific to this app

This app uses a similar stack to other mitodl apps (Docker/Django/Webpack). Installation steps that are common to
all of these apps can be found below, beginning with the [Major Dependencies](#major-dependencies) section. **Those
installation steps should be completed before the following steps, which are specific to this app.**

 1. Set up a reddit instance for use as a backing store. See the README
 at https://github.com/mitodl/reddit-config for instructions on how
 to set up reddit to work with open_discussions.
 1. Run the containers for open_discussions and navigate to the running site in your browser
    ([outlined here](#5-run-the-container)).

## Major Dependencies
- Docker
  - OSX recommended install method: [Download from Docker website](https://docs.docker.com/mac/)
- docker-compose
  - Recommended install: pip (`pip install docker-compose`)
- Virtualbox (https://www.virtualbox.org/wiki/Downloads)
- _(OSX only)_ Node/NPM, and Yarn
  - OSX recommended install method: [Installer on Node website](https://nodejs.org/en/download/)
  - No specific version has been chosen yet.

## Docker Container Configuration and Start-up

#### 1) Create your ``.env`` file

This file should be copied from the example in the codebase:

    cp .env.example .env

All the  variables in the ``.env``` file should then be manually populated with values.

The default values for ``OPEN_DISCUSSIONS_REDDIT_CLIENT_ID`` and ``OPEN_DISCUSSIONS_REDDIT_SECRET``
can be found in the reddit-config repo's Vagrantfile.

Set ``OPEN_DISCUSSIONS_BASE_URL`` to the ``protocol://host:port`` where open-discussions is reachable locally (e.g. http://localhost:8063).

#### 3) Build the containers
Run this command:

    docker-compose build

You will also need to run this command whenever ``requirements.txt`` or ``test_requirements.txt`` change.

#### 4) Create data structures
Create the database tables from the Django models:

    docker-compose run web ./manage.py migrate

#### 5) Run the container
Start Django, PostgreSQL, and other related services:

    docker-compose up

In another terminal tab, navigate to the open_discussions directory
and add a superuser in the now-running Docker container:

    docker-compose run web ./manage.py createsuperuser

You should now be able to do visit open_discussions in your browser on port `8063`. _(OSX Only)_ Docker auto-assigns
 the container IP. Run ``docker-machine ip`` to see it. Your open_discussions URL will
 be something like this: ``192.168.99.100:8063``.

#### 5a) Log in

There is no official login page yet, so in order to use the site as a logged in user, you'll need to login
via Django admin first (`http://<open_discussions_url>:8063/admin`). Use the credentials for the superuser you created
in the step above.

#### 5b) Set up initial channel/post data

The app UI is not currently usable until a channel exists and the logged-in user has a post associated with the channel.
The following commands will create a channel and a post:

First, create an authentication token (good for one hour) in a django shell.
 ```python
from django.contrib.auth.models import User
from rest_framework_jwt.settings import api_settings
user = User.objects.get(username=<superuser username>)
jwt_payload_handler = api_settings.JWT_PAYLOAD_HANDLER
jwt_encode_handler = api_settings.JWT_ENCODE_HANDLER
payload = jwt_payload_handler(user)
payload['roles'] = ['staff']
token = jwt_encode_handler(payload)
print(token)
```

Then use these bash commands with the above token to create a channel and post:
 ```bash
 TOKEN=<token>
 # Create a channel
 curl -X POST -H "Authorization: Bearer $TOKEN" "http://<open_discussions_url>:8063/api/v0/channels/" \
   -H "Content-Type: application/json" \
   -d '{"title": "Test Channel", "name": "test_channel", "public_description": "This is a test channel", "channel_type": "public"}'

 # Create a post for the channel
 curl -X POST -H "Authorization: Bearer $TOKEN" "http://<open_discussions_url>:8063/api/v0/channels/test_channel/posts/" \
   -H "Content-Type: application/json" \
   -d '{"text": "This is a text post in the test channel", "title": "Test Post", "channel_name": "test_channel"}'
 ```

#### 5c) Configure a site

Login to the admin ui and create a new site. Some example values for MicroMasters:

 - `key` -  `micromasters`
 - `title` - `MicroMasters`
 - `base_url` - `http://localhost:8079/`
 - `login_url` - `http://localhost:8079/discussions/`
 - `session_url` - `http://localhost:8079/api/v0/discussions_token/`
 - `tos_url` - `http://localhost:8079/terms-of-service`

In your `.env` file, set `OPEN_DISCUSSIONS_DEFAULT_SITE_KEY` to the `key` value from your record


## Running Commands and Testing

As shown above, manage commands can be executed on the Docker-contained
open_discussions app. For example, you can run a Python shell with the following command:

    docker-compose run web ./manage.py shell

Tests should be run in the Docker container, not the host machine. They can be run with the following commands:

    # Run the full suite
    ./test_suite.sh
    # Run Python tests only
    docker-compose run web tox
    # Single file test
    docker-compose run web tox /path/to/test.py
    # Run the JS tests with coverage report
    docker-compose run watch npm run-script coverage
    # run the JS tests without coverage report
    docker-compose run watch npm test
    # run a single JS test file
    docker-compose run watch npm test /path/to/test.js
    # Run the JS linter
    docker-compose run watch npm run-script lint
    # Run JS type-checking
    docker-compose run watch npm run-script flow
    # Run SCSS linter
    docker-compose run watch npm run scss_lint

Note that running [`flow`](https://flowtype.org) may not work properly if your
host machine isn't running Linux. If you are using a Mac, you'll need to run
`flow` on your host machine, like this:

    yarn install --frozen-lockfile
    npm run-script flow


#### 6) Integration with MicroMasters

MicroMasters and Open-Discussions share a cookie, which means that they need to be running on the same domain.
This can be emulated by modifying your hosts file, for example:

 ```
127.0.0.1  mm.odl.local
127.0.0.1  od.odl.local
 ```

The following variables should also be set in your Open-Discussions `.env` file, assuming you have modified your `hosts` file using `mm.odl.local` for Micromasters and `od.odl.local` for Open-Discussions:

```
OPEN_DISCUSSIONS_COOKIE_DOMAIN=odl.local
MICROMASTERS_EXTERNAL_LOGIN_URL=http://mm.odl.local:8079/discussions/
### Linux users should use this value...
MICROMASTERS_BASE_URL=http://mm.odl.local:8079/
### OSX users should use this value...
MICROMASTERS_BASE_URL=http://docker.for.mac.localhost:8079/   
```

The following variables and their values should copied directly from this .env file to the MicroMasters .env file:

```
OPEN_DISCUSSIONS_JWT_SECRET
OPEN_DISCUSSIONS_COOKIE_NAME
OPEN_DISCUSSIONS_COOKIE_DOMAIN
OPEN_DISCUSSIONS_SITE_KEY
```

These variables should also be added to the MicroMasters .env file:

```
FEATURE_OPEN_DISCUSSIONS_POST_UI=True
FEATURE_OPEN_DISCUSSIONS_CREATE_CHANNEL_UI=True

OPEN_DISCUSSIONS_API_USERNAME=<your_micromasters_username>
OPEN_DISCUSSIONS_REDIRECT_URL=http://od.odl.local:8063/complete/micromasters/
### Linux users should use this value...
OPEN_DISCUSSIONS_BASE_URL=http://od.odl.local:8063/
### OSX users should use this value...
OPEN_DISCUSSIONS_BASE_URL=http://docker.for.mac.localhost:8063/
```


#### 7) Testing integration with SAML via SSOCircle

*Note: Testing with ShibTest instead of SSOCircle fails unless python-saml3 is downgraded to 1.2.6 and `use="signing"` is removed from the `KeyDescriptor` tag of the SP metadata*

- Create an X.509 certificate & key with the following command:
  ```
  openssl req -new -x509 -days 365 -nodes -out saml.crt -keyout saml.key
  ```
- Enter values for the following [SAML configuration variables](http://python-social-auth-docs.readthedocs.io/en/latest/backends/saml.html) in your `.env` file
  ```
  FEATURE_SAML_AUTH=True
  SOCIAL_AUTH_SAML_SP_ENTITY_ID=http://od.odl.local:8063/
  SOCIAL_AUTH_SAML_SP_PUBLIC_CERT=<saml.crt contents, no spaces or returns>
  SOCIAL_AUTH_SAML_SP_PRIVATE_KEY= <saml.key contents, no spaces or returns>
  SOCIAL_AUTH_SAML_ORG_DISPLAYNAME=ODL Test
  SOCIAL_AUTH_SAML_CONTACT_NAME=<Your Name>
  SOCIAL_AUTH_SAML_IDP_ENTITY_ID=https://idp.ssocircle.com
  SOCIAL_AUTH_SAML_IDP_URL=https://idp.ssocircle.com:443/sso/SSORedirect/metaAlias/publicidp
  SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_PERM_ID=EmailAddress
  SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_NAME=FirstName
  SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_EMAIL=EmailAddress
  SOCIAL_AUTH_SAML_IDP_X509=MIIEYzCCAkugAwIBAgIDIAZmMA0GCSqGSIb3DQEBCwUAMC4xCzAJBgNVBAYTAkRFMRIwEAYDVQQKDAlTU09DaXJjbGUxCzAJBgNVBAMMAkNBMB4XDTE2MDgwMzE1MDMyM1oXDTI2MDMwNDE1MDMyM1owPTELMAkGA1UEBhMCREUxEjAQBgNVBAoTCVNTT0NpcmNsZTEaMBgGA1UEAxMRaWRwLnNzb2NpcmNsZS5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCAwWJyOYhYmWZF2TJvm1VyZccs3ZJ0TsNcoazr2pTWcY8WTRbIV9d06zYjngvWibyiylewGXcYONB106ZNUdNgrmFd5194Wsyx6bPvnjZEERny9LOfuwQaqDYeKhI6c+veXApnOfsY26u9Lqb9sga9JnCkUGRaoVrAVM3yfghv/Cg/QEg+I6SVES75tKdcLDTt/FwmAYDEBV8l52bcMDNF+JWtAuetI9/dWCBe9VTCasAr2Fxw1ZYTAiqGI9sW4kWS2ApedbqsgH3qqMlPA7tg9iKy8Yw/deEn0qQIx8GlVnQFpDgzG9k+jwBoebAYfGvMcO/BDXD2pbWTN+DvbURlAgMBAAGjezB5MAkGA1UdEwQCMAAwLAYJYIZIAYb4QgENBB8WHU9wZW5TU0wgR2VuZXJhdGVkIENlcnRpZmljYXRlMB0GA1UdDgQWBBQhAmCewE7aonAvyJfjImCRZDtccTAfBgNVHSMEGDAWgBTA1nEA+0za6ppLItkOX5yEp8cQaTANBgkqhkiG9w0BAQsFAAOCAgEAAhC5/WsF9ztJHgo+x9KV9bqVS0MmsgpG26yOAqFYwOSPmUuYmJmHgmKGjKrj1fdCINtzcBHFFBC1maGJ33lMk2bM2THx22/O93f4RFnFab7t23jRFcF0amQUOsDvltfJw7XCal8JdgPUg6TNC4Fy9XYv0OAHc3oDp3vl1Yj8/1qBg6Rc39kehmD5v8SKYmpE7yFKxDF1ol9DKDG/LvClSvnuVP0b4BWdBAA9aJSFtdNGgEvpEUqGkJ1osLVqCMvSYsUtHmapaX3hiM9RbX38jsSgsl44Rar5Ioc7KXOOZFGfEKyyUqucYpjWCOXJELAVAzp7XTvA2q55u31hO0w8Yx4uEQKlmxDuZmxpMz4EWARyjHSAuDKEW1RJvUr6+5uA9qeOKxLiKN1jo6eWAcl6Wr9MreXR9kFpS6kHllfdVSrJES4ST0uh1Jp4EYgmiyMmFCbUpKXifpsNWCLDenE3hllF0+q3wIdu+4P82RIM71n7qVgnDnK29wnLhHDat9rkC62CIbonpkVYmnReX0jze+7twRanJOMCJ+lFg16BDvBcG8u0n/wIDkHHitBI7bU1k6c6DydLQ+69h8SCo6sO9YuD+/3xAGKad4ImZ6vTwlB4zDCpu6YgQWocWRXE+VkOb+RBfvP755PUaLfL63AFVlpOnEpIio5++UjNJRuPuAA=
  ```
- Log in to open-discussions with a superuser account  
- Go to `http://od.odl.local:8063/saml/metadata/` and copy the XML response  
- Register & login for a free account at `ssocircle.net`, the email that you use to register will be used as your social-auth identifier
- After confirming your registration, go to https://idp.ssocircle.com/sso/hos/ManageSPMetadata.jsp
  - Click `Add new Service Provider`
  - Enter `od.odl.localhost` as the FQDN
  - Check `FirstName`, `EmailAddress`
  - Paste the XML response from above into the text field
  - Submit the form
- In an incognito browser window, go to `http://od.odl.local:8063/login/saml/?next=%2F&idp=default` 
- You should be redirected to SSOCircle, fill out the captcha and click `Continue SAML Single Sign On`
- You should be redirected back to the open-discussions home page, and be logged in. 
- Log out & back in as a superuser and to go the Users admin page.
  - There should be a new user with the same email address and name that you used to register with SSOCircle.



