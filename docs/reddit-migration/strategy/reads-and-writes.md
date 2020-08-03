---
layout: default
parent: Strategy
grand_parent: Reddit Migration
nav_order: 2
---
# Migrate Reads and Writes

We need to gracefully migrate our APIs over to the new schema. We want to avoid or at the very least minimize any sort of downtime.

In general, migrating reads and writes can happen in a siloed manner, in order of highest to lowest level in the relationship hierarchies:

- Channels
- Posts
- Comments
- etc...

### Add writes to the new tables

This should be fairly straightforward, we should add another write to where we are currently writing (calling APIs) to reddit. Most/all of these should be in `channels/api.py` and we should include the writes in any of the existing atomic transactions in that file. There are some cases where we haven't added transactions because they provide no benefit. Those tend to be when we're creating a piece of data (post or comment) and the source of truth is reddit. In those cases a transaction rollback is of no value because we can't rollback a reddit api call.

### Backpopulate historical data into new tables

This can be done with backpopulate commands and celery tasks. We've done this plenty of times so it shouldn't be too difficult.

### Verify new data

We want some kind of verification of the new data vs the old data. Probably a command that runs through all of the data and verifies records exist and are accurate.

### Move reads to the new tables

- Move APIs, celery tasks, and any other reads to the new data models. After this step there should be no references in application code to the old models.
- Migrate any BI queries to the new tables
  - If we silo our changes on object type, this might have to wait until everything is moved over

### Backup reddit data

It can't hurt and is probably prudent to take a backup of our reddit data prior to cutting off writes.

### Remove writes from the old schema

This means removing writes to the models defined in the `channels` app and the writes to reddit itself. After this step we should see no traffic to reddit and no further writes to the tables. This can be tested by temporarily stopping the reddit API instances and verifying there are no errors when exercising the app.
