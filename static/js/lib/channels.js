//@flow
import R from "ramda"

import type {
  Channel,
  ChannelForm,
  ChannelContributors,
  ChannelContributorsForm,
  ChannelModerators,
  ChannelModeratorsForm
} from "../flow/discussionTypes"

export const CHANNEL_TYPE_PUBLIC: "public" = "public"
export const CHANNEL_TYPE_RESTRICTED: "restricted" = "restricted"
export const CHANNEL_TYPE_PRIVATE: "private" = "private"

export type ChannelType =
  | typeof CHANNEL_TYPE_PUBLIC
  | typeof CHANNEL_TYPE_RESTRICTED
  | typeof CHANNEL_TYPE_PRIVATE

export const LINK_TYPE_TEXT: "self" = "self"
export const LINK_TYPE_LINK: "link" = "link"
export const LINK_TYPE_ANY: "any" = "any"
export const VALID_LINK_TYPES = [LINK_TYPE_TEXT, LINK_TYPE_LINK, LINK_TYPE_ANY]

export type LinkType =
  | typeof LINK_TYPE_TEXT
  | typeof LINK_TYPE_LINK
  | typeof LINK_TYPE_ANY

export const newChannelForm = (): ChannelForm => ({
  name:               "",
  title:              "",
  description:        "",
  public_description: "",
  channel_type:       CHANNEL_TYPE_PUBLIC,
  link_type:          LINK_TYPE_ANY
})

export const editChannelForm = (channel: Channel): ChannelForm =>
  R.pickAll(
    [
      "name",
      "title",
      "description",
      "public_description",
      "channel_type",
      "link_type"
    ],
    channel
  )

export const newModeratorsForm = (
  channel: Channel,
  moderators: ChannelModerators
): ChannelModeratorsForm => ({
  channel:    channel,
  moderators: moderators
})

export const newContributorsForm = (
  channel: Channel,
  contributors: ChannelContributors
): ChannelContributorsForm => ({
  channel:      channel,
  contributors: contributors
})

export const userCanPost = (channel: Channel) =>
  channel.channel_type === CHANNEL_TYPE_PUBLIC ||
  channel.user_is_moderator ||
  channel.user_is_contributor

type MaybeLinkType = LinkType | ""

export const updateLinkType = (
  oldLinkType: MaybeLinkType,
  value: LinkType,
  checked: boolean
): MaybeLinkType => {
  if (checked) {
    // ignoring case if oldLinkType is already ANY, assuming LINK or TEXT.
    // UI should prevent that from happening.
    return !oldLinkType ? value : LINK_TYPE_ANY
  } else {
    if (oldLinkType === LINK_TYPE_ANY) {
      return value === LINK_TYPE_TEXT ? LINK_TYPE_LINK : LINK_TYPE_TEXT
    } else {
      // this is invalid but we will check that in validation on submit
      return ""
    }
  }
}

export const isLinkTypeChecked = (
  channelLinkType: string,
  linkType: string
) => {
  if (channelLinkType === LINK_TYPE_ANY) {
    return true
  } else {
    return channelLinkType === linkType
  }
}

export const isLinkTypeAllowed = (channel: ?Channel, linkType: string) =>
  !channel ? true : isLinkTypeChecked(channel.link_type, linkType)

export const isTextTabSelected = (
  postType: string | null,
  channel: ?Channel
) => {
  let selectedTab
  if (postType) {
    selectedTab = postType
  } else if (channel) {
    selectedTab = channel.link_type
  } else {
    selectedTab = LINK_TYPE_ANY
  }

  const isTextTabSelected = selectedTab !== LINK_TYPE_LINK

  // If the selected tab is invalid, choose the other one. At least one tab should be valid for a channel.
  if (channel && !isLinkTypeChecked(channel.link_type, selectedTab)) {
    return !isTextTabSelected
  }

  return isTextTabSelected
}
