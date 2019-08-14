// @flow
/* global SETTINGS:false */
import React from "react"
import Dotdotdot from "react-dotdotdot"
import { mutateAsync } from "redux-query"
import { connect } from "react-redux"

import { availabilityLabel, minPrice } from "../lib/learning_resources"
import {
  embedlyThumbnail,
  starSelectedURL,
  starUnselectedURL
} from "../lib/url"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  platformLogoUrls,
  platforms,
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_USERLIST,
  LR_TYPE_PROGRAM,
  COURSE_AVAILABLE_NOW
} from "../lib/constants"
import { favoriteCourseMutation } from "../lib/queries/courses"
import { favoriteBootcampMutation } from "../lib/queries/bootcamps"
import { favoriteProgramMutation } from "../lib/queries/programs"
import { favoriteUserListMutation } from "../lib/queries/user_lists"

import type { LearningResourceSummary } from "../flow/discussionTypes"

type OwnProps = {|
  object: LearningResourceSummary,
  setShowResourceDrawer: Function,
  toggleFacet?: Function
|}

type DispatchProps = {|
  toggleFavorite: Function
|}

type Props = {|
  ...OwnProps,
  ...DispatchProps
|}

const getPlatform = (object: LearningResourceSummary): string => {
  if (object.object_type === LR_TYPE_COURSE) {
    // $FlowFixMe: only a course will reach this line
    return object.offered_by || object.platform
  } else if (object.object_type === LR_TYPE_BOOTCAMP) {
    return platforms.bootcamps
  } else {
    return object.offered_by || ""
  }
}

export const LearningResourceCard = ({
  object,
  setShowResourceDrawer,
  toggleFacet,
  toggleFavorite
}: Props) => {
  const showResourceDrawer = () =>
    setShowResourceDrawer({
      objectId:   object.id,
      objectType: object.object_type
    })

  return (
    <div className="learning-resource-card">
      <div className="card-contents">
        <div className="cover-image" onClick={showResourceDrawer}>
          <img
            src={embedlyThumbnail(
              SETTINGS.embedlyKey,
              object.image_src || "",
              CAROUSEL_IMG_HEIGHT,
              CAROUSEL_IMG_WIDTH
            )}
            height={CAROUSEL_IMG_HEIGHT}
            alt={`cover image for ${object.title}`}
          />
        </div>
        <div className="row course-title" onClick={showResourceDrawer}>
          <Dotdotdot clamp={2}>{object.title}</Dotdotdot>
        </div>
        <div className="row topics">
          {object.topics.length > 0
            ? object.topics.slice(0, 3).map(topic => (
              <div
                className="topic"
                key={topic.name}
                onClick={
                  toggleFacet
                    ? () => toggleFacet("topics", topic.name, true)
                    : null
                }
              >
                {topic.name}
              </div>
            ))
            : null}
        </div>
        <div className="row availability">
          {availabilityLabel(object.availability || COURSE_AVAILABLE_NOW)}
        </div>
        <div className="row platform-favorite">
          <img
            className="course-platform"
            src={platformLogoUrls[getPlatform(object)]}
            alt={`logo for ${getPlatform(object)}`}
          />
          <img
            className="favorite"
            src={
              // $FlowFixMe
              object.is_favorite ? starSelectedURL : starUnselectedURL
            }
            onClick={() => toggleFavorite(object)}
          />
        </div>
        <div className="row price">{minPrice(object)}</div>
      </div>
      <div className="blue-bottom-border" />
    </div>
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
  }
})

export default connect<Props, OwnProps, _, _, _, _>(
  null,
  mapDispatchToProps
)(LearningResourceCard)
