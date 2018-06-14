// @flow
/* global SETTINGS:false */
import _ from "lodash"
import type { Profile } from "../flow/discussionTypes"

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
    profile &&
    profile.name &&
    profile.bio &&
    profile.headline &&
    makeProfileImageUrl(profile) !== defaultProfileImageUrl
  ) {
    return true
  }
  return false
}

export function userPrivilegeCheck(
  profile: Profile,
  privileged: any,
  unPrivileged: any
): any {
  if (SETTINGS.username && profile.username === SETTINGS.username) {
    return _.isFunction(privileged) ? privileged() : privileged
  } else {
    return _.isFunction(unPrivileged) ? unPrivileged() : unPrivileged
  }
}
