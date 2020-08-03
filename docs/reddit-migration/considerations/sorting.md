---
layout: default
parent: Considerations
grand_parent: Reddit Migration
nav_order: 1
---
### Sorting

There are several areas where reddit sorts objects coming back from their APIs in a way that isn't necessarily trivial via standard django ORM methods. This list is meant to be comprehensive so we know the problem space:

- `Hot` (named "Active" in our UI)
  - A logarithmic sort, where as an item ages, it requires an order of magnitude more `upvotes - downvotes` to be sorted above a newer item, the interval for the order of magnitude increase is 12.5 hours
  - Implementation: https://github.com/mitodl/reddit/blob/stable/r2/r2/lib/db/_sorts.pyx#L47
- `Confidence` (named "Best" in our UI)
  - Items are sorted with a [weighted algorithm](https://www.evanmiller.org/how-not-to-sort-by-average-rating.html)
  - See the corresponding code in the reddit source:
    - https://github.com/mitodl/reddit/blob/stable/r2/r2/lib/db/_sorts.pyx#L70
    - https://github.com/mitodl/reddit/blob/stable/install/setup_postgres.sh#L42
- `New` - posts are sorted in reverse chronological order
- `old` - posts are sorted in chronological order


#### Posts

Posts are sorted in two places: channels and the frontpage. These both support seemingly similar sorts but the implementations actually differ.

##### Posts in Channels

Post sorting in channels is the more straightforward version of post sorting, there are 3 kinds we use: `Hot`, `New`, `Top`

##### Posts in Frontpage

 - `Hot` - posts are sorted using a normalized version of the hot algorithm. This is done to ensure that content from less active channels isn't overshadowed by content from more popular channels.
   - See the corresponding code in the reddit source:
     - https://github.com/mitodl/reddit/blob/stable/r2/r2/lib/normalized_hot.py#L38-L79
 - `New` and `Top` - same method as channels

 #### Comments

 Comments only have a few sorting options we're currently using: `New`, `Old`, and `Confidence`
