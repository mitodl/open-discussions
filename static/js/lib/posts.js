// @flow
import React from "react"
import R from "ramda"
import { Link } from "react-router-dom"

import { postDetailURL, urlHostname } from "./url"
import { showDropdown, hideDropdownDebounced } from "../actions/ui"

import type { Dispatch } from "redux"
import type {
  PostForm,
  Post,
  PostListData,
  PostListResponse
} from "../flow/discussionTypes"

export const newPostForm = (): PostForm => ({
  postType: null,
  text:     "",
  url:      "",
  title:    ""
})

export const formatCommentsCount = (post: Post): string =>
  post.num_comments === 1 ? "1 comment" : `${post.num_comments || 0} comments`

export const mapPostListResponse = (
  response: PostListResponse,
  data: PostListData
): PostListData => {
  const pagination = response.pagination
  const responsePostIds = response.posts.map(post => post.id)

  let postIds
  if (!data.pagination || data.pagination.sort !== pagination.sort) {
    // If the user changed their sort do a clean reload
    postIds = responsePostIds
  } else {
    postIds = R.uniq(data.postIds.concat(response.posts.map(post => post.id)))
  }

  return {
    pagination,
    postIds
  }
}

export const getPostIds = R.propOr([], "postIds")

export const getPaginationSortParams = R.pickAll([
  "count",
  "after",
  "before",
  "sort"
])

export const PostTitleAndHostname = ({ post }: { post: Post }) => (
  <React.Fragment>
    <span className="post-title">{post.title}</span>
    {post.url ? (
      <span className="url-hostname">{`(${urlHostname(post.url)})`}</span>
    ) : null}
  </React.Fragment>
)

export const getPostDropdownMenuKey = (post: Post) => `POST_DROPDOWN_${post.id}`

export const formatPostTitle = (post: Post) =>
  post.url ? (
    <div>
      <a
        className="post-title navy"
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {post.title}
        <span className="expanded-url-hostname">
          ({urlHostname(post.url)}
          <i className="material-icons open_in_new overlay-icon">
            open_in_new
          </i>)
        </span>
      </a>
    </div>
  ) : (
    <Link
      className="post-title"
      to={postDetailURL(post.channel_name, post.id, post.slug)}
    >
      {post.title}
    </Link>
  )

// a shared function which provides a showPostMenu and hidePostMenu
// function, for showing and hiding a post menu dropdown (we use on the
// detail and list pages)
export const postMenuDropdownFuncs = (dispatch: Dispatch<*>, post: Post) => {
  const postMenuKey = getPostDropdownMenuKey(post)

  return {
    showPostMenu: () => dispatch(showDropdown(postMenuKey)),
    hidePostMenu: () => dispatch(hideDropdownDebounced(postMenuKey))
  }
}
