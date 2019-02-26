// @flow
/* global SETTINGS: false */
import React from "react"
import _ from "lodash"
import Dotdotdot from "react-dotdotdot"
import moment from "moment"
import striptags from "striptags"
import { AllHtmlEntities } from "html-entities"

import type { Course } from "../flow/discussionTypes"
import { embedlyResizeImage } from "../lib/url"
import { maxPrice } from "../lib/courses"
import { platforms } from "../lib/constants"
import { languageName } from "../lib/util"

const COURSE_IMAGE_DISPLAY_HEIGHT = 300
const entities = new AllHtmlEntities()

type Props = {
  course: Course
}

type State = {
  showMore: boolean
}

export default class ExpandedCourseDisplay extends React.Component<Props, State> {

  constructor() {
    super()
    this.state = {
      showMore: false
    }
  }

  toggleDescription = () => {
    this.setState({showMore: !this.state.showMore})
  }

  render() {
    const { course } = this.props
    const { showMore } = this.state

    return (
      <div className="expanded-course-summary">
        <div className="summary">
          {course.image_src ? (
            <div className="course-image-div">
              <img
                className="course-image"
                src={embedlyResizeImage(
                  SETTINGS.embedlyKey,
                  course.image_src,
                  COURSE_IMAGE_DISPLAY_HEIGHT
                )}
                height={COURSE_IMAGE_DISPLAY_HEIGHT}
              />
            </div>
          ) : null}
          {course.url ? (
            <div className="course-links">
              <div>
                <a
                  className="link-button"
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Take Course on {course.platform.toUpperCase()}
                </a>
              </div>
              <div className="course-links-right">
                Offered by
                <a
                  href={course.url || ""}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={`/static/images/${course.platform}-logo.png`} />
                </a>
              </div>
            </div>
          ) : null}
          <div className="course-title">{course.title}</div>
          <div className="course-description">
            {
              showMore ? (
                <div>
                {entities.decode(striptags(course.short_description))}
                </div>
                ) : (
                  <Dotdotdot clamp={4}>
                    {entities.decode(striptags(course.short_description))}
                  </Dotdotdot>
              )
            }

            <button onClick={this.toggleDescription}>{showMore ? 'Less' : 'More'} </button>
          </div>
          <div className="course-subheader row">Topics</div>
          <div className="course-topics">
            {course.topics.map((topic, i) => (
              <div className="grey-surround" key={i}>
                {topic.name}
              </div>
            ))}
          </div>
          <div className="course-subheader row">Info</div>
          <div className="course-info-row">
            <i className="material-icons history">history</i>
            <div className="course-info-label">
              {course.platform === platforms.edX ? "As taught in" : "Semester"}:
            </div>
            <div className="course-info-value">
              {_.capitalize(course.semester)} {course.year}
            </div>
          </div>
          <div className="course-info-row">
            <i className="material-icons calendar_today">calendar_today</i>
            <div className="course-info-label">Start date:</div>
            <div className="course-info-value">
              {course.platform === platforms.edX
                ? moment(course.start_date).format("DD MMMM YYYY")
                : "Ongoing"}
            </div>
          </div>
          <div className="course-info-row">
            <i className="material-icons attach_money">attach_money</i>
            <div className="course-info-label">Cost:</div>
            <div className="course-info-value">{maxPrice(course)}</div>
          </div>
          <div className="course-info-row">
            <i className="material-icons bar_chart">bar_chart</i>
            <div className="course-info-label">Level:</div>
            <div className="course-info-value">
              {course.level || "Unspecified"}
            </div>
          </div>
          <div className="course-info-row">
            <i className="material-icons school">school</i>
            <div className="course-info-label">Instructors:</div>
            <div className="course-info-value">
              {_.join(
                course.instructors.map(
                  instructor =>
                    `Prof. ${instructor.first_name} ${instructor.last_name}`
                ),
                ", "
              )}
            </div>
          </div>
          <div className="course-info-row">
            <i className="material-icons language">language</i>
            <div className="course-info-label">Language:</div>
            <div className="course-info-value">
              {languageName(course.language)}
            </div>
          </div>
        </div>
      </div>
    )
  }
}
