// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import striptags from "striptags"
import { AllHtmlEntities } from "html-entities"
import ClampLines from "react-clamp-lines"

import {
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM
} from "../lib/constants"
import {
  bestRun,
  minPrice,
  getStartDate,
  getInstructorName
} from "../lib/learning_resources"
import { defaultResourceImageURL, embedlyThumbnail } from "../lib/url"
import {
  capitalize,
  emptyOrNil,
  languageName
} from "../lib/util"

import type {Bootcamp, Course, Program} from "../flow/discussionTypes"

const COURSE_IMAGE_DISPLAY_HEIGHT = 239
const COURSE_IMAGE_DISPLAY_WIDTH = 440
const entities = new AllHtmlEntities()

type Props = {
  object: Course | Bootcamp | Program,
  objectType: string,
  runId: number,
  setShowResourceDrawer: Function
}

const ExpandedLearningResourceDisplay = (props: Props) => {
  const { object, objectType, runId, setShowResourceDrawer } = props
  const isProgram = objectType === LR_TYPE_PROGRAM
  const isBootcamp = objectType === LR_TYPE_BOOTCAMP

  const updateRun = (event: Object) =>
    setShowResourceDrawer({
      objectId:   object.id,
      objectType: objectType,
      runId:      parseInt(event.target.value)
    })

  // $FlowFixMe: courseRuns will be set to [] if a program
  const courseRuns = object.course_runs || []
  const selectedRun = courseRuns
    ? bestRun(
      runId
        ? courseRuns.filter(run => run.id === runId)
        : courseRuns
    ) || courseRuns[0]
    : null

  // $FLowFixMe: url will be set to null if object.url is undefined
  const url = selectedRun && selectedRun.url ? selectedRun.url : object.url || null

  return (
    <div className="expanded-course-summary">
      <div className="summary">
        {selectedRun ? (
          <div className="course-info-row form centered">
            <i className="material-icons school">school</i>
            <div className="course-info-label">
              {object.offered_by === "OCW"
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
                {isBootcamp
                  ? "Take Bootcamp"
                  : `Take ${capitalize(objectType)} on ${object.offered_by}`}
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
        <div className="course-info-row">
          <i className="material-icons attach_money">attach_money</i>
          <div className="course-info-label">Cost:</div>
          <div className="course-info-value">
            {minPrice(isProgram ? object : selectedRun)}
          </div>
        </div>
        {selectedRun && selectedRun.level ? (
          <div className="course-info-row">
            <i className="material-icons bar_chart">bar_chart</i>
            <div className="course-info-label">Level:</div>
            <div className="course-info-value">{selectedRun.level}</div>
          </div>
        ) : null}
        {selectedRun && selectedRun.instructors ? (
          <div className="course-info-row">
            <i className="material-icons school">school</i>
            <div className="course-info-label">Instructors:</div>
            <div className="course-info-value">
              {R.join(", ", selectedRun.instructors.map(getInstructorName))}
            </div>
          </div>
        ) : null}
        {isProgram && object.items ? (
          <div className="course-info-row">
            <i className="material-icons menu_book">menu_book</i>
            <div className="course-info-label">Number of Courses:</div>
            <div className="course-info-value">
              {`${object.items.length} Courses in Program`}
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
