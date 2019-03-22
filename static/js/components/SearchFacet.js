// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import _ from "lodash"
import Checkbox from "rmwc/Checkbox/index"

import { hideSearchFacets, showSearchFacets } from "../actions/ui"

import type { Dispatch } from "redux"
import type { FacetResult } from "../flow/searchTypes"

type OwnProps = {|
  results: ?FacetResult,
  name: string,
  title: string,
  currentlySelected: Array<string>,
  labelFunction?: Function,
  onUpdate: Function,
  displayCount?: number
|}

type StateProps = {|
  showAll: boolean
|}

type DispatchProps = {|
  dispatch: Dispatch<*>
|}

type Props = {|
  ...StateProps,
  ...DispatchProps,
  ...OwnProps
|}

export class SearchFacet extends React.Component<Props> {
  toggleAllFacets = async (key: string) => {
    const { dispatch, showAll } = this.props
    await dispatch(showAll ? hideSearchFacets(key) : showSearchFacets(key))
  }

  shouldComponentUpdate(nextProps: Props) {
    const { results, currentlySelected, showAll } = this.props
    const nextResults = nextProps.results
    return (
      _.has(nextResults, "buckets") &&
      (results !== nextResults ||
        currentlySelected !== nextProps.currentlySelected ||
        showAll !== nextProps.showAll)
    )
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
        {results && results.buckets
          ? results.buckets.map((facet, i) => (
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
              {(!showAll &&
                  i === maxCount &&
                  maxCount < results.buckets.length) ||
                (showAll && i === results.buckets.length - 1) ? (
                  <div
                    className="facet-more-less"
                    onClick={() => this.toggleAllFacets(name)}
                  >
                    {showAll ? "View less" : "View more"}
                  </div>
                ) : null}
            </React.Fragment>
          ))
          : null}
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps): StateProps => {
  const { ui } = state
  const { name } = ownProps
  return {
    showAll: ui.facets.has(name)
  }
}

export default connect<Props, OwnProps, _, _, _, _>(mapStateToProps)(
  SearchFacet
)
