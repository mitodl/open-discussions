// @flow
/* global SETTINGS:false */
import R from "ramda"
import _ from "lodash"
import qs from "query-string"
import LocaleCode from "locale-code"
import isURL from "validator/lib/isURL"
import Decimal from "decimal.js-light"

import type { Match } from "react-router"
import type { Profile } from "../flow/discussionTypes"
import { platforms } from "./constants"

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

export const isEmptyText = R.compose(R.isEmpty, R.trim, R.defaultTo(""))

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

export const defaultProfileImageUrl = "/static/images/avatar_default.png"

export function isProfileComplete(profile: ?Profile): boolean {
  if (
    !profile ||
    (profile.name &&
      profile.bio &&
      profile.headline &&
      (profile.image_file || profile.image))
  ) {
    return true
  }
  return false
}

export const getViewportWidth = () => window.innerWidth

export const DRAWER_BREAKPOINT = 950

export const isMobileWidth = () => getViewportWidth() < DRAWER_BREAKPOINT

export const GRID_MOBILE_BREAKPOINT = 840

export const isMobileGridWidth = () =>
  getViewportWidth() < GRID_MOBILE_BREAKPOINT

export const truncate = (text: ?string, length: number): string =>
  text ? _.truncate(text, { length: length, separator: " " }) : ""

export const getTokenFromUrl = (props: Object): string => {
  const urlMatchPath = ["match", "params", "token"],
    querystringPath = ["location", "search"]

  let token = R.view(R.lensPath(urlMatchPath))(props)
  if (token) return token

  const querystring = R.view(R.lensPath(querystringPath))(props)
  const parsedQuerystring = qs.parse(querystring)
  token = parsedQuerystring.token
  return token || ""
}

export const makeUUID = (len: number) =>
  Array.from(window.crypto.getRandomValues(new Uint8Array(len)))
    .map(int => int.toString(16))
    .join("")
    .slice(0, len)

export const removeTrailingSlash = (str: string) =>
  str.length > 0 && str[str.length - 1] === "/"
    ? str.substr(0, str.length - 1)
    : str

export const emptyOrNil = R.either(R.isEmpty, R.isNil)
export const allEmptyOrNil = R.all(emptyOrNil)

export const spaceSeparated = (strings: Array<?string>): string =>
  strings.filter(str => str).join(" ")

export function* incrementer(): Generator<number, *, *> {
  let int = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    yield int++
  }
}

export const isValidUrl = (url: string): boolean =>
  _.isString(url)
    ? isURL(url, { allow_underscores: true, require_protocol: true })
    : false

export const toArray = (obj: any) =>
  Array.isArray(obj) ? obj : obj ? [obj] : undefined

export const languageName = (langCode: ?string): string | null => {
  if (!langCode) return null
  const lang = LocaleCode.getLanguageName(
    `${langCode.split("-")[0].toLowerCase()}-US`
  )
  return lang ? lang : null
}

export const flatZip = R.compose(R.flatten, R.zip)

export const capitalize = R.converge(R.concat(), [
  R.compose(R.toUpper, R.head),
  R.tail
])

export const formatPrice = (price: ?string | number | Decimal): string => {
  if (price === null || price === undefined) {
    return ""
  } else {
    let formattedPrice: Decimal = Decimal(price)

    if (formattedPrice.isInteger()) {
      formattedPrice = formattedPrice.toFixed(0)
    } else {
      formattedPrice = formattedPrice.toFixed(2, Decimal.ROUND_HALF_UP)
    }
    return `$${formattedPrice}`
  }
}

export const getImageSrc = (
  rawImageSrc: ?string,
  platform: ?string
): ?string => {
  if (
    rawImageSrc &&
    rawImageSrc.startsWith("/") &&
    platform === platforms.OCW &&
    SETTINGS.ocw_next_base_url
  ) {
    const ocwNextBaseUrl = SETTINGS.ocw_next_base_url.endsWith("/")
      ? // $FlowFixMe we check for null  SETTINGS.ocw_next_base_url above
      SETTINGS.ocw_next_base_url.slice(0, -1)
      : SETTINGS.ocw_next_base_url
    // $FlowFixMe we check for null rawImageSrc above
    return ocwNextBaseUrl + rawImageSrc
  } else {
    return rawImageSrc
  }
}

export const sortBy = (property: string) =>
  R.sortWith([R.ascend(R.prop(property))])

export const normalizeDoubleQuotes = (text: ?string) =>
  (text || "").replace(/[\u201C\u201D]/g, '"')

export const isDoubleQuoted = (text: ?string) =>
  !emptyOrNil(R.match(/^".+"$/, normalizeDoubleQuotes(text)))
