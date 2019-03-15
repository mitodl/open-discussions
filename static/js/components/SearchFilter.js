// @flow
import React from "react"

type Props = {|
  clearFacet: Function,
  labelFunction: ?Function,
  title: string,
  value?: string
|}

const SearchFilter = ({ title, value, clearFacet, labelFunction }: Props) => (
  <div className={"search-filter-div"}>
    <div>
      {title}
      {value ? `: ${labelFunction ? labelFunction(value) : value}` : ""}
    </div>
    <div className="search-filter-close" onClick={clearFacet}>
      <i className="material-icons">close</i>
    </div>
  </div>
)

export default SearchFilter
