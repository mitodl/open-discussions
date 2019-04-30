Email Notifications Infrastructure
---

#### Summary

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


#### Architecture

##### State Machine

Email Notifications proceed through the following state machine:

- `PENDING` - notification is ready to send
- `SENDING` - notification is in the process of being sent (rendered and delivered to ESP)
- `CANCELED` - notification was canceled
- `SENT` - notification was delivered to ESP\*

**\* NOTE:** to ensure we don't send an email multiple times we follow a `At Most Once` sending strategy where we mark the record as sent first, then attempt to send the email. This can cause some emails to be dropped if the ESP errors.

##### Frontpage Emails:

 - Tasks are triggered on a daily and weekly basis. Each of these tasks triggers the following task flow:
   - For all users with notifications enabled, fan out a set of batch tasks to determine if the user has posts in their feed since the last notification.
     - These tasks are idempotent and will be retried if there's any failure
   - If the user has posts in their feed, create a `PENDING` `EmailNotification` record for that user

##### Comment Notifications

 - When a comment occurs, fire a celery task to check subscriptions
 - Walk all subscriptions to that the posts and/or a comment (if the new comment was a reply to another comment) and for each one create a pending `EmailNotification` record
   - If their `NotificationSettings` record for that type has `frequency_type` of `never`, then we don't create this record. This has the effect of muting subscriptions temporarily without necessitating the removal of the subscriptions or effecting a massive catch-up of notifications if they turn it back on


##### Notification Email Sending

For both notification types, an asynchronous task set to run every minute via `crontab` will trigger another set of batch tasks in the following manner:
 - Marks the notifications as being in the `SENDING` state, trigers batch tasks for these to send the email
 - Takes a lock on the `EmailNotification` record
   - Continues if and only if the record is still pending
   - Re-checks that there is still data to send for this record (race condition coverage)
   - Marks the `EmailNotification` as sent
 - Sends the email to the ESP


##### Configuration

We have a number of configuration options available to control our sending:

| Environment Variable | Description | Examples |
|---|---|
| `OPEN_DISCUSSIONS_NOTIFICATION_ATTEMPT_RATE_LIMIT` | The per-worker rate limit at which to generate pending `EmailNotification` frontpage records | `100/s`, `2/h`, etc<br/>[See Celery Docs](https://docs.celeryproject.org/en/latest/reference/celery.app.task.html#celery.app.task.Task.rate_limit)|
| `OPEN_DISCUSSIONS_NOTIFICATION_ATTEMPT_CHUNK_SIZE` | The size of each attempt batch |`100`, `150`, etc|
| `OPEN_DISCUSSIONS_NOTIFICATION_SEND_CHUNK_SIZE` | The size of each sending batch |`100`, `150`, etc|
