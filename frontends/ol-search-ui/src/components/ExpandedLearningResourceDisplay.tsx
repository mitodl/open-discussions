import React from "react"
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

import { ResourceIdentifiers } from "./LearningResourceDrawer"

const COURSE_IMAGE_DISPLAY_HEIGHT = 239
const COURSE_IMAGE_DISPLAY_WIDTH = 440

type Props = {
  object: LearningResourceResult
  runId: string | number | undefined
  setShowResourceDrawer: (params: ResourceIdentifiers | null) => void
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
  const { object, runId, setShowResourceDrawer } = props

  const hasCertificate = object.certification?.length > 0

  const updateRun = (event: React.ChangeEvent<HTMLSelectElement>) =>
    setShowResourceDrawer({
      id:    object.id,
      type:  object.object_type,
      runId: parseInt(event.target.value)
    })

  const objectRuns = object.runs ?? []

  const learningResourcePermalink = `${window.location.origin}${window.location.pathname}?resourceId=${object.id}&resourceType=${object.object_type}`

  const selectedRun =
    bestRun(runId ? objectRuns.filter(run => run.id === runId) : objectRuns) ||
    objectRuns[0]

  const url = selectedRun?.url ? selectedRun.url : object.url
  const cost = selectedRun ? minPrice(selectedRun.prices, true) : null

  const instructors = selectedRun?.instructors ?
    selectedRun.instructors.map(instructor => getInstructorName(instructor)) :
    []

  const imageEmbedlyConfig = {
    embedlyKey: SETTINGS.embedlyKey,
    ocwBaseUrl: SETTINGS.ocw_next_base_url,
    width:      COURSE_IMAGE_DISPLAY_WIDTH,
    height:     COURSE_IMAGE_DISPLAY_HEIGHT
  }

  return (
    <div className="expanded-lr-summary">
      <div className="object-type">
        {getReadableResourceType(object.object_type)}
      </div>
      <h3 className="title">{object.title}</h3>
      <div className="run-certification-container">
        {selectedRun ? (
          <div className="run-selector">
            <div>
              <div className="info-label">
                {object.platform === "ocw" ? "As Taught In" : "Start Date"}
              </div>
            </div>
            <div className="select-semester-div">
              {objectRuns.length > 1 ? (
                <select value={runId} onChange={updateRun}>
                  {objectRuns.map(run => (
                    <option value={run.id} key={run.id}>
                      {getStartDate(object, run)}
                    </option>
                  ))}
                </select>
              ) : (
                <div>{getStartDate(object, selectedRun)}</div>
              )}
            </div>
          </div>
        ) : null}
        {hasCertificate && <CertificateIcon />}
      </div>
      <div className="image-div">
        <img src={resourceThumbnailSrc(object, imageEmbedlyConfig)} alt="" />
      </div>
      <div className="link-share-offered-by">
        {url ? (
          <div className="external-links">
            <a
              className="link-button blue-btn"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {`Take ${object.object_type}`}
            </a>
          </div>
        ) : null}
        <button className="elr-share">
          <ShareTooltip
            url={learningResourcePermalink}
            placement="topLeft"
            objectType={object.object_type}
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
            {object.offered_by?.length && object.offered_by.join(", ")}
          </span>
        </div>
      </div>
      <div className="description">
        <TruncatedText
          text={
            object.short_description ?
              decode(striptags(object.short_description)) :
              ""
          }
          lines={5}
          estCharsPerLine={100}
          showExpansionControls
        />
      </div>

      <div className="lr-metadata">
        <div className="section-label">Info</div>
        {cost ? lrInfoRow("Cost:", cost) : lrInfoRow("Cost:", "Free")}
        {selectedRun?.level ? lrInfoRow("Level:", selectedRun.level) : null}
        {!emptyOrNil(instructors) ?
          lrInfoRow("Instructors:", instructors.join(", ")) :
          null}
        {object.object_type === LearningResourceType.Program &&
        object.item_count ?
          lrInfoRow("Number of Courses:", object.item_count) :
          null}
        {lrInfoRow(
          "Language:",
          languageName(selectedRun ? selectedRun.language : "en")
        )}
      </div>
    </div>
  )
}
