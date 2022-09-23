import React, { useCallback, useState } from "react"
import striptags from "striptags"
import { decode } from "html-entities"
import { propsNotNil } from "ol-util"

import TruncatedText from "./TruncatedText"

import ShareTooltip from "./ShareTooltip"

import {
  LearningResourceType,
  LearningResourceResult,
  LearningResourceRun
} from "../interfaces"
import {
  findBestRun,
  minPrice,
  getStartDate,
  getInstructorName,
  languageName,
  resourceThumbnailSrc,
  CertificateIcon,
  getReadableResourceType,
  EmbedlyConfig
} from "../util"

import { EmbedlyCard, formatDurationClockTime } from "ol-util"
import moment from "moment"

type LearningResourceDetailsProps = {
  resource: LearningResourceResult
  formatShareLink: (resource: LearningResourceResult) => string
  /**
   * Config used to generate embedly urls.
   */
  imgConfig: EmbedlyConfig
}

const LearningResourceDetails: React.FC<LearningResourceDetailsProps> = ({
  resource,
  formatShareLink,
  imgConfig
}) => {
  const objectRuns = resource.runs ?? []
  const [runId, setRunId] = useState<number | undefined>(
    () => findBestRun(objectRuns)?.id
  )
  const selectedRun = objectRuns.find(r => r.id === runId)

  const hasCertificate = resource.certification?.length > 0

  const updateRun: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    e => {
      setRunId(Number(e.target.value))
    },
    []
  )

  const url = selectedRun?.url ?? resource.url

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
                      {getStartDate(resource.platform ?? "", run)}
                    </option>
                  ))}
                </select>
              ) : (
                <div>{getStartDate(resource.platform ?? "", selectedRun)}</div>
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
          <img src={resourceThumbnailSrc(resource, imgConfig)} alt="" />
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
            url={formatShareLink(resource)}
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
      <LearningResourceInfo resource={resource} run={selectedRun} />
    </div>
  )
}

type LearningResourceInfoProps = {
  resource: LearningResourceResult
  run?: LearningResourceRun
}
const LearningResourceInfo: React.FC<LearningResourceInfoProps> = ({
  resource,
  run
}) => {
  const rows = getInfoRows(resource, run)
  return (
    <section className="ol-lr-info">
      <h3>Info:</h3>
      <dl>
        {rows.map(row => (
          <React.Fragment key={row.label}>
            <dt>{row.label}:</dt>
            <dd>{row.value}</dd>
          </React.Fragment>
        ))}
      </dl>
    </section>
  )
}

type ResourceInfoRow = { label: string; value: string }
const getInfoRows = (
  resource: LearningResourceResult,
  run?: LearningResourceRun
): ResourceInfoRow[] => {
  const rows: { label: string; value?: string | null }[] = [
    {
      label: "Duration",
      value: resource.duration && formatDurationClockTime(resource.duration)
    },
    {
      label: "Date Posted",
      value:
        resource.last_modified &&
        moment(resource.last_modified).format("MMM D, YYYY")
    },
    {
      label: "Cost",
      // @chris document this Logic change here... previously, no run => free
      value: run ? minPrice(run.prices, true) : null
    },
    {
      label: "Level",
      value: run?.level
    },
    {
      label: "Instructors",
      value:
        run?.instructors
          ?.map(instructor => getInstructorName(instructor))
          .join(", ") ?? ""
    },
    {
      label: "Number of Courses",
      value:
        resource.object_type === LearningResourceType.Program ?
          String(resource.item_count) :
          null
    },
    {
      label: "Language",
      value: languageName(run?.language ?? "en")
    }
  ]

  return rows.filter(propsNotNil(["value"])).filter(r => r.value.length > 0)
}

export default LearningResourceDetails
export type { LearningResourceDetailsProps }
