// @flow
/* global SETTINGS:false */
import React from "react"
import { connect } from "react-redux"
import _ from "lodash"

import Card from "./Card"

import { setShowCourseDrawer } from "../actions/ui"
import { availabilityLabel, minPrice } from "../lib/courses"
import { embedlyThumbnail } from "../lib/url"
import { EMBEDLY_THUMB_HEIGHT, EMBEDLY_THUMB_WIDTH } from "../lib/posts"

import type { Course } from "../flow/discussionTypes"
import type { Dispatch } from "redux"

type OwnProps = {|
  course: Course,
  toggleFacet?: Function
|}

type Props = {|
  ...OwnProps,
  dispatch: Dispatch<*>
|}

export class CompactCourseDisplay extends React.Component<Props> {
  setCourseForDrawer = async () => {
    const { dispatch, course } = this.props
    dispatch(setShowCourseDrawer({ courseId: course.id }))
  }

  onToggleFacet = async (name: string, value: string) => {
    const { toggleFacet } = this.props
    if (toggleFacet) {
      toggleFacet(name, value, true)
    }
  }

  render() {
    const { course } = this.props
    return (
      <Card className={`compact-course-summary`}>
        <div className="column1">
          <div className="preview-body">
            <div className="row title-row">
              <div className="course-title" onClick={this.setCourseForDrawer}>
                {course.title}
              </div>
            </div>
            <div className="row topics-row">
              {_.sortBy(course.topics).map((topic, i) => (
                <div
                  className="grey-surround facet topic"
                  key={i}
                  onClick={() => this.onToggleFacet("topics", topic.name)}
                >
                  {topic.name}
                </div>
              ))}
            </div>
          </div>
          <div className="row preview-footer">
            <div className="course-availability">
              {availabilityLabel(course.availability)}
            </div>
            <div className="course-platform">
              {course.platform.toUpperCase()}
            </div>
            <div className="course-price">{minPrice(course)}</div>
          </div>
        </div>
        {course.image_src ? (
          <div
            className="column2 link-thumbnail"
            onClick={this.setCourseForDrawer}
          >
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
          </div>
        ) : null}
      </Card>
    )
  }
}

export default connect<Props, OwnProps, _, _, _, _>()(CompactCourseDisplay)
