---
layout: default
parent: RFCs
nav_order: 3
---
# 0003: Search UI Framework
{: .no_toc }

## Table of Contents
{: .no_toc .text-delta }

- Table of Contents
{:toc}

### Abstract
Previously, a decision was made to develop a custom elasticsearch UI rather than use searchkit.

From the MIT Open Search Technical Detail doc:
>We considered using a react component library that constructed queries in the front end, but discarded this approach
as not flexible enough for our styling and security needs...and also decided against searchkit due to previous
negative experiences using it in MicroMasters.


That decision was revisited due to the increased complexity of the course search UI, which includes facets.  Overall, it seems as though continuing with a custom implementation is still the best approach.  It offers maximum flexibility and customization which outweighs the cost of developing additional UI features that are already included with other frameworks.


### Architecture Changes

The following enhancements are desired for the course search UI:
- Default search across all courses if no search text is entered (filtered by facets if selected)
- Display search result counts next to each facet option
- Update the list of facets to only show those included in search results
- Display only the first ~10 topic facets, with a 'More' button to show the entire list
- Display a list of the currently applied filters, with an option to clear them all, like this:
  <img src="https://user-images.githubusercontent.com/430126/53447610-7b452800-39e3-11e9-804b-8b837a76d1ff.png" />

It should be possible to add these enhancements to the current custom UI, probably in less time than
it would take to replace all the search UI code that's been written to date with Searchkit or ReactiveSearch.

#### Searchkit
_http://www.searchkit.co/_
- Pros:
  - Demos indicate it includes the desired search enhancements.
- Cons:
  - It was initially rejected due to problems experienced in Micromasters.
  - Difficult to test
  - Difficult to customize non-standard queries
  - Slow to upgrade dependencies

#### ReactiveSearch
_https://opensource.appbase.io/reactivesearch/v2_
- Pros:
  - Demos indicate it includes the desired search enhancements.
  - Seems to be gaining [popularity over Searchkit](https://www.npmtrends.com/@appbaseio/reactivesearch-vs-searchkit)
  - Possible in theory to customize queries via the `customQuery` property of components.
- Cons:
  - Although designed to connect directly to an OpenSearch URL, using a proxy view is possible. However, it does not seem
  to play nice with Django Rest Framework; sends data as `application/x-ndjson` instead of `application/json` resulting
  in an `UnsupportedMediaType` error.
  - Difficult to take individual components and integrate them to our workflow, since every component needs to be wrapped by `<ReactiveBase />`

#### Custom UI
- Pros:
  - Already implemented, with working facets for course search
  - More flexibility in defining queries via `bodybuilder`
- Cons:
  - Needs to be modified to include the facet enhancements mentioned above, and perhaps more in the future.

### Security Considerations
Regardless of the UI framework, direct ES connections from the front-end should be avoided and certain restrictions on the queries should be imposed on the backend before submitting to ES.

### Testing & Rollout
The current custom search UI will be enhanced with additional features and tested via the usual PR/release process.
