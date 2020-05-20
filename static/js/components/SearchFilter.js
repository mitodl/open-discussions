// @flow
import React from "react"

type Props = {|
  clearFacet: Function,
  labelFunction: ?Function,
  value?: string
|}

const SearchFilter = ({ value, clearFacet, labelFunction }: Props) => (
  <div className="active-search-filter">
    <div className="remove-filter" onClick={clearFacet}>
      <i className="material-icons">close</i>
    </div>
    <div>{labelFunction ? labelFunction(value) : value}</div>
  </div>
)

export default SearchFilter
