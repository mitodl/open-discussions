## Caching System for Third-Party Data

#### Abstract

We need a caching system for caching third-party data. Some known needs are:

- RSS Widget feed responses (XML)
- Embedly API responses (JSON)

We currently have Redis available which we *could* use as a cache, however, we primarily use it as a queuing system for `celery` tasks. Because of this use pattern, we have Redis configured to not evict keys, which means it can't behave like a traditional LRU cache for actual caching while still ensuring we don't critical `celery` state data or tasks.

Additionally, caching arbitrary blobs of response data is likely to grow cache memory usage at an unbounded rate, which in a scenario using Redis could cause a situation where the application is unable to dispatch a task into Redis because it has hit the memory ceiling.

So for both the above reasons at a minimum the cache system used for caching arbitrary blobs of data should be a separate physical system and possibly doesn't need to be Redis.

#### Architecture Changes


#### Security Considerations


#### Testing & Rollout
