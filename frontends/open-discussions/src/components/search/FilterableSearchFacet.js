// @flow
import React, { useState, useEffect, useCallback } from "react"
import R from "ramda"
import _ from "lodash"
import Fuse from "fuse.js/dist/fuse.basic.common"

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

// the `.search method returns records like { item, refindex }
// where item is the facet and refIndex is it's index in the original
// array. this helper just pulls out only the facets themselves
const runSearch = (searcher, text) =>
  // $FlowFixMe
  searcher.search(text).map(({ item }) => item)

function FilterableSearchFacet(props: Props) {
  const {
    name,
    title,
    results,
    currentlySelected,
    labelFunction,
    onUpdate
  } = props
  const [showFacetList, setShowFacetList] = useState(true)

  // null is signal for no input yet or cleared input
  const [filteredList, setFilteredList] = useState(null)
  const [searcher, setSearcher] = useState(null)

  const [filterText, setFilterText] = useState("")

  useEffect(() => {
    if (results && results.buckets) {
      const searcher = new Fuse(results.buckets, {
        keys:      ["key"],
        threshold: 0.4
      })
      setSearcher(searcher)
    }
  }, [results])

  useEffect(() => {
    if (filterText === "") {
      setFilteredList(null)
    } else {
      setFilteredList(runSearch(searcher, filterText))
    }
  }, [searcher, filterText])

  const handleFilterInput = useCallback(e => {
    e.preventDefault()
    const filterText = e.target.value
    setFilterText(filterText)
  }, [])

  const titleLineIcon = showFacetList ? "arrow_drop_down" : "arrow_drop_up"

  let facets
  if (filteredList) {
    facets = filteredList
  } else if (results && results.buckets) {
    facets = results.buckets
  } else {
    facets = []
  }

  return results && results.buckets && results.buckets.length === 0 ? null : (
    <div className="facets filterable-facet">
      <div
        className="filter-section-title"
        onClick={() => setShowFacetList(!showFacetList)}
      >
        {title}
        <i className={`material-icons ${titleLineIcon}`}>{titleLineIcon}</i>
      </div>
      {showFacetList ? (
        <>
          <div className="input-wrapper">
            <input
              className="facet-filter"
              type="text"
              onChange={handleFilterInput}
              value={filterText}
              placeholder={`Search ${title || ""}`}
            />
            {filterText === "" ? (
              <i className="material-icons search-icon">search</i>
            ) : (
              <i
                className="material-icons clear-icon"
                onClick={() => setFilterText("")}
                onKeyPress={e => {
                  if (e.key === "Enter") {
                    setFilterText("")
                  }
                }}
                tabIndex="0"
              >
                clear
              </i>
            )}
          </div>
          <div className="facet-list">
            {facets.map((facet, i) => (
              <SearchFacetItem
                key={i}
                facet={facet}
                isChecked={R.contains(facet.key, currentlySelected || [])}
                onUpdate={onUpdate}
                labelFunction={labelFunction}
                name={name}
              />
            ))}
          </div>
        </>
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

export default React.memo<Props>(FilterableSearchFacet, propsAreEqual)
