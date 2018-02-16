Email
---

#### Considerations

- Be able to send frontpage email notifications on a daily or weekly basis
  - Frequency is user-configurable
  - If we don't have any new content since the last send, defer until next interval


- Be able to notify users on specific events, controlled by a subscription to the entity
  - Examples:
    - Comment replies to posts
    - Comment replies to other comments
  - Capability to notify at the following frequencies:
    - Near term we want to support:
      - Never
      - Immediate
    - Long term we may want to support:
      - Daily (digest/aggregation of new events)
      - Weekly (digest/aggregation of new events)


#### Proposal

For frontpage digests the workflow would be:

 - Daily and weekly tasks to:
  - Walk `NotificationSettings` matching the corresponding `notification_type`
  - For each of these settings, get frontpage data for that user
  - Filter the list of frontpage posts to those that were made since the last frontpage email we sent this user
    - A record needs to be stored at send time of when that happened
  - If we have at least 1 post to send, render and send the emails
  - Long a record of the sent email

For event-specific notifications:

 - When an event happens, trigger a django signal (so we can tie multiple handlers into it down the road)
 - On that event, fire a celery task to check subscriptions
 - Walk all subscriptions to that object and for each one create an `EmailNotification` record
   - If their `NotificationSettings` record for that type has `frequency_type` of `never`, then we don't create this record. This has the effect of muting subscriptions temporarily with necessitating the removal of the subscriptions or effecting a massive catch-up of notifications if they turn it back on
 - For each of those `EmailNotification` records, if the user has their `NotificationSettings` for that type set to immediate, send the email immediately, marking the notification as sent
 - **For later implementation:**
  - For weekly and daily settings, appropriate cron tasks to aggregate, render and send those emails


There is common behavior between these two mechanisms which we should implement in a reusable manner.
