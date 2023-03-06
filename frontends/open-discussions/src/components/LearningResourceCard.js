// @flow
/* global SETTINGS:false */
import moment from "moment"
import React, { useCallback } from "react"
import Dotdotdot from "react-dotdotdot"
import { useDispatch } from "react-redux"

import Card from "./Card"
import LoginTooltip from "./LoginTooltip"
import LearningResourceIcon from "./LearningResourceIcon"

import { setDialogData } from "../actions/ui"
import { bestRun } from "../lib/learning_resources"
import { defaultResourceImageURL, embedlyThumbnail } from "../lib/url"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  LR_TYPE_VIDEO,
  DISPLAY_DATE_FORMAT,
  readableLearningResources
} from "../lib/constants"
import { SEARCH_GRID_UI, SEARCH_LIST_UI } from "../lib/search"
import { toQueryString, COURSE_SEARCH_URL } from "../lib/url"
import { emptyOrNil, userIsAnonymous, getImageSrc } from "../lib/util"
import { pushLRHistory, DIALOG_ADD_TO_LIST } from "../actions/ui"

import type {
  CourseTopic,
  LearningResourceSummary
} from "../flow/discussionTypes"

type Props = {|
  object: LearningResourceSummary,
  searchResultLayout?: string,
  reordering?: boolean
|}

const getClassName = (searchResultLayout, reordering) =>
  `learning-resource-card ${
    searchResultLayout === SEARCH_LIST_UI ? "list-view" : ""
  } ${reordering ? "reordering" : ""}`.trim()

const formatTopics = (topics: Array<CourseTopic>) =>
  topics.map((topic, i) => (
    <a
      href={`${COURSE_SEARCH_URL}${toQueryString({
        t: topic.name
      })}`}
      key={i}
    >
      {topic.name}
    </a>
  ))

const formatOfferedBys = (offeredBys: Array<string>) =>
  offeredBys
    .map((offeror, i) => (
      <a
        href={`${COURSE_SEARCH_URL}${toQueryString({
          o: offeror
        })}`}
        key={i}
      >
        {offeror}
      </a>
    ))
    .reduce((prev, curr) => [prev, ", ", curr])

const Subtitle = ({ label, content, htmlClass }) => (
  <div className="row subtitle">
    <div className={`lr-subtitle ${htmlClass}`}>
      <span className="grey">{label}</span>
      {content}
    </div>
  </div>
)

const CoverImage = ({ object, showResourceDrawer }) => (
  <div className="cover-image" onClick={showResourceDrawer}>
    <img
      src={embedlyThumbnail(
        SETTINGS.embedlyKey,
        getImageSrc(object.image_src, object.platform) ||
          defaultResourceImageURL(),
        CAROUSEL_IMG_HEIGHT,
        CAROUSEL_IMG_WIDTH
      )}
      height={CAROUSEL_IMG_HEIGHT}
      alt={`cover image for ${object.title}`}
    />
    {object.object_type === LR_TYPE_VIDEO ? (
      <img
        src="/static/images/video_play_overlay.png"
        className="video-play-icon"
      />
    ) : null}
  </div>
)

export function LearningResourceCard(props: Props) {
  const { searchResultLayout, reordering } = props

  return (
    <Card
      className={getClassName(searchResultLayout, reordering)}
      borderless={searchResultLayout === SEARCH_GRID_UI}
    >
      <LearningResourceDisplay {...props} />
    </Card>
  )
}

export function LearningResourceRow(props: Props) {
  return (
    <div className="learning-resource-card list-view">
      <div className="card-contents">
        <LearningResourceDisplay {...props} />
      </div>
    </div>
  )
}

export function LearningResourceDisplay(props: Props) {
  const { object, searchResultLayout, reordering } = props

  const bestAvailableRun = object.runs ? bestRun(object.runs) : null

  const dispatch = useDispatch()
  const showResourceDrawer = useCallback(
    () =>
      dispatch(
        pushLRHistory({
          objectId:   object.id,
          objectType: object.object_type,
          runId:      bestAvailableRun ? bestAvailableRun.id : null
        })
      ),
    [dispatch, object, bestAvailableRun]
  )

  const showListDialog = useCallback(
    payload => {
      dispatch(setDialogData({ dialogKey: DIALOG_ADD_TO_LIST, data: payload }))
    },
    [dispatch]
  )

  const hasCertificate = object.certification && object.certification.length > 0
  const startDate =
    hasCertificate && bestAvailableRun
      ? moment(bestAvailableRun.best_start_date).format(DISPLAY_DATE_FORMAT)
      : null

  const iconKeys =
    object.audience && object.certification
      ? object.audience.concat(object.certification)
      : []

  const inLists = object ? object.lists : []

  const bookmarkIconName =
    object.is_favorite || !emptyOrNil(inLists) ? "bookmark" : "bookmark_border"

  return (
    <React.Fragment>
      {searchResultLayout === SEARCH_GRID_UI ? (
        <CoverImage object={object} showResourceDrawer={showResourceDrawer} />
      ) : null}
      {reordering ? (
        <div className="drag-handle">
          <i className="material-icons">drag_indicator</i>
        </div>
      ) : null}
      <div className="lr-info">
        <div className="row resource-type-audience-certificates">
          <div className="resource-type">
            {readableLearningResources[object.object_type]}
          </div>
          <div className="audience-certificates">
            {iconKeys.length > 0
              ? iconKeys.map((key, i) => (
                <LearningResourceIcon iconKey={key} key={i} />
              ))
              : null}
          </div>
        </div>
        <div
          className="row course-title"
          onClick={showResourceDrawer}
          onKeyPress={e => {
            if (e.key === "Enter") {
              showResourceDrawer()
            }
          }}
          tabIndex="0"
        >
          <Dotdotdot clamp={3}>{object.title}</Dotdotdot>
        </div>
        {reordering ? null : (
          <>
            <div className="row subtitles">
              {object.offered_by.length ? (
                <Subtitle
                  content={formatOfferedBys(object.offered_by)}
                  label="Offered by - "
                  htmlClass=""
                />
              ) : null}
              {object.topics.length > 0 ? (
                <Subtitle
                  content={formatTopics(object.topics)}
                  label={`${
                    object.topics.length === 1 ? "Subject" : "Subjects"
                  } - `}
                  htmlClass="subject"
                />
              ) : null}
            </div>
            <div className="row start-date-favorite">
              {startDate ? (
                <div className="start-date grey-surround">
                  <i className="material-icons calendar_today">
                    calendar_today
                  </i>
                  {startDate}
                </div>
              ) : null}
              <LoginTooltip>
                <div
                  className="favorite grey-surround"
                  onClick={e => {
                    e.preventDefault()
                    if (!userIsAnonymous()) {
                      showListDialog(object)
                    }
                  }}
                  onKeyPress={e => {
                    if (e.key === "Enter") {
                      if (!userIsAnonymous()) {
                        showListDialog(object)
                      }
                    }
                  }}
                  tabIndex="0"
                >
                  <i className={`material-icons ${bookmarkIconName}`}>
                    {bookmarkIconName}
                  </i>
                </div>
              </LoginTooltip>
            </div>
          </>
        )}
      </div>
      {searchResultLayout === SEARCH_GRID_UI || reordering ? null : (
        <CoverImage object={object} showResourceDrawer={showResourceDrawer} />
      )}
    </React.Fragment>
  )
}
