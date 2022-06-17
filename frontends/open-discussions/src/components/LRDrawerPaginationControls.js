// @flow
import React from "react"

type Props = {
  page: number,
  begin: number,
  setPage: Function,
  count: number,
  end: number
}

export default function LRDrawerPaginationControls(props: Props) {
  const { page, begin, setPage, count, end } = props

  return (
    <div className="pagination-nav">
      <button
        onClick={() => setPage(page - 1)}
        disabled={begin === 0}
        className="blue-btn outlined previous"
      >
        <i className="material-icons keyboard_arrow_left">
          keyboard_arrow_left
        </i>
        <span>Previous</span>
      </button>
      <button
        onClick={() => setPage(page + 1)}
        disabled={end >= count}
        className="blue-btn outlined next"
      >
        <span>Next</span>
        <i className="material-icons keyboard_arrow_right">
          keyboard_arrow_right
        </i>
      </button>
    </div>
  )
}
