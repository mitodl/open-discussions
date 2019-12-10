// @flow
/* global SETTINGS:false */
import React, { useCallback } from "react"
import Dotdotdot from "react-dotdotdot"
import { useDispatch } from "react-redux"

import Card from "./Card"
import LoginTooltip from "./LoginTooltip"

import { setDialogData } from "../actions/ui"
import {
  filterRunsByAvailability,
  bestRunLabel,
  bestRun,
  minPrice,
  getPreferredOfferedBy,
  userListCoverImage
} from "../lib/learning_resources"
import {
  defaultResourceImageURL,
  embedlyThumbnail,
  starSelectedURL,
  starUnselectedURL
} from "../lib/url"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  readableLearningResources
} from "../lib/constants"
import { SEARCH_GRID_UI, SEARCH_LIST_UI } from "../lib/search"
import { toQueryString, COURSE_SEARCH_URL } from "../lib/url"
import { emptyOrNil, userIsAnonymous } from "../lib/util"
import { setShowResourceDrawer, DIALOG_ADD_TO_LIST } from "../actions/ui"

import type {
  CourseTopic,
  LearningResourceSummary
} from "../flow/discussionTypes"

type Props = {|
  object: LearningResourceSummary,
  searchResultLayout?: string,
  availabilities?: Array<string>,
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

const offeredBySearchLink = offeredBy => (
  <a
    href={`${COURSE_SEARCH_URL}${toQueryString({
      o: offeredBy
    })}`}
  >
    {offeredBy}
  </a>
)

const Subtitle = ({ label, content }) => (
  <div className="row subtitle">
    <div className="lr-subtitle">
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
        object.image_src ||
          userListCoverImage(object) ||
          defaultResourceImageURL(),
        CAROUSEL_IMG_HEIGHT,
        CAROUSEL_IMG_WIDTH
      )}
      height={CAROUSEL_IMG_HEIGHT}
      alt={`cover image for ${object.title}`}
    />
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
  const { object, searchResultLayout, availabilities, reordering } = props

  const bestAvailableRun =
    bestRun(filterRunsByAvailability(object.runs, availabilities)) ||
    (object.runs ? object.runs[0] : null)

  const dispatch = useDispatch()
  const showResourceDrawer = useCallback(
    () =>
      dispatch(
        setShowResourceDrawer({
          objectId:   object.id,
          objectType: object.object_type,
          runId:      bestAvailableRun ? bestAvailableRun.id : null
        })
      ),
    [dispatch, object]
  )

  const showListDialog = useCallback(
    payload => {
      dispatch(setDialogData({ dialogKey: DIALOG_ADD_TO_LIST, data: payload }))
    },
    [dispatch]
  )

  const cost = bestAvailableRun ? minPrice(bestAvailableRun.prices) : null
  const inLists = object ? object.lists : []

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
        <div className="row resource-type">
          {readableLearningResources[object.object_type]}
        </div>
        <div className="row course-title" onClick={showResourceDrawer}>
          <Dotdotdot clamp={2}>{object.title}</Dotdotdot>
        </div>
        {object.offered_by.length ? (
          <Subtitle
            content={offeredBySearchLink(
              getPreferredOfferedBy(object.offered_by)
            )}
            label="Offered by - "
          />
        ) : null}
        {object.topics.length > 0 ? (
          <Subtitle
            content={formatTopics(object.topics)}
            label={`${object.topics.length === 1 ? "Subject" : "Subjects"} - `}
          />
        ) : null}
        <div className="row availability-price-favorite">
          {cost ? (
            <div className="price grey-surround">
              <i className="material-icons attach_money">attach_money</i>
              {cost}
            </div>
          ) : null}
          <div className="availability grey-surround">
            <i className="material-icons calendar_today">calendar_today</i>
            {bestRunLabel(bestAvailableRun)}
          </div>
          <LoginTooltip>
            <div className="favorite grey-surround">
              <img
                className="favorite"
                src={
                  // $FlowFixMe
                  object.is_favorite || !emptyOrNil(inLists)
                    ? starSelectedURL
                    : starUnselectedURL
                }
                onClick={e => {
                  e.preventDefault()
                  if (!userIsAnonymous()) {
                    showListDialog(object)
                  }
                }}
              />
            </div>
          </LoginTooltip>
        </div>
      </div>
      {searchResultLayout === SEARCH_GRID_UI ? null : (
        <CoverImage object={object} showResourceDrawer={showResourceDrawer} />
      )}
    </React.Fragment>
  )
}
