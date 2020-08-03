---
layout: default
title: Reddit Migration
nav_order: 12
has_children: true
---
# Reddit Migration

## Major Considerations

- [Reddit Ids](considerations/reddit-ids.md)
- [Sorting](considerations/sorting.md)

## Strategy

We should tackle the migration in the following order:

- [Establish a New Schema](strategy/schema.md) - this needs to be in place before we can start any of the data migration work
- [Migrate Reads and Writes](strategy/reads-and-writes.md) - some of the work in here can be broken into subtasks and/or parallelized
- [Cleanup](strategy/cleanup.md) - not urgent, but should be done in a reasonable timeframe
