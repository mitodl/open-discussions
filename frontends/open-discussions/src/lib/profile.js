// @flow
import R from "ramda"

import { PERSONAL_SITE_TYPE } from "./constants"
import type { Profile, ImageForm, UserWebsite } from "../flow/discussionTypes"

export const initials = R.pipe(
  R.split(/\s+/),
  R.slice(0, 2),
  R.map(item => (item ? item[0].toUpperCase() : "")),
  R.join("")
)

export const makeProfile = (props: Object): Profile => ({
  image:             null,
  image_small:       null,
  image_medium:      null,
  image_file:        null,
  image_small_file:  null,
  image_medium_file: null,
  bio:               null,
  headline:          null,
  ...props
})

export const newImageForm = (): ImageForm => ({
  edit:  null,
  image: null
})

export const getSocialSites = (profile: Profile): Array<UserWebsite> =>
  profile.user_websites
    ? profile.user_websites.filter(
      (userWebsite: UserWebsite) =>
        userWebsite.site_type !== PERSONAL_SITE_TYPE
    )
    : []

export const getPersonalSite = (profile: Profile): ?UserWebsite =>
  profile.user_websites
    ? profile.user_websites.find(
      (userWebsite: UserWebsite) =>
        userWebsite.site_type === PERSONAL_SITE_TYPE
    )
    : undefined
