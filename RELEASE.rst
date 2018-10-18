Release Notes
=============

Version 0.50.1
--------------

- Revert "Added hover highlight on post card" (#1390)
- Fixed error when trying to use confirmation link a second time
- Fixed register API for existing MM users
- Channel design updates
- Fixed template context for email confirmation emails
- Add REST API for search (#1377)
- Configuration for black code formatter
- Implement new pinned post UI

Version 0.50.0 (Released October 17, 2018)
--------------

- Added fixes for email template font issues
- Add URL validation to create post form, fix issue with cancel button
- Fix styling of intro card on small phones
- 'Open Discussions' -> 'Open Learning' (#1355)
- add checkbox to PR template for mobile screenshots (#1362)
- Split posts and comments into separate Elasticsearch indices (#1341)
- Added a screenshots section to PR template (#1348)
- Hide useless asteroid warnings when running tests (#1340)
- Added hover highlight on post card
- Third pass of email templates

Version 0.49.2 (Released October 12, 2018)
--------------

- Fix spacing for top of channel loading animation

Version 0.49.1 (Released October 11, 2018)
--------------

- dang buttons
- Added new authentication class to ignore expired JWTs
- Upgrade react, react-dom to latest
- Link and button styling changes
- Change the message shown in the image upload dialog box

Version 0.49.0 (Released October 11, 2018)
--------------

- Added home page intro cards for logged in and anonymous users (#1268)
- Add moment as a dependency
- Fixes the dialog buttons submitting the form
- Channel-specific analytics should trigger on direct URL load (#1315)
- Shorten menu options (#1303)
- Install storybook and set up a few basic stories
- Fixed the --name arg to the set_channel_allow_top command
- Added login popup/tooltip to drawer compose button
- Styling tweaks for CompactPostDisplay
- Move edit icon to channel banner, add gradient for readability
- Fixed anonymous user signup prompt for post upvote button

Version 0.48.2 (Released October 05, 2018)
--------------

- Updated login tooltip prompt for anon users
- Bumped django version
- Fix styling issues on channel members tab

Version 0.48.1 (Released October 03, 2018)
--------------

- Added support for next param
- Refactored form update logic on post creation page
- Added support for conditional logo

Version 0.48.0 (Released October 02, 2018)
--------------

- Added base_url to password reset email
- Sort channels alphabetically (#1286)
- Replace underscores with dashes in post slugs (#1279)
- Fix issue with z-index on mobile drawer
- Replace percent with viewport dimensions (#1285)
- Revert "Added support for next param"
- Added support for next param
- update remove post dialog message to better match behavior (#1283)
- Removed JWT logic and made login url conditional on email auth flag
- Fix author line display on post page
- Tweaks for channel settings page
- Avoid squeezing snackbar message at narrow widths (#1282)
- Updated email templates and added mail debugger
- Fix auth card widths on various screen sizes

Version 0.47.2 (Released October 01, 2018)
--------------

- Show post type buttons after switching channels if empty (#1248)
- Hid social sharing buttons for private channel comments
- Remove "Show thread" from comment dropdown  (#1239)
- Fixed styling for incomplete profile indicator
- Fixed scrollbar-on-hover for the drawer
- Fix appearance of quoted text in post body
- Make MIT logo in <Footer /> a link
- Enabled scrollbar-on-hover behavior for the drawer

Version 0.47.1 (Released September 28, 2018)
--------------

- Convert "days ago" text to post/comment link (#1234)
- a few CSS fixes
- Increased comment text size
- Increased size of upvote & comment icons

Version 0.47.0 (Released September 25, 2018)
--------------

- Add channel header, title, headline to channel page
- Fixed login button width for narrow widths

Version 0.46.1 (Released September 24, 2018)
--------------

- remove 'MicroMasters' from community guidelines (#1174)
- ## Reports instead of Reported ## times (#1229)
- Changed HTTP response error handling to behave like form validation
- Show LoginPopup in comment textarea via focus/change events (#1220)
- fix issue with comment share URL
- Updated top nav styling
- Simplify exception handling for emails (#1206)
- Fix line-break issue in the navigation sidebar
- Added privacy policy and TOS
- Prevent comment dropdown menu from hovering over top bar
- Grouped channel post view tests together w/ common test scenario, other refactors
- Better handling of non-existent channels (#1184)
- Added new (unused as of yet) feature flag for branding changes (#1178)

Version 0.46.0 (Released September 19, 2018)
--------------

- Allow reddit errors to fail user creation
- fix small style regression
- Add description to basic channel form (#1199)
- Site redesign
- Always show current user at top of mods list (#1191)
- Refactored tests and added pytest-lazy-fixture
- Added random channel avatars and script to generate them
- Add subscriber when a moderator adds another moderator (#1190)

Version 0.45.2 (Released September 17, 2018)
--------------

- Move channel moderation page (#1183)
- Added banner message for PSA error messages

Version 0.45.1 (Released September 12, 2018)
--------------

- Add tests for ChannelModerationPage, fix remove post error (#1176)
- Validate a new link post URL before calling embedly (#1180)

Version 0.45.0 (Released September 12, 2018)
--------------

- Added empty post loading animation when posts are being loaded
- Extract correct channel name from edit pages (#1175)
- Don't show an error page if comment posting fails (#1165)

Version 0.44.2 (Released September 10, 2018)
--------------

- Recaptcha for new signups (#1159)
- Implement infinite scroll (#1104)
- Fix image uploads on Edge and iOS (#1155)
- Added link tags with rel=canonical to improve SEO and analytics

Version 0.44.1 (Released September 06, 2018)
--------------

- LoginPopup for comment reply buttons and post reply form (#1131)
- Added back button to login pages
- Add title and headline fields to edit channel appearance page (#1148)
- fix app.json

Version 0.44.0 (Released September 04, 2018)
--------------

- Add handling for AuthorizationFailed on expired JWTs
- create new helper function for simple component tests
- Added command and tasks to backpopulate a default channel's subscribers
- Add Raven.js (#1142)
- Configured login flow to show greeting for external auth providers
- Fixed overflow scrolling to only be vertical
- Use material dropdown instead of browser-native select

Version 0.43.1 (Released August 30, 2018)
--------------

- Changed API to pass allow_top and added mgmt command to update it (#950, #948)
- Upgrade to Babel v7

Version 0.43.0 (Released August 29, 2018)
--------------

- Fixed incorrect password UI bug
- Swapped order of authentication classes
- LoginPopup for Follow button (#1106)

Version 0.42.1 (Released August 24, 2018)
--------------

- remove some CSS which was creating another scrolling issue
- update comment UI for new designs
- Revert "Replace withLoading with Loading component (#1111)"
- Fix sidebar scrolling
- Replace withLoading with Loading component (#1111)
- Switch over to the material grid
- Make home link full width (#1108)
- Show snackbar when user adds/removes a moderator/contributor (#1099)
- Login popup for anonymous user vote buttons on post detail page (#1102)
- Move footer into sidebar (#1089)
- Add channel avatar to sidebar (#1082)

Version 0.42.0 (Released August 21, 2018)
--------------

- Add support for editing posts with the <Editor /> component
- Upgrade dependencies
- Add avatar_small and avatar_medium (#1086)

Version 0.41.4 (Released August 20, 2018)
--------------

- Upgrade to Django 2.0 (#1092)
- Show domain and link icon next to title of link post (#1090)
- Implement WYSIWYG editor for Posts

Version 0.41.3 (Released August 16, 2018)
--------------

- Use embedly image api to resize thumbnails in Embedly component (#1083)
- Banner message if creating a post on reddit fails (#1055)
- Remove IS_OSX since it's unnecessary with Docker for Mac (#1079)
- Fix profile image upload bug (#1081)

Version 0.41.2 (Released August 15, 2018)
--------------

- Made JWT redirect conditional on non-expired JWT
- Update edit profile form to match Invision design (#1073)
- Remove edit button from profile image on profile view page (#1071)

Version 0.41.1 (Released August 15, 2018)
--------------

- Add upload_to to banner and avatar (#1070)
- Implement uploading channel avatar and banner (#983)
- Updated staff permission to check user.is_staff for authenticated users
- Added well-named urls to urls.py
- fix typo in error log (#1021)
- Changed login UI to show image & name when email entered

Version 0.41.0 (Released August 14, 2018)
--------------

- Enable channel-specific google analytics tracking (#1019)
- Display author headline near name on post cards, limit length of headline text (#1030)
- Fixed contributor and moderator factories for username collisions
- Silence warning with empty profile fields (#1044)
- Fixed snackbar UI bugs
- Login button on header
- Move container level form code out of ProfileImage (#1031)
- Added WrappedComponent to our HOCs and taught the helper render how to traverse them
- Changed unrecognized email UX to a validation message

Version 0.40.1 (Released August 09, 2018)
--------------

- Improvements to moderator/contributor UI (#1024)
- Added redirect to MM on login
- Added redirect for new JWT tokens to /complete/provider

Version 0.40.0 (Released August 08, 2018)
--------------

- Fixed indent in PR template
- Added some PR template checkboxes
- Add can_remove field to serializers (#1017)
- Added a setting to change the default for feature flags
- Added API change to support prompting the user to login via MM
- Touched up account settings UI and added SAML auth type
- Add links to profile to comment, post displays
- Hide comment section header when post has no comments
- Notify user via snackbar when URL is copied

Version 0.39.1 (Released August 02, 2018)
--------------

- Set snackbar message when posts/comments are followed/unfollowed
- Add avatar and banner fields to serializer and models (#996)
- Use urls with post slugs in emails (#1009)
- Update the urlHostname function to remove www. from beginning of domains (#1014)
- fix profile dot location, user menu click area
- Fix save, cancel button alignment (#991)

Version 0.39.0 (Released July 31, 2018)
--------------

- Profile image improvements - generate initials png avatars and use as default url via gravatar API (#975)
- fix rich embed display width
- Updated user api to create social auth if provider_username is present
- Refactor profile upload to use withForm (#978)

Version 0.38.4 (Released July 30, 2018)
--------------

- Added banner component and changed "email sent" snackbar notification to use it
- Display link post thumbnails in list view (#956)

Version 0.38.3 (Released July 26, 2018)
--------------

- Removed email suggestion

Version 0.38.2 (Released July 25, 2018)
--------------

- Implement adding and removing moderators and contributors (#916)
- Added login & signup links to the signup & login pages

Version 0.38.1 (Released July 24, 2018)
--------------

- Save embedly thumbnail URL's (#944)
- Fix a bug with the create post page
- Filter out indexing user from moderator and contributor lists (#958)
- Allow readonly contributor view for moderators for managed channels (#962)
- Add membership notice and alert tab visibility based on channel type (#955)

Version 0.38.0 (Released July 24, 2018)
--------------

- Release date for 0.37.1
- General page layout tweaks

Version 0.37.1 (Released July 20, 2018)
--------------

- Support confirming email on a different device/browser
- Fix adding contributors and moderators by email (#953)
- Tweak embedly display
- Release date for 0.37.0
- Refactor moderator and contributor forms (#941)
- Implement adding contributors and moderators by email (#946)
- Check on server that channels are not managed before letting users moderate them (#940)
- make post body optional (frontend work)

Version 0.37.0 (Released July 18, 2018)
--------------

- Rename /register -&gt; /signup
- Make touchstone button &amp; MIT email invalidation contingent on FEATURE_SAML_AUTH flag  (#920)
- Added command to backpopulate social auth
- Refactor user create code and create social auth record for MM users
- Don&#39;t silence 403 status for reddit moderator API (#939)
- Remove duplicates when adding a new moderator or contributor (#914)
- Add readonly moderator and contributor tabs (#906)
- Fix flow issues with component prop typing
- Added password change UI
- Make text post body optional (#910)
- Fixed password reset UI and refactored redirect/load logic
- Add functions to add and remove moderators and contributors (#913)
- Implement new submit post design
- Add reducer and API function for contributors (#902)
- Make contributors API moderator-only and add moderator-only serializer for contributors (#898)
- Don&#39;t fetch from moderators list to check whether user is mod (#901)
- Change sandbox.create to createSandbox (#904)
- a few small CSS tweaks
- Description metatag (#884)
- Touchstone login UI (#895)

Version 0.36.1 (Released July 10, 2018)
--------------

- Add membership field to Channel and REST API serializer (#881)

Version 0.36.0 (Released July 09, 2018)
--------------

- Hide user menu if user is not logged in
- Added logout url back in after accidental removal
- Upgrade javascript dependencies (#863)
- Added password reset UI
- Replace &#39;channel&#39; with &#39;c&#39; in URLs, redirect old URLs to new ones (#876)
- Add scss to our fmt commands for prettier

Version 0.35.2 (Released July 06, 2018)
--------------

- Update post detail page to new design
- Remove KEEP_LOCAL_COPY feature flag (#879)
- Include reddit slug in post/comment URLs (#873)
- Scope fixed-width form styles to auth pages
- Added login/register UI

Version 0.35.1 (Released July 05, 2018)
--------------

- Add UI to edit post types (#852)
- Added link url to search serializer

Version 0.35.0 (Released July 03, 2018)
--------------

- Hide post button for channels not allowing it (#857)
- Add preventDefault to toolbar click handler (#862)

Version 0.34.1 (Released June 29, 2018)
--------------

- Redesign post listing
- Remove a flow workaround
- fix &#39;submit post&#39; button color

Version 0.34.0 (Released June 26, 2018)
--------------

- Add UI for editing channel types (#846)

Version 0.33.0 (Released June 22, 2018)
--------------

- Use gravatar for new profiles without images (#848)
- Added and updated APIs to support DRF-based social auth
- Pin dockerfile pytohn version to 3.6.4
- fix profile url (#849)
- View/edit profile (#828)
- Add autouse fixture to prevent requests from executing during tests (#822)

Version 0.32.2 (Released June 20, 2018)
--------------

- Use feature flag to determine whether to show profile incompleteness red dot (#838)
- Delete indices one by one to avoid use of _all (#829)

Version 0.32.1 (Released June 20, 2018)
--------------

- Fix a layout bug on the channel page
- Add models to store id information for posts, channels and comments (#742)
- Refactored Elasticsearch serializers to use DRF post/comment serializers

Version 0.32.0 (Released June 19, 2018)
--------------

- Update drawer and toolbar layout!
- Profile image uploader (#816)
- Added channel API middleware and moved channel API imports out of serializers

Version 0.31.2 (Released June 14, 2018)
--------------

- Fix silly bug with embedly display
- Fix logging of errors and exceptions to sentry (#813)
- Add a fancy loading animation to link posts
- Require uwsgi to honour stdin locally for debugging

Version 0.31.1 (Released June 12, 2018)
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

Version 0.31.0 (Released June 11, 2018)
--------------

- Added ES comment document indexing
- Backend modifications for resizing an uploaded image (#729)
- Fix comment serialization error, Celery error handling (#782)
- apt buildpack should be first (#800)
- Add security config and entityID setting (#797)
- Fixed id assignment during indexing

Version 0.30.2 (Released June 08, 2018)
--------------

- Fixed faulty downvote logic and added tests

Version 0.30.1 (Released June 07, 2018)
--------------

- Refactored lib/auth*.js files
- Update to latest version of React and a few other packages
- Remove authentication requirement for viewing SAML metadata (#773)

Version 0.30.0 (Released June 06, 2018)
--------------

- Remove redundant profile image and move &#39;incomplete&#39; dot
- Fix iframe styling issue
- Fix link post creation preview message bug
- Red dot next to incomplete profiles (#712)
- Fix for non-breaking code text in discussions (#753)
- Aptfile for heroku (#756)
- SAML login support (#735)

Version 0.29.1 (Released May 31, 2018)
--------------

- Fix issue with twitter embeds
- Fix heroku deploy (#752)
- Update some JS linting and code formatting dependencies
- Add management command to index comments and posts (#651)
- Add a user menu in the upper right

Version 0.29.0 (Released May 29, 2018)
--------------

- Use keyword so post_link_url won&#39;t be tokenized (#737)
- Refactored authentication code to its own app

Version 0.28.0 (Released May 24, 2018)
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

Version 0.27.1 (Released May 18, 2018)
--------------

- Enable anonymous acces to the embedly API
- Added login/register via email
- Added Elasticsearch document and added indexing handlers for posts
- Increased uwsgi buffer size

Version 0.27.0 (Released May 15, 2018)
--------------

- Hide the report button for anonymous users
- Additions to Profile model and DRF API (#695)
- Hide settings and post link for anons
- Add a link preview to the link post creation screen
- README for OSX without docker-machine (#698)

Version 0.26.0 (Released May 10, 2018)
--------------

- Add Zendesk widget
- Add embedly frontend code
- Don&#39;t HTML escape subject lines for frontpage emails
- Simplified layout for notification email (#661)

Version 0.25.0 (Released May 01, 2018)
--------------

- Upgrade celery (#652)

Version 0.24.1 (Released April 26, 2018)
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

Version 0.24.0 (Released April 23, 2018)
--------------

- Allow anonymous access for channels (#626)

Version 0.23.0 (Released April 19, 2018)
--------------

- Post / Comment follow settings UI
- Add post and comment follow buttons
- Fix failing test
- Add missing environment variable for Travis (#622)
- Added comment notifications

Version 0.22.2 (Released April 12, 2018)
--------------

- Fix some style issues with outlook
- Add error page for 403 error
- Setup Cloudfront for serving static assets

Version 0.22.1 (Released April 11, 2018)
--------------

- Fixed safe_format_recipients to quote display name
- Adds a read more button to digest email (#594)

Version 0.22.0 (Released April 09, 2018)
--------------

- changing logo in micromasters digest emails (#591)
- Add a link, in the sidebar, to the Settings page

Version 0.21.2 (Released April 05, 2018)
--------------

- Fix missing profile picture in email

Version 0.21.1 (Released April 04, 2018)
--------------

- Fix 401 auth errors (#579)

Version 0.21.0 (Released April 02, 2018)
--------------

- Some small font, margin, and profile image size tweaks (#580)
- Changed digest email subject line and other small changes (#578)
- Fixes some layout issues with the email template (#574)
- Fixed shrinking profile images in discussions (#571)
- Add the &#39;remove post&#39; button to the channel view

Version 0.20.0 (Released March 27, 2018)
--------------

- Ensure new users get the default NotificationSettings

Version 0.19.3 (Released March 23, 2018)
--------------

- Fix settings page
- Added email tasks to crontab

Version 0.19.2 (Released March 22, 2018)
--------------

- Fixed issue with request KeyError on email send

Version 0.19.1 (Released March 20, 2018)
--------------

- Fixed query error on populate command
- Added model and API to subscribe to comments and posts

Version 0.19.0 (Released March 19, 2018)
--------------

- Updated populate_notification_settings to add for comments and respect email_optin
- Added responsive frontpage email

Version 0.18.1 (Released March 14, 2018)
--------------

- Added cancelation and better error handling to email sending
- Upgrade Django to 1.11, other upgrades (#530)

Version 0.18.0 (Released March 12, 2018)
--------------

- Fixed celery log levels with sentry
- Fix travis errors
- Add the current user&#39;s name and profile image

Version 0.17.3 (Released March 08, 2018)
--------------

- Refactored and added user_activity middleware

Version 0.17.2 (Released March 07, 2018)
--------------

- Add settings page for adjusting notification prefs
- Added frontpage digest email tasks (#460, #461)

Version 0.17.1 (Released March 06, 2018)
--------------

- Fix calculation of loaded and notFound on the post page

Version 0.17.0 (Released March 05, 2018)
--------------

- Add report links to frontpage and channel page

Version 0.16.0 (Released February 26, 2018)
--------------

- Updated UI and views to use AuthenticatedSite (#444)
- A little renaming

Version 0.15.0 (Released February 22, 2018)
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

Version 0.14.0 (Released February 13, 2018)
--------------

- Add preventDefault wrapper to report post dialog
- Fix error with non-moderators editing posts
- Added Site models (#444)

Version 0.13.2 (Released February 09, 2018)
--------------

- Fixed error page on comment error (#477)
- Fix non-moderator comment editing
- Add profile image to CompactPostDisplay

Version 0.13.1 (Released February 08, 2018)
--------------

- Omit status check for code coverage to prevent blocking of deploys (#479)
- Automatically render plain URLs in Markdown as &lt;a&gt; tags
- Add comment sorting UI

Version 0.13.0 (Released February 06, 2018)
--------------

- Add channel moderation page

Version 0.12.0 (Released February 01, 2018)
--------------

- Added email and email_optin fields to user API (#447)

Version 0.11.0 (Released January 22, 2018)
--------------

- add UI for choosing post sort method
- Updated post/comment APIs to enable ignoring future reports (#427)
- Add comment permalinks

Version 0.10.1 (Released January 18, 2018)
--------------

- Added Comment sort api
- Added report counts to post/comment serializers (#432)
- Added sorting to posts and frontpage APIs (#192)

Version 0.10.0 (Released January 17, 2018)
--------------

- Add a footer
- Added API for listing reported content (#398)
- Fixes spacing with upvote arrows being too close together (#428)
- Add a 404 message to the channel page
- Added post/comment reporting UI (#235)

Version 0.9.0 (Released January 10, 2018)
-------------

- Add check_pip.sh (#419)
- Add a 404 page for Posts
- Added api to report posts and comments (#197)
- Have update-docker-hub update local dockerfiles (#418)

Version 0.8.2 (Released December 28, 2017)
-------------

- Refactored channels/views*.py into separate modules
- Fixed loading spinner on channel page

Version 0.8.1 (Released December 27, 2017)
-------------

- Changed public_description to be optional on channel creation
- Css tweaks to community guidelines page (#409)

Version 0.8.0 (Released December 21, 2017)
-------------

- Upgrade node.js version to 9.3 ⬆️
- Added user comment deletion
- Pin astroid to fix pylint issue (#406)
- Some dependency upgrades

Version 0.7.3 (Released December 15, 2017)
-------------

- Add user post deletion
- Added comment removal UI

Version 0.7.2 (Released December 13, 2017)
-------------

- Add support for dealing with dialogs in the UI reducer
- install the mdl-react-components package
- fix for url breaking layout problem (#394)
- upgrade the hammock package

Version 0.7.1 (Released December 12, 2017)
-------------

- Added comment removal API

Version 0.7.0 (Released December 11, 2017)
-------------

- Fix post pinning issue
- Add UI for pinning posts
- Refactored CommentTree to make it classy

Version 0.6.1 (Released December 05, 2017)
-------------

- Added UI to remove posts as a moderator

Version 0.6.0 (Released December 04, 2017)
-------------

- Make stickied not required (#378)
- Add spinner for Load more comments link (#371)
- Added editing of channel description

Version 0.5.2 (Released December 01, 2017)
-------------

- fixed styling of channel page (#360)
- Add pinning support to post API

Version 0.5.1 (Released November 30, 2017)
-------------

- Comments pagination (#298)
- Fix field name for channel description (#366)
- Added requests for channel moderators
- s/self/text/ on guidelines page
- Add post editing

Version 0.5.0 (Released November 29, 2017)
-------------

- Fix channel navigation error
- Add &#39;edited&#39; boolean to Post and Comment APIs
- Change copy for content guideline rules
- Updated posts API to handle remove moderation
- Default to empty description for new channel if not provided (#349)
- Fixed regression in CSS for new post page (#346)

Version 0.4.0 (Released November 21, 2017)
-------------

- Added channel description to API and UI
- Add comment editing UI
- Added content policy page (#314)
- Remove iflow-lodash, add flow-typed (#339)
- Add subreddit title to the API and frontend
- Split the PostDisplay component into two separate components
- Switched factories to class-based model and added created field
- Stabilized factory serialization

Version 0.3.4 (Released November 08, 2017)
-------------

- Refactored User/Profile factories to be UserFactory-centric

Version 0.3.3 (Released November 07, 2017)
-------------

- Added factories for reddit objects
- Handle Forbidden exception (#293)
- Refactor docker-compose layout (#324)

Version 0.3.2 (Released November 07, 2017)
-------------

- Monkey patch prawcore&#39;s rate limit to not limit
- Use application log level for Celery (#313)

Version 0.3.1 (Released November 06, 2017)
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

Version 0.3.0 (Released October 30, 2017)
-------------

- Added caching for refresh and access tokens

Version 0.2.2 (Released October 19, 2017)
-------------

- Switched to static reddit OAuth for local
- Add the domain after the tile for URL posts
- Fix a bug with the MDC Drawer component
- Added docs with gh-pages style.

Version 0.2.1 (Released October 12, 2017)
-------------

- Added a setting for the JWT cookie name
- Highlight current channel in the nav sidebar
- Add validation when creating a post and make &#39;title&#39; field a textarea
- Limit max depth of comments (#284)
- Add MicroMasters link to toolbar (#259)
- Smaller avatars in comments section (#277)
- Fix root logger location (#266)

Version 0.2.0 (Released October 10, 2017)
-------------

- Added pagination for frontpage (#199)
- Add check for presence of mailgun variables (#249)

Version 0.1.0 (Released October 06, 2017)
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

