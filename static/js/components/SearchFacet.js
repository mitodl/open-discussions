// @flow
import React, { useState } from "react"
import R from "ramda"
import _ from "lodash"

import type { FacetResult } from "../flow/searchTypes"

type Props = {|
  results: ?FacetResult,
  name: string,
  title: string,
  currentlySelected: Array<string>,
  labelFunction?: Function,
  onUpdate: Function,
  displayCount?: number
|}

function SearchFacet(props: Props) {
  const {
    name,
    title,
    results,
    currentlySelected,
    labelFunction,
    onUpdate,
    displayCount
  } = props
  const maxCount = displayCount || 5

  const [showFacetList, setShowFacetList] = useState(true)
  const [showAllFacets, setShowAllFacets] = useState(false)

  const titleLineIcon = showFacetList ? "arrow_drop_down" : "arrow_drop_up"

  return (
    <div className="facets">
      <div
        className="filter-section-title"
        onClick={() => setShowFacetList(!showFacetList)}
      >
        {title}
        <i className={`material-icons ${titleLineIcon}`}>{titleLineIcon}</i>
      </div>
      {results && results.buckets && showFacetList
        ? results.buckets.map((facet, i) => {
          const isChecked = R.contains(facet.key, currentlySelected || [])

          return (
            <React.Fragment key={i}>
              <div
                className={`${
                  showAllFacets || i < maxCount
                    ? "facet-visible"
                    : "facet-hidden"
                } ${isChecked ? "checked" : ""}`}
              >
                <input
                  type="checkbox"
                  name={name}
                  value={facet.key}
                  checked={isChecked}
                  onChange={onUpdate}
                />
                <div className="facet-label-div">
                  <div className="facet-key">
                    {labelFunction ? labelFunction(facet.key) : facet.key}
                  </div>
                  <div className="facet-count">{facet.doc_count}</div>
                </div>
              </div>
              {(!showAllFacets &&
                  i === maxCount &&
                  maxCount < results.buckets.length) ||
                (showAllFacets && i === results.buckets.length - 1) ? (
                  <div
                    className="facet-more-less"
                    onClick={() => setShowAllFacets(!showAllFacets)}
                  >
                    {showAllFacets ? "View less" : "View more"}
                  </div>
                ) : null}
            </React.Fragment>
          )
        })
        : null}
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
