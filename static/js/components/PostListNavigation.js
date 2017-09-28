// @flow
import React from "react"
import { Link } from "react-router-dom"

import { toQueryString } from "../lib/url"

type PostListNavigationProps = {
  pathname: string,
  before: ?string,
  after: ?string,
  beforeCount: ?number,
  afterCount: ?number
}

const PostListNavigation = (props: PostListNavigationProps) => {
  const { pathname, before, after, beforeCount, afterCount } = props
  const toBefore = {
    pathname,
    search: toQueryString({
      count: beforeCount,
      before
    })
  }
  const toAfter = {
    pathname,
    search: toQueryString({
      count: afterCount,
      after
    })
  }
  return (
    <div className="post-list-navigation">
      {before
        ? <Link
          className="mdc-button mdc-button--raised blue-button"
          to={toBefore}
        >
            &lt; previous
        </Link>
        : null}
      {after
        ? <Link
          className="mdc-button mdc-button--raised blue-button"
          to={toAfter}
        >
            next &gt;
        </Link>
        : null}
    </div>
  )
}

export default PostListNavigation
