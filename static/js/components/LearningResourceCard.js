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
  LR_TYPE_BOOTCAMP
} from "../lib/constants"
import { favoriteCourseMutation } from "../lib/queries/courses"
import { favoriteBootcampMutation } from "../lib/queries/bootcamps"

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

const getPlatform = (object: Object): string =>
  object.object_type === LR_TYPE_COURSE ? object.platform : platforms.bootcamps

const LearningResourceCard = ({
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
          {availabilityLabel(object.availability)}
        </div>
        <div className="row platform">
          {object.offered_by || "platform" in object ? (
            <img
              className="course-platform"
              src={platformLogoUrls[object.offered_by || object.platform || ""]}
              alt={`logo for ${object.offered_by || object.platform || ""}`}
            />
          ) : null}
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
  }
})

export default connect<Props, OwnProps, _, _, _, _>(
  null,
  mapDispatchToProps
)(LearningResourceCard)
