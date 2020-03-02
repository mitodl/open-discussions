
### Reddit Ids

Ids have to get handled carefully because we're moving the source of truth of these from Reddit to postgres, but it is a gradual switchover that will be paced out over several releases so we can't just put the site offline while we do this.

Reddit ids are base36 encoded integers, so we can decode those to a value that can go into a integer column. In fact we are already doing this with the `Base36IntegerField` column type so we already have the decoded values.

### Migration Plan

- Reddit will be the source of truth of id values up until we deploy the code that switches the source of truth to postgres
- We need a version of `Base36IntegerField` that subclasses `BigAutoField` instead (might as well switch to a `BIGINT` while we're in here) and use that for `id`
on models. That allows transparent usage of base-36 and base-10 integers.
- Under the hood, `BigAutoField` is a `BIGSERIAL` in postgres, which is syntactic sugar for creating a column with a sequence as the default value. It doesn't _require_ that inserted columns use that default, so we can define this as such from the beginning.
- When we deploy the code changes that generate the ids in postgres from the sequence, we need to advance that sequence since it will still be set to `1` as the next value. We should include a healthy margin between the current highest id and the new sequence value.
  - This should be decided when the code is written to accommodate current application traffic
  - See https://www.postgresql.org/docs/9.1/sql-altersequence.html
