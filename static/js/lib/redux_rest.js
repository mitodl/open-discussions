// @flow
import { postsEndpoint } from "../reducers/posts"
import { subscribedChannelsEndpoint } from "../reducers/subscribedChannels"
import { channelsEndpoint } from "../reducers/channels"
import { postsForChannelEndpoint } from "../reducers/posts_for_channel"
import { frontPageEndpoint } from "../reducers/frontpage"
import { commentsEndpoint, moreCommentsEndpoint } from "../reducers/comments"
import { postUpvotesEndpoint } from "../reducers/post_upvotes"
import { channelContributorsEndpoint } from "../reducers/channel_contributors"
import { channelModeratorsEndpoint } from "../reducers/channel_moderators"
import { channelSubscribersEndpoint } from "../reducers/channel_subscribers"
import { channelInvitationsEndpoint } from "../reducers/channel_invitations"
import { postRemovedEndpoint } from "../reducers/post_removed"
import { reportsEndpoint } from "../reducers/reports"
import { settingsEndpoint } from "../reducers/settings"
import { accountSettingsEndpoint } from "../reducers/account_settings"
import { embedlyEndpoint } from "../reducers/embedly"
import { profilesEndpoint } from "../reducers/profiles"
import { userWebsitesEndpoint } from "../reducers/websites"
import { userContributionsEndpoint } from "../reducers/user_contributions"
import { authEndpoint } from "../reducers/auth"
import { passwordResetEndpoint } from "../reducers/password_reset"
import { passwordChangeEndpoint } from "../reducers/password_change"
import { profileImageEndpoint } from "../reducers/profile_image"
import { channelAvatarEndpoint } from "../reducers/channel_avatar"
import { channelBannerEndpoint } from "../reducers/channel_banner"
import { searchEndpoint } from "../reducers/search"
import { relatedPostsEndpoint } from "../reducers/related_posts"
import { widgetsEndpoint } from "../reducers/widgets"
import { livestreamEndpoint } from "../reducers/livestream"

import type { Dispatch } from "redux"

export const endpoints = [
  postsEndpoint,
  subscribedChannelsEndpoint,
  channelsEndpoint,
  channelContributorsEndpoint,
  channelModeratorsEndpoint,
  channelSubscribersEndpoint,
  channelInvitationsEndpoint,
  postsForChannelEndpoint,
  frontPageEndpoint,
  commentsEndpoint,
  moreCommentsEndpoint,
  postUpvotesEndpoint,
  postRemovedEndpoint,
  reportsEndpoint,
  settingsEndpoint,
  accountSettingsEndpoint,
  embedlyEndpoint,
  profilesEndpoint,
  userWebsitesEndpoint,
  userContributionsEndpoint,
  authEndpoint,
  passwordResetEndpoint,
  passwordChangeEndpoint,
  profileImageEndpoint,
  channelAvatarEndpoint,
  channelBannerEndpoint,
  searchEndpoint,
  relatedPostsEndpoint,
  widgetsEndpoint,
  livestreamEndpoint
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
