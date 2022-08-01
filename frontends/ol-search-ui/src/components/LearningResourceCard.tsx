import moment from "moment"
import React, { useMemo } from "react"
import Dotdotdot from "react-dotdotdot"
import { toQueryString } from "ol-util"
import type { PartialBy } from "ol-util"
import classNames from "classnames"

import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Chip from "@mui/material/Chip"
import CalendarTodayIcon from "@mui/icons-material/CalendarToday"

import CardMedia from "@mui/material/CardMedia"
import { LearningResourceSummary } from "../interfaces"
import {
  bestRun,
  getReadableResourceType,
  resourceThumbnailSrc,
  EmbedlyConfig
} from "../util"

const DISPLAY_DATE_FORMAT = "MMMM D, YYYY"

type CardMinimalResource = PartialBy<
  Pick<
    LearningResourceSummary,
    | "runs"
    | "certification"
    | "title"
    | "offered_by"
    | "object_type"
    | "image_src"
    | "platform"
  >,
  "offered_by" | "certification"
>

type CardVariant = "column" | "row" | "row-reverse"
type LearningResourceCardProps = {
  /**
   * Whether the course picture and info display as a column or row.
   * Defaults to `'column'`.
   */
  variant?: CardVariant
  resource: CardMinimalResource
  searchResultLayout?: string
  reordering?: boolean
  className?: string
  /**
   * Config used to generate embedly urls.
   */
  imgConfig: EmbedlyConfig
}

const CertificateIcon = () => (
  <img
    style={{ height: "1.5rem" }}
    alt="Receive a certificate upon completion"
    src="/static/images/certificate_icon_infinite.png"
  />
)

type OffererProps = {
  offerers: string[]
}

const Offerers: React.FC<OffererProps> = ({ offerers }) => {
  return (
    <>
      {offerers.map((offerer, i) => {
        const isLast = i === offerers.length - 1
        return (
          <React.Fragment key={`${offerer}-${i}`}>
            <a href={`/infinite/search?${toQueryString({ o: offerer })}`}>
              {offerer}
            </a>
            {!isLast && ", "}
          </React.Fragment>
        )
      })}
    </>
  )
}

const variantClasses: Record<CardVariant, string> = {
  column:        "ol-lrc-col",
  row:           "ol-lrc-row",
  "row-reverse": "ol-lrc-row-reverse"
}

const LearningResourceCard: React.FC<LearningResourceCardProps> = ({
  variant = "column",
  resource,
  imgConfig,
  className
}) => {
  const bestAvailableRun = bestRun(resource.runs)
  const hasCertificate =
    resource.certification && resource.certification.length > 0
  const startDate =
    hasCertificate && bestAvailableRun ?
      moment(bestAvailableRun.best_start_date).format(DISPLAY_DATE_FORMAT) :
      null
  const offerers = resource.offered_by ?? []

  const isRow = variant === "row" || variant === "row-reverse"
  const cardImg = useMemo(
    () => (
      <CardMedia
        component="img"
        height={imgConfig.height}
        src={resourceThumbnailSrc(resource, imgConfig)}
        alt=""
      />
    ),
    [resource, imgConfig]
  )
  return (
    <Card className={classNames(className, variantClasses[variant])}>
      {isRow ? <CardContent>{cardImg}</CardContent> : cardImg}
      <CardContent className="ol-lrc-content">
        <div className="ol-lrc-flex-row">
          <span className="ol-lrc-type">
            {getReadableResourceType(resource.object_type)}
          </span>
          {hasCertificate && <CertificateIcon />}
        </div>
        <div className="ol-lrc-title-box">
          <Dotdotdot className="ol-lrc-title" tagName="h3" clamp={3}>
            {resource.title}
          </Dotdotdot>
        </div>
        <div>
          <span className="ol-lrc-offered-by">Offered By &ndash;</span>
          {offerers.length && <Offerers offerers={offerers} />}
        </div>
        <div>
          {startDate && (
            <Chip
              className="ol-lrc-chip "
              avatar={<CalendarTodayIcon />}
              label={startDate}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default LearningResourceCard
export type { LearningResourceCardProps, CardMinimalResource }
