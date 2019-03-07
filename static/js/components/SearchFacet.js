import React from "react"
import R from "ramda"
import { Dispatch } from "redux"
import { connect } from "react-redux"
import Checkbox from "rmwc/Checkbox/index"

import { hideSearchFacets, showSearchFacets } from "../actions/ui"

import type { FacetResult } from "../flow/searchTypes"

type Props = {
  results: FacetResult,
  name: string,
  title: string,
  currentlySelected: Array<string>,
  labelFunction?: Function,
  onUpdate: Function,
  displayCount?: number,
  showAll: boolean,
  dispatch: Dispatch<*>
}

export class SearchFacet extends React.Component<Props> {
  constructor() {
    super()
    this.state = {
      showAll: false
    }
  }

  toggleAllFacets = async (key: string) => {
    const { dispatch, showAll } = this.props
    await dispatch(showAll ? hideSearchFacets(key) : showSearchFacets(key))
  }

  render() {
    const {
      name,
      title,
      results,
      currentlySelected,
      labelFunction,
      onUpdate,
      showAll,
      displayCount
    } = this.props
    const maxCount = displayCount || 5

    return (
      <div className="facets">
        <div className="facet-title">{title}</div>
        {results.buckets.map((facet, i) => (
          <React.Fragment key={i}>
            <div
              className={
                showAll || i < maxCount ? "facet-visible" : "facet-hidden"
              }
            >
              <Checkbox
                name={name}
                value={facet.key}
                checked={R.contains(facet.key, currentlySelected || [])}
                onClick={onUpdate}
              >
                <div className="facet-label-div">
                  <div className="facet-key">
                    {labelFunction ? labelFunction(facet.key) : facet.key}
                  </div>
                  <div className="facet-count">{facet.doc_count}</div>
                </div>
              </Checkbox>
            </div>
            {i === maxCount && !showAll && maxCount < results.buckets.length ? (
              <div
                className="facet-more-less"
                onClick={() => this.toggleAllFacets(name)}
              >
                View more
              </div>
            ) : null}
          </React.Fragment>
        ))}
        {showAll && maxCount < results.buckets.length ? (
          <div
            className="facet-more-less"
            onClick={() => this.toggleAllFacets(name)}
          >
            View less
          </div>
        ) : null}
      </div>
    )
  }
}

export default connect()(SearchFacet)
