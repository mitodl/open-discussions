# Cleanup

These steps are not urgent, but should be done in areasonable timeframe.

### Drop old db tables / data models

- Remove the old data models in the `channels` app
- Ensure the related tables/indexes are dropped


### Decommission reddit

At this point the reddit backend itself can be decommissioned.


### Cleanup documentation and configurations

We should remove anything non-functional related to the reddit integration:

- Documentation, readme, etc
- Configuration:
  - `mitodl/saltops`
  - Heroku
  - Docker environments
