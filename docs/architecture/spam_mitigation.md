---
parent: Architecture
---

# Spam Mitigation
{: .no_toc }

## Table of Contents
{: .no_toc .text-delta }

- Table of Contents
{:toc}


### Summary

We have a number of channels that are public and allowing non-MIT users to post content is a feature we want to continue to offer. This comes with the problem of bad actors trying to post spam content on our site. Spammers are typically trying to link into their own sites and they often link back to ours as well.

To combat this, we should approach this with a [defense in depth](https://en.wikipedia.org/wiki/Defense_in_depth_(computing)) strategy, depending on no single component to stop everything.

### Application-wide


#### Blocking IP addresses

This strategy makes it easier to block spammers based on where their requests are originating. Configuration is represented by the data model `authentication.models.BlockedIPRange`, which you'd typically configure in `django-admin`. This supports the blocking of ranges of IPs, a situation we can encounter if a spammer is coming in over a proxy server hosted on a cloud service. Cloud services enable the spammer to get a new IP if they burn the one they're currently using, which means a lot of jumping around for us trying to block them. Instead, we would block on a range once we identify the cloud provider, which typically retain a block of IP addresses for their services.

We use [`django-ipware`](https://github.com/un33k/django-ipware) to determine the IP address of the incoming request, this library handles a lot of the networking and request-level nuances around determining what header the IP address is pulled from. It's also highly configurable should our needs/deployment situation change.

We allow read-only access for blocked IP and block any mutable requests (e.g. `POST`, `PUT`, etc).


### Preventing spammer account creation

We've taken some steps to mitigate the spammer's ability to create accounts.

#### Blocking email domains

This mostly has bearing to spammers trying to sign up with emails under a personal domain, as we can't categorically block a domain like `@gmail.com`. Configuration is represented by the data model `authentication.models.BlockedEmailRegex`, which you'd typically configure in `django-admin`.


### Preventing spam from being posted

#### Private or protected channels

Private and protected channels have the protection that only contributors can create posts. In protected channels anyone can comment though as the posts are otherwise public. This is a quick way to lock down a channel if the current mitigation measures for that channel aren't adequate.


#### Akismet spam checking

When a user creates or updates a comment or a post the first line of defense is checking the contents against Akismet, the spam checking service largely used by Wordpress. This allows us to avoid having to write our own service to classify spam and lean on the knowledge Akismet has around what spam looks like.

Akismet results are a binary `True` / `False` on whether the content was spam. This opaqueness is a feature of the service so that spammers aren't able to work around it.

Akismet spam results are stored in the `channels.models.SpamCheckResult` model.

##### False Positives

Akismet can be a double-edged sword, it will occasionally misclassify a post or comment as spam. Since Akismet is a black box (and should be), we should focus our efforts on how to make handling false positives as user-friendly as possible.


###### Excluding moderators from spam checking

We've [implemented a fix](https://github.com/mitodl/open-discussions/pull/3079) to exclude channel moderators from spam checks. At this time moderators are the most active content posters and they are almost always MIT staff, so we don't expect spam from these users and avoiding the chance of false positives makes things easier all around.

###### Excluding MIT users from spam checking

We [implemented a fix](https://github.com/mitodl/open-discussions/pull/3096) to exclude MIT users (by default users with a `@mit.edu` email address) from being spam checked due to the trust factor with this group of users not to post spam. This can be enabled by the feature flag `FEATURE_SPAM_EXEMPTIONS` and is configurable by the environment variable `SPAM_EMAIL_EXEMPTIONS`.


#### User reports

We also gather user reports of offending content to cover those posts that slip through the spam checks. These posts show up in a monderator-only UI that gives them the ability to review the post/comment and remove it if necessary.


### Reducing spam value

We're also taken steps to mitigating spam value. The primary one of which was to no longer allow removed posts to be viewed. Previously these posts were available if you had a direct link to them, which for spammers meant that their content was still hosted on our site. We've since adjusted these pages to return a server 404 for anonymous and non-moderator users (to continue to support moderators being able to re-approve the post if desired). It also helps mitigates content from showing up on search engine results, which means spammers don't get any search engine ranking boosts either.

### Future plans

- Report miscategorizations to Akismet, this should help Akismet learn about what content we consider spam or not
- Moderator UI to be able to see posts that were classified as spam so they have an opportunity to be more proactive in approving them.
- Per-channel disabling of spam checks
  - In practice, channel owners would really only want to turn this on if the channel is private and there's a level of trust with the contributors
- Giving moderators the ability to either flag an account as a spammer or disable the account altogether
  - This is a fair amount of power to give away, so having the account flagged for review might be a good middle ground
- Users who frequently post spam get their accounts disabled
  - This runs the risks of false-positives causing someone who isn't a bad actor having their account disabled
