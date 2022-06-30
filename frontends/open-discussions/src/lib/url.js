// @flow
import R from "ramda"
import qs from "query-string"
import UrlAssembler from "url-assembler"

import { LR_TYPE_PODCAST_EPISODE, LR_TYPE_PODCAST } from "../lib/constants"

import type { Post } from "../flow/discussionTypes"

export const channelURL = (channelName: string) => `/c/${channelName}`

export const channelAboutURL = (channelName: string) =>
  `/c/${channelName}/about`

export const channelMembersURL = (channelName: string) =>
  `/c/${channelName}/members`

export const channelModerationURL = (channelName: string) =>
  `/manage/c/edit/${channelName}/moderation/`

export const editChannelBasicURL = (channelName: string) =>
  `/manage/c/edit/${channelName}/basic/`

export const editChannelAppearanceURL = (channelName: string) =>
  `/manage/c/edit/${channelName}/appearance/`

export const editChannelModeratorsURL = (channelName: string) =>
  `/manage/c/edit/${channelName}/members/moderators/`

export const editChannelContributorsURL = (channelName: string) =>
  `/manage/c/edit/${channelName}/members/contributors/`

export const postDetailURL = (
  channelName: string,
  postID: string,
  postSlug?: string
) => `/c/${channelName}/${postID}${postSlug ? `/${postSlug}` : ""}`

export const newPostURL = (channelName: ?string) =>
  channelName ? `/create_post/${channelName}` : "/create_post/"

export const profileURL = (username: string, selectedTab: ?string) =>
  selectedTab ? `/profile/${username}/${selectedTab}` : `/profile/${username}/`

export const editProfileURL = (username: string) => `/profile/${username}/edit`

export const commentPermalink = R.curry(
  (channelName: string, postID: string, postSlug: string, commentID: string) =>
    `${postDetailURL(channelName, postID, postSlug)}/comment/${commentID}/`
)

export const channelSearchURL = (channelName: string) =>
  `/c/${channelName}/search/`

export const blankThumbnailUrl = () =>
  new URL("/static/images/blank.png", window.location.origin).toString()

export const defaultResourceImageURL = () =>
  new URL(
    "/static/images/default_resource_thumb.jpg",
    window.location.origin
  ).toString()

export const embedlyThumbnail = (
  key: string,
  url: string,
  height: number,
  width: number
) =>
  `https://i.embed.ly/1/display/crop/?key=${key}&url=${encodeURIComponent(
    url
  )}&height=${height}&width=${width}&grow=true&animate=false&errorurl=${blankThumbnailUrl()}`

export const embedlyResizeImage = (key: string, url: string, height: number) =>
  `https://i.embed.ly/1/display/resize/?key=${key}&url=${encodeURIComponent(
    url
  )}&height=${height}&grow=false&animate=false&errorurl=${blankThumbnailUrl()}`

export const absolutizeURL = (url: string) =>
  new URL(url, window.location.origin).toString()

export const postPermalink = (post: Post): string =>
  absolutizeURL(postDetailURL(post.channel_name, post.id, post.slug))

// pull the channel name out of location.pathname
// see here for why this hackish approach was necessary:
// https://github.com/mitodl/open-discussions/pull/118#discussion_r135284591
export const getChannelNameFromPathname = R.compose(
  R.defaultTo(null),
  R.view(R.lensIndex(2)),
  R.match(/c\/(edit\/)?([^/]+)\/?/)
)

export const FRONTPAGE_URL = "/"
export const AUTH_REQUIRED_URL = "/auth_required/"
export const CONTENT_POLICY_URL = "/content_policy/"
export const SETTINGS_URL = "/settings/"
export const NOTIFICATION_SETTINGS_URL = "/settings/notifications"
export const ACCOUNT_SETTINGS_URL = "/settings/account"
export const PASSWORD_RESET_URL = "/password_reset/"
export const PASSWORD_CHANGE_URL = "/settings/password"

// auth urls
export const LOGIN_URL = "/login/"
export const LOGIN_PASSWORD_URL = "/login/password/"
export const LOGIN_PROVIDER_URL = "/login/external/"

