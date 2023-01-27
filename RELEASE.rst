Release Notes
=============

Version 0.205.0
---------------

- Import content files for mitx platform (#3811)
- Fix blank fields for xpro etl (#3809)
- Bump future from 0.18.2 to 0.18.3 (#3810)
- Bump terser from 5.14.1 to 5.16.1 (#3805)

Version 0.204.0 (Released January 17, 2023)
---------------

- Add all prolearn imports to professional offerings, handle multiple start/end dates as separate runs (#3804)
- Bump json5 from 1.0.1 to 1.0.2 (#3803)
- Bump loader-utils from 1.4.0 to 1.4.2 (#3791)
- Bump certifi from 2017.4.17 to 2022.12.7 (#3785)
- Bump decode-uri-component from 0.2.0 to 0.2.2 (#3784)

Version 0.203.0 (Released December 20, 2022)
---------------

- Import courses from the prolearn search api (#3790)
- Bump express from 4.16.3 to 4.17.3 (#3788)

Version 0.202.1 (Released November 18, 2022)
---------------

- Bump moment from 2.29.1 to 2.29.4 (#3765)

Version 0.202.0 (Released November 16, 2022)
---------------

- Bump nokogiri from 1.12.5 to 1.13.9 in /docs (#3764)

Version 0.201.2 (Released November 07, 2022)
---------------

- Remove Dockerfile line related to moira and ssl (#3771)
- Cc/linting updates (#3769)

Version 0.201.1 (Released October 31, 2022)
---------------

- Fix moira by updating openssl (#3768)
- Bump tzinfo from 1.2.7 to 1.2.10 in /docs (#3650)
- Bump pillow from 9.0.0 to 9.0.1 (#3538)
- Bump django from 2.2.27 to 2.2.28 (#3560)

Version 0.201.0 (Released October 04, 2022)
---------------

- Use react-helmet-async instead of react-meta-tags, add noindex meta tag to 404/403 error pages (#3757)

Version 0.200.0 (Released September 28, 2022)
---------------

- Connect LearningResource Drawer to router (#3753)

Version 0.199.4 (Released September 21, 2022)
---------------

- Update course-search-utils to fix routing issue (#3732)
- Remove bootcamps, csail, mitpe, see platform courses (#3749)

Version 0.199.3 (Released September 20, 2022)
---------------

- Wider widget sidebar; more consistent breakpoints (#3742)

Version 0.199.2 (Released September 19, 2022)
---------------

- Refactor xpro course file sync (#3743)

Version 0.199.1 (Released September 15, 2022)
---------------

- Set published=False for openedx courses if no runs are published (#3735)

Version 0.199.0 (Released September 15, 2022)
---------------

- Remove transient errors in start-dev (#3736)
- fix permissions (#3733)
- support videos in drawer (#3728)

Version 0.198.1 (Released September 08, 2022)
---------------

- Cc/smaller bundle (#3725)

Version 0.198.0 (Released September 07, 2022)
---------------

- Cc/url widget (#3721)
- add jest-watch-typeahead (#3723)

Version 0.197.0 (Released September 07, 2022)
---------------

- Enforce uniqueness for instructor full name, get rid of existing dupes (#3717)
- infinite drawer (#3708)
- support richtext editing/display in ol-widgets (#3713)
- Import and index MITX Online courses and content (#3700)

Version 0.196.0 (Released August 29, 2022)
---------------

- Reordering widgets (#3710)

Version 0.195.2 (Released August 29, 2022)
---------------

- Widget Editing in Infinite Corridor (#3702)

Version 0.195.1 (Released August 24, 2022)
---------------

- upgrade python-saml3, add aptfile packages for heroku-22 (#3704)
- Handle non-numerical status codes from elasticsearch (#3705)

Version 0.195.0 (Released August 23, 2022)
---------------

- Viewing (plaintext) widgets (#3699)

Version 0.194.1 (Released August 17, 2022)
---------------

- Cc/styling 2 (#3692)

Version 0.194.0 (Released August 17, 2022)
---------------

- FieldChannel banner menu dropdown (#3693)
- Move widget/group creation for fields to signal (#3689)
- Basic field edit form (add/remove/sort lists) (#3682)

Version 0.193.0 (Released August 15, 2022)
---------------

- search styles (#3685)
- facets (#3683)
- Cc/styling tweaks (#3679)

Version 0.192.2 (Released August 04, 2022)
---------------

- fix channel header z-index issue (#3676)
- Set imagekit prefix to "" (#3674)
- Fix styling conflicts: remove some classless tag selectors (#3673)

Version 0.192.1 (Released August 04, 2022)
---------------

- Cc/field pages v1 (#3665)
- rtl tests for search (#3669)
- fix useSearchParams (#3670)
- Preliminary field edit page with appearance form tab (#3661)

Version 0.192.0 (Released August 01, 2022)
---------------

- Learning Resource Cards (#3659)
- fix facet label (#3658)

Version 0.191.4 (Released July 29, 2022)
---------------

- infinite search (#3645)
- For field channel API serializer, return "lists" attribute as ordered list of UserLists (#3656)
- Cc/field pages v0 (#3654)

Version 0.191.3 (Released July 27, 2022)
---------------

- Improve jest request mocking/spying (#3653)

Version 0.191.2 (Released July 26, 2022)
---------------

- Featured list, lists and subfields for FieldChannel (#3648)

Version 0.191.1 (Released July 25, 2022)
---------------

- Infinite Corridor Front Page Round 2 (#3647)
- Fix tox (#3649)
- Stricter ts linting, in-line with ocw-studio (#3644)
- Change behavior of course_ui_enabled flag (#3634)

Version 0.191.0 (Released July 20, 2022)
---------------

- Update newrelic (#3640)
- Update celery, redis (#3638)
- Remove a few unused css classes (#3628)
- Upgrade python to 3.9 (#3624)
- Cc/cards (#3629)
- Infinite Corridor front page (#3619)

Version 0.190.1 (Released July 14, 2022)
---------------

- Remove OPEN_DISCUSSIONS_DEFAULT_SITE_KEY and authenticated site section of README (#3617)

Version 0.190.0 (Released July 13, 2022)
---------------

- discussions search uses new course-search-utils (#3616)
- Extract CourseSearchbox (as Searchbox) (#3614)

Version 0.189.0 (Released July 11, 2022)
---------------

- Use prettier v2 for better typescript support (#3612)
- fix ci commands; remove flowgen (#3610)
- no devdeps, only dependencies (#3611)
- fix some formatting in the readme (#3604)
- Begin sharing (some) frontend code + styling between open-discussions and infinite-corridor (#3601)

Version 0.188.1 (Released June 29, 2022)
---------------

- fix yarn postinstall script (#3597)
- remove test_webpack_url
- gitignore vscode dir
- fix prosemirror version
- remove accidental files
- address prosemirror and global.process issues
- add test data for ci
- remove DISABLE_WEBPACK_LOADER_STATS
- add new frontend
- switch to yarn workspaces + update webpack
- move files

Version 0.188.0 (Released June 22, 2022)
---------------

- Remove sites app, add django.contrib.sites app (#3591)

Version 0.187.0 (Released June 22, 2022)
---------------

- Field Pages for InfiniteCorridor - backend (#3586)
- remove UWSGI_THREAD_COUNT from .env.example

Version 0.186.0 (Released June 06, 2022)
---------------

- fix ocw-next delete command

Version 0.185.0 (Released May 25, 2022)
---------------

- Upgrade feedparser to fix heroku build failure (#3578)
- Assign url, and save full url path as run_slug, for ocw courses (#3576)
- Remove algolia places, LocationPicker component, and profile location field (#3566)

Version 0.184.1 (Released May 17, 2022)
---------------

- update ocw-data-parser (#3569)
- Added heroku deployment workflows

Version 0.184.0 (Released May 02, 2022)
---------------

- Remove unpublished OCW courses from search index (#3562)

Version 0.183.0 (Released May 02, 2022)
---------------

- Unquote s3 file path to key (#3559)

Version 0.182.2 (Released April 20, 2022)
---------------

- fix department import

Version 0.182.1 (Released April 13, 2022)
---------------

- update ocw-data-parser (#3552)

Version 0.182.0 (Released April 11, 2022)
---------------

- fix ocw images

Version 0.181.0 (Released April 05, 2022)
---------------

- fix backpopulate_ocw_next_data --delete

Version 0.180.0 (Released March 24, 2022)
---------------

- Fix command (#3541)
- update ocw-data-parser (#3539)

Version 0.179.2 (Released March 14, 2022)
---------------

- fewer indexing jobs

Version 0.179.1 (Released March 11, 2022)
---------------

- fix: fetching and storing instructor's full name (#3529)

Version 0.179.0 (Released March 07, 2022)
---------------

- Update ocw-data-parser, allow list of course paths to be passed to backpopulate_ocw_data (#3528)

Version 0.178.3 (Released March 02, 2022)
---------------

- fix video thumbnails in search
- Recognize fancy double quotes for phrase search (#3522)

Version 0.178.2 (Released February 24, 2022)
---------------

- OCW Next Webhook Updates

Version 0.178.1 (Released February 22, 2022)
---------------

- Revert "Bump celery from 4.3.0 to 5.2.2"
- Bump django from 2.2.24 to 2.2.27
- Bump django-filter from 2.2.0 to 2.4.0
- Bump ipython from 7.12.0 to 7.16.3
- Bump pillow from 8.3.2 to 9.0.0
- Bump celery from 4.3.0 to 5.2.2
- Bump lxml from 4.6.3 to 4.6.5

Version 0.178.0 (Released February 16, 2022)
---------------

- content file fixes

Version 0.177.0 (Released February 11, 2022)
---------------

- Option to force S3 uploads of OCW data via ocw-data-parser (#3502)

Version 0.176.0 (Released February 10, 2022)
---------------

- resource import

Version 0.175.3 (Released January 26, 2022)
---------------

- fixes for sentry errors
- Import ocw-next courses

Version 0.175.2 (Released December 14, 2021)
---------------

- Bump validator from 10.11.0 to 13.7.0
- Bump nth-check from 2.0.0 to 2.0.1
- Bump nokogiri from 1.11.5 to 1.12.5 in /docs
- change Video model duration column width
- Bump pillow from 8.2.0 to 8.3.2
- fix tests

Version 0.175.1 (Released September 28, 2021)
---------------

- Update ocw-data-parser (#3475)

Version 0.175.0 (Released August 17, 2021)
---------------

- Bump path-parse from 1.0.6 to 1.0.7

Version 0.174.0 (Released August 11, 2021)
---------------

- fix ocw webhook
- Upgrade ocw-data-parser (#3468)
- make ocw backpopulate restartable

Version 0.173.0 (Released August 04, 2021)
---------------

- dont overwrite image_src when upload_to_s3=False

Version 0.172.0 (Released July 27, 2021)
---------------

- Bump addressable from 2.7.0 to 2.8.0 in /docs
- Bump striptags from 3.1.1 to 3.2.0

Version 0.171.1 (Released July 15, 2021)
---------------

- sort by department coursenum when there is a department filter
- Add course argument to filter backpopulate_ocw_data (#3450)

Version 0.171.0 (Released July 15, 2021)
---------------

- Remove WEBHOOK_OCW flag, get-ocw-data from celery beat (#3451)

Version 0.170.2 (Released July 08, 2021)
---------------

- Upgrade ocw-data-parser to version 0.29.2 (#3448)

Version 0.170.1 (Released June 29, 2021)
---------------

- avoid parsing all documents at once

Version 0.170.0 (Released June 21, 2021)
---------------

- Bump django from 2.2.20 to 2.2.24 (#3438)
- Bump markdown2 from 2.3.9 to 2.4.0 (#3421)
- Bump pillow from 8.1.1 to 8.2.0 (#3432)
- Bump css-what from 5.0.0 to 5.0.1 (#3428)

Version 0.169.0 (Released June 15, 2021)
---------------

- Add timeout to address flaky test (#3441)

Version 0.168.2 (Released June 11, 2021)
---------------

- Add coursenum to index (#3437)
- Upgrade ocw-data-parser for archived versions (#3435)

Version 0.168.1 (Released June 10, 2021)
---------------

- upgrade jsdom
- Allow codecov upload to fail
- remove environment variables
- value needs to be a string
- set extra worker concurrency
- set celery worker concurrency
- support multiple departments

Version 0.168.0 (Released June 07, 2021)
---------------

- replace node-sass with just sass

Version 0.167.1 (Released June 03, 2021)
---------------

- Bump nokogiri from 1.11.0 to 1.11.5 in /docs

Version 0.167.0 (Released June 02, 2021)
---------------

- Remove mappings for Resources and Exercises from OCW_SECTION_TYPE_MAPPING (#3415)

Version 0.166.0 (Released May 25, 2021)
---------------

- downgrade the react-dotdotdot package

Version 0.165.2 (Released May 24, 2021)
---------------

- A few dependency upgrades

Version 0.165.1 (Released May 21, 2021)
---------------

- fix digest task queue
- avoid new user posts in notification

Version 0.165.0 (Released May 18, 2021)
---------------

- set ocw-data-parser to 0.28.0 in requirements.in and run pip-compile (#3398)

Version 0.164.3 (Released May 14, 2021)
---------------

- fix to salutation pr
- Revert "Revert "fix salutation""
- add excluded course files
- adjust PR template
- Run apt-get update for ci build (#3392)

Version 0.164.2 (Released May 07, 2021)
---------------

- Revert "fix salutation"
- Add to history stack on changes to search UI, and support back button (#3385)
- Bump rsa from 4.1 to 4.7
- fix salutation
- fix similar items error

Version 0.164.1 (Released April 29, 2021)
---------------

- update-index command

Version 0.164.0 (Released April 28, 2021)
---------------

- OCW data parser 0.27.0
- Bump ssri from 6.0.1 to 6.0.2 (#3372)

Version 0.163.2 (Released April 15, 2021)
---------------

- fix notifications setting error
- Bump django from 2.2.18 to 2.2.20

Version 0.163.1 (Released April 12, 2021)
---------------

- add resource filters for recreate index

Version 0.163.0 (Released April 05, 2021)
---------------

- fix google_tag_manager sentry error

Version 0.162.1 (Released April 01, 2021)
---------------

- Bump pygments from 2.5.2 to 2.7.4
- Bump pyyaml from 5.1.2 to 5.4
- Bump y18n from 3.2.1 to 3.2.2
- fix channel settings
- Bump lxml from 4.6.2 to 4.6.3
- fix channel tracking

Version 0.162.0 (Released March 31, 2021)
---------------

- Add resource_type to ES index for ContentFiles (#3347)
- Bump rsa from 4.0 to 4.1 (#3346)
- Bump djangorestframework from 3.10.3 to 3.11.2 (#3341)
- Bump pillow from 7.2.0 to 8.1.1 (#3337)
- ocw-data-parser version 0.26.0

Version 0.161.2 (Released March 29, 2021)
---------------

- Bump django from 2.2.13 to 2.2.18

Version 0.161.1 (Released March 24, 2021)
---------------

- manually send gtag events

Version 0.161.0 (Released March 22, 2021)
---------------

- Fix test which wasn't running (#3334)
- Fix typo in logging exception (#3333)
- podcasts in notifications
- update ocw data parser

Version 0.160.2 (Released March 19, 2021)
---------------

- Fix migration conflict (#3330)
- expose ga tracking id to moderators
- Add "course feature tags" to index for ocw and remove some obsolete code (#3317)

Version 0.160.1 (Released March 15, 2021)
---------------

- check for gtag in channel tracker
- make tracking with new google analytics g-tags possible
- Upgrade ocw-data-parser to 0.24 (#3321)
- Bump elliptic from 6.5.3 to 6.5.4

Version 0.160.0 (Released March 11, 2021)
---------------

- ATHENA_MITX_DATABASE -> ATHENA_MITX_DATABASE_NAME
- enrollments for single user

Version 0.159.0 (Released February 24, 2021)
---------------

- do not send moderator notifications for posts marked as spam automatically

Version 0.158.0 (Released February 18, 2021)
---------------

- update ocw-data-parser (#3310)

Version 0.157.1 (Released February 10, 2021)
---------------

- Bump cryptography from 3.2 to 3.3.2
- Bump httplib2 from 0.18.0 to 0.19.0
- remove read more button

Version 0.157.0 (Released February 10, 2021)
---------------

- add enrollment models

Version 0.156.0 (Released January 27, 2021)
---------------

- add try catch around finding notification setting
- ab/remove-profile-last-updated-on
- fix inactive setting
- Don't show suggestion if it is effectively the same as search text (#3287)
- update django-cors-headers to allow regex
- moderator notification setting ui

Version 0.155.1 (Released January 21, 2021)
---------------

- upgrade to the latest version of redux-hammock

Version 0.155.0 (Released January 19, 2021)
---------------

- pass bucket name to ocw parser on initialization (#3282)
- add new queue to procfile
- Ensure test_url_widget_serialize sorts entries by reverse date (#3276)
- Bump lxml from 4.5.0 to 4.6.2 (#3274)
- Upgrade ocw-data-parser to 0.20.0 (#3270)
- separate digest email queue
- Bump cairosvg from 2.1.3 to 2.5.1

Version 0.154.1 (Released January 07, 2021)
---------------

- Do not publish courses without runs (#3269)
- Fix insecure nokogiri dependency for github pages

Version 0.154.0 (Released January 04, 2021)
---------------

- Upload OCW course JSON to S3 regardless of publish state (#3264)
- Bump ini from 1.3.5 to 1.3.7 (#3256)

Version 0.153.0 (Released December 21, 2020)
---------------

- define __str__ for course

Version 0.152.1 (Released December 09, 2020)
---------------

- fix reclassify spam for moderator comments

Version 0.152.0 (Released December 08, 2020)
---------------

- CELERY_WORKER_MAX_MEMORY_PER_CHILD setting (#3250)
- moderator post notifications

Version 0.151.1 (Released December 03, 2020)
---------------

- Fix flaky test (#3248)
- Split each OCW run into its own course (#3245)
- Fix test issues (#3247)

Version 0.151.0 (Released December 01, 2020)
---------------

- Revert "Add  OWASP ZAP security scan as Github action (#3229)" (#3234)
- Add Elasticsearch shard count variable (#3228)
- Add  OWASP ZAP security scan as Github action (#3229)

Version 0.150.1 (Released November 19, 2020)
---------------

- fix styling for long search filters

Version 0.150.0 (Released November 17, 2020)
---------------

- Return False if reddit API is_moderator call raises a Forbidden error (#3223)
- ES Course serializer should exclude unpublished runs and list them in reverse chronological order (#3221)

Version 0.149.2 (Released November 12, 2020)
---------------

- Import OCW level 3 topics (specialities) (#3218)

Version 0.149.1 (Released November 10, 2020)
---------------

- update ocw-data-parser to 0.15.1 (#3216)

Version 0.149.0 (Released November 10, 2020)
---------------

- 404 for removed comments
- add back a few things to CI

Version 0.148.2 (Released November 05, 2020)
---------------

- Switch from Travis to Github Actions

Version 0.148.1 (Released November 04, 2020)
---------------

- fix procfile for celery queues
- speparate celery queue for spam check tasks

Version 0.148.0 (Released November 03, 2020)
---------------

- Bump cryptography from 2.8 to 3.2

Version 0.147.2 (Released October 29, 2020)
---------------

- update ocw parser
- ab/remove-course-catalog-acks-late

Version 0.147.1 (Released October 28, 2020)
---------------

- dont show removed comments and posts in profile

Version 0.147.0 (Released October 26, 2020)
---------------

- Update ocw-data-parser (#3193)

Version 0.146.4 (Released October 23, 2020)
---------------

- add support for the 'level' facet

Version 0.146.3 (Released October 22, 2020)
---------------

- remove PODCAST_FRONTPAGE feature flag

Version 0.146.2 (Released October 16, 2020)
---------------

- upgrade course-search-utils
- update ocw-data-parser (#3183)

Version 0.146.1 (Released October 13, 2020)
---------------

- Added mappings for some new MITPE topics

Version 0.146.0 (Released October 07, 2020)
---------------

- use course-search-utils for CourseSearchPage logic
- add the department_name field to search aggregation transform

Version 0.145.1 (Released October 01, 2020)
---------------

- fix podcast date farce

Version 0.145.0 (Released September 30, 2020)
---------------

- Add embedded youtube videos as course resources (#3159)
- add spam management commands
- Upgrade pillow to 7.2.0
- Youtube video resource RFC (#3154)

Version 0.144.0 (Released September 23, 2020)
---------------

- use latest version of ocw-data-parser (#3162)

Version 0.143.4 (Released September 21, 2020)
---------------

- fix spam check admin

Version 0.143.3 (Released September 18, 2020)
---------------

- Skip non-course directories (#3151)

Version 0.143.2 (Released September 17, 2020)
---------------

- Add attributes for OCW URL components (#3149)

Version 0.143.1 (Released September 15, 2020)
---------------

- add post and comment information to spam check admin

Version 0.143.0 (Released September 15, 2020)
---------------

- add level and department to search
- Add accessibility links to footers (#3147)

Version 0.142.1 (Released September 11, 2020)
---------------

- Changes to ContentFile (resource) index (#3137)
- Bump node-sass from 4.12.0 to 4.13.1

Version 0.142.0 (Released September 10, 2020)
---------------

- fix course search textbox behavior

Version 0.141.2 (Released September 04, 2020)
---------------

- correct typo in "Mechanical Engineering" (#3126)

Version 0.141.1 (Released September 02, 2020)
---------------

- Mock debounce to try to fix flaky tests (#3129)

Version 0.141.0 (Released August 31, 2020)
---------------

- Fixed password reset
- Fix flaky test (#3122)
- update to latest version of our eslint config

Version 0.140.1 (Released August 27, 2020)
---------------

- update ocw-data-parser in requirements.in and run pip-compile (#3124)

Version 0.140.0 (Released August 24, 2020)
---------------

- podcast button styling update

Version 0.139.1 (Released August 19, 2020)
---------------

- add cache to rss page
- limit rss feed episodes

Version 0.139.0 (Released August 17, 2020)
---------------

- Spam exemptions check and feature flag (#3096)

Version 0.138.1 (Released August 12, 2020)
---------------

- pin requests to fix urllib3 error
- add rss to subscribe button

Version 0.138.0 (Released August 10, 2020)
---------------

- fix requirements
- remove podcast rss authentication
- Document spam mitigation and modernize docs

Version 0.137.0 (Released August 04, 2020)
---------------

- add rss_url to podcast etl
- Bump elliptic from 6.4.0 to 6.5.3
- generate rss for all MIT podcast episodes

Version 0.136.1 (Released July 31, 2020)
---------------

- Spam check only if the content changes
- Added server-side 404 page for posts
- do not spam check moderators
- Blocked IP model and middleware (#3082)

Version 0.136.0 (Released July 28, 2020)
---------------

- add podcast subscription links
- fix padding issue with the drawer
- python and JS upgrades (#3073)
- Save spam check results (#3076)

Version 0.135.2 (Released July 27, 2020)
---------------

- fix read more
- Bump codecov from 3.6.5 to 3.7.1

Version 0.135.1 (Released July 23, 2020)
---------------

- add podcast subscribe URLs to podcast ETL
- make learn and search pages tababble
- fix some issues with comment voting
- Bump lodash from 4.17.15 to 4.17.19

Version 0.135.0 (Released July 21, 2020)
---------------

- Added spam checking to posts and comments (#3062)

Version 0.134.2 (Released July 16, 2020)
---------------

- refactor ExpandedPostDisplay to be a function-based component
- fix audio player drawer padding issue

Version 0.134.1 (Released July 15, 2020)
---------------

- Block certain emails during registration (#3051)

Version 0.134.0 (Released July 15, 2020)
---------------

- refactor post voting to be more straightforward

Version 0.133.2 (Released July 13, 2020)
---------------

- pull method on HomePage.js out as separate component
- ensure the AudioPlayer works across the site

Version 0.133.1 (Released July 08, 2020)
---------------

- add a link to the podcast to the LR drawer

Version 0.133.0 (Released July 07, 2020)
---------------

- fix micromasters loader
- fix podcast etl
- fix isort version
- remove runs from videos and podcasts
- refactor CommentTree to use a separate Comment component
- show focus outlines for tabbing only

Version 0.132.0 (Released July 07, 2020)
---------------

- update requirements with new version (#3012)

Version 0.131.0 (Released June 26, 2020)
---------------

- dependency upgrades, add @reduxjs/toolkit
- Added xPro topic mapping

Version 0.130.0 (Released June 24, 2020)
---------------

- limit to one recent episode per podcast
- Bump django from 2.2.10 to 2.2.13
- do not select run with missing dates
- add episode count to podcast card
- trim white space

Version 0.129.1 (Released June 18, 2020)
---------------

- fix facet filters
- fix off-by-one error

Version 0.129.0 (Released June 17, 2020)
---------------

- Fix video loading of offerors and topics
- fix display of favorite icon in 'similar items' panel
- Restrict public list creation (#2988)
- Update ocw data parser (#2989)

Version 0.128.0 (Released June 15, 2020)
---------------

- Rename blacklist -> blocklist
- add tooltips to learning resource card

Version 0.127.1 (Released June 03, 2020)
---------------

- search restyling

Version 0.127.0 (Released June 03, 2020)
---------------

- Various fixes for ETL loading bugs
- change reorder text
- fix a height issue with the author on the podcast card
- fix checked facet highlight

Version 0.126.0 (Released June 02, 2020)
---------------

- Bump httplib2 from 0.14.0 to 0.18.0 (#2943)
- add footer to podcast page
- add FilterableSearchFacet component
- /podcasts keyboard accessibility (#2963)

Version 0.125.2 (Released May 28, 2020)
---------------

- new facets ui

Version 0.125.1 (Released May 28, 2020)
---------------

- Added new topic mapping to SEE

Version 0.125.0 (Released May 27, 2020)
---------------

- sort type facet
- Fix the xPRO offered by value
- don't use conditionals on selectors! (#2952)
- index changes for new filters

Version 0.124.2 (Released May 21, 2020)
---------------

- don't use conditionals on selectors! (#2952)

Version 0.124.1 (Released May 21, 2020)
---------------

- Podcast drawer "view episode details" link (#2945)
- Fixed loading topics when not defined by the input data
- Handle 'January IAP' semester and MITPE empty dates
- PodcastEpisode.episode_link (#2941)

Version 0.124.0 (Released May 20, 2020)
---------------

- Ensure ocw subtasks don't ack until task completes
- Revert "upgrade dependencies, add @reduxjs/toolkit"
- Added remapping for edx topics

Version 0.123.3 (Released May 15, 2020)
---------------

- Revert "upgrade dependencies, add @reduxjs/toolkit"

Version 0.123.2 (Released May 15, 2020)
---------------

- upgrade dependencies, add @reduxjs/toolkit
- fix facets for podcasts
- remove cost and availability facets

Version 0.123.1 (Released May 13, 2020)
---------------

- fix podcast card height issues
- combine learning list and learning path
- fix popular resourses view for learning paths

Version 0.123.0 (Released May 12, 2020)
---------------

- combine podcast and podcast episode in search facets
- fix an issue with scroll position in the LR drawer

Version 0.122.1 (Released May 11, 2020)
---------------

- Remove extra AWS access key and secret environment variables (#2900)
- Snackbar update (#2899)
- hide 'share' button on podcasts, podcast episodes in drawer

Version 0.122.0 (Released May 07, 2020)
---------------

- Revert "add link in drawer from podcast episode to all episodes"
- add link in drawer from podcast episode to all episodes
- Precommit hooks (#2859)
- Update Podcasts page title (#2893)

Version 0.121.4 (Released May 01, 2020)
---------------

- mobile ui css

Version 0.121.3 (Released May 01, 2020)
---------------

- Audio player skip forward / backward progress reset bug fix (#2891)
- Podcasts Series -> Podcasts
- prevent highlighting of text within the audio player (#2889)
- add ability to pause / play podcast from the PodcastPlayButton

Version 0.121.2 (Released April 30, 2020)
---------------

- Fix tests for previous commit
- fix-intercations-request
- Change queryset to show empty podcasts (#2833)
- add list of episodes to podcast drawer display
- set the z index of the audio player to sit on top of any drawer (#2873)
- add test coverage for some utility hooks
- Audio player padding adjustments (#2872)
- remove stray console.log

Version 0.121.1 (Released April 29, 2020)
---------------

- fix podcast and podcast episode sharing URL
- podcasts search page ui
- Remove check_pip.sh (#2870)
- add the date to the PodcastEpisodeCard

Version 0.121.0 (Released April 28, 2020)
---------------

- Audio player Safari / Apple Webkit fix (#2847)
- add basic drawer support for podcasts, podcastEpisodes
- fix parsing of variables inside calc (#2843)
- Bootcamps -> Courses (#2811)
- Audio player (#2782)
- Fix app.json (#2835)
- Add loader to podcast page (#2804)

Version 0.120.1 (Released April 24, 2020)
---------------

- make config offered_by field optional
- use podcast image when the podcast episode image is missing
- Add episodes per podcast view (#2815)
- Added podcast indexing upon ingestion
- error catching for unparsable rss file
- add basic tests for podcast frontpage component (#2805)

Version 0.120.0 (Released April 22, 2020)
---------------

- Use github access token for authentication
- Add episodes list/detail view REST APIs (#2812)
- update background image asset on `/podcasts`
- Add episode_count field to episodes REST API (#2810)
- add Podcast cards
- hide 'My List' link according to feature flags
- Remove nested episodes from podcasts API to improve performance (#2799)

Version 0.119.4 (Released April 21, 2020)
---------------

- Set strict = true, rename some UWSGI_ env vars (#2775)

Version 0.119.3 (Released April 17, 2020)
---------------

- add 'recent episodes' display to /podcasts
- Added podcasts & podcast episodes to index

Version 0.119.2 (Released April 16, 2020)
---------------

- Added data models for discussions channels

Version 0.119.1 (Released April 15, 2020)
---------------

- fix unpublish code for podcast episodes
- add curved background to `/podcasts`
- import podcast data
- add suggestions to channel search

Version 0.119.0 (Released April 14, 2020)
---------------

- add Podcasts, PodcastEpisodes to the admin
- Add recent podcasts API (#2765)
- CSAIL course import (#2759)
- add podcast-specific top navbar
- Add read-only podcasts API (#2757)

Version 0.118.1 (Released April 13, 2020)
---------------

- MIT Professional Education course import (#2744)
- unpublish userlists for removed playlists
- add feature flag for podcast landing page
- index changes to support suggestions in channel search

Version 0.118.0 (Released April 08, 2020)
---------------

- Revert "Suggested Terms in Channel Search"
- Suggested Terms in Channel Search
- data model for podcasts
- Import Sloan Executive courses (#2726)

Version 0.117.2 (Released April 02, 2020)
---------------

- Make frontend URL parsing more resilient (#2729)
- Filter out blank/null moira list names (#2731)

Version 0.117.1 (Released April 01, 2020)
---------------

- Handle text/plain requests (#2719)
- Fix OLL logo image (#2708)
- Improved performance of /learn APIs

Version 0.117.0 (Released March 31, 2020)
---------------

- Initial proposal for reddit migration work
- remove fuzzy search

Version 0.116.1 (Released March 30, 2020)
---------------

- Update djoser and DRF to fix password reset (#2707)

Version 0.116.0 (Released March 30, 2020)
---------------

- OCW webhook (#2687)
- Use file extension to detect mime type, and pass info to tika (#2684)

Version 0.115.1 (Released March 27, 2020)
---------------

- More intelligent OLX ingestion, and ingest static files for xPRO (#2631)
- refactor course search state to live in the URL
- Log ProfileDoesNotExist exceptions when updating channel memberships (#2696)
- update ocw-data-parser version to 0.5.0
- Pin redis and nginx versions (#2626)

Version 0.115.0 (Released March 24, 2020)
---------------

- Updated /learn to have per-carousel loaders

Version 0.114.1 (Released March 23, 2020)
---------------

- raw_json should be write-only on LearningResourceRunSerializer (#2688)
- Moira integration (#2627)
- bump ocw data parser verison

Version 0.114.0 (Released March 20, 2020)
---------------

- Support for subscribing users via criteria
- don't overwrite ocw course with old run data

Version 0.113.3 (Released March 16, 2020)
---------------

- Improve error reporting (#2620)
- Fix OLL import (#2625)
- script to generate duplicate courses file
- Allow anonymous users to view the profile page and related posts and comments (#2619)

Version 0.113.2 (Released March 12, 2020)
---------------

- Redirect discussions.odl.mit.edu to open.mit.edu (#2616)
- Assign a score to child document results (#2608)

Version 0.113.1 (Released March 10, 2020)
---------------

- OLX ingestion for xPRO courses (#2599)

Version 0.113.0 (Released March 09, 2020)
---------------

- Fixed bug with missing popular resources

Version 0.112.2 (Released March 03, 2020)
---------------

- Refresh requirements.txt (#2601)
- Bump codecov from 3.5.0 to 3.6.5
- Dedupe mitx courses with multiple edx records
- OLX/OCW ingestion work (#2574)

Version 0.112.1 (Released February 27, 2020)
---------------

- digest_ocw_course() needs to be run after OCWParser.upload_all_media_to_s3() (#2597)
- Upgrade to Python 3.7 (#2594)

Version 0.112.0 (Released February 24, 2020)
---------------

- Revert "Upgrade celery, use Python 3.7 in docker (#2592)" (#2595)
- Upgrade celery, use Python 3.7 in docker (#2592)
- Update postgres version and docker-compose setup (#2591)
- Updated sentry and added filter to exclude typical shutdown errors

Version 0.111.1 (Released February 14, 2020)
---------------

- Added support for tracking and displaying popular learning resources

Version 0.111.0 (Released February 13, 2020)
---------------

- update default sort order
- Bump django from 2.2.9 to 2.2.10

Version 0.110.1 (Released February 07, 2020)
---------------

- updates to search index for default search ordering
- Refactor index_items (#2576)

Version 0.110.0 (Released February 06, 2020)
---------------

- Chunk up OCW import task and use rapidjson to speed up processing (#2567)

Version 0.109.1 (Released January 30, 2020)
---------------

- Upgrade django

Version 0.109.0 (Released January 29, 2020)
---------------

- Fixed race condition with profile writes

Version 0.108.0 (Released January 27, 2020)
---------------

- Revert  "sort default results in search page with no text"
- change URL params for LR sharing to be friendlier
- automatically open "similar items" panel for some LRs
- sort default results in search page with no text
- change copy for userlists to "learning lists"
- grabbed a new webpack version
- prevent course title in search from being cut off

Version 0.107.4 (Released January 22, 2020)
---------------

- add created_on to elasticsearch
- fix offered by link in the search page

Version 0.107.3 (Released January 16, 2020)
---------------

- fix LR card height when reordering learning path

Version 0.107.2 (Released January 15, 2020)
---------------

- fix scrollbar on post sort picker

Version 0.107.1 (Released January 15, 2020)
---------------

- Improve ES performance by not validating connection for read operations
- add ability to share learning resources
- Added support for user list items in frontend
- Bump handlebars from 4.1.2 to 4.5.3 (#2514)
- Fix a few typos in tests (#2531)

Version 0.107.0 (Released January 13, 2020)
---------------

- ensure course cards have the same height
- allow user to reset search text on the search page
- Dont publish/index blocklisted courses (#2519)
- Supported double-quoted search terms (#2516)

Version 0.106.1 (Released January 10, 2020)
---------------

- Update indexing methods to reduce data sent to and from redis via celery  (#2520)
- allow specifying list name in config file
- Return search term suggestions (#2510)

Version 0.106.0 (Released January 07, 2020)
---------------

- implement new design for learning resource drawer
- mock out HTML height attrs globally
- add play button overlay for video cover images
- display all learning reasourse offered bys if there are multiple

Version 0.105.0 (Released January 06, 2020)
---------------

- add all option to video playlist config
- Log an error for YOUTUBE_DEVELOPER_KEY
- update user list reordering UI a little bit
- switch to bookmark icon for learning resource lists menu

Version 0.104.2 (Released December 20, 2019)
---------------

- increase LearningResourceOfferor name length

Version 0.104.1 (Released December 19, 2019)
---------------

- Don't allow userlists to be added to userlists (#2462)

Version 0.104.0 (Released December 18, 2019)
---------------

- fix issue with learningResourceSelector function
- Fix search result subject display (#2488)
- Display similar learning resources in drawer (#2480)
- fix the display of read more / less in the truncated text component

Version 0.103.2 (Released December 17, 2019)
---------------

- add history to the learning resource drawer
- add a display of the courses in a program to the program drawer
- Bump django from 2.1.11 to 2.1.15 (#2478)
- Fix bug unchecking lists (#2482)

Version 0.103.1 (Released December 12, 2019)
---------------

- Inject 'is_favorite' and 'lists' fields into search results (#2473)
- Fixed routing for /learn/lists/favorites

Version 0.103.0 (Released December 10, 2019)
---------------

- Only index lists with items, include item image_src values (#2448)
- List Items API (#2470)
- Exclude large/unused fields from API results (#2468)
- /courses/ -> /learn/
- implement mobile design for userlist dialog
- add visual separation (a line) to list items in the LR drawer

Version 0.102.3 (Released December 09, 2019)
---------------

- Added topics generation for videos
- Get rid of n+1 query on content_type.name (#2460)
- Require at least 1 subject for lists/paths (#2449)
- Set DISABLE_SERVER_SIDE_CURSORS=True by default (#2454)
- add re-ordering UI for learning paths

Version 0.102.2 (Released December 05, 2019)
---------------

- new videos view
- fix dialog sizing on mobile
- Increase the width of the Course.image_src column
- Add support for next param to login prompt
- Add a sleep to youtube video transcript downloads

Version 0.102.1 (Released December 05, 2019)
---------------

- Revert "Calculate and return is_favorite and lists fields in ES search results (#2423)" (#2451)
- Added transcripts to searchable fields
- Calculate and return 'is_favorite' and 'lists' fields in ES search results (#2423)
- fix Select component when removing last selection (#2430)
- Adjust resource item serializers (#2415)

Version 0.102.0 (Released December 03, 2019)
---------------

- Add tasks for pulling youtube video transcripts
- fix cropper width issue on channel settings page
- Added free prices to videos

Version 0.101.1 (Released December 02, 2019)
---------------

- Prevent users from adding lists to each other (#2416)
- Topics select field for the UserListFormDialog (#2411)
- Support generating user lists from playlists
- Update get_active_aliases to reuse connection so verification doesn't thrash

Version 0.101.0 (Released November 25, 2019)
---------------

- display user lists and learning paths in the learning resource drawer
- add ability to create a new list from the "add to list" dialog

Version 0.100.2 (Released November 25, 2019)
---------------

- Fixed KeyError in etl loaders
- Topics endpoint API (#2401)
- Support topics CRUD in UserList API (#2397)
- Added video unpublish support
- Fix test (#2400)
- When a resource is deleted, delete any UserListItems for that resource (#2389)
- Show a filled-in star when a resource is in a user's list (#2379)

Version 0.100.1 (Released November 21, 2019)
---------------

- show the description for a user list on the detail page
- Simplified serializers for UserListView list response (#2385)

Version 0.100.0 (Released November 18, 2019)
---------------

- Filter out unauthored lists on UserListsPage and AddToListDialog (#2383)
- new config file format
- add the favorites as a userlist in the UI

Version 0.99.2 (Released November 15, 2019)
--------------

- Search index updates for user lists (#2374)
- Added tasks to fetch youtube videos
- Added drawer for video resources

Version 0.99.1 (Released November 13, 2019)
--------------

- add the ability to edit userlist metadata
- add functions to download and process youtube transcripts

Version 0.99.0 (Released November 13, 2019)
--------------

- add user list detail page
- UI for adding/removing a list item (#2339)

Version 0.98.0 (Released November 07, 2019)
--------------

- use youtube playlist item call to get around search limit
- add the ability to delete user lists
- Allow programs, videos, and user lists to be added as UserList items (#2346)
- Fix favoriting of lists and paths (#2341)
- fix display of the "My Lists" link

Version 0.97.2 (Released November 04, 2019)
--------------

- some tweaks to the course search page
- transform function for youtube etl
- add pyyaml to requirements

Version 0.97.1 (Released October 31, 2019)
--------------

- add ability to create new UserLists
- Extract function for course catalog youtube video etl
- Added video favoriting functionality

Version 0.97.0 (Released October 29, 2019)
--------------

- Added loader code for videos
- Added VideoResource indexing
- Differentiate between user lists and learning paths in the search index (#2329)
- Allow CRUD operations for UserLists via API (#2326)

Version 0.96.1 (Released October 25, 2019)
--------------

- add an index page for showing userlists
- Bump pillow from 3.4.2 to 6.2.0
- two tweaks to course search facet

Version 0.96.0 (Released October 23, 2019)
--------------

- Added VideoResource model
- Fix caniuse-lite breaking build by upgrading it

Version 0.95.2 (Released October 21, 2019)
--------------

- fix bug with the Cell component
- Add support for multiple offered_by
- Don't show any results if no text matches are found (#2295)

Version 0.95.1 (Released October 18, 2019)
--------------

- small style tweak to course facets
- fix the learning resources drawer right-to-left behavior
- Prevent embedly from creating animated thumbnails (#2291)

Version 0.95.0 (Released October 16, 2019)
--------------

- fix UI issue with showing/hiding options on SearchFacet
- Import xPro program topics and instructors (#2279)
- Add instructors, topics, and program prices to micromasters ETL transform (#2282)
- Added import for xpro courses

Version 0.94.2 (Released October 15, 2019)
--------------

- Added Open Learning Library implementation
- Create program runs (#2267)

Version 0.94.1 (Released October 11, 2019)
--------------

- Rename CourseRun to LearningResourceRun (#2265)
- Remove OCW courses from search if they are unpublished (#2260)

Version 0.94.0 (Released October 09, 2019)
--------------

- fix small layout bug
- Refactor MITx integration to new etl pipeline
- refactor tooltips
- implement mobile view for the course search page
- Set default ordering of CourseRun (#2262)

Version 0.93.1 (Released October 03, 2019)
--------------

- Open drawer for programs (#2251)

Version 0.93.0 (Released October 02, 2019)
--------------

- fix pluralization of "subject" line on learning resource card
- Populate best date fields during xpro import (#2252)

Version 0.92.2 (Released September 26, 2019)
--------------

- Search nested fields including instructors (#2232)
- Add course number to the search index and boost it in queries (#2233)

Version 0.92.1 (Released September 24, 2019)
--------------

- Added xpro integration for catalog
- rename 'containers' dir to 'pages'

Version 0.92.0 (Released September 23, 2019)
--------------

- a few styling tweaks for the course search page
- Fix occasionally failing test for LearningResourceCard (#2241)
- add 'grid' style loader to the course search page
- Fix 'Offered By' display (#2238)
- Make sure object_type is always merged in when retrieving entities from state (#2230)

Version 0.91.0 (Released September 18, 2019)
--------------

- refactor course sidebar component to use hooks
- fix the search loader for the course search
- Default image for learning resource (#2222)
- Facets for price and offered by (#2212)

Version 0.90.1 (Released September 16, 2019)
--------------

- Adjust cron job times
- Display the most relevant course run, with dropdown, in course drawer (#2196)

Version 0.90.0 (Released September 12, 2019)
--------------

- some styling tweaks for the course search page
- Updated course APIs to filter out courses with no runs
- update babel-eslint
- update course home page
- Added course catalog integration with micromasters
- update display of the currently-active filters on the course search
- Add LearningResourceRun to admin (#2194)
- Show most relevant availability for search result (#2190)

Version 0.89.2 (Released September 05, 2019)
--------------

- upgrade react-redux, react-router, redux-query

Version 0.89.1 (Released September 04, 2019)
--------------

- restyle the course-search facets
- fix an issue with the responsiveness of the search facets

Version 0.89.0 (Released September 03, 2019)
--------------

- Make sure best date fields are writable in serializer (#2186)
- Working availability facet based on course run dates (#2158)
- Support cancelling notifications for disabled notifications

Version 0.88.0 (Released August 28, 2019)
--------------

- Added trailing slash to API urls to avoid 301 redirects
- CourseRuns for all courses and bootcamps (#2153)

Version 0.87.1 (Released August 27, 2019)
--------------

- update course search and course carousel UI
- bump a few deps
- Pin pytest deps
- upgrade eslint and related dependencies
- fix an issue with unfavoriting on the favorites carousel
- upgrade dependencies

Version 0.87.0 (Released August 21, 2019)
--------------

- Added retire_users command and don't email inactive users

Version 0.86.5 (Released August 16, 2019)
--------------

- add basic favorites display to the homepage
- Show paths and programs in search results (#2131)

Version 0.86.4 (Released August 14, 2019)
--------------

- Upgrade django
- fix a flaky test

Version 0.86.3 (Released August 13, 2019)
--------------

- add initial implementation of favorites

Version 0.86.2 (Released August 08, 2019)
--------------

- Add course runs to ES index

Version 0.86.1 (Released August 07, 2019)
--------------

- Make topic and price sequences again in tests (#2139)
- Include course runs in CourseSerializer (#2136)

Version 0.86.0 (Released August 06, 2019)
--------------

- update UI for search box in course page header
- Add Program and UserList to Django admin (#2133)
- Updated course_catalog factories to be generate more data out of the box

Version 0.85.2 (Released August 05, 2019)
--------------

- Import courses and course runs for MITx (#2130)

Version 0.85.1 (Released August 01, 2019)
--------------

- Added LearningResourceRun model

Version 0.85.0 (Released July 30, 2019)
--------------

- Renamed course_catalog.task_helpers to course_catalog.api
- Search for bootcamps (#2102)

Version 0.84.0 (Released July 24, 2019)
--------------

- Switch course search to use CourseCard, grid layout

Version 0.83.1 (Released July 16, 2019)
--------------

- Remove writing bootcamps to Course model
- Ignore allowed_post_types from django-admin

Version 0.83.0 (Released July 15, 2019)
--------------

- implement new course card design
- Bumped django version
- fix styling issues with the drawer

Version 0.82.3 (Released July 12, 2019)
--------------

- remove USE_NEW_BRANDING feature flag

Version 0.82.2 (Released July 11, 2019)
--------------

- few small dependency upgrades
- Upgrade version of psycopg2 to work with heroku-18 stack

Version 0.82.1 (Released July 09, 2019)
--------------

- Fix search query for anonymous users (#2079)
- Add endpoints for users to favorite and view favorited items (#2064)
- Addresses #2068  (#2074)

Version 0.82.0 (Released July 09, 2019)
--------------

- add config_change_template (#2050)
- adds offered_by to models and indexing (#2072)
- updates indexing code for course catalog models (#2056)
- restyle the course carousel to match new designs
- add new banner image to the course pages
- tweak to the drawer open / close animation and behavior

Version 0.81.1 (Released June 24, 2019)
--------------

- add to README and docstring (#2066)
- install Formik and use it to implement a separate <CommentForm />
- Add tests for course_catalog.views (#2065)
- adds new catalog model FavoriteItem; renames LearningPath model (#2061)

Version 0.81.0 (Released June 21, 2019)
--------------

- Serializers, views, factories, and tests for course_catalog models (#2058)
- update the top bar in the courses section

Version 0.80.0 (Released June 13, 2019)
--------------

- run black
- Address comments on PR
- fix tests
- Refactor course_catalog course parsing
- upgrade a few dependencies

Version 0.79.2 (Released June 10, 2019)
--------------

- persist desktop drawer open / close value to localStorage
- Update bootcamps tasks and tests to use new Bootcamp model
- fix styling of profile page

Version 0.79.1 (Released June 06, 2019)
--------------

- Implement proposed changes to new course_catalog models
- upgrade of a few dependencies (nothing serious)
- tweak the two-column layout width and cell ratio
- fix course search page infinite scroll issue

Version 0.79.0 (Released June 04, 2019)
--------------

- Periodic bump of drf

Version 0.78.1 (Released May 24, 2019)
--------------

- Added workers to pgbouncer

Version 0.78.0 (Released May 20, 2019)
--------------

- site 'grid' (basic layout) tweaks
- split out widget-related API functions from main api.js file
- Fix email url to go through static assets
- Update ocw data parser in requirements to use version that removes certain fields from master_json
- remove ANONYMOUS_ACCESS feature flag
- fix URL widget help text font size
- fix rendering height of channel navbar on mobile
- fix drawer animation

Version 0.77.0 (Released May 20, 2019)
--------------

- Add functionality to parse Bootcamps data into course_catalog
- add option for custom html on URL widgets

Version 0.76.1 (Released May 10, 2019)
--------------

- add channel nav bar to the post detail page
- CSS tweak for links in the markdown widget
- add an animation for the drawer expand / contract on desktop
- remove the SEARCH_UI feature flag

Version 0.76.0 (Released May 08, 2019)
--------------

- Fix RSS widgets for invalid urls and add admin ui for them
- Use MM and PE data to tag edx courses with program_name and program_type

Version 0.75.2 (Released May 07, 2019)
--------------

- add professional programs data (#1980)

Version 0.75.1 (Released May 01, 2019)
--------------

- Improved resilience and sending speed of frontpage notifications

Version 0.75.0 (Released April 30, 2019)
--------------

- Send courses in chunks for master json parsing (#1987)
- make desktop drawer collapse instead of hide
- Repair posts if they don't appear in the hot posts list
- Modifies ocw parsing and adds task/management command to upload ocw master json data to S3.

Version 0.74.2 (Released April 26, 2019)
--------------

- Updated command to populate user subscriptions to take a list of channels

Version 0.74.1 (Released April 25, 2019)
--------------

- fix a flaky test
- Added test for app.json validity
- add sorting to the channel members page
- Revert "Added reporting of validation errors to sentry"

Version 0.74.0 (Released April 22, 2019)
--------------

- Upgraded urllib3
- hide manage widgets link on the post page

Version 0.73.2 (Released April 19, 2019)
--------------

- Added redirect for handling themove.mit.edu

Version 0.73.1 (Released April 17, 2019)
--------------

- Added a redirect rule to handle traffic to the lemelsonx subdomain

Version 0.73.0 (Released April 11, 2019)
--------------

- shuffle post overflow menu options around a bit
- Add 'members' page for showing the people who are members of a channel

Version 0.72.1 (Released April 08, 2019)
--------------

- refresh the post list after you remove a post
- closes issue #1930

Version 0.72.0 (Released March 27, 2019)
--------------

- Add cover image to the course index page
- Modify facet behavior within/between groups (#1928)

Version 0.71.0 (Released March 19, 2019)
--------------

- add new courses widget to the home page
- Label course availability by model field instead of dates in UI (#1922)
- Buttons to clear facets (#1916)

Version 0.70.3 (Released March 15, 2019)
--------------

- Add course index page
- Show min price instead of max price for courses (#1920)

Version 0.70.2 (Released March 13, 2019)
--------------

- Different toolbar and no channel drawer for courses (#1913)

Version 0.70.1 (Released March 13, 2019)
--------------

- Search facet improvements (#1906)

Version 0.70.0 (Released March 12, 2019)
--------------

- kill some sluggishness with the ArticleEditor
- Fix typo

Version 0.69.0 (Released March 08, 2019)
--------------

- update a few JS deps
- Bump django to 2.1.7
- upgrade flow to @latest
- Updated Python runtime version
- RFC for enhanced search facets (#1891)
- Adds new availability field to course_catalog/Course model for Course search
- Display all topics in CompactCourseDisplay, make clickable (#1892)
- Search UI RFC (#1885)
- Added channel invitation backend and frontend
- Course detail view (#1866)

Version 0.68.1 (Released February 27, 2019)
--------------

- get rid of the docker setup for JavaScript tests on travis
- Hide embedly title for embedly widgets (#1878)
- Add livestream widget to the homepage
- tweak post pinning so that the UI fully reflects the newly pinned post
- Fix comment dialog dialog bug and refactor PostPage_test (#1875)
- Added opengraph metadata tags for social sharing

Version 0.68.0 (Released February 25, 2019)
--------------

- Bumped ocw-data-parser version

Version 0.67.0 (Released February 21, 2019)
--------------

- fix an issue with article validation
- Remove comments (#1868)
- Added embedly link preview content to index
- moves log info statement
- adds log info statements, renames variable and adds other case to not upload, per PR review comments
- flips if statement; adds case check to unit tests
- adds error_occurred flag to check for cases where we would not like to upload to s3
- renames "get_edx_data" -> sync_and_upload_edx_data
- Fixed anonymous create post page bug
- Adding caching to RSS widget
- Update README.md
- Course search UI (#1784)
- updates unit test
- adds unit test
- Updates ocw-data-parser package
- updates requirements
- Readme updates
- add validtion to post editing
- fixes bucket; fixes failing tests; adds stub for new test
- format change from running `black course_catalog`
- Changes permission for edx json export
- minor changes
- Adds functionality to export edx courses into json format and upload it to s3

Version 0.66.1 (Released February 19, 2019)
--------------

- Fix tests (#1864)
- Updated Jupyter notebook command in README
- Add channel about page frontend UI
- Add some scrolling to post create page to make errors visible
- Add url to Course model and helper method to determine its value (#1851)
- Limit widget dialog focus to widget type selection (#1854)
- People widget (#1803)
- Created docker container config for running the app in a Jupyter notebook
- Remove automatic focus from dialog radio buttons (#1848)
- New setting to specify if only course images should be uploaded during import (#1839)
- clarified concern for a separate issue
- Added embedly link preview indexing RFC

Version 0.66.0 (Released February 13, 2019)
--------------

- RFC: Caching system for third party data
- Create and update course documents in Elasticsearch (#1721)
- Switched search to index posts/comments from db
- Remove accidental file
- Fixed template typo
- Added a few issue templates
- Remove usages of channel description and allow_widget_ui

Version 0.65.3 (Released February 12, 2019)
--------------

- replace @task with @app.task (#1832)
- Changed article thumbnail rendering to serve from embedly
- Copy mitodl/course_catalog app into discussions (#1753)
- Added reporting of validation errors to sentry
- Removed EMAIL_AUTH flag

Version 0.65.2 (Released February 07, 2019)
--------------

- upgrade to react v16.8
- Fixed bug with preview text for posts including a base64-encoded image
- Bumped ES docker image version to 6.5.4

Version 0.65.1 (Released February 06, 2019)
--------------

- Switch backpopulate over to the list() api
- Fix link menu when editing rich text widget (#1816)
- Fix a z-index issue on the post create page
- Show related posts on the post detail page
- Fixed contributor delete permissions and changed logic for showing leave channel option

Version 0.65.0 (Released February 04, 2019)
--------------

- Fixed exception with lazy submissions
- Switched backpopulate_posts to a more reliable submission fetch

Version 0.64.3 (Released February 04, 2019)
--------------

- Add validation to widget configuration inputs, fix URL validation (#1795)
- Backend to add 'about' field to Channel model
- upgrade react, react-dom, enzyme, and the enzyme adapter

Version 0.64.2 (Released February 01, 2019)
--------------

- Fix backpopulate not adding comments
- Implement embedly widget (#1786)

Version 0.64.1 (Released January 30, 2019)
--------------

- Added script and tasks to backpopulate all posts and comments

Version 0.64.0 (Released January 29, 2019)
--------------

- Fixed subscriber permission to allow self-editing of channel subs
- Collapse and expand widgets (#1759)
- Refactored factories to split model ones vs. reddit ones
- Fixed bug with post summary showing raw markdown
- Added button to follow/unfollow channel

Version 0.63.2 (Released January 25, 2019)
--------------

- Updated Post and Comment models with missing fields
- Add support for rending content using Embedly in the article editor
- Bump yarn and node version
- Split comment API functions out into separate module

Version 0.63.1 (Released January 24, 2019)
--------------

- Fix flaky test (#1758)
- Improvements for RSS dialog editing (#1750)

Version 0.63.0 (Released January 23, 2019)
--------------

- Added storybook command to readme
- Upgrade dependencies to fix browserslist warning (#1751)

Version 0.62.3 (Released January 22, 2019)
--------------

- Refactor widgets, restyle RSS widget (#1730)
- Fix search loading height issue (#1738)
- Updated post summary card styling
- fix issue with post delete dialog staying open
- fix dropdown menu click targets
- loading width fix for search pages (#1734)
- Refactor a few class-based components to be stateless components
- some adjustments to the cover image and post creation UI

Version 0.62.2 (Released January 18, 2019)
--------------

- use post_type to show UI specific to different post types
- make post pinning work again
- update prosemirror-markdown to latest version
- Fix flaky test (#1725)
- Added posts and comments feed to the profile page
- Fix widget stories (#1716)
- Move cancel/done widget buttons into channel header navbar (#1692)
- Added truncated post content preview to post summary card

Version 0.62.1 (Released January 16, 2019)
--------------

- Minimum search query length (#1675)
- Text tweaks on the create post page
- small tweak to the cover image style
- Update subscriber/moderator/contributor APIs to be atomic
- Autofocus the input on the password screen
- Upgrade Django to 2.1.5 (#1695)
- Fix a post page form reset bug
- Allow article cover images to be deleted (#1693)

Version 0.62.0 (Released January 14, 2019)
--------------

- Widget style changes (#1674)
- round out article cover image UI

Version 0.61.1 (Released January 11, 2019)
--------------

- delete the icons from the post type buttons
- Create ChannelGroupRoles in populate_user_roles function (#1679)
- Fixed URL patterns to match post slugs with special characters

Version 0.61.0 (Released January 11, 2019)
--------------

- Remove unique constraint on title
- refactor API library file to several modules
- Add description for widget instances (#1672)
- Fix a flakey JS test
- Added title and channel_type to Channel to avoid many reddit requests
- Remove text widget class and add wysiwyg widget field editor (#1646)
- Fixed next param for touchstone
- Add cover image to article post
- Add article_text and post_type to REST API (#1633)
- post creation page tweaks
- Remove PyYAML (#1651)
- Search text input focus (#1642)
- Peg python-lazy-fixture to 0.4.2 (#1648)
- Fix handling of widget ids (#1645)
- Article search (#1619)
- Upgrade elasticsearch lib

Version 0.60.1 (Released January 04, 2019)
--------------

- Revert "Implement mobile widget view (#1617)" (#1629)
- Implement adding and editing widgets (#1598)
- Fix recreate_index error handling (#1620)
- Implement mobile widget view (#1617)
- Change page width from 12 to 8 on withSingleColumn HOC (#1625)
- Reduce version conflict errors in ES when updating profiles (#1618)
- Split serializers
- Make channel title in header a link (#1621)
- Filter out removed/deleted posts and comments from search (#1614)
- Display cover image thumbnail on compact post display (#1608)

Version 0.59.1 (Released December 28, 2018)
--------------

- Fix other calls to fetch()
- ask for confirmation when the user switches post types
- Remove the widget list from the channel admin

Version 0.59.0 (Released December 27, 2018)
--------------

- Fixed performance issues around proxies and DB queries
- Cover image for articles - backend (#1599)

Version 0.58.2 (Released December 26, 2018)
--------------

- Fixed article n+1 query

Version 0.58.1 (Released December 19, 2018)
--------------

- Implement moving and removing a widget (#1588)

Version 0.58.0 (Released December 18, 2018)
--------------

- Location for profiles (#1571)

Version 0.57.2 (Released December 14, 2018)
--------------

- Updated frontend to support allowed post types

Version 0.57.1 (Released December 14, 2018)
--------------

- Fix post type assignment in backpopulate_missing_posts command (#1586)
- Add editing capability to article posts
- Add popup to channel settings link (#1582)
- Refactor widgets and style read-only widgets (#1574)
- Added backend support for allowed post types
- Fixed unverified user login bug
- Django management command to create missing `Post` objects (#1567)
- Added widgets backend
- Remove errorHandling, use async/await, refactor API functions (#1562)
- Add django-hijack (#1535)

Version 0.57.0 (Released December 12, 2018)
--------------

- Add CKEditor for creating Article posts
- Small tweaks to embedly 'link' display
- Enable comment voting in search results (#1560)
- Prevent non-superusers from editing a channel title

Version 0.56.1 (Released December 07, 2018)
--------------

- Add widget JS to open-discussions (#1558)
- Hide Share button on comment cards in search (#1561)
- Hide reply and menu icons on search post/comment result cards (#1555)

Version 0.56.0 (Released December 04, 2018)
--------------

- Added UI for adding/deleting user websites
- Enable post voting in search results (#1545)

Version 0.55.3 (Released November 30, 2018)
--------------

- Don't try to reindex profile more than once on image change (#1529)
- Add channel header to post detail and channel settings (#1504)
- Updated DRF to 3.9.0
- Update comment style colors (#1530)

Version 0.55.2 (Released November 27, 2018)
--------------

- Update index when channel is updated (#1526)

Version 0.55.1 (Released November 26, 2018)
--------------

- Added proxying for frontpage emails as well (#1523)

Version 0.55.0 (Released November 26, 2018)
--------------

- Enable profile search (#1516)
- Do not try to update the profile index for the indexing user (#1521)
- API to retrieve channel followers (subscribers) (#1500)
- Remove zendesk help and replace with "Contact us" email link (#1506)

Version 0.54.0 (Released November 26, 2018)
--------------

- remove the logo from intro card on phones
- Add the site name to the mobile drawer header
- Adds article post_type
- Add english analyzer to Elasticsearch mapping, and update search to use it (#1502)

Version 0.53.3 (Released November 19, 2018)
--------------

- Implement site search (#1481)
- Add support anonymous users in search, and add support for public and restricted channels who are not already contributors or moderators (#1493)

Version 0.53.2 (Released November 16, 2018)
--------------

- Query database to get lists of channels, posts, comments for indexing (#1415)
- Added backend support for adding/deleting user websites
- Updated README and added references to common web app guide

Version 0.53.1 (Released November 15, 2018)
--------------

- remove micromasters references from mail header (#1473)
- Fix stacking issue with z-index banner and compact post buttons
- Updated mobile navbar and drawer header styling
- Upgrade requests lib
- add validation for super long text posts
- Add page for channel search (#1422)

Version 0.53.0 (Released November 14, 2018)
--------------

- Handle PRAW errors during backpopulate (#1478)
- Upgrade our eslint config to the latest version
- add profile admin (#1476)
- Remove unused markdown2 dependency
- Store channel memberships (subscriber, moderator, contributor) in django (#1449)

Version 0.52.1 (Released November 05, 2018)
--------------

- Set membership_is_managed to False when creating channels from app (#1440)
- Add components for search results (#1444)
- Add search textbox component (#1437)
- Add search filter component (#1438)
- Split profiles into chunks for indexing (#1435)
- Add indexing user as first moderator to every channel if not already a moderator (#1409)

Version 0.52.0 (Released November 01, 2018)
--------------

- Enabled newrelic for our workers
- Refactor channel header (#1433)

Version 0.51.1 (Released October 29, 2018)
--------------

- Add author_headline to post, comment docs and update them when headline is changed (#1418)
- Use iterator when retrieving profiles (#1428)
- Fix login page button label
- Always align sort menu to right (#1416)
- Storybook updates for post and comment (#1396)
- Add `post_slug` to post and comment docs in Elasticsearch index (#1412)
- Index user profiles in Elasticsearch (#1373)
- Fixed channel header layout on mobile
- Fixed signup page UI issues
- Allow link type posts to be pinned

Version 0.51.0 (Released October 24, 2018)
--------------

- Use `word-break` css on anchor tags in expanded post displays. (#1393)
- Fix placement of reported comment dropdown (#1394)
- Fix underline for compact post display title

Version 0.50.1 (Released October 18, 2018)
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

