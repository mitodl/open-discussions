import moment from "moment"
import React, { useCallback, useMemo } from "react"
import Dotdotdot from "react-dotdotdot"
import { toQueryString, pluralize } from "ol-util"
import classNames from "classnames"

import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Chip from "@mui/material/Chip"
import CalendarTodayIcon from "@mui/icons-material/CalendarToday"

import CardMedia from "@mui/material/CardMedia"
import {
  CardMinimalResource,
  EmbedlyConfig,
  LearningResourceType
} from "../interfaces"
import {
  findBestRun,
  getReadableResourceType,
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

const CardBody: React.FC<Pick<LearningResourceCardProps, "resource">> = ({
  resource
}) => {
  const offerers = resource.offered_by ?? []
  return offerers.length > 0 ? (
    <div>
      <span className="ol-lrc-offered-by">Offered by &ndash;</span>
      <Offerers offerers={offerers} />
    </div>
  ) : null
}

const CardFooter: React.FC<Pick<LearningResourceCardProps, "resource">> = ({
  resource
}) => {
  const bestAvailableRun = findBestRun(resource.runs ?? [])
  const hasCertificate =
    resource.certification && resource.certification.length > 0
  const startDate =
    hasCertificate && bestAvailableRun ?
      moment(bestAvailableRun.best_start_date).format(DISPLAY_DATE_FORMAT) :
      null
  const isList = [
    LearningResourceType.Userlist,
    LearningResourceType.LearningPath
  ].includes(resource.object_type)
  return (
    <div className="ol-lrc-footer-row">
      {startDate && (
        <Chip
          className="ol-lrc-chip"
          avatar={<CalendarTodayIcon />}
          label={startDate}
        />
      )}
      {isList &&
        resource.item_count !== undefined && ( // for TS; should not be undefined for lists
        <span>
          {resource.item_count} {pluralize("item", resource.item_count)}
        </span>
      )}
    </div>
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
  const hasCertificate =
    resource.certification && resource.certification.length > 0
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
        <CardBody resource={resource} />
        <CardFooter resource={resource} />
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
