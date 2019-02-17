// @flow
/* global SETTINGS:false */
import React from "react"
import { connect } from "react-redux"

import Card from "./Card"
import { courseAvailability, maxPrice } from "../lib/courses"
import { embedlyThumbnail } from "../lib/url"
import { EMBEDLY_THUMB_HEIGHT, EMBEDLY_THUMB_WIDTH } from "../lib/posts"

import type { Course } from "../flow/discussionTypes"
import { setShowCourseDrawer } from "../actions/ui"
import type { Dispatch } from "redux"

type Props = {
  course: Course,
  dispatch: Dispatch<*>
}

export class CompactCourseDisplay extends React.Component<Props> {
  setCourseForDrawer = async () => {
    const { dispatch, course } = this.props
    dispatch(setShowCourseDrawer({ visible: true, courseId: course.id }))
  }

  render() {
    const { course } = this.props
    return (
      <Card className={`compact-course-summary`}>
        <div className="column1" onClick={this.setCourseForDrawer}>
          <div className="preview-body">
            <div className="row title-row">
              <div className="course-title">{course.title}</div>
            </div>
            <div className="row">
              <div className="course-topics">
                {course.topics ? course.topics[0].name : ""}
              </div>
            </div>
          </div>
          <div className="row preview-footer">
            <div className="course-info">
              <span className="course-availability grey-surround flexless">
                {courseAvailability(course)}
              </span>
              <span className="course-platform grey-surround flexless">
                {course.platform.toUpperCase()}
              </span>
            </div>
            <div className="course-price grey-surround">{maxPrice(course)}</div>
          </div>
        </div>
        {course.image_src ? (
          <div
            className="column2 link-thumbnail"
            onClick={this.setCourseForDrawer}
          >
            <React.Fragment>
              <img
                src={embedlyThumbnail(
                  SETTINGS.embedlyKey,
                  course.image_src,
                  EMBEDLY_THUMB_HEIGHT,
                  EMBEDLY_THUMB_WIDTH
                )}
                height={EMBEDLY_THUMB_HEIGHT}
                width={EMBEDLY_THUMB_WIDTH}
              />
            </React.Fragment>
          </div>
        ) : null}
      </Card>
    )
  }
}

export default connect()(CompactCourseDisplay)
