Release Notes
=============

Version 0.31.2
--------------

- Fix silly bug with embedly display
- Fix logging of errors and exceptions to sentry (#813)
- Add a fancy loading animation to link posts
- Require uwsgi to honour stdin locally for debugging

Version 0.31.1
--------------

- Fixed locally failing lint
- Set requestedAuthnContext to False (#810)
- Add required environment variables to app.json (#808)
- Added user full name to ES document
- Add MAILGUN_SENDER_DOMAIN to app.json so it gets used by review apps (#807)
- Form utilities
- X-Forward settings (#804)
- Nginx headers for Touchstone (#803)
- Minor serializer test refactor

Version 0.31.0
--------------

- Added ES comment document indexing
- Backend modifications for resizing an uploaded image (#729)
- Fix comment serialization error, Celery error handling (#782)
- apt buildpack should be first (#800)
- Add security config and entityID setting (#797)
- Fixed id assignment during indexing

Version 0.30.2
--------------

- Fixed faulty downvote logic and added tests

Version 0.30.1
--------------

- Refactored lib/auth*.js files
- Update to latest version of React and a few other packages
- Remove authentication requirement for viewing SAML metadata (#773)

Version 0.30.0
--------------

- Remove redundant profile image and move &#39;incomplete&#39; dot
- Fix iframe styling issue
- Fix link post creation preview message bug
- Red dot next to incomplete profiles (#712)
- Fix for non-breaking code text in discussions (#753)
- Aptfile for heroku (#756)
- SAML login support (#735)

Version 0.29.1
--------------

- Fix issue with twitter embeds
- Fix heroku deploy (#752)
- Update some JS linting and code formatting dependencies
- Add management command to index comments and posts (#651)
- Add a user menu in the upper right

Version 0.29.0
--------------

- Use keyword so post_link_url won&#39;t be tokenized (#737)
- Refactored authentication code to its own app

Version 0.28.0
--------------

- Add tooltip for anonymous users for the voting buttons
- embedly styling (#715)
- Added jwt/micromasters python-social-auth backends
- Profile ImageFields (#708)
- Add a unique CSS class for every page in the app
- Fix issues with html returned from Embed.ly link type
- Hide the comment reply form if the user is anonymous
- Fix bug related to fetching subscriptions in App.js
- Hide the reply and follow buttons if the user is anonymous

Version 0.27.1
--------------

- Enable anonymous acces to the embedly API
- Added login/register via email
- Added Elasticsearch document and added indexing handlers for posts
- Increased uwsgi buffer size

Version 0.27.0
--------------

- Hide the report button for anonymous users
- Additions to Profile model and DRF API (#695)
- Hide settings and post link for anons
- Add a link preview to the link post creation screen
- README for OSX without docker-machine (#698)

Version 0.26.0
--------------

- Add Zendesk widget
- Add embedly frontend code
- Don&#39;t HTML escape subject lines for frontpage emails
- Simplified layout for notification email (#661)

Version 0.25.0
--------------

- Upgrade celery (#652)

Version 0.24.1
--------------

- Added handling for praw errors in email notifications
- Update frontend to allow anonymous access (#629)
- Don&#39;t run celery on Travis (#648)
- Add empty search Django app and elasticsearch Docker container (#645)
- Allow access for anonymous users to see moderator list (#627)
- Handle anonymous access for frontpage and posts (#628)
- Add API for embedly
- Fixed race condition with NotificationSettings trigger_frequency
- Handle anonymous users for comments (#621)
- Remove email_optin logic (#631)

Version 0.24.0
--------------

- Allow anonymous access for channels (#626)

Version 0.23.0
--------------

- Post / Comment follow settings UI
- Add post and comment follow buttons
- Fix failing test
- Add missing environment variable for Travis (#622)
- Added comment notifications

Version 0.22.2
--------------

- Fix some style issues with outlook
- Add error page for 403 error
- Setup Cloudfront for serving static assets

Version 0.22.1
--------------

- Fixed safe_format_recipients to quote display name
- Adds a read more button to digest email (#594)

Version 0.22.0
--------------

- changing logo in micromasters digest emails (#591)
- Add a link, in the sidebar, to the Settings page

Version 0.21.2
--------------

- Fix missing profile picture in email

Version 0.21.1
--------------

- Fix 401 auth errors (#579)

Version 0.21.0
--------------

- Some small font, margin, and profile image size tweaks (#580)
- Changed digest email subject line and other small changes (#578)
- Fixes some layout issues with the email template (#574)
- Fixed shrinking profile images in discussions (#571)
- Add the &#39;remove post&#39; button to the channel view

Version 0.20.0
--------------

- Ensure new users get the default NotificationSettings

Version 0.19.3
--------------

- Fix settings page
- Added email tasks to crontab

Version 0.19.2
--------------

- Fixed issue with request KeyError on email send

Version 0.19.1
--------------

- Fixed query error on populate command
- Added model and API to subscribe to comments and posts

Version 0.19.0
--------------

- Updated populate_notification_settings to add for comments and respect email_optin
- Added responsive frontpage email

Version 0.18.1
--------------

- Added cancelation and better error handling to email sending
- Upgrade Django to 1.11, other upgrades (#530)

Version 0.18.0
--------------

- Fixed celery log levels with sentry
- Fix travis errors
- Add the current user&#39;s name and profile image

Version 0.17.3
--------------

- Refactored and added user_activity middleware

Version 0.17.2
--------------

- Add settings page for adjusting notification prefs
- Added frontpage digest email tasks (#460, #461)

Version 0.17.1
--------------

- Fix calculation of loaded and notFound on the post page

Version 0.17.0
--------------

- Add report links to frontpage and channel page

Version 0.16.0
--------------

- Updated UI and views to use AuthenticatedSite (#444)
- A little renaming

Version 0.15.0
--------------

- Added stateless token auth to notification settings api
- Add the material radio component
- Proposed design for email notifications
- Added notifications settings (#459)
- Add more details to the README on env. settings and integration with MicroMasters
- fix comment permalink 404 issue
- Added report counts to report page (#495)
- Fix 403 error on post page (from moderator API)
- Added mail app supporting sending of emails (#449)

Version 0.14.0
--------------

- Add preventDefault wrapper to report post dialog
- Fix error with non-moderators editing posts
- Added Site models (#444)

Version 0.13.2
--------------

- Fixed error page on comment error (#477)
- Fix non-moderator comment editing
- Add profile image to CompactPostDisplay

Version 0.13.1
--------------

- Omit status check for code coverage to prevent blocking of deploys (#479)
- Automatically render plain URLs in Markdown as &lt;a&gt; tags
- Add comment sorting UI

Version 0.13.0
--------------

- Add channel moderation page

Version 0.12.0
--------------

- Added email and email_optin fields to user API (#447)

Version 0.11.0
--------------

- add UI for choosing post sort method
- Updated post/comment APIs to enable ignoring future reports (#427)
- Add comment permalinks

Version 0.10.1
--------------

- Added Comment sort api
- Added report counts to post/comment serializers (#432)
- Added sorting to posts and frontpage APIs (#192)

Version 0.10.0
--------------

- Add a footer
- Added API for listing reported content (#398)
- Fixes spacing with upvote arrows being too close together (#428)
- Add a 404 message to the channel page
- Added post/comment reporting UI (#235)

Version 0.9.0
-------------

- Add check_pip.sh (#419)
- Add a 404 page for Posts
- Added api to report posts and comments (#197)
- Have update-docker-hub update local dockerfiles (#418)

Version 0.8.2
-------------

- Refactored channels/views*.py into separate modules
- Fixed loading spinner on channel page

Version 0.8.1
-------------

- Changed public_description to be optional on channel creation
- Css tweaks to community guidelines page (#409)

Version 0.8.0
-------------

- Upgrade node.js version to 9.3 ⬆️
- Added user comment deletion
- Pin astroid to fix pylint issue (#406)
- Some dependency upgrades

Version 0.7.3
-------------

- Add user post deletion
- Added comment removal UI

Version 0.7.2
-------------

- Add support for dealing with dialogs in the UI reducer
- install the mdl-react-components package
- fix for url breaking layout problem (#394)
- upgrade the hammock package

Version 0.7.1
-------------

- Added comment removal API

Version 0.7.0
-------------

- Fix post pinning issue
- Add UI for pinning posts
- Refactored CommentTree to make it classy

Version 0.6.1
-------------

- Added UI to remove posts as a moderator

Version 0.6.0
-------------

- Make stickied not required (#378)
- Add spinner for Load more comments link (#371)
- Added editing of channel description

Version 0.5.2
-------------

- fixed styling of channel page (#360)
- Add pinning support to post API

Version 0.5.1
-------------

- Comments pagination (#298)
- Fix field name for channel description (#366)
- Added requests for channel moderators
- s/self/text/ on guidelines page
- Add post editing

Version 0.5.0
-------------

- Fix channel navigation error
- Add &#39;edited&#39; boolean to Post and Comment APIs
- Change copy for content guideline rules
- Updated posts API to handle remove moderation
- Default to empty description for new channel if not provided (#349)
- Fixed regression in CSS for new post page (#346)

Version 0.4.0
-------------

- Added channel description to API and UI
- Add comment editing UI
- Added content policy page (#314)
- Remove iflow-lodash, add flow-typed (#339)
- Add subreddit title to the API and frontend
- Split the PostDisplay component into two separate components
- Switched factories to class-based model and added created field
- Stabilized factory serialization

Version 0.3.4
-------------

- Refactored User/Profile factories to be UserFactory-centric

Version 0.3.3
-------------

- Added factories for reddit objects
- Handle Forbidden exception (#293)
- Refactor docker-compose layout (#324)

Version 0.3.2
-------------

- Monkey patch prawcore&#39;s rate limit to not limit
- Use application log level for Celery (#313)

Version 0.3.1
-------------

- Handle ALREADY_MODERATOR error (#292)
- Use ExtractTextPlugin to split CSS into separate file (#300)
- Mark AWS environment variables as not required (#312)
- Use try/finally in context managers (#311)
- Add https to placeholder
- Set focus on comment reply forms, add key combo to submit
- Bump psycopg version to 2.7
- Refactor betamax cassette code to automatically create cassettes (#305)
- Use yarn install --frozen-lockfile (#303)

Version 0.3.0
-------------

- Added caching for refresh and access tokens

Version 0.2.2
-------------

- Switched to static reddit OAuth for local
- Add the domain after the tile for URL posts
- Fix a bug with the MDC Drawer component
- Added docs with gh-pages style.

Version 0.2.1
-------------

- Added a setting for the JWT cookie name
- Highlight current channel in the nav sidebar
- Add validation when creating a post and make &#39;title&#39; field a textarea
- Limit max depth of comments (#284)
- Add MicroMasters link to toolbar (#259)
- Smaller avatars in comments section (#277)
- Fix root logger location (#266)

Version 0.2.0
-------------

- Added pagination for frontpage (#199)
- Add check for presence of mailgun variables (#249)

Version 0.1.0
-------------

- Fixing problems for realease
- Make public_description not required when creating a channel (#254)
- Numerous small tweaks to UI (#252)
- Upgrade eslint config (#260)
- Move collectstatic into docker-compose to match cookiecutter (#250)
- Fix issue w/ comment submit button being disabled during upvoting
- Fix logging configuration (#242)
- Added page for users who aren&#39;t logged in (#225)
- Tweaks to post display byline
- Small refactor to discussion flow types
- Add profile name to comment, post APIs
- Update URL in place instead of adding a new URL when new channel is selected (#224)
- Fix the channel select when creating posts in firefox
- Added flag to not check for praw updates
- Set document title
- Fix linting erros (#217)
- Mark posts and comments with missing users as deleted (#198)
- Change is_subscriber to return correct result if the user is a subscriber but not a contributor to a private channel (#189)
- Add script to import models for Django shell (#205)
- switch to using common eslint package
- Added access token header and settings (#164)
- Fix a little `npm run fmt` error
- set eslint `prefer-const` rule and fix violations
- Change create post form to have a channel select dropdown
- Add CORS whitelist
- Only redirect to auth on a 401 response (#182)
- Added add/remove subscriber
- Prevent submission of empty posts
- Disable submit buttons when requests are in flight
- Get scroll behavior on page transitions to work in the normal way
- Responsive tweaks to Profile image and comment layout (#173)
- Remove error when clicking &#39;cancel&#39; on create post page
- Add profile image to post + comment serializers and to UI
- Added JWT session renewal
- Fixed app.json to not require S3

