/* global SETTINGS: false */
// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import DropdownMenu from "../components/DropdownMenu"
import { DropUpArrow, DropDownArrow } from "../components/Arrow"

import { actions } from "../actions"
import { hideDropdown, showDropdown } from "../actions/ui"
import { leaveChannel } from "../util/api_actions"
import { getOwnProfile } from "../lib/redux_selectors"
import { FRONTPAGE_URL } from "../lib/url"
import { CHANNEL_TYPE_PUBLIC } from "../lib/channels"

import type { Dispatch } from "redux"
import type { Channel } from "../flow/discussionTypes"

export const CHANNEL_FOLLOW_DROPDOWN = "CHANNEL_FOLLOW_DROPDOWN"

type Props = {
  channel: Channel,
  history: Object,
  username: string,
  isDropdownOpen: boolean,
  showDropdown: () => void,
  hideDropdown: () => void,
  followChannel: (username: string) => void,
  unfollowChannel: (username: string) => void,
  leaveChannel: (username: string) => void,
  loadChannel: () => void,
  loadChannels: () => void
}

export class ChannelFollowControls extends React.Component<Props> {
  handleFollowClick = async () => {
    const { followChannel, loadChannel, loadChannels, username } = this.props

    await followChannel(username)
    await loadChannel()
    await loadChannels()
  }

  handleUnfollowClick = async () => {
    const { unfollowChannel, loadChannel, loadChannels, username } = this.props

    await unfollowChannel(username)
    await loadChannel()
    await loadChannels()
  }

  handleLeaveChannelClick = async () => {
    const { leaveChannel, history, loadChannels, username } = this.props

    await leaveChannel(username)
    history.push(FRONTPAGE_URL)
    await loadChannels()
  }

  render() {
    const {
      channel,
      showDropdown,
      hideDropdown,
      isDropdownOpen,
      username
    } = this.props

    // Follow/unfollow controls should not be shown if the user is anonymous or if the channel
    // has membership managed externally.
    if (R.isEmpty(username) || channel.membership_is_managed) {
      return null
    }

    return channel.user_is_subscriber ? (
      <React.Fragment>
        <a className="follow-button dropdown-button" onClick={showDropdown}>
          <span>Following</span>
          {isDropdownOpen ? <DropUpArrow /> : <DropDownArrow />}
        </a>
        {isDropdownOpen ? (
          <DropdownMenu
            closeMenu={hideDropdown}
            className="channel-follow-dropdown"
          >
            <li>
              <a onClick={this.handleUnfollowClick}>Unfollow channel</a>
            </li>
            {channel.channel_type !== CHANNEL_TYPE_PUBLIC &&
            channel.user_is_contributor &&
            !channel.user_is_moderator ? (
                <li>
                  <a onClick={this.handleLeaveChannelClick}>Leave channel</a>
                </li>
              ) : null}
          </DropdownMenu>
        ) : null}
      </React.Fragment>
    ) : (
      <button className="follow-button" onClick={this.handleFollowClick}>
        Follow
      </button>
    )
  }
}

const mapStateToProps = state => {
  const {
    ui: { dropdownMenus }
  } = state

  const profile = getOwnProfile(state)
  const isDropdownOpen = dropdownMenus.has(CHANNEL_FOLLOW_DROPDOWN)
  return {
    isDropdownOpen,
    username: profile ? profile.username : ""
  }
}

const mapDispatchToProps = (dispatch: Dispatch<any>, { channel }: Props) => ({
  showDropdown:  () => dispatch(showDropdown(CHANNEL_FOLLOW_DROPDOWN)),
  hideDropdown:  () => dispatch(hideDropdown(CHANNEL_FOLLOW_DROPDOWN)),
  followChannel: (username: string) =>
    dispatch(actions.channelSubscribers.post(channel.name, username)),
  unfollowChannel: (username: string) =>
    dispatch(actions.channelSubscribers.delete(channel.name, username)),
  leaveChannel: (username: string) =>
    leaveChannel(dispatch, channel.name, username),
  loadChannel:  () => dispatch(actions.channels.get(channel.name)),
  loadChannels: () => dispatch(actions.subscribedChannels.get())
})

export default R.compose(connect(mapStateToProps, mapDispatchToProps))(
  ChannelFollowControls
)
