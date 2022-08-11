import React, { useState } from "react"
import { contains } from "ramda"

import SearchFacetItem from "./SearchFacetItem"
import { Aggregation } from "@mitodl/course-search-utils"

const MAX_DISPLAY_COUNT = 5
const FACET_COLLAPSE_THRESHOLD = 15

interface Props {
  name: string
  title: string
  results: Aggregation | null
  currentlySelected: string[]
  onUpdate: React.ChangeEventHandler<HTMLInputElement>
}

function SearchFacet(props: Props) {
  const { name, title, results, currentlySelected, onUpdate } = props

  const [showAllFacets, setShowAllFacets] = useState(false)

  return results && results.buckets && results.buckets.length === 0 ? null : (
    <div className="facets mb-3">
      {name !== "certification" ? (
        <div className="filter-section-title pl-3 pt-2 pb-2">{title}</div>
      ) : null}
      <React.Fragment>
        {results && results.buckets ?
          results.buckets.map((facet, i) =>
            showAllFacets ||
              i < MAX_DISPLAY_COUNT ||
              results.buckets.length < FACET_COLLAPSE_THRESHOLD ? (
                <SearchFacetItem
                  key={i}
                  facet={facet}
                  isChecked={contains(facet.key, currentlySelected || [])}
                  onUpdate={onUpdate}
                  name={name}
                />
              ) : null
          ) :
          null}
        {results && results.buckets.length >= FACET_COLLAPSE_THRESHOLD ? (
          <div
            className={"facet-more-less"}
            onClick={() => setShowAllFacets(!showAllFacets)}
          >
            {showAllFacets ? "View less" : "View more"}
          </div>
        ) : null}
      </React.Fragment>
    </div>
  )
}

const facetsAreLoaded = (_prevProps: Props, nextProps: Props) => {
  // results.buckets is null while the search request is in-flight
  // we want to defer rendering in that case because it will cause
  // all the facets to briefly disappear before reappearing
  return !nextProps?.results?.hasOwnProperty("buckets")
}

export default React.memo(SearchFacet, facetsAreLoaded)
