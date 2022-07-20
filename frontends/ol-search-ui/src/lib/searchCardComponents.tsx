import moment from "moment"
import React from "react"
import qs from "query-string"
import { isEmpty } from "ramda"
import { LearningResourceRun, LearningResourceSummary } from "./search"

export const CAROUSEL_IMG_HEIGHT = 130
export const CAROUSEL_IMG_WIDTH = 306
export const DATE_FORMAT = "YYYY-MM-DD[T]HH:mm:ss[Z]"

const runStartDate = (objectRun: LearningResourceRun): moment.Moment =>
  moment(objectRun.best_start_date, DATE_FORMAT)

const runEndDate = (objectRun: LearningResourceRun): moment.Moment =>
  moment(objectRun.best_end_date, DATE_FORMAT)

const compareRuns = (
  firstRun: LearningResourceRun,
  secondRun: LearningResourceRun
) => runStartDate(firstRun).diff(runStartDate(secondRun), "hours")

export const bestRun = (runs: LearningResourceRun[]) => {
  runs = runs.filter(run => run.best_start_date && run.best_end_date)

  // Runs that are running right now
  const currentRuns = runs.filter(
    run => runStartDate(run).isSameOrBefore() && runEndDate(run).isAfter()
  )
  if (!isEmpty(currentRuns)) {
    return currentRuns[0]
  }

  // The next future run
  const futureRuns = runs
    .filter(run => runStartDate(run).isAfter())
    .sort(compareRuns)
  if (!isEmpty(futureRuns)) {
    return futureRuns[0]
  }

  // The most recent run that "ended"
  const mostRecentRuns = runs
    .filter(run => runStartDate(run).isSameOrBefore())
    .sort(compareRuns)
    .reverse()
  if (!isEmpty(mostRecentRuns)) {
    return mostRecentRuns[0]
  }
  return null
}

export const toQueryString = (params: Record<string, unknown>) =>
  isEmpty(params || {}) ? "" : `?${qs.stringify(params)}`

export const formatOfferedBys = (offeredBys: string[]): React.ReactNode[] =>
  offeredBys
    .map((offeror: string, i: number) => (
      <a
        href={`/infinite/search${toQueryString({
          o: offeror
        })}`}
        key={i}
      >
        {offeror}
      </a>
    ))
    .reduce((prev, curr) => [prev.flat(), ", ", curr], [] as React.ReactNode[])
    .slice(2)

type SubtitleProps = {
  label: string
  content: React.ReactNode
  htmlClass: string
}

export const Subtitle = ({ label, content, htmlClass }: SubtitleProps) => (
  <div className="row subtitle">
    <div className={`lr-subtitle ${htmlClass}`}>
      <span className="grey">{label}</span>
      {content}
    </div>
  </div>
)

export const getImageSrc = (
  rawImageSrc: string | null | undefined,
  platform: string | null | undefined,
  ocwNextBaseUrl: string
): string | null | undefined => {
  if (rawImageSrc?.startsWith("/") && platform === "ocw" && ocwNextBaseUrl) {
    ocwNextBaseUrl = ocwNextBaseUrl ?
      ocwNextBaseUrl.slice(0, -1) :
      ocwNextBaseUrl
    return ocwNextBaseUrl + rawImageSrc
  } else {
    return rawImageSrc
  }
}

export const blankThumbnailUrl = () =>
  new URL("/static/images/blank.png", window.location.origin).toString()

export const embedlyThumbnail = (
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

type CoverImageProps = {
  object: LearningResourceSummary
  embedlyKey: string
  ocwNextBaseUrl: string
}

export const CoverImage: React.FC<CoverImageProps> = ({
  object,
  embedlyKey,
  ocwNextBaseUrl
}) => (
  <div className="cover-image">
    <img
      src={embedlyThumbnail(
        embedlyKey,
        getImageSrc(object.image_src, object.platform, ocwNextBaseUrl) ||
          defaultResourceImageURL(),
        CAROUSEL_IMG_HEIGHT,
        CAROUSEL_IMG_WIDTH
      )}
      height={CAROUSEL_IMG_HEIGHT}
      alt={`cover image for ${object.title}`}
    />
  </div>
)
