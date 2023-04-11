import React, { useCallback, useMemo, } from "react"
import Container from "@mui/material/Container"
import { BannerPage, useMuiBreakpoint } from "ol-util"
import InfiniteScroll from "react-infinite-scroller"
import {
  Aggregations,
  useSearchInputs,
  useFacetOptions,
  useSyncUrlAndSearch
} from "@mitodl/course-search-utils"
import {
  SearchInput,
  SearchFilterDrawer,
  FacetManifest
} from "ol-search-ui"
import { GridColumn, GridContainer } from "../components/layout"
import { useInfiniteSearch } from "../api/learning-resources/search"

import LearningResourceCard from "../components/LearningResourceCard"
import { useHistory } from "react-router"

const ALLOWED_TYPES = ["program", "course"]
const pageSize = SETTINGS.search_page_size

const facetMap: FacetManifest = [
  ["certification", "Certificates"],
  ["type", "Learning Resource"],
  ["offered_by", "Offered By"]
]

const SearchPage: React.FC = () => {
  const isMd = useMuiBreakpoint("md")

  const history = useHistory()
  const search = useSearchInputs(history)
  const { text, activeFacets } = search.searchParams
  const searchQuery = useInfiniteSearch({
    text,
    activeFacets,
    size:         pageSize,
    allowedTypes: ALLOWED_TYPES
  })
  useSyncUrlAndSearch(history, search)

  const aggregations = useMemo(() => {
    return new Map(Object.entries(searchQuery.data?.pages[0].aggregations ?? {})) as Aggregations
  }, [searchQuery.data?.pages])
  const facetOptions = useFacetOptions(aggregations, activeFacets)

  const results = useMemo(() => {
    return searchQuery.data?.pages.flatMap(page => page.hits.results) || []
  }, [searchQuery.data])
  const { fetchNextPage } = searchQuery
  const loadMore = useCallback(() => {
    if (!searchQuery.isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, searchQuery.isFetchingNextPage])

  const hasResultsAvailable = !searchQuery.isLoading && !searchQuery.isPreviousData

  return (
    <BannerPage
      omitBackground
      className="search-page-banner"
      bannerContent={
        <Container>
          <GridContainer>
            <GridColumn variant="sidebar-2" />
            <GridColumn variant="main-2" component="section">
              <SearchInput
                className="main-search"
                placeholder="Search for online courses or programs at MIT"
                onChange={search.updateText}
                value={search.text || ""}
                onClear={search.clearText}
                onSubmit={search.submitText}
                autoFocus
              />
            </GridColumn>
          </GridContainer>
        </Container>
      }
    >
      <Container disableGutters>
        <GridContainer>
          <GridColumn variant="sidebar-2">
            <SearchFilterDrawer
              alwaysOpen={isMd}
              facetMap={facetMap}
              facetOptions={facetOptions}
              activeFacets={activeFacets}
              onUpdateFacets={search.onUpdateFacet}
              clearAllFilters={search.clearAllFilters}
              toggleFacet={search.toggleFacet}
            />
          </GridColumn>
          <GridColumn variant="main-2" component="section">
            <InfiniteScroll
              hasMore={searchQuery.hasNextPage}
              loadMore={loadMore}
              initialLoad={searchQuery.data === undefined}
              loader={
                <div key="loader" className="loader">
                  Loading ...
                </div>
              }
            >
              {searchQuery.isError ? (
                <div className="no-results-found">
                  <span>Oops! Something went wrong.</span>
                </div>
              ) : hasResultsAvailable ? (
                results.length === 0 ? (
                  <div className="no-results-found">
                    <span>No results found for your query</span>
                  </div>
                ) : (
                  <ul
                    aria-label="Search Results"
                    className="ic-searchpage-list ic-card-row-list"
                  >
                    {results.map(hit => (
                      <li
                        key={hit.object_type.concat(
                          hit.id.toString()
                        )}
                      >
                        <LearningResourceCard
                          variant="row-reverse"
                          resource={hit}
                        />
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <span>Loading...</span>
              )}
            </InfiniteScroll>
          </GridColumn>
        </GridContainer>
      </Container>
    </BannerPage>
  )
}

export default SearchPage
