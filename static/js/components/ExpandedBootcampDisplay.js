// @flow
/* global SETTINGS: false */
import React from "react"
import _ from "lodash"
import moment from "moment"
import striptags from "striptags"
import { AllHtmlEntities } from "html-entities"
import ClampLines from "react-clamp-lines"

import { minPrice } from "../lib/courses"
import { embedlyThumbnail } from "../lib/url"
import { languageName } from "../lib/util"

import type { Bootcamp } from "../flow/discussionTypes"

const BOOTCAMP_IMAGE_DISPLAY_HEIGHT = 239
const BOOTCAMP_IMAGE_DISPLAY_WIDTH = 440
const entities = new AllHtmlEntities()

type Props = {
  bootcamp: Bootcamp
}

export default class ExpandedBootcampDisplay extends React.Component<Props> {
  render() {
    const { bootcamp } = this.props

    return (
      <div className="expanded-course-summary">
        <div className="summary">
          {bootcamp.image_src ? (
            <div className="course-image-div">
              <img
                src={embedlyThumbnail(
                  SETTINGS.embedlyKey,
                  bootcamp.image_src,
                  BOOTCAMP_IMAGE_DISPLAY_HEIGHT,
                  BOOTCAMP_IMAGE_DISPLAY_WIDTH
                )}
              />
            </div>
          ) : null}
          {bootcamp.url ? (
            <div className="course-links">
              <div>
                <a
                  className="link-button"
                  href={bootcamp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Take Bootcamp
                </a>
              </div>
            </div>
          ) : null}
          <div className="course-title">{bootcamp.title}</div>
          <div className="course-description">
            <ClampLines
              text={entities.decode(striptags(bootcamp.short_description))}
              lines={5}
              ellipsis="..."
              moreText="Read more"
              lessText="Read less"
            />
          </div>
          <div className="course-subheader row">Topics</div>
          <div className="course-topics">
            {bootcamp.topics.map((topic, i) => (
              <div className="grey-surround facet" key={i}>
                {topic.name}
              </div>
            ))}
          </div>
          <div className="course-subheader row">Info</div>
          <div className="course-info-row">
            <i className="material-icons history">history</i>
            <div className="course-info-label">As taught in:</div>
            <div className="course-info-value">{bootcamp.year}</div>
          </div>
          <div className="course-info-row">
            <i className="material-icons calendar_today">calendar_today</i>
            <div className="course-info-label">Start date:</div>
            <div className="course-info-value">
              {moment(bootcamp.start_date).format("DD MMMM YYYY")}
            </div>
          </div>
          <div className="course-info-row">
            <i className="material-icons attach_money">attach_money</i>
            <div className="course-info-label">Cost:</div>
            <div className="course-info-value">{minPrice(bootcamp)}</div>
          </div>
          <div className="course-info-row">
            <i className="material-icons school">school</i>
            <div className="course-info-label">Instructors:</div>
            <div className="course-info-value">
              {_.join(
                bootcamp.instructors.map(
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
              {languageName(bootcamp.language)}
            </div>
          </div>
        </div>
      </div>
    )
  }
}
