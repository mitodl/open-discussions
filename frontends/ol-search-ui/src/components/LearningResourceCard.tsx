import moment from "moment"
import React, { useCallback, useMemo } from "react"
import Dotdotdot from "react-dotdotdot"
import { toQueryString } from "ol-util"
import classNames from "classnames"

import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Chip from "@mui/material/Chip"
import CalendarTodayIcon from "@mui/icons-material/CalendarToday"

import CardMedia from "@mui/material/CardMedia"
import { CardMinimalResource, EmbedlyConfig } from "../interfaces"
import {
  findBestRun,
  getReadableResourceType,
  getStartDate,
  resourceThumbnailSrc,
  CertificateIcon
} from "../util"

const DISPLAY_DATE_FORMAT = "MMMM D, YYYY"

type CardVariant = "column" | "row" | "row-reverse"
type OnActivateCard<R extends CardMinimalResource = CardMinimalResource> = (
  resource: R
) => void
type LearningResourceCardProps<
  R extends CardMinimalResource = CardMinimalResource
> = {
  /**
   * Whether the course picture and info display as a column or row.
   * Defaults to `'column'`.
   */
  variant?: CardVariant
  resource: R
  reordering?: boolean
  className?: string
  /**
   * Config used to generate embedly urls.
   */
  imgConfig: EmbedlyConfig
  onActivate?: OnActivateCard
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

const LearningResourceCard = <R extends CardMinimalResource>({
  variant = "column",
  resource,
  imgConfig,
  className,
  onActivate
}: LearningResourceCardProps<R>) => {
  const bestAvailableRun = findBestRun(resource.runs ?? [])
  const hasCertificate =
    resource.certification && resource.certification.length > 0
  const startDate =
    hasCertificate && bestAvailableRun ?
      getStartDate(resource.platform ?? "", bestAvailableRun) :
      null
  const offerers = resource.offered_by ?? []
  const handleActivate = useCallback(
    () => onActivate?.(resource),
    [resource, onActivate]
  )

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
        {onActivate ? (
          <button className="clickable-title" onClick={handleActivate}>
            <Dotdotdot className="ol-lrc-title" tagName="h3" clamp={3}>
              {resource.title}
            </Dotdotdot>
          </button>
        ) : (
          <Dotdotdot className="ol-lrc-title" tagName="h3" clamp={3}>
            {resource.title}
          </Dotdotdot>
        )}
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
  CardVariant,
  OnActivateCard
}
