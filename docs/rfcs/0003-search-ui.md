## Search UI framework

#### Abstract
Previously, a decision was made to develop a custom elasticsearch UI rather than use searchkit (reasons?).
That decision is being revisited due to the increased complexity of the course search UI, which includes facets.


#### Architecture Changes

The following enhancements are desired for the course search UI:
- Default search across all courses if no search text is entered (filtered by facets if selected)
- Display search result counts next to each facet option
- Update the list of facets to only show those included in search results
- Display only the first ~10 topic facets, with a 'More' button to show the entire list

It should be possible to add these enhancements to the current custom UI, probably in less time than
it would take to replace all the search UI code that's been written to date with Searchkit or ReactiveSearch.

##### Searchkit
_http://www.searchkit.co/_
- Pros:
- Cons: 


##### ReactiveSearch 
_https://opensource.appbase.io/reactivesearch/v2_
- Pros:
- Cons:


##### Custom UI
- Pros:
  - UI is already implemented for post/comment/profile/course search, with working facets for course search
- Cons:
  - Needs to be modified to include the enhancements mentioned above

#### Security Considerations


#### Testing & Rollout
