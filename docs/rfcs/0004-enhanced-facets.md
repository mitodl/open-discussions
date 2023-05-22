---
layout: default
parent: RFCs
nav_order: 4
has_toc: true
---

# 0004: Enhanced Search Facets for Courses
{: .no_toc }

## Table of Contents
{: .no_toc .text-delta }

- Table of Contents
{:toc}

### Abstract
Have full-featured facets similar to the "Country" facet of this Searchkit demo: http://demo.searchkit.co/imdb

e.g.
![image](https://user-images.githubusercontent.com/430126/53446383-d6c1e680-39e0-11e9-8271-d124e887988d.png)

and
![image](https://user-images.githubusercontent.com/430126/53446400-e17c7b80-39e0-11e9-9654-ee1ff3e4533b.png)



### Acceptance Criteria

- [ ] Display the hit count next to each facet filter
- [ ] Don't display a facet for which there are zero hits in the current result set
- [ ] Sort the facets in each category by hit count
- [ ] Only display the first 5 Subject area filters (we may want to try different numbers for this)
- [X] When the checkbox next to a filter is checked, add it to the search filter
- [ ] When a search filter is added, display it above the search results -- as a reminder to user of which filters are
active and so that they can be removed.


### Architecture Changes

Currently, a separate aggregation request is made once to Opensearch to get the list of all unique subject and
platform facet values, and stored in state.  This includes counts, which are not displayed.  The aggregation query
can be appended to the standard search query so that both are returned in the same response, with facet counts based on the
search results returned.  The subject facets are sorted alphabetically, this will be changed to sort by hits, which
will be displayed next to the facet name.  

In order to get availability counts (prior, upcoming, current), an availability field needs to be added to the Course
model, populated from each Course object's raw JSON, and added to the search index.  The aggregate ES query will need to
include this field, and the search query will also need to be modified to use it instead of a date range based on the
start_date and end_date fields.

All the search parameters are stored in the CourseSearchPage container's state, and can be used to dynamically create/update
a list of search filters above the search results, and just below the search text box.  Each displayed filter will have an
x button to remove the filter (by triggering a function to remove it from state).

Some functionality has already been implemented: when the checkbox next to a facet is checked, it is added to the
search filters via a state change in the CourseSearchPage container.  The facet choices should probably be stored in the global search state instead, with the facet widgets and associated code modified to the extent necessary to make them  more generic and suitable for use with other searches besides courses.

### Security Considerations
None

### Testing & Rollout
The current search facets will be enhanced with the additional features and tested via the usual PR/release
process.
