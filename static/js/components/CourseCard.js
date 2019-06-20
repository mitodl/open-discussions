// @flow
/* global SETTINGS:false */
import React from "react"
import Dotdotdot from "react-dotdotdot"

import { availabilityLabel, minPrice } from "../lib/courses"
import { embedlyThumbnail } from "../lib/url"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  platformLogoUrls
} from "../lib/constants"

import type { Course } from "../flow/discussionTypes"

type CardProps = {|
  course: Course,
  setShowCourseDrawer: Function
|}

const CourseCard = ({ course, setShowCourseDrawer }: CardProps) => (
  <div
    className="course-card"
    onClick={() => setShowCourseDrawer({ courseId: course.id })}
  >
    <div className="card-contents">
      <div className="cover-image">
        <img
          src={embedlyThumbnail(
            SETTINGS.embedlyKey,
            course.image_src || "",
            CAROUSEL_IMG_HEIGHT,
            CAROUSEL_IMG_WIDTH
          )}
          height={CAROUSEL_IMG_HEIGHT}
          alt={`cover image for ${course.title}`}
        />
      </div>
      <div className="row course-title">
        <Dotdotdot clamp={2}>{course.title}</Dotdotdot>
      </div>
      <div className="row topics">
        {course.topics.length > 0
          ? course.topics.slice(0, 3).map(topic => (
            <div className="topic" key={topic.name}>
              {topic.name}
            </div>
          ))
          : null}
      </div>
      <div className="row availability">
        {availabilityLabel(course.availability)}
      </div>
      <div className="row platform">
        <img
          className="course-platform"
          src={platformLogoUrls[course.platform]}
          alt={`logo for ${course.platform}`}
        />
      </div>
      <div className="row price">{minPrice(course)}</div>
    </div>
    <div className="blue-bottom-border" />
  </div>
)

export default CourseCard
