// @flow
import { postsEndpoint } from "../reducers/posts"
import { channelsEndpoint } from "../reducers/channels"
import { postsForChannelEndpoint } from "../reducers/posts_for_channel"
import { frontPageEndpoint } from "../reducers/frontpage"
import { commentsEndpoint } from "../reducers/comments"
import { postUpvotesEndpoint } from "../reducers/post_upvotes"

export const endpoints = [
  postsEndpoint,
  channelsEndpoint,
  postsForChannelEndpoint,
  frontPageEndpoint,
  commentsEndpoint,
  postUpvotesEndpoint
]
