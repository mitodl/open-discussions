import moment from "moment"
import React, { useMemo } from "react"
import Dotdotdot from "react-dotdotdot"
import { toQueryString } from "ol-util"
import classNames from "classnames"

import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Chip from "@mui/material/Chip"
import CalendarTodayIcon from "@mui/icons-material/CalendarToday"

import CardMedia from "@mui/material/CardMedia"
import { LearningResource } from "../interfaces"
import {
  bestRun,
  getReadableResourceType,
  resourceThumbnailSrc,
  EmbedlyConfig,
  CertificateIcon
} from "../util"

const DISPLAY_DATE_FORMAT = "MMMM D, YYYY"

type CardMinimalResource = Pick<
  LearningResource,
  | "runs"
  | "certification"
  | "title"
  | "offered_by"
  | "object_type"
  | "image_src"
  | "platform"
>

type CardVariant = "column" | "row" | "row-reverse"
type CardImgConfig = EmbedlyConfig
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
  imgConfig: CardImgConfig
}

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
  const bestAvailableRun = bestRun(resource.runs ?? [])
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
    <Card
      className={classNames(className, variantClasses[variant], "ol-lrc-root")}
    >
      {isRow ? (
        <CardContent className="ol-lrc-image">{cardImg}</CardContent>
      ) : (
        cardImg
      )}
      <CardContent className="ol-lrc-content">
        <div className="ol-lrc-type-row">
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
          <span className="ol-lrc-offered-by">Offered by &ndash;</span>
          {offerers.length && <Offerers offerers={offerers} />}
        </div>
        <div className="ol-lrc-date-row">
          {startDate && (
            <Chip
              className="ol-lrc-chip"
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
export type {
  LearningResourceCardProps,
  CardMinimalResource,
  CardImgConfig,
  CardVariant
}
