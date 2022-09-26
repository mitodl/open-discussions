import React, { useCallback, useState } from "react"
import striptags from "striptags"
import { decode } from "html-entities"
import { propsNotNil, capitalize } from "ol-util"
import Button from "@mui/material/Button"
import ReplyIcon from '@mui/icons-material/Reply'

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

const invertIconSx = { transform: "scaleX(-1)" }
const isTakeableResource = (resource: LearningResourceResult): boolean => [LearningResourceType.Course, LearningResourceType.Program].includes(resource.object_type)

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
    <div className="ol-lr-details">
      <div className="object-type">
        {getReadableResourceType(resource.object_type)}
      </div>
      <h2>{resource.title}</h2>
      <div>
        {selectedRun ? (
          <div className="run-selector">
            <div className="info-label">
              {resource.platform === "ocw" ? "As Taught In" : "Start Date"}
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
          <EmbedlyCard url={resource.url} />
        ) : (
          <img src={resourceThumbnailSrc(resource, imgConfig)} alt="" />
        )}
      </div>
      <div className="ol-lrd-actions-row ">
        <div className="ol-lrd-actions">
          {url && isTakeableResource(resource) && (
            <Button variant="contained" component="a" href={url} target="_blank" rel="noopener noreferrer">
            Take {capitalize(resource.object_type)}
            </Button>
          )}
          <ShareTooltip
            url={formatShareLink(resource)}
            objectType={resource.object_type}
          >
            <Button variant="outlined" startIcon={<ReplyIcon sx={invertIconSx} />}>
            Share
            </Button>
          </ShareTooltip>
        </div>
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
type FlexibleInfoRow = {
  label: string
  value?: string | null | number
  include: boolean
}
const getInfoRows = (
  resource: LearningResourceResult,
  run?: LearningResourceRun
): ResourceInfoRow[] => {
  const rows: FlexibleInfoRow[] = [
    {
      label:   "Duration",
      include: resource.object_type === LearningResourceType.Video,
      value:   resource.duration && formatDurationClockTime(resource.duration)
    },
    {
      label:   "Date Posted",
      include: resource.object_type === LearningResourceType.Video,
      value:
        resource.last_modified &&
        moment(resource.last_modified).format("MMM D, YYYY")
    },
    {
      label:   "Cost",
      include: resource.object_type !== LearningResourceType.Video,
      value:   (run && minPrice(run.prices, true)) ?? "Free"
    },
    {
      label:   "Level",
      include: resource.object_type !== LearningResourceType.Video,
      value:   run?.level
    },
    {
      label:   "Instructors",
      include: resource.object_type !== LearningResourceType.Video,
      value:
        run?.instructors
          ?.map(instructor => getInstructorName(instructor))
          .join(", ") ?? ""
    },
    {
      label:   "Number of Courses",
      include: resource.object_type === LearningResourceType.Program,
      value:   resource.item_count
    },
    {
      label:   "Language",
      include: true,
      value:   languageName(run?.language ?? "en")
    }
  ]

  return rows
    .filter(propsNotNil(["value"]))
    .filter(r => r.value !== "" && r.include)
    .map(r => ({ label: r.label, value: String(r.value) }))
}

export default LearningResourceDetails
export type { LearningResourceDetailsProps }
