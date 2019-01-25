// @flow
import React from "react"
import R from "ramda"
import { Link } from "react-router-dom"

import { postDetailURL, urlHostname } from "./url"
import { showDropdown, hideDropdownDebounced } from "../actions/ui"
import { LINK_TYPE_LINK, LINK_TYPE_TEXT, LINK_TYPE_ARTICLE } from "./channels"

import type { Dispatch } from "redux"
import type {
  PostForm,
  Post,
  PostListData,
  PostListResponse
} from "../flow/discussionTypes"

export const POST_PREVIEW_LINES = 2
export const EMBEDLY_THUMB_HEIGHT = 123
export const EMBEDLY_THUMB_WIDTH = 240

export const newPostForm = (): PostForm => ({
  postType:         null,
  text:             "",
  url:              "",
  title:            "",
  thumbnail:        null,
  article:          [],
  cover_image:      null,
  show_cover_image: true
})

export const postFormIsContentless = R.useWith(
  R.equals,
  R.repeat(R.omit(["postType", "title", "show_cover_image"]), 2)
)(newPostForm())

export const isPostContainingText = (post: Post): boolean =>
  post.post_type === LINK_TYPE_TEXT || post.post_type === LINK_TYPE_ARTICLE

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
    {post.post_type === LINK_TYPE_LINK ? (
      <span className="url-hostname">{`(${urlHostname(post.url)})`}</span>
    ) : null}
  </React.Fragment>
)

export const getPostDropdownMenuKey = (post: Post) => `POST_DROPDOWN_${post.id}`

export const formatPostTitle = (post: Post) =>
  post.post_type === LINK_TYPE_LINK ? (
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
      className="post-title navy"
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

export const getPlainTextContent = (post: Post): ?string => {
  if (isPostContainingText(post)) {
    // Default to the 'text' value if 'plain_text' is null for any reason
    return post.plain_text || post.text
  }
  return null
}

export const isEditablePostType = (post: Post): boolean =>
  post.post_type === LINK_TYPE_TEXT || post.post_type === LINK_TYPE_ARTICLE
