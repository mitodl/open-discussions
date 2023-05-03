import moment from "moment"
import {
  LearningResourceRun,
  CoursePrice,
  CourseInstructor,
  LearningResourceType as LR,
  UserList,
  StaffList,
  TYPE_FAVORITES
} from "./interfaces"
import React, { useState, useEffect } from "react"
import { capitalize, emptyOrNil } from "ol-util"
import LocaleCode from "locale-code"
import Decimal from "decimal.js-light"

export const getImageSrc = (
  resource: { image_src?: string | null; platform?: string | null },
  ocwBaseUrl: string
): string | null => {
  if (typeof resource.image_src !== "string") return null
  if (resource.image_src.startsWith("/") && resource.platform === "ocw") {
    return ocwBaseUrl.slice(0, -1) + resource.image_src
  } else {
    return resource.image_src
  }
}

const blankThumbnailUrl = () =>
  new URL("/static/images/blank.png", window.location.origin).toString()

const embedlyThumbnail = (
  key: string,
  url: string,
  height: number,
  width: number
) =>
  `https://i.embed.ly/1/display/crop/?key=${key}&url=${encodeURIComponent(
    url
  )}&height=${height}&width=${width}&grow=true&animate=false&errorurl=${blankThumbnailUrl()}`

export const defaultResourceImageURL = () =>
  new URL(
    "/static/images/default_resource_thumb.jpg",
    window.location.origin
  ).toString()

type EmbedlyConfig = {
  embedlyKey: string
  ocwBaseUrl: string
  width: number
  height: number
}

const resourceThumbnailSrc = (
  resource: { image_src?: string | null; platform?: string | null },
  config: EmbedlyConfig
) =>
  embedlyThumbnail(
    config.embedlyKey,
    getImageSrc(resource, config.ocwBaseUrl) ?? defaultResourceImageURL(),
    config.height,
    config.width
  )

export const DATE_FORMAT = "YYYY-MM-DD[T]HH:mm:ss[Z]"

const runStartDate = (objectRun: LearningResourceRun): moment.Moment =>
  moment(objectRun.start_date, DATE_FORMAT)

const runEndDate = (objectRun: LearningResourceRun): moment.Moment =>
  moment(objectRun.end_date, DATE_FORMAT)

const compareRuns = (
  firstRun: LearningResourceRun,
  secondRun: LearningResourceRun
) => runStartDate(firstRun).diff(runStartDate(secondRun), "hours")

const findBestRun = (
  runs: LearningResourceRun[]
): LearningResourceRun | undefined => {
  const dated = runs.filter(run => run.start_date && run.end_date)

  // Runs that are running right now
  const [bestCurrentRun] = dated.filter(
    run => runStartDate(run).isSameOrBefore() && runEndDate(run).isAfter()
  )
  if (bestCurrentRun) return bestCurrentRun

  // The next future run
  const [bestFutureRun] = dated
    .filter(run => runStartDate(run).isAfter())
    .sort(compareRuns)
  if (bestFutureRun) return bestFutureRun

  // The most recent run that "ended"
  const [bestRecentRun] = dated
    .filter(run => runStartDate(run).isSameOrBefore())
    .sort(compareRuns)
    .reverse()
  if (bestRecentRun) return bestRecentRun
  return undefined
}

const readableLearningResources: Record<LR | typeof TYPE_FAVORITES, string> = {
  [LR.Course]:         "Course",
  [LR.Program]:        "Program",
  [LR.Userlist]:       "Learning List",
  [LR.LearningPath]:   "Learning Path",
  [LR.StaffList]:      "MIT Learning List",
  [LR.StaffPath]:      "MIT Learning Path",
  [LR.Video]:          "Video",
  [TYPE_FAVORITES]:    "Favorites",
  [LR.Podcast]:        "Podcast",
  [LR.PodcastEpisode]: "Podcast Episode"
}
const LR_TYPES: string[] = Object.values(LR)

const assertIsLrType: (
  type: string
) => asserts type is LR | typeof TYPE_FAVORITES = type => {
  if (LR_TYPES.includes(type)) return
  if (type === TYPE_FAVORITES) return
  throw new Error(`Type ${type} is not a valid LearningResourceType`)
}

/**
 * Convert a LearningResourceType to a readable string. For example,
 * `getReadableResourceType('podcastepisode')` is `"Podcast Episode"`.
 *
 * Throws if `type` is not a valid `LearningResourceType`.
 */
const getReadableResourceType = (type: string): string => {
  assertIsLrType(type)
  return readableLearningResources[type]
}

export { resourceThumbnailSrc, findBestRun, getReadableResourceType }
export type { EmbedlyConfig }

export const getViewportWidth = () => window.innerWidth

export const useWidth = () => {
  const [width, setWidth] = useState(getViewportWidth())

  useEffect(() => {
    const cb = () => {
      setWidth(getViewportWidth())
    }
    window.addEventListener("resize", cb)
    return () => {
      window.removeEventListener("resize", cb)
    }
  }, [])

  return width
}

export const CertificateIcon = () => (
  <img
    className="ol-lrc-cert"
    alt="Receive a certificate upon completion"
    src="/static/images/certificate_icon_infinite.png"
  />
)

export const minPrice = (
  prices: CoursePrice[],
  includeDollarSign = false
): string | null => {
  if (emptyOrNil(prices)) {
    return null
  }
  const price = Math.min(...prices.map(price => price.price))

  if (price > 0 && price !== Infinity) {
    return includeDollarSign ? `${formatPrice(price)}` : String(price)
  } else {
    return "Free"
  }
}

export const getStartDate = (
  platform: string,
  objectRun: LearningResourceRun
): string => {
  if (platform === "ocw") {
    return `${capitalize(objectRun.semester || "")} ${objectRun.year || ""}`
  } else if (objectRun.start_date) {
    return moment(objectRun.start_date).format("MMMM DD, YYYY")
  } else if (objectRun.best_start_date) {
    return moment(objectRun.best_start_date).format("MMMM DD, YYYY")
  }
  return "Ongoing"
}

export const getInstructorName = (instructor: CourseInstructor) => {
  if (instructor.full_name) {
    return instructor.full_name
  } else if (instructor.first_name && instructor.last_name) {
    return `${instructor.first_name} ${instructor.last_name}`
  } else if (instructor.last_name) {
    return `Prof. ${instructor.last_name}`
  }
  return ""
}

export const languageName = (langCode: string | null): string =>
  LocaleCode.getLanguageName(
    `${langCode ? langCode.split("-")[0].toLowerCase() : "en"}-US`
  )

const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) {
    return ""
  } else {
    const decimalPrice = new Decimal(price)
    let formattedPrice

    if (decimalPrice.isInteger()) {
      formattedPrice = decimalPrice.toFixed(0)
    } else {
      formattedPrice = decimalPrice.toFixed(2, Decimal.ROUND_HALF_UP)
    }
    return `$${formattedPrice}`
  }
}

export const absolutizeURL = (url: string) =>
  new URL(url, window.location.origin).toString()

const isUserListOrPath = <
  U extends Pick<UserList, "object_type">,
  S extends Pick<StaffList, "object_type">
>(
    resource: U | S
  ): resource is U => {
  return (
    resource.object_type === LR.Userlist ||
    resource.object_type === LR.LearningPath
  )
}
const isStaffListOrPath = <
  U extends Pick<UserList, "object_type">,
  S extends Pick<StaffList, "object_type">
>(
    resource: U | S
  ): resource is S => {
  return (
    resource.object_type === LR.StaffList ||
    resource.object_type === LR.StaffPath
  )
}

export { isUserListOrPath, isStaffListOrPath }
