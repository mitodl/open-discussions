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
import { profilesEndpoint } from "../reducers/profiles"
import { authEndpoint } from "../reducers/auth"
import { passwordResetEndpoint } from "../reducers/password_reset"

import type { Dispatch } from "redux"

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
  profilesEndpoint,
  authEndpoint,
  passwordResetEndpoint
]

/**
 * takes an actionCreator and dispatch and returns a function that
 * dispatches the action created by that actionCreator to the store
 */
export function createActionHelper(
  dispatch: Dispatch<*>,
  actionCreator: Function
): (...args: any) => void {
  return (...args) => dispatch(actionCreator(...args))
}
