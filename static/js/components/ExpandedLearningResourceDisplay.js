// @flow
/* global SETTINGS: false */
import React from "react"
import _ from "lodash"
import striptags from "striptags"
import { AllHtmlEntities } from "html-entities"
import ClampLines from "react-clamp-lines"

import { platforms, LR_TYPE_COURSE } from "../lib/constants"
import { bestRun, minPrice, getStartDate } from "../lib/learning_resources"
import { embedlyThumbnail } from "../lib/url"
import { languageName } from "../lib/util"

import type { Bootcamp, Course } from "../flow/discussionTypes"

const COURSE_IMAGE_DISPLAY_HEIGHT = 239
const COURSE_IMAGE_DISPLAY_WIDTH = 440
const entities = new AllHtmlEntities()

type Props = {
  object: Course | Bootcamp,
  objectType: string,
  runId: number,
  setShowResourceDrawer: Function
}

const ExpandedLearningResourceDisplay = (props: Props) => {
  const { object, objectType, runId, setShowResourceDrawer } = props
  const isCourse = objectType === LR_TYPE_COURSE

  const updateRun = (event: Object) =>
    setShowResourceDrawer({
      objectId:   object.id,
      objectType: objectType,
      runId:      parseInt(event.target.value)
    })

  const selectedRun =
    bestRun(
      runId
        ? object.course_runs.filter(run => run.id === runId)
        : object.course_runs
    ) || object.course_runs[0]
  const url = selectedRun && selectedRun.url ? selectedRun.url : object.url

  return (
    <div className="expanded-course-summary">
      <div className="summary">
        {selectedRun ? (
          <div className="course-info-row form centered">
            <i className="material-icons school">school</i>
            <div className="course-info-label">
              {// $FlowFixMe: only courses will access platform
                object.platform === platforms.OCW
                  ? "As Taught In"
                  : "Start Date"}:
            </div>
            <div className="select-semester-div">
              {object.course_runs.length > 1 ? (
                <select value={runId} onChange={updateRun}>
                  {object.course_runs.map(run => (
                    <option value={run.id} key={run.id}>
                      {getStartDate(object, run)}
                    </option>
                  ))}
                </select>
              ) : (
                <div>{getStartDate(object, selectedRun)}</div>
              )}
            </div>
          </div>
        ) : null}
        {object.image_src ? (
          <div className="course-image-div">
            <img
              src={embedlyThumbnail(
                SETTINGS.embedlyKey,
                object.image_src,
                COURSE_IMAGE_DISPLAY_HEIGHT,
                COURSE_IMAGE_DISPLAY_WIDTH
              )}
            />
          </div>
        ) : null}
        {url ? (
          <div className="course-links">
            <div>
              <a
                className="link-button"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {isCourse
                  ? // $FlowFixMe: only courses will end up here
                  `Take Course on ${object.platform.toUpperCase()}`
                  : "Take Bootcamp"}
              </a>
            </div>
          </div>
        ) : null}
        <div className="course-title">{object.title}</div>
        <div className="course-description">
          <ClampLines
            text={entities.decode(striptags(object.short_description))}
            lines={5}
            ellipsis="..."
            moreText="Read more"
            lessText="Read less"
          />
        </div>
        <div className="course-subheader row">Topics</div>
        <div className="course-topics">
          {object.topics.map((topic, i) => (
            <div className="grey-surround facet" key={i}>
              {topic.name}
            </div>
          ))}
        </div>
        <div className="course-subheader row">Info</div>
        <div className="course-info-row">
          <i className="material-icons attach_money">attach_money</i>
          <div className="course-info-label">Cost:</div>
          <div className="course-info-value">{minPrice(selectedRun)}</div>
        </div>
        {isCourse && selectedRun ? (
          <div className="course-info-row">
            <i className="material-icons bar_chart">bar_chart</i>
            <div className="course-info-label">Level:</div>
            <div className="course-info-value">
              {// $FlowFixMe: only courses will access level
                selectedRun.level || "Unspecified"}
            </div>
          </div>
        ) : null}
        {selectedRun ? (
          <div className="course-info-row">
            <i className="material-icons school">school</i>
            <div className="course-info-label">Instructors:</div>
            <div className="course-info-value">
              {_.join(
                selectedRun.instructors.map(
                  instructor =>
                    `Prof. ${instructor.first_name} ${instructor.last_name}`
                ),
                ", "
              )}
            </div>
          </div>
        ) : null}
        <div className="course-info-row">
          <i className="material-icons language">language</i>
          <div className="course-info-label">Language:</div>
          <div className="course-info-value">
            {languageName(selectedRun ? selectedRun.language : "en")}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExpandedLearningResourceDisplay
