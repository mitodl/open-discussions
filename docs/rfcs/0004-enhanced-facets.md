## Enhanced search facets for courses

#### Abstract
Have full-featured facets similar to the "Country" facet of this Searchkit demo: http://demo.searchkit.co/imdb

e.g. 
![image](https://user-images.githubusercontent.com/430126/53446383-d6c1e680-39e0-11e9-8271-d124e887988d.png)

and 
![image](https://user-images.githubusercontent.com/430126/53446400-e17c7b80-39e0-11e9-9654-ee1ff3e4533b.png)



#### Acceptance Criteria:

- [ ] Display the hit count next to each facet filter
- [ ] Don't display a facet for which there are zero hits in the current result set
- [ ] Sort the facets in each category by hit count
- [ ] Only display the first 5 Subject area filters (we may want to try different numbers for this)
- [X] When the checkbox next to a filter is checked, add it to the search filter
- [ ] When a search filter is added, display it above the search results -- as a reminder to user of which filters are 
active and so that they can be removed. 


#### Architecture Changes

Currently, a separate aggregation request is made once to Elasticsearch to get the list of all unique subject and 
platform facet values, and stored in state.  This includes counts, which are not displayed.  The aggregation query can 
be appended to the standard search query so that both are returned in the same response, with facet counts based on the 
search results returned.  The subject facets are sorted alphabetically, this will be changed to sort by hits, which 
will be displayed next to the facet name.  

In order to get availability counts (prior, upcoming, current), an availability field needs to be added to the Course 
model and populated from each Course object's raw JSON.

All the search parameters are stored in state, and can be used to dynamically create/update a list of search filters
above the search results, and just below the search text box.  Each displayed filter will have an x button to remove
the filter (by triggering a function to remove it from state).

Some functionality has already been implemented: when the checkbox next to a facet is checked, it is added to the 
search filters via a state change.

#### Security Considerations
None

#### Testing & Rollout
The current custom search facets will be enhanced with the additional features and tested via the usual PR/release 
process.
