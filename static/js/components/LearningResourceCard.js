// @flow
/* global SETTINGS:false */
import React from "react"
import Dotdotdot from "react-dotdotdot"
import { mutateAsync } from "redux-query"
import { connect } from "react-redux"

import Card from "./Card"
import LoginTooltip from "./LoginTooltip"

import {
  filterRunsByAvailability,
  bestRunLabel,
  bestRun,
  minPrice,
  getPreferredOfferedBy
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
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_USERLIST,
  LR_TYPE_PROGRAM,
  LR_TYPE_VIDEO,
  readableLearningResources
} from "../lib/constants"
import { favoriteCourseMutation } from "../lib/queries/courses"
import { favoriteBootcampMutation } from "../lib/queries/bootcamps"
import { favoriteProgramMutation } from "../lib/queries/programs"
import { favoriteUserListMutation } from "../lib/queries/user_lists"
import { favoriteVideoMutation } from "../lib/queries/videos"
import { SEARCH_GRID_UI, SEARCH_LIST_UI } from "../lib/search"
import { toQueryString, COURSE_SEARCH_URL } from "../lib/url"

import type { LearningResourceSummary } from "../flow/discussionTypes"

type OwnProps = {|
  object: LearningResourceSummary,
  setShowResourceDrawer: Function,
  searchResultLayout?: string,
  availabilities?: Array<string>
|}

type DispatchProps = {|
  toggleFavorite: Function
|}

type Props = {|
  ...OwnProps,
  ...DispatchProps
|}

const getClassName = searchResultLayout =>
  `learning-resource-card ${
    searchResultLayout === SEARCH_LIST_UI ? "list-view" : ""
  }`.trim()

const formatTopics = (topics: Array<{ name: string }>) =>
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
        object.image_src || defaultResourceImageURL(),
        CAROUSEL_IMG_HEIGHT,
        CAROUSEL_IMG_WIDTH
      )}
      height={CAROUSEL_IMG_HEIGHT}
      alt={`cover image for ${object.title}`}
    />
  </div>
)

export const LearningResourceCard = ({
  object,
  setShowResourceDrawer,
  toggleFavorite,
  searchResultLayout,
  availabilities
}: Props) => {
  const bestAvailableRun =
    bestRun(filterRunsByAvailability(object.runs, availabilities)) ||
    (object.runs ? object.runs[0] : null)

  const showResourceDrawer = () =>
    setShowResourceDrawer({
      objectId:   object.id,
      objectType: object.object_type,
      runId:      bestAvailableRun ? bestAvailableRun.id : null
    })

  const cost = bestAvailableRun ? minPrice(bestAvailableRun.prices) : null

  return (
    <Card
      className={getClassName(searchResultLayout)}
      borderless={searchResultLayout === SEARCH_GRID_UI}
    >
      {searchResultLayout === SEARCH_GRID_UI ? (
        <CoverImage object={object} showResourceDrawer={showResourceDrawer} />
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
                  object.is_favorite ? starSelectedURL : starUnselectedURL
                }
                onClick={() => toggleFavorite(object)}
              />
            </div>
          </LoginTooltip>
        </div>
      </div>
      {searchResultLayout === SEARCH_GRID_UI ? null : (
        <CoverImage object={object} showResourceDrawer={showResourceDrawer} />
      )}
    </Card>
  )
}

const mapDispatchToProps = dispatch => ({
  toggleFavorite: payload => {
    if (payload.object_type === LR_TYPE_COURSE) {
      dispatch(mutateAsync(favoriteCourseMutation(payload)))
    }
    if (payload.object_type === LR_TYPE_BOOTCAMP) {
      dispatch(mutateAsync(favoriteBootcampMutation(payload)))
    }
    if (payload.object_type === LR_TYPE_PROGRAM) {
      dispatch(mutateAsync(favoriteProgramMutation(payload)))
    }
    if (payload.object_type === LR_TYPE_USERLIST) {
      dispatch(mutateAsync(favoriteUserListMutation(payload)))
    }
    if (payload.object_type === LR_TYPE_VIDEO) {
      dispatch(mutateAsync(favoriteVideoMutation(payload)))
    }
  }
})

export default connect<Props, OwnProps, _, _, _, _>(
  null,
  mapDispatchToProps
)(LearningResourceCard)
