import React, { useCallback } from "react"
import Dotdotdot from "react-dotdotdot"
import invariant from "tiny-invariant"
import { toQueryString, pluralize } from "ol-util"
import classNames from "classnames"

import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Chip from "@mui/material/Chip"
import CalendarTodayIcon from "@mui/icons-material/CalendarToday"
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'

import CardMedia from "@mui/material/CardMedia"
import {
  CardMinimalResource,
  EmbedlyConfig,
  LearningResourceType,
  TYPE_FAVORITES
} from "../interfaces"
import {
  findBestRun,
  getReadableResourceType,
  getStartDate,
  resourceThumbnailSrc,
  CertificateIcon
} from "../util"

type CardVariant = "column" | "row" | "row-reverse"
type OnActivateCard<R extends CardMinimalResource = CardMinimalResource> = (
  resource: R
) => void
type LearningResourceCardTemplateProps<
  R extends CardMinimalResource = CardMinimalResource
> = {
  /**
   * Whether the course picture and info display as a column or row.
   */
  variant: CardVariant
  resource: R
  sortable?: boolean
  className?: string
  /**
   * Config used to generate embedly urls.
   */
  imgConfig: EmbedlyConfig
  onActivate?: OnActivateCard<R>
  /**
   * Suppress the image.
   */
  suppressImage?: boolean
  footerActionSlot?: React.ReactNode
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

const CardBody: React.FC<
  Pick<LearningResourceCardTemplateProps, "resource">
> = ({ resource }) => {
  const offerers = resource.offered_by ?? []
  return offerers.length > 0 ? (
    <div>
      <span className="ol-lrc-offered-by">Offered by &ndash;</span>
      <Offerers offerers={offerers} />
    </div>
  ) : null
}

const ResourceFooterDetails: React.FC<
  Pick<LearningResourceCardTemplateProps, "resource">
> = ({ resource }) => {
  const isList = [
    LearningResourceType.Userlist,
    LearningResourceType.LearningPath,
    TYPE_FAVORITES
  ].includes(resource.object_type)
  if (isList && resource.item_count !== undefined) {
    return (
      <span>
        {resource.item_count} {pluralize("item", resource.item_count)}
      </span>
    )
  }

  const bestAvailableRun = findBestRun(resource.runs ?? [])
  const hasCertificate =
    resource.certification && resource.certification.length > 0
  const startDate =
    hasCertificate && bestAvailableRun ?
      getStartDate(resource.platform ?? "", bestAvailableRun) :
      null
  if (startDate) {
    return (
      <Chip
        className="ol-lrc-chip"
        avatar={<CalendarTodayIcon />}
        label={startDate}
      />
    )
  }

  return null
}

type LRCImageProps = Pick<
  LearningResourceCardTemplateProps,
  "resource" | "imgConfig" | "suppressImage" | "variant"
>
const LRCImage: React.FC<LRCImageProps> = ({
  resource,
  imgConfig,
  suppressImage,
  variant
}) => {
  if (suppressImage) return null
  const dims = variant === 'column' ? { height: imgConfig.height } : {width: imgConfig.width, height: imgConfig.height}
  return (
    <CardMedia
      component="img"
      className="ol-lrc-image"
      sx={dims}
      src={resourceThumbnailSrc(resource, imgConfig)}
      alt=""
    />
  )
}

const variantClasses: Record<CardVariant, string> = {
  column:        "ol-lrc-col",
  row:           "ol-lrc-row",
  "row-reverse": "ol-lrc-row-reverse"
}

/**
 * A card display for Learning Resources. Includes a title, image, and various
 * metadata.
 *
 * This template does not provide any meaningful user interaction by itself, but
 * does accept props to build user interaction (e.g., `onActivate` and
 * `footerActionSlot`).
 */
const LearningResourceCardTemplate = <R extends CardMinimalResource>({
  variant,
  resource,
  imgConfig,
  className,
  suppressImage = false,
  onActivate,
  footerActionSlot,
  sortable
}: LearningResourceCardTemplateProps<R>) => {
  const hasCertificate =
    resource.certification && resource.certification.length > 0
  const handleActivate = useCallback(
    () => onActivate?.(resource),
    [resource, onActivate]
  )

  invariant(!sortable || variant === "row-reverse", "sortable only supported for variant='row-reverse'")

  return (
    <Card
      className={classNames(className, "ol-lrc-root")}
    >
      {variant === 'column' ?
        <LRCImage
          variant={variant}
          suppressImage={suppressImage}
          resource={resource}
          imgConfig={imgConfig}
        /> : null }
      <CardContent className={classNames("ol-lrc-content", variantClasses[variant], {
        "ol-lrc-sortable": sortable
      })}>
        {
          variant !== 'column' ?
            <LRCImage
              variant={variant}
              suppressImage={suppressImage}
              resource={resource}
              imgConfig={imgConfig}
            /> : null
        }
        <div className="ol-lrc-details">
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
          {
            sortable ? null : <>
              <CardBody resource={resource} />
              <div className="ol-lrc-fill-space-content-end">
                <div className="ol-lrc-footer-row">
                  <div>
                    <ResourceFooterDetails resource={resource} />
                  </div>
                  {footerActionSlot}
                </div>
              </div>
            </>
          }
        </div>
        { sortable ?
          <div className="ol-lrc-drag-handle">
            <DragIndicatorIcon fontSize="inherit" />
          </div> :
          null }
      </CardContent>
    </Card>
  )
}

export default LearningResourceCardTemplate

export type {
  LearningResourceCardTemplateProps,
  CardMinimalResource,
  CardVariant,
  OnActivateCard
}
