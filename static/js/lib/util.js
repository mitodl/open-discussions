// @flow
/* global SETTINGS:false */
import R from "ramda"
import _ from "lodash"

import type { Match } from "react-router"
import type { Profile } from "../flow/discussionTypes"

export const getChannelName = (props: { match: Match }): string =>
  props.match.params.channelName || ""

export const getPostID = (props: { match: Match }): string =>
  props.match.params.postID || ""

export const getCommentID = (props: { match: Match }): string | void =>
  props.match.params.commentID || undefined

export const getUserName = (props: { match: Match }): string =>
  props.match.params.userName || ""

/**
 * Returns a promise which resolves after a number of milliseconds have elapsed
 */
export const wait = (millis: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, millis))

/**
 * Adds on an index for each item in an iterable
 */
export function* enumerate<T>(
  iterable: Iterable<T>
): Generator<[number, T], void, void> {
  let i = 0
  for (const item of iterable) {
    yield [i, item]
    ++i
  }
}

export const isEmptyText = R.compose(
  R.isEmpty,
  R.trim,
  R.defaultTo("")
)

export const notNil = R.complement(R.isNil)

export const goBackAndHandleEvent = R.curry((history, e) => {
  e.preventDefault()
  history.goBack()
})

export const preventDefaultAndInvoke = R.curry(
  (invokee: Function, e: Event) => {
    if (e) {
      e.preventDefault()
    }
    invokee()
  }
)

export const userIsAnonymous = () => R.isNil(SETTINGS.username)

export const votingTooltipText = "Sign Up or Login to vote"

export const defaultProfileImageUrl = "/static/images/avatar_default.png"

export function makeProfileImageUrl(
  profile: Profile,
  useSmall: ?boolean
): string {
  let imageUrl = defaultProfileImageUrl
  if (profile) {
    if (useSmall && (profile.image_small || profile.image_small_file)) {
      imageUrl = profile.image_small_file
        ? profile.image_small_file
        : profile.image_small
    } else if (profile.image_medium_file || profile.image_medium) {
      imageUrl = profile.image_medium_file
        ? profile.image_medium_file
        : profile.image_medium
    }
  }
  return imageUrl || defaultProfileImageUrl
}

export function isProfileComplete(profile: Profile): boolean {
  if (
    !profile ||
    (profile.name &&
      profile.bio &&
      profile.headline &&
      makeProfileImageUrl(profile) !== defaultProfileImageUrl)
  ) {
    return true
  }
  return false
}

export const getViewportWidth = () => window.innerWidth

export const DRAWER_BREAKPOINT = 950

export const isMobileWidth = () => getViewportWidth() < DRAWER_BREAKPOINT

export const truncate = (text: string, length: number): string => _.truncate(text, { length })