export const REGISTER_URL = "/signup/"
export const REGISTER_CONFIRM_URL = "/signup/confirm/"
export const REGISTER_DETAILS_URL = "/signup/details/"

export const INACTIVE_USER_URL = "/account/inactive/"

export const TOUCHSTONE_URL = "/login/saml/?idp=default"
export const MICROMASTERS_URL = "/login/micromasters/"

export const TERMS_OF_SERVICE_URL = "/terms-and-conditions"
export const PRIVACY_POLICY_URL = "/privacy-statement"

export const SITE_SEARCH_URL = "/search/"
export const COURSE_URL = "/learn/"
export const COURSE_SEARCH_URL = "/learn/search"

export const PODCAST_URL = "/podcasts"

export const PODCAST_RSS_URL = "/podcasts/rss_feed"
export const PODCAST_GOOGLE_URL =
  "https://podcasts.google.com/feed/aHR0cHM6Ly9vcGVuLm1pdC5lZHUvcG9kY2FzdHMvcnNzX2ZlZWQ"

export const toQueryString = (params: Object) =>
  R.isEmpty(params || {}) ? "" : `?${qs.stringify(params)}`

export const urlHostname = (url: ?string) => {
  if (!url) {
    return ""
  }

  if (!url.startsWith("https:") && !url.startsWith("http:")) {
    url = `https://${url}`
  }
  try {
    return new URL(url).hostname.replace(/^www\.(.*\.\w)/i, "$1")
  } catch (_) {
    return ""
  }
}

export const getNextParam = (search: string) => qs.parse(search).next || "/"

export const COURSE_BANNER_URL = "/static/images/lawn_and_river_banner.png"
export const COURSE_SEARCH_BANNER_URL =
  "/static/images/course_search_banner.png"

export const MIT_LOGO_URL = "/static/images/MIT_circle.svg"

export const starSelectedURL = "/static/images/star_selected.png"
export const starUnselectedURL = "/static/images/star_unselected.png"

const api = UrlAssembler().prefix("/api/v0/")

export const featuredCoursesURL = "/api/v0/courses/featured/"
export const upcomingCoursesURL = "/api/v0/courses/upcoming/"
export const newCoursesURL = "/api/v0/courses/new/"
export const favoritesURL = "/api/v0/favorites"
export const courseApiURL = api.segment("courses/")
export const courseDetailApiURL = courseApiURL.segment(":courseId/")
export const programApiURL = api.segment("programs/")
export const programDetailApiURL = programApiURL.segment(":programId/")

export const userListApiURL = api.segment("userlists/")
export const userListDetailApiURL = userListApiURL.segment(":userListId/")
export const userListItemsApiURL = userListDetailApiURL.segment("items/")
export const userListItemsDetailApiURL = userListItemsApiURL.segment(":itemId/")

export const videoApiURL = api.segment("videos/")
export const videoDetailApiURL = videoApiURL.segment(":videoId/")
export const interactionsApiURL = api.segment("interactions/").toString()
export const popularContentUrl = api.segment("popular-content/").toString()
export const newVideosURL = "/api/v0/videos/new/"

export const embedlyApiURL = "/api/v0/embedly"
export const topicApiURL = "/api/v0/topics"
export const similarResourcesURL = "/api/v0/similar/"

export const podcastApiURL = api.segment("podcasts/")
export const recentPodcastApiURL = podcastApiURL.segment("recent/")
export const podcastDetailApiURL = podcastApiURL.segment(":podcastId/")
export const podcastDetailEpisodesApiURL =
  podcastDetailApiURL.segment("episodes/")

export const podcastEpisodeApiURL = api.segment("podcastepisodes/")
export const podcastEpisodeDetailApiURL =
  podcastEpisodeApiURL.segment(":episodeId")

export const userListIndexURL = "/learn/lists/"
export const userListDetailURL = (id: number) => `/learn/lists/${id}`

export const learningResourcePermalink = (object: Object) =>
  absolutizeURL(
    `${
      object.object_type === LR_TYPE_PODCAST ||
      object.object_type === LR_TYPE_PODCAST_EPISODE
        ? PODCAST_URL
        : COURSE_URL
    }${toQueryString({
      lr_id: object.id,
      type:  object.object_type
    })}`
  )
