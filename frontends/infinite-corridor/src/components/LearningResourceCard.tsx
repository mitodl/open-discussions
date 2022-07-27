import moment from "moment"
import React from "react"
import Dotdotdot from "react-dotdotdot"

import { Card } from "ol-util"
export const DISPLAY_DATE_FORMAT = "MMMM D, YYYY"

import {
  LearningResourceSummary,
  readableLearningResources,
  bestRun,
  formatOfferedBys,
  CoverImage,
  Subtitle
} from "ol-search-ui"

type Props = {
  object: LearningResourceSummary
  searchResultLayout?: string
  reordering?: boolean
}

export function LearningResourceCard(props: Props) {
  return (
    <Card className="card learning-resource-card list-view">
      <LearningResourceDisplay {...props} />
    </Card>
  )
}

export function LearningResourceDisplay(props: Props) {
  const { object } = props

  const bestAvailableRun = object.runs ? bestRun(object.runs) : null

  const hasCertificate = object.certification && object.certification.length > 0
  const startDate =
    hasCertificate && bestAvailableRun ?
      moment(bestAvailableRun.best_start_date).format(DISPLAY_DATE_FORMAT) :
      null

  return (
    <div className="lr-info">
      <div className="row resource-type-audience-certificates">
        <div className="resource-type">
          {readableLearningResources[object.object_type]}
        </div>
        <div className="audience-certificates">
          {hasCertificate ? (
            <img src="/static/images/certificate_icon_infinite.png" />
          ) : null}
        </div>
      </div>
      <div className="row course-title">
        <Dotdotdot clamp={3}>{object.title}</Dotdotdot>
      </div>
      <div className="row subtitles">
        {object.offered_by.length ? (
          <Subtitle
            content={formatOfferedBys(object.offered_by)}
            label="Offered by - "
            htmlClass=""
          />
        ) : null}
      </div>
      <div className="row start-date-favorite">
        {startDate ? (
          <div className="start-date grey-surround">
            <i className="material-icons calendar_today">calendar_today</i>
            {startDate}
          </div>
        ) : null}
      </div>
      <CoverImage
        object={object}
        embedlyKey={SETTINGS.embedlyKey}
        ocwNextBaseUrl={SETTINGS.ocw_next_base_url}
      />
    </div>
  )
}
