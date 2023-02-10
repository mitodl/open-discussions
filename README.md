# Open Discussions
This provides a discussion forum for use with other MIT applications.

**SECTIONS**
1. [Initial Setup](#initial-setup)
1. [Running and Accessing the App](#running-and-accessing-the-app)
1. [Testing and Formatting](#testing-and-formatting)
1. [Optional Setup](#optional-setup)


# Initial Setup

Open Discussions follows the same [initial setup steps outlined in the common ODL web app guide](https://mitodl.github.io/handbook/how-to/common-web-app-guide.html).
Run through those steps **including the addition of `/etc/hosts` aliases and the optional step for running the
`createsuperuser` command**.

After going through those steps in the common web app guide, run through these additional steps:

### Set up a reddit instance

Open Discussions needs a running reddit instance as a backing store. Go to the
[reddit-config](https://github.com/mitodl/reddit-config) repo for setup
instructions.


### Configure required `.env` settings

The following settings must be configured before running the app:

- `INDEXING_API_USERNAME`

    At least to start out, this should be set to the username of the superuser
    you created above.

- `MAILGUN_KEY` and `MAILGUN_SENDER_DOMAIN`

    You can set these values to any non-empty string value if email-sending functionality
    is not needed. It's recommended that you eventually configure the site to be able
    to send emails. Those configuration steps can be found [below](#enabling-email).

- `OPEN_DISCUSSIONS_HOSTNAME`
    
    Sets the hostname required by webpack for building the frontend. Should likely be whatever you set 
    the host to in your /etc/hosts or the hostname that you're accessing it from. Likely `od.odl.local`.

### Run the app and create a new user via the signup flow

The steps for running Open Discussions are outlined in the [common ODL web app guide for running and accessing the app](https://github.com/mitodl/handbook/blob/master/common-web-app-guide.md#running-and-accessing-the-app).

Once the app is running, navigate to `/signup` and follow the signup flow. As mentioned
above, this will involve receiving an email and clicking a link in that
email to verify your address.

### Configure user and set up initial channel/post data

The app UI is not currently usable until a channel exists and the logged-in user has a post associated with the channel.
The following block will create two channels (one public, one private) and a post in each, and
it will set your user as a moderator in these new channels.

Run this in a Django shell (change the channel names as needed):
```python
PUBLIC_CHANNEL = ('public_channel', 'Public Channel', 'public')
PRIVATE_CHANNEL = ('private_channel', 'Private Channel', 'private')
TEST_POST_TITLE = 'Test Post'
TEST_POST_TEXT = 'This is the test post content'
USER_FULL_NAME = 'Admin User'
#
import json
from rest_framework import status
from django.urls import reverse
from django.contrib.auth.models import User
from django.test.client import Client
from profiles.models import Profile
from channels.api import Api
CHANNEL_URL_NAME = 'channel-list'
POST_URL_NAME = 'post-list'
# Fetch & configure the new superuser
user = User.objects.get(is_superuser=True)
user.is_staff = True
user.save()
Profile.objects.get_or_create(user=user, name=USER_FULL_NAME)
#
client = Client()
client.force_login(user)
api = Api(user)
# Create channels and add your user as a moderator and contributor
for channel_tuple in [PUBLIC_CHANNEL, PRIVATE_CHANNEL]:
    # Create channel and post
    channel_req_data = dict(
      name=channel_tuple[0],
      title=channel_tuple[1],
      channel_type=channel_tuple[2],
    )
    channel_resp = client.post(
      reverse(CHANNEL_URL_NAME),
      data=json.dumps(channel_req_data),
      content_type='application/json'
    )
    if channel_resp.status_code == 409:
      if not api.is_moderator(channel_tuple[0], user.username):
        raise Exception(
          'Channel already exists, and your user cannot be set as a moderator [%s]'
          % channel_tuple[0]
        )
      continue
    elif not status.is_success(channel_resp.status_code):
      raise Exception('Failed to create channel - [%s] %s' % (
        channel_resp.status_code, channel_resp.content
      ))
    post_url = reverse(
      POST_URL_NAME,
      kwargs={'channel_name': channel_tuple[0]}
    )
    post_req_data = dict(
      title=TEST_POST_TITLE,
      text=TEST_POST_TEXT
    )
    post_resp = client.post(post_url, data=json.dumps(post_req_data), content_type='application/json')
    # Set user as a moderator and contributor
    api.add_moderator(user.username, channel_tuple[0])
    api.add_contributor(user.username, channel_tuple[0])
# Add notification settings
from notifications.models import NotificationSettings, NOTIFICATION_TYPE_FRONTPAGE, NOTIFICATION_TYPE_COMMENTS, FREQUENCY_NEVER, FREQUENCY_IMMEDIATE
NotificationSettings.objects.create(user=user, notification_type=NOTIFICATION_TYPE_FRONTPAGE, trigger_frequency=FREQUENCY_NEVER)
NotificationSettings.objects.create(user=user, notification_type=NOTIFICATION_TYPE_COMMENTS, trigger_frequency=FREQUENCY_IMMEDIATE)
```


# Running and Accessing the App

Open Discussions follows the same steps outlined in the [common ODL web app guide for running and accessing the app](https://github.com/mitodl/handbook/blob/master/common-web-app-guide.md#running-and-accessing-the-app).
A reddit instance at the URL indicated by `OPEN_DISCUSSIONS_REDDIT_URL` will need to be running for the app
to work properly.


# Testing and Formatting

[The commands outlined in the common ODL web app guide](https://github.com/mitodl/handbook/blob/master/common-web-app-guide.md#testing-and-formatting)
are all relevant to Open Discussions.

The following commands are also available:

```
# Format python code
docker-compose run --rm web black .
# Run storybook locally
docker-compose run -p 9001:9001 watch npm run storybook
```


# Optional Setup

Described below are some setup steps that are not strictly necessary
for running Open Discussions

### Enabling email

The app is usable without email-sending capability, but there is a lot of app functionality
that depends on it. The following variables will need to be set in your `.env` file -
please reach out to a fellow developer or devops for the correct values.

```
MAILGUN_SENDER_DOMAIN
MAILGUN_URL
MAILGUN_KEY
```

Additionally, you'll need to set `MAILGUN_RECIPIENT_OVERRIDE` to your own email address so
any emails sent from the app will be delivered to you.

### Enabling article posts

We have created a new post type beyond the 2 basic types that reddit allows (link posts and self/text posts).
It is based on text posts but allows the user to add a cover image, provides richer editing capabilities, etc.
To enable it, run through these steps:

1. Adjust channel settings to allow article posts. This can be done in one of two ways:
    1. Visit the channel settings page in the running app when logged in as a moderator user.
        Select the article checkbox under "Allowed Post Types" and save. 
        (There should be an option in the channel page header to visit the settings page, or
        you can navigate there directly: `/c/<channel_name>/settings/`).
    1. Update the channel directly in a Django shell:
        
        ```python
        from channels.models import Channel
        # To allow all post types for the channel...
        Channel.objects.filter(name="SOME_CHANNEL_NAME").update(
           allowed_post_types=Channel.allowed_post_types.link | Channel.allowed_post_types.self | Channel.allowed_post_types.article
        )        
        ```
1. Set up environment variables for the article UI. In `.env`, add:
    ```python
    FEATURE_ARTICLE_UI=True
    # Ask a fellow developer for the following values...
    CKEDITOR_ENVIRONMENT_ID=...
    CKEDITOR_SECRET_KEY=...
    CKEDITOR_UPLOAD_URL=...
    ```

### Enabling image uploads to S3

:warning: **NOTE: Article cover image thumbnails will be broken unless this is configured** :warning:

Article posts give users the option to upload a cover image, and we show a thumbnail for that 
image in post listings. We use Embedly to generate that thumbnail, so they will appear as 
broken images unless you configure your app to upload to S3. Steps:

1. Set `OPEN_DISCUSSIONS_USE_S3=True` in `.env`
1. Also in `.env`, set these AWS variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, 
    `AWS_STORAGE_BUCKET_NAME` 
    
    These values can be copied directly from the Open Discussions CI Heroku settings, or a 
    fellow dev can provide them.
    
### Enabling widgets

To enable channel widgets, run through these steps:

1. Run the management command to ensure that your channels are properly configured
    ```bash
    docker-compose run --rm web ./manage.py backpopulate_channel_widget_lists
    ```
1. Add `FEATURE_WIDGETS_UI=True` to your `.env`

### Enabling searching the course catalog on elasticsearch

To enable searching the course catalog on elasticsearch, run through these steps:
1. Start the services with `docker-compose up`
2. With the above running, run this management command, which kicks off a celery task, to create an elasticsearch index:
    ```
    docker-compose  run web python manage.py recreate_index --all
    ```
    If there is an error running the above command, observe what traceback gets logged in the celery service.
3. Once created and with `docker-compose up`  running, hit this endpoint in your browser to see if the index exists: `http://localhost:9101/discussions_local_all_default/_search`
4. If yes, to run a specific query, make a `POST` request (using `curl`, [Postman](https://www.getpostman.com/downloads/), Python `requests`, etc.) to the above endpoint with a `json` payload. For example, to search for all courses, run a query with Content-Type as `application/json` and with a body `{"query":{"term":{"object_type":"course"}}}`

### Running the app in a notebook

This repo includes a config for running a [Jupyter notebook](https://jupyter.org/) in a
Docker container. This enables you to do in a Jupyter notebook anything you might 
otherwise do in a Django shell. To get started:

- Copy the example file
    ```bash
    # Choose any name for the resulting .ipynb file
    cp app.ipynb.example app.ipynb
    ```
- Build the `notebook` container _(for first time use, or when requirements change)_
    ```bash
    docker-compose -f docker-compose-notebook.yml build
    ```
- Run all the standard containers (`docker-compose up`)
- In another terminal window, run the `notebook` container
    ```bash
    docker-compose -f docker-compose-notebook.yml run --rm --service-ports notebook
    ```
- Visit the running notebook server in your browser. The `notebook` container log output will
  indicate the URL and `token` param with some output that looks like this:
    ```
    notebook_1  |     To access the notebook, open this file in a browser:
    notebook_1  |         file:///home/mitodl/.local/share/jupyter/runtime/nbserver-8-open.html
    notebook_1  |     Or copy and paste one of these URLs:
    notebook_1  |         http://(2c19429d04d0 or 127.0.0.1):8080/?token=2566e5cbcd723e47bdb1b058398d6bb9fbf7a31397e752ea
    ```
  Here is a one-line command that will produce a browser-ready URL from that output. Run this in a separate terminal:
    ```bash
    APP_HOST="od.odl.local"; docker logs $(docker ps --format '{{.Names}}' | grep "_notebook_run_") | grep -E "http://(.*):8080[^ ]+\w" | tail -1 | sed -e 's/^[[:space:]]*//' | sed -e "s/(.*)/$APP_HOST/"
    ```
  OSX users can pipe that output to `xargs open` to open a browser window directly with the URL from that command.
- Click the `.ipynb` file that you created to run the notebook
- Execute the first block to confirm it's working properly (click inside the block
  and press Shift+Enter)
  
From there, you should be able to run code snippets with a live Django app just like you 
would in a Django shell.

### Integration with MicroMasters

The following steps assume that you've added `/etc/hosts` aliases for MicroMasters
and Open Discussions, and that those aliases are `mm.odl.local` and `od.odl.local`
respectively.

The following variables should be set in your Open Discussions `.env` file:

```
OPEN_DISCUSSIONS_COOKIE_DOMAIN=odl.local
MICROMASTERS_EXTERNAL_LOGIN_URL=http://mm.odl.local:8079/discussions/
### Linux users should use this value...
MICROMASTERS_BASE_URL=http://mm.odl.local:8079/
### OSX users should use this value...
MICROMASTERS_BASE_URL=http://docker.for.mac.localhost:8079/   
```

The following variables and their values should copied directly from this `.env` file
to the MicroMasters .env file:

```
OPEN_DISCUSSIONS_JWT_SECRET
OPEN_DISCUSSIONS_COOKIE_NAME
OPEN_DISCUSSIONS_COOKIE_DOMAIN
OPEN_DISCUSSIONS_SITE_KEY
```

These variables should also be added to the MicroMasters `.env` file:

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

### Testing integration with SAML via SSOCircle

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


## Commits

To ensure commits to github are safe, you should install the following first:
```
pip install pre_commit
pre-commit install
```

To automatically install precommit hooks when cloning a repo, you can run this:
```
git config --global init.templateDir ~/.git-template
pre-commit init-templatedir ~/.git-template
```    