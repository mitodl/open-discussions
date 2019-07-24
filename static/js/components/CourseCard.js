// @flow
/* global SETTINGS:false */
import React from "react"
import Dotdotdot from "react-dotdotdot"

import { availabilityLabel, minPrice } from "../lib/courses"
import { embedlyThumbnail } from "../lib/url"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  platformLogoUrls,
  platforms
} from "../lib/constants"

import type { Bootcamp, Course } from "../flow/discussionTypes"

type CardProps = {|
  object: Course | Bootcamp,
  objectType: string,
  setShowResourceDrawer: Function,
  toggleFacet?: Function
|}

const CourseCard = ({
  object,
  objectType,
  setShowResourceDrawer,
  toggleFacet
}: CardProps) => {
  const showResourceDrawer = () =>
    setShowResourceDrawer({ objectId: object.id, objectType: objectType })

  return (
    <div className="course-card">
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
          <img
            className="course-platform"
            src={
              platformLogoUrls[
                // $FlowFixMe: only courses will access platform
                objectType === "course" ? object.platform : platforms.bootcamps
              ]
            }
            alt={`logo for ${
              // $FlowFixMe: only courses will end up here
              objectType === "course" ? object.platform : platforms.bootcamps
            }`}
          />
        </div>
        <div className="row price">{minPrice(object)}</div>
      </div>
      <div className="blue-bottom-border" />
    </div>
  )
}

export default CourseCard
