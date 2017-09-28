// @flow
import R from "ramda"

import type {
  PostForm,
  Post,
  PostListData,
  PostListResponse
} from "../flow/discussionTypes"

export const newPostForm = (): PostForm => ({
  isText: true,
  text:   "",
  url:    "",
  title:  ""
})

export const formatCommentsCount = (post: Post): string =>
  post.num_comments === 1 ? "1 Comment" : `${post.num_comments || 0} Comments`

export const mapPostListResponse = (
  response: PostListResponse
): PostListData => ({
  pagination: response.pagination,
  postIds:    response.posts.map(post => post.id)
})

export const getPostIds = R.propOr([], "postIds")

export const getPaginationParams = R.pickAll(["count", "after", "before"])
