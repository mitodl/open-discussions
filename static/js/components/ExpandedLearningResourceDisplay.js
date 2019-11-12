// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import striptags from "striptags"
import { AllHtmlEntities } from "html-entities"
import moment from "moment"

import TruncatedText from "./TruncatedText"
import Embedly from "./Embedly"

import {
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM,
  LR_TYPE_VIDEO,
  platforms
} from "../lib/constants"
import {
  bestRun,
  minPrice,
  getStartDate,
  getInstructorName,
  getPreferredOfferedBy,
  isCoursewareResource,
  formatDurationClockTime
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
  setShowResourceDrawer: Function,
  embedly: ?Object
}

const ExpandedLearningResourceDisplay = (props: Props) => {
  const { object, runId, setShowResourceDrawer, embedly } = props

  const updateRun = (event: Object) =>
    setShowResourceDrawer({
      objectId:   object.id,
      objectType: object.object_type,
      runId:      parseInt(event.target.value)
    })

  const objectRuns = object.runs || []

  const selectedRun =
    bestRun(runId ? objectRuns.filter(run => run.id === runId) : objectRuns) ||
    objectRuns[0]

  const url = selectedRun && selectedRun.url ? selectedRun.url : object.url
  const cost = selectedRun ? minPrice(selectedRun.prices, true) : null

  const offeredBy = getPreferredOfferedBy(object.offered_by)
  const instructors =
    selectedRun && selectedRun.instructors
      ? selectedRun.instructors.map(instructor => getInstructorName(instructor))
      : []

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
              {objectRuns.length > 1 ? (
                <select value={runId} onChange={updateRun}>
                  {objectRuns.map(run => (
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
          {object.object_type === LR_TYPE_VIDEO ? (
            <Embedly embedly={embedly} />
          ) : (
            <img
              src={embedlyThumbnail(
                SETTINGS.embedlyKey,
                object.image_src || defaultResourceImageURL(),
                COURSE_IMAGE_DISPLAY_HEIGHT,
                COURSE_IMAGE_DISPLAY_WIDTH
              )}
            />
          )}
        </div>
        {isCoursewareResource(object.object_type) && url ? (
          <div className="course-links">
            <div>
              <a
                className="link-button"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {`Take ${capitalize(object.object_type)}`}
                {offeredBy && object.object_type !== LR_TYPE_BOOTCAMP
                  ? ` on ${offeredBy}`
                  : null}
              </a>
            </div>
          </div>
        ) : null}
        <div className="course-title">{object.title}</div>
        <div className="course-description">
          <TruncatedText
            text={entities.decode(striptags(object.short_description))}
            lines={5}
            estCharsPerLine={100}
            showExpansionControls
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
              {
                // $FlowFixMe: only programs will get to this code
                object.items.length
              }
            </div>
          </div>
        ) : null}
        {isCoursewareResource(object.object_type) ? (
          <div className="course-info-row">
            <i className="material-icons language">language</i>
            <div className="course-info-label">Language:</div>
            <div className="course-info-value">
              {languageName(selectedRun ? selectedRun.language : "en")}
            </div>
          </div>
        ) : null}
        {object.object_type === LR_TYPE_VIDEO ? (
          <React.Fragment>
            {// $FlowFixMe: only videos will get to this code
              object.duration ? (
                <div className="course-info-row">
                  <i className="material-icons restore">restore</i>
                  <div className="course-info-label">Duration:</div>
                  <div className="course-info-value">
                    {// $FlowFixMe: only videos will get to this code
                      formatDurationClockTime(object.duration)}
                  </div>
                </div>
              ) : null}
            {offeredBy ? (
              <div className="course-info-row">
                <i className="material-icons local_offer">local_offer</i>
                <div className="course-info-label">Offered By:</div>
                <div className="course-info-value">{offeredBy}</div>
              </div>
            ) : null}
            <div className="course-info-row">
              <i className="material-icons calendar_today">calendar_today</i>
              <div className="course-info-label">Date Posted:</div>
              <div className="course-info-value">
                {// $FlowFixMe: only videos will get to this code
                  moment(object.last_modified).format("MMM D, YYYY")}
              </div>
            </div>
          </React.Fragment>
        ) : null}
      </div>
    </div>
  )
}

export default ExpandedLearningResourceDisplay
