// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import striptags from "striptags"
import { AllHtmlEntities } from "html-entities"
import ClampLines from "react-clamp-lines"

import {
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  platforms
} from "../lib/constants"
import {
  bestRun,
  minPrice,
  getStartDate,
  getInstructorName
} from "../lib/learning_resources"
import { defaultResourceImageURL, embedlyThumbnail } from "../lib/url"
import { capitalize, emptyOrNil, languageName } from "../lib/util"

import type { Bootcamp, Course, Program } from "../flow/discussionTypes"

const COURSE_IMAGE_DISPLAY_HEIGHT = 239
const COURSE_IMAGE_DISPLAY_WIDTH = 440
const entities = new AllHtmlEntities()

type Props = {
  object: Course | Bootcamp | Program,
  runId: number,
  setShowResourceDrawer: Function
}

const ExpandedLearningResourceDisplay = (props: Props) => {
  const { object, runId, setShowResourceDrawer } = props

  const updateRun = (event: Object) =>
    setShowResourceDrawer({
      objectId:   object.id,
      objectType: object.object_type,
      runId:      parseInt(event.target.value)
    })

  const courseRuns = [LR_TYPE_BOOTCAMP, LR_TYPE_COURSE].includes(
    object.object_type
  )
    ? // $FlowFixMe: if object is bootcamp or course it will have course_runs property
    object.course_runs
    : []

  const selectedRun = courseRuns
    ? bestRun(
      runId ? courseRuns.filter(run => run.id === runId) : courseRuns
    ) || courseRuns[0]
    : null

  let url = object.url
  let cost = null
  if (selectedRun && selectedRun.url) {
    url = selectedRun.url
    cost = minPrice(selectedRun.prices)
  } else if (object.object_type === LR_TYPE_PROGRAM) {
    // $FlowFixMe: programs do have prices
    cost = minPrice(object.prices)
  }

  let instructors = []
  if (selectedRun && selectedRun.instructors) {
    instructors = selectedRun.instructors.map(instructor =>
      getInstructorName(instructor)
    )
  } else if (object.object_type === LR_TYPE_PROGRAM) {
    instructors = Array.from(
      new Set(
        R.flatten(
          // $FlowFixMe: programs have items
          object.items.map(item =>
            item.content_data.course_runs.map(courseRun =>
              courseRun.instructors.map(instructor =>
                getInstructorName(instructor)
              )
            )
          )
        )
      )
    )
  }

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
              {courseRuns.length > 1 ? (
                <select value={runId} onChange={updateRun}>
                  {courseRuns.map(run => (
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
        <div className="course-image-div">
          <img
            src={embedlyThumbnail(
              SETTINGS.embedlyKey,
              object.image_src || defaultResourceImageURL(),
              COURSE_IMAGE_DISPLAY_HEIGHT,
              COURSE_IMAGE_DISPLAY_WIDTH
            )}
          />
        </div>
        {url ? (
          <div className="course-links">
            <div>
              <a
                className="link-button"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {`Take ${capitalize(object.object_type)}`}
                {object.offered_by && object.object_type !== LR_TYPE_BOOTCAMP
                  ? ` on ${object.offered_by}`
                  : null}
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
        {!emptyOrNil(object.topics) ? (
          <React.Fragment>
            <div className="course-subheader row">Topics</div>
            <div className="course-topics">
              {object.topics.map((topic, i) => (
                <div className="grey-surround facet" key={i}>
                  {topic.name}
                </div>
              ))}
            </div>
          </React.Fragment>
        ) : null}
        <div className="course-subheader row">Info</div>
        {cost ? (
          <div className="course-info-row">
            <i className="material-icons attach_money">attach_money</i>
            <div className="course-info-label">Cost:</div>
            <div className="course-info-value">{cost}</div>
          </div>
        ) : null}
        {selectedRun && selectedRun.level ? (
          <div className="course-info-row">
            <i className="material-icons bar_chart">bar_chart</i>
            <div className="course-info-label">Level:</div>
            <div className="course-info-value">{selectedRun.level}</div>
          </div>
        ) : null}
        {!emptyOrNil(instructors) ? (
          <div className="course-info-row">
            <i className="material-icons school">school</i>
            <div className="course-info-label">Instructors:</div>
            <div className="course-info-value">{R.join(", ", instructors)}</div>
          </div>
        ) : null}
        {object.object_type === LR_TYPE_PROGRAM ? (
          <div className="course-info-row">
            <i className="material-icons menu_book">menu_book</i>
            <div className="course-info-label">Number of Courses:</div>
            <div className="course-info-value">
              {// $FlowFixMe: only programs will get to this code
                `${object.items.length} Courses in Program`}
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
