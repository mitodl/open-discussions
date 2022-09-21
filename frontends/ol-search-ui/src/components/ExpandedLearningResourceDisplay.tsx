import React, { useCallback, useState } from "react"
import striptags from "striptags"
import { decode } from "html-entities"
import { emptyOrNil } from "ol-util"

import TruncatedText from "./TruncatedText"

import ShareTooltip from "./ShareTooltip"

import { LearningResourceType, LearningResourceResult } from "../interfaces"
import {
  bestRun,
  minPrice,
  getStartDate,
  getInstructorName,
  languageName,
  resourceThumbnailSrc,
  CertificateIcon,
  getReadableResourceType
} from "../util"

import { EmbedlyCard, formatDurationClockTime } from "ol-util"
import moment from "moment"

const COURSE_IMAGE_DISPLAY_HEIGHT = 239
const COURSE_IMAGE_DISPLAY_WIDTH = 440

type Props = {
  resource: Omit<LearningResourceResult, "is_favorite" | "audience" | "lists">
}

const lrInfoRow = (label: string, value: string | number) => (
  <div className="info-row">
    <div className="col-1">
      <div className="label">{label}</div>
    </div>
    {value ? <div className="col-2 value">{value}</div> : null}
  </div>
)

export default function ExpandedLearningResourceDisplay(props: Props) {
  const { resource } = props
  const [runId, setRunId] = useState<number | undefined>()

  const hasCertificate = resource.certification?.length > 0

  const updateRun: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    e => {
      setRunId(Number(e.target.value))
    },
    []
  )

  const objectRuns = resource.runs ?? []

  const learningResourcePermalink = `${window.location.origin}${window.location.pathname}?resourceId=${resource.id}&resourceType=${resource.object_type}`

  const selectedRun =
    bestRun(runId ? objectRuns.filter(run => run.id === runId) : objectRuns) ??
    objectRuns[0]

  const url = selectedRun?.url ?? resource.url
  const cost = selectedRun ? minPrice(selectedRun.prices, true) : null

  const instructors =
    selectedRun?.instructors?.map(instructor =>
      getInstructorName(instructor)
    ) ?? []

  const imageEmbedlyConfig = {
    embedlyKey: SETTINGS.embedlyKey,
    ocwBaseUrl: SETTINGS.ocw_next_base_url,
    width:      COURSE_IMAGE_DISPLAY_WIDTH,
    height:     COURSE_IMAGE_DISPLAY_HEIGHT
  }

  return (
    <div className="expanded-lr-summary">
      <div className="object-type">
        {getReadableResourceType(resource.object_type)}
      </div>
      <h3 className="title">{resource.title}</h3>
      <div className="run-certification-container">
        {selectedRun ? (
          <div className="run-selector">
            <div>
              <div className="info-label">
                {resource.platform === "ocw" ? "As Taught In" : "Start Date"}
              </div>
            </div>
            <div className="select-semester-div">
              {objectRuns.length > 1 ? (
                <select value={runId} onChange={updateRun}>
                  {objectRuns.map(run => (
                    <option value={run.id} key={run.id}>
                      {getStartDate(resource.platform, run)}
                    </option>
                  ))}
                </select>
              ) : (
                <div>{getStartDate(resource.platform, selectedRun)}</div>
              )}
            </div>
          </div>
        ) : null}
        {hasCertificate && <CertificateIcon />}
      </div>
      <div className="image-div">
        {resource.object_type === "video" && resource.url ? (
          <EmbedlyCard url={resource.url} className="watch-video" />
        ) : (
          <img
            src={resourceThumbnailSrc(resource, imageEmbedlyConfig)}
            alt=""
          />
        )}
      </div>
      <div className="link-share-offered-by">
        {url && resource.object_type !== "video" ? (
          <div className="external-links">
            <a
              className="link-button blue-btn"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {`Take ${resource.object_type}`}
            </a>
          </div>
        ) : null}
        <button className="elr-share">
          <ShareTooltip
            url={learningResourcePermalink}
            placement="topLeft"
            objectType={resource.object_type}
          >
            <div className="share-contents">
              <i className="material-icons reply">reply</i>
              <span>Share</span>
            </div>
          </ShareTooltip>
        </button>
        <div className="offered-by">
          <span className="label">Offered by -&nbsp;</span>
          <span className="offeror">
            {resource.offered_by?.length && resource.offered_by.join(", ")}
          </span>
        </div>
      </div>
      <div className="description">
        <TruncatedText
          text={
            resource.short_description ?
              decode(striptags(resource.short_description)) :
              ""
          }
          lines={5}
          estCharsPerLine={100}
          showExpansionControls
        />
      </div>
      <div className="lr-metadata">
        <div className="section-label">Info</div>
        {resource.object_type === "video" ? (
          <>
            {resource.duration ?
              lrInfoRow(
                "Duration:",
                formatDurationClockTime(resource.duration)
              ) :
              null}
            {lrInfoRow(
              "Date Posted:",
              moment(resource.last_modified).format("MMM D, YYYY")
            )}
          </>
        ) : (
          <>
            {cost ? lrInfoRow("Cost:", cost) : lrInfoRow("Cost:", "Free")}
            {selectedRun?.level ? lrInfoRow("Level:", selectedRun.level) : null}
            {!emptyOrNil(instructors) ?
              lrInfoRow("Instructors:", instructors.join(", ")) :
              null}
            {resource.object_type === LearningResourceType.Program &&
            resource.item_count ?
              lrInfoRow("Number of Courses:", resource.item_count) :
              null}
          </>
        )}
        {lrInfoRow(
          "Language:",
          languageName(selectedRun ? selectedRun.language : "en")
        )}
      </div>
    </div>
  )
}
