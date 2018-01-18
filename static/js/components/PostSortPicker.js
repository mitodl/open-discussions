// @flow
import React from "react"

import { VALID_SORT_LABELS } from "../lib/sorting"

type PostSortProps = {
  updateSortParam: (t: string) => void,
  value: string
}

const PostSortPicker = ({ updateSortParam, value }: PostSortProps) =>
  <div className="sorter">
    <div className="sort-label">Sort:</div>
    <select onChange={updateSortParam} value={value}>
      {VALID_SORT_LABELS.map(([type, label]) =>
        <option label={label} value={type} key={type}>
          {label}
        </option>
      )}
    </select>
  </div>

export default PostSortPicker
