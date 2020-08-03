---
layout: default
parent: RFCs
nav_order: 1
---
# 0001: Caching System for Third-Party Data
{: .no_toc }

## Table of Contents
{: .no_toc .text-delta }

- Table of Contents
{:toc}

### Abstract

We need a caching system for caching third-party data. Some known needs are:

- RSS Widget feed responses (XML)
- Embedly API responses (JSON)

We currently have Redis available which we *could* use as a cache, however, we primarily use it as a queuing system for `celery` tasks. Because of this use pattern, we have Redis configured to not evict keys, which means it can't behave like a traditional LRU cache for actual caching while still ensuring we don't conflict with critical `celery` state data or tasks.

Additionally, caching arbitrary blobs of response data is likely to grow cache memory usage at an unbounded rate, which in a scenario using Redis could cause a situation where the application is unable to dispatch a task into Redis because it has hit the memory ceiling.

So for both the above reasons at a minimum the cache system used for caching arbitrary blobs of data should be a separate physical system and we should evaluate which backing cache is best for the needs that are known.

### Architecture Changes

Django has a built-in [caching system](https://docs.djangoproject.com/en/2.1/topics/cache/) with pluggable backends that we should try to use instead of rolling our own. It supports several backend types the most practical for us being:

- Memcached (`django.core.cache.backends.memcached.PyLibMCCache`)
- Redis (`django.core.cache.backends.memcached.PyLibMCCache`)
- Database (`django.core.cache.backends.memcached.PyLibMCCache`)

Using this means there's no big architecture to put in place.

### Security Considerations

Since we run our application in Heroku, the backing store needs to be secured for public access. There are two aspects of this we need to look at:

#### Authentication

The backing store should support some flavor of credentials so we can ensure writes to this system are from an authorized source (our application). Particularly because often this information is being rendered back to users on the discussions site (e.g. Embedly descriptions or widget responses). An unauthenticated store would be an easy attack vector for getting unauthorized content to show up on the site.

See [Backend Security Comparison](#backend-security-comparison).


#### Encrypted Transport

It's ideal to encrypt traffic if it is going to the store across the public internet. Particularly because unencrypted traffic negates some of the benefits of the requests being authenticated.

See [Backend Security Comparison](#backend-security-comparison).

#### Backend Security Comparison

| Backend | Credential Type | Transport Type | Notes |
| --- | --- | --- | --- |
| Memcached | Username/Password via SASL | Not Encrypted | This backend is probably less than ideal for applications that are not deployed entirely within a VPC or similarly protected environment. Since we are deployed in Heroku, this backend is probably a no-go for that reason. |
| Redis | Username/Password | TLS | Security Docs:<br>[Redis Enterprise](https://redislabs.com/redis-enterprise/technology/redis-security-reliability/) (formerly RedisCloud)<BR>[Elasticache Redis](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/in-transit-encryption.html) |
| Database | Username/Password | TLS | Same security considerations as our existing DB connections which we can consider a solved problem. |

### Testing & Rollout

Caching should be optional to configure so that we can roll out the code for this without being blocked by the backing stores needing to be operationally setup first. We can then coordinate configuring the app once operations has the environment setup.


#### Backend Deployment Complexity

Aside from generally needing to configure each of these with some runtime settings, here are some extra per-backend considerations are:

| Backend | Notes |
| --- | --- |
| Memcached | We would need to be able to share the memcached instance across PR apps / CI.<br><br>DevOps team already has salt scripts for standing up a memcached-backed Elasticache cluster [here](https://github.com/mitodl/salt-ops/blob/bde16e69d9c370804d330fce647bed4a43e8a7a6/salt/orchestrate/aws/elasticache.sls). |
| Redis | Ideally we use `pylibmc`, which will require an additional dependency to be added to the app that has C bindings. Need to determine how supported this is in Heroku.<br><br>We would need to be able to share the Redis instance across PR apps / CI.<br><br>Our team is already familiar with Redis.<br><br>DevOps team already has salt scripts for standing up a Redis-backed Elasticache cluster [here](https://github.com/mitodl/salt-ops/blob/bde16e69d9c370804d330fce647bed4a43e8a7a6/salt/orchestrate/aws/elasticache.sls) |
| Database | Requires an additional out-of-band management command (`manage.py createcachetable`) to be run per environment (including all PR builds). <br><br>A major downside to this is the table is **not** managed via standard django migration mechanisms which makes this difficult to automate environments for. |


### Conclusion

`django.cache` backed by Redis is the most appealing option in terms of familiarity and security.

However, after discussion with stakeholders we're going to go with the database-backed cache as we're not certain the performance gains are worth the operational difficultly configuring our environments would be. Additionally, it was suggested a cache like Varnish in front of these external requests might be more appropriate and the database-backed approach requires the least effort to get functional.
