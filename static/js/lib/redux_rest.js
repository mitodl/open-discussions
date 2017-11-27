// @flow
import { postsEndpoint } from "../reducers/posts"
import { subscribedChannelsEndpoint } from "../reducers/subscribedChannels"
import { channelsEndpoint } from "../reducers/channels"
import { postsForChannelEndpoint } from "../reducers/posts_for_channel"
import { frontPageEndpoint } from "../reducers/frontpage"
import { commentsEndpoint } from "../reducers/comments"
import { postUpvotesEndpoint } from "../reducers/post_upvotes"
import { channelModeratorsEndpoint } from "../reducers/channel_moderators"

export const endpoints = [
  postsEndpoint,
  subscribedChannelsEndpoint,
  channelsEndpoint,
  channelModeratorsEndpoint,
  postsForChannelEndpoint,
  frontPageEndpoint,
  commentsEndpoint,
  postUpvotesEndpoint
]
