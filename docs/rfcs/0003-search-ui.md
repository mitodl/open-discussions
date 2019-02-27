## Search UI framework

#### Abstract
Previously, a decision was made to develop a custom elasticsearch UI rather than use searchkit.

From the MIT Open Search Technical Detail doc:
>We considered using a react component library that constructed queries in the front end, but discarded this approach 
as not flexible enough for our styling and security needs...and also decided against searchkit due to previous 
negative experiences using it in MicroMasters.


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
  - Demos indicate it includes the desired search enhancements.
- Cons: 
  - It was initially rejected due to problems experienced in Micromasters.
  - 

##### ReactiveSearch 
_https://opensource.appbase.io/reactivesearch/v2_
- Pros:
  - Demos indicate it includes the desired search enhancements.
  - Seems to be gaining [popularity over Searchkit](https://www.npmtrends.com/@appbaseio/reactivesearch-vs-searchkit)
- Cons:
  - Designed to connect directly to an Elasticsearch URL.  Using a proxy is possible but it does not seem to play nice 
  with Django Rest Framework; sends data as `application/x-ndjson` instead of `application/json` resulting in `UnsupportedMediaType` error. 
  - Potential issues with our schema? Using simplest possible search component (`DataSearch`), and connecting directly to Elasticsearch, no results are returned:
  ```
      <ReactiveBase
        app="discussions_local_all_default"
        url="http://localhost:9101"
      >
        <DataSearch
          componentId="searchbox"
          dataField={["course_title.english,course_title,short_description.english,short_description"]}
        />
      </ReactiveBase>  
  ```

##### Custom UI
- Pros:
  - UI is already implemented for post/comment/profile/course search, with working facets for course search
- Cons:
  - Needs to be modified to include the enhancements mentioned above

#### Security Considerations
- Would be best to avoid connecting directly to Elasticsearch URL's

#### Testing & Rollout
