// @flow
import React, { useState } from "react"
import R from "ramda"
import _ from "lodash"

import SearchFacetItem from "./SearchFacetItem"

import type { FacetResult } from "../../flow/searchTypes"

type Props = {|
  results: ?FacetResult,
  name: string,
  title: ?string,
  currentlySelected: Array<string>,
  labelFunction?: Function,
  onUpdate: Function
|}

const MAX_DISPLAY_COUNT = 5
const FACET_COLLAPSE_THRESHOLD = 15

function SearchFacet(props: Props) {
  const { name, title, results, currentlySelected, labelFunction, onUpdate } =
    props
  const [showFacetList, setShowFacetList] = useState(true)
  const [showAllFacets, setShowAllFacets] = useState(false)

  const titleLineIcon = showFacetList ? "arrow_drop_down" : "arrow_drop_up"

  return results && results.buckets && results.buckets.length === 0 ? null : (
    <div className="facets">
      {title ? (
        <div
          className="filter-section-title"
          onClick={() => setShowFacetList(!showFacetList)}
        >
          {title}
          {name !== "certification" ? (
            <i className={`material-icons ${titleLineIcon}`}>{titleLineIcon}</i>
          ) : null}
        </div>
      ) : null}
      {showFacetList ? (
        <React.Fragment>
          {results && results.buckets
            ? results.buckets.map((facet, i) =>
              showAllFacets ||
                i < MAX_DISPLAY_COUNT ||
                results.buckets.length < FACET_COLLAPSE_THRESHOLD ? (
                  <SearchFacetItem
                    key={i}
                    facet={facet}
                    isChecked={R.contains(facet.key, currentlySelected || [])}
                    onUpdate={onUpdate}
                    labelFunction={labelFunction}
                    name={name}
                  />
                ) : null
            )
            : null}
          {results && results.buckets.length >= FACET_COLLAPSE_THRESHOLD ? (
            <div
              className={"facet-more-less"}
              onClick={() => setShowAllFacets(!showAllFacets)}
            >
              {showAllFacets ? "View less" : "View more"}
            </div>
          ) : null}
        </React.Fragment>
      ) : null}
    </div>
  )
}

const propsAreEqual = (prevProps, nextProps) => {
  // results.buckets is null while the search request is in-flight
  // we want to defer rendering in that case because it will cause
  // all the facets to briefly disappear before reappearing
  return !_.has(nextProps.results, "buckets")
}

export default React.memo<Props>(SearchFacet, propsAreEqual)
