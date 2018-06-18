// @flow
import { postsEndpoint } from "../reducers/posts"
import { subscribedChannelsEndpoint } from "../reducers/subscribedChannels"
import { channelsEndpoint } from "../reducers/channels"
import { postsForChannelEndpoint } from "../reducers/posts_for_channel"
import { frontPageEndpoint } from "../reducers/frontpage"
import { commentsEndpoint, moreCommentsEndpoint } from "../reducers/comments"
import { postUpvotesEndpoint } from "../reducers/post_upvotes"
import { channelModeratorsEndpoint } from "../reducers/channel_moderators"
import { postRemovedEndpoint } from "../reducers/post_removed"
import { reportsEndpoint } from "../reducers/reports"
import { settingsEndpoint } from "../reducers/settings"
import { embedlyEndpoint } from "../reducers/embedly"
import { authEndpoint } from "../reducers/auth"

export const endpoints = [
  postsEndpoint,
  subscribedChannelsEndpoint,
  channelsEndpoint,
  channelModeratorsEndpoint,
  postsForChannelEndpoint,
  frontPageEndpoint,
  commentsEndpoint,
  moreCommentsEndpoint,
  postUpvotesEndpoint,
  postRemovedEndpoint,
  reportsEndpoint,
  settingsEndpoint,
  embedlyEndpoint,
  authEndpoint
]
