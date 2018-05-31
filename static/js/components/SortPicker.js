// @flow
import React from "react"
import R from "ramda"

import {
  VALID_POST_SORT_LABELS,
  VALID_COMMENT_SORT_LABELS
} from "../lib/sorting"

type PostSortProps = {
  updateSortParam: (t: string) => void,
  value: string
}

const SortPicker = R.curry(
  (labels, { updateSortParam, value }: PostSortProps) => (
    <div className="sorter">
      <div className="sort-label">Sort:</div>
      <select onChange={updateSortParam} value={value}>
        {labels.map(([type, label]) => (
          <option label={label} value={type} key={type}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
)

export const PostSortPicker = SortPicker(VALID_POST_SORT_LABELS)

export const CommentSortPicker = SortPicker(VALID_COMMENT_SORT_LABELS)
