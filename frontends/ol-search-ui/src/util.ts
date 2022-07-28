import moment from "moment"
import { LearningResourceRun, LearningResourceType as LR } from "./interfaces"

const getImageSrc = (
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

const defaultResourceImageURL = () =>
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
  moment(objectRun.best_start_date, DATE_FORMAT)

const runEndDate = (objectRun: LearningResourceRun): moment.Moment =>
  moment(objectRun.best_end_date, DATE_FORMAT)

const compareRuns = (
  firstRun: LearningResourceRun,
  secondRun: LearningResourceRun
) => runStartDate(firstRun).diff(runStartDate(secondRun), "hours")

const bestRun = (runs: LearningResourceRun[]): LearningResourceRun | null => {
  const dated = runs.filter(run => run.best_start_date && run.best_end_date)

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
  return null
}

const readableLearningResources: Record<LR, string> = {
  [LR.Course]:               "Course",
  [LR.Program]:              "Program",
  [LR.Userlist]:             "Learning List",
  [LR.LearningPath]:         "Learning Path",
  [LR.Video]:                "Video",
  [LR.Favorites]:            "Favorites",
  [LR.Podcast]:              "Podcast",
  [LR.PodcastEpisode]:       "Podcast Episode"
}
const LR_TYPES: string[] = Object.values(LR)

const assertIsLrType: (type: string) => asserts type is LR = type => {
  if (LR_TYPES.includes(type)) return
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

export { resourceThumbnailSrc, bestRun, getReadableResourceType }
export type { EmbedlyConfig }
