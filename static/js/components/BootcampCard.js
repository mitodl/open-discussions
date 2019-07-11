// @flow
/* global SETTINGS:false */
import React from "react"
import Dotdotdot from "react-dotdotdot"

import { availabilityLabel, minPrice } from "../lib/courses"
import { embedlyThumbnail } from "../lib/url"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
} from "../lib/constants"

import type { Bootcamp } from "../flow/discussionTypes"

type CardProps = {|
  bootcamp: Bootcamp,
  setShowLearningResourceDrawer: Function,
  toggleFacet?: Function
|}

const BootcampCard = ({
  bootcamp,
  setShowLearningResourceDrawer,
  toggleFacet
}: CardProps) => {
  const showLearningResourceDrawer = () => setShowLearningResourceDrawer({ objectId: bootcamp.id, objectType: "bootcamp" })

  return (
    <div className="course-card">
      <div className="card-contents">
        <div className="cover-image" onClick={showLearningResourceDrawer}>
          <img
            src={embedlyThumbnail(
              SETTINGS.embedlyKey,
              bootcamp.image_src || "",
              CAROUSEL_IMG_HEIGHT,
              CAROUSEL_IMG_WIDTH
            )}
            height={CAROUSEL_IMG_HEIGHT}
            alt={`cover image for ${bootcamp.title}`}
          />
        </div>
        <div className="row course-title" onClick={showLearningResourceDrawer}>
          <Dotdotdot clamp={2}>{bootcamp.title}</Dotdotdot>
        </div>
        <div className="row topics">
          {bootcamp.topics.length > 0
            ? bootcamp.topics.slice(0, 3).map(topic => (
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
          {availabilityLabel(bootcamp.availability)}
        </div>
        <div className="row price">{minPrice(bootcamp)}</div>
      </div>
      <div className="blue-bottom-border" />
    </div>
  )
}

export default BootcampCard
