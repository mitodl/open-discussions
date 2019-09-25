// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import striptags from "striptags"
import { AllHtmlEntities } from "html-entities"
import ClampLines from "react-clamp-lines"

import {
  platforms,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST
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
  defaultProfileImageUrl,
  emptyOrNil,
  languageName
} from "../lib/util"

const COURSE_IMAGE_DISPLAY_HEIGHT = 239
const COURSE_IMAGE_DISPLAY_WIDTH = 440
const entities = new AllHtmlEntities()

type Props = {
  object: Object,
  objectType: string,
  runId: number,
  setShowResourceDrawer: Function
}

const ExpandedLearningResourceDisplay = (props: Props) => {
  const { object, objectType, runId, setShowResourceDrawer } = props
  const isProgram = objectType === LR_TYPE_PROGRAM
  const isBootcamp = objectType === LR_TYPE_BOOTCAMP
  const isLearningPath = objectType === LR_TYPE_USERLIST

  const updateRun = (event: Object) =>
    setShowResourceDrawer({
      objectId:   object.id,
      objectType: objectType,
      runId:      parseInt(event.target.value)
    })

  const selectedRun = R.has("course_runs", object)
    ? bestRun(
      runId
        ? // $FlowFixMe: already verified it has course_runs
        object.course_runs.filter(run => run.id === runId)
        : object.course_runs
    ) || object.course_runs[0]
    : null
  const url = selectedRun && selectedRun.url ? selectedRun.url : object.url
  const listItems =
    R.has("items", object) && objectType === LR_TYPE_USERLIST
      ? object.items.filter(item => item.content_data)
      : null

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
        {listItems ? (
          <div>
            <div className="course-info-row">
              <div>
                <img
                  src={object.profile_img || defaultProfileImageUrl}
                  alt="profile image"
                  className="profile-image medium"
                />
              </div>
              <div className="course-info-value">{object.profile_name}</div>
            </div>
            <div className="course-subheader row">{`List of Items (${
              listItems.length
            })`}</div>
            {listItems.map((item, key) => (
              <div className="course-info-row" key={key}>
                <div>{key + 1}.</div>
                <div>
                  <img
                    alt="item thumbnail"
                    src={embedlyThumbnail(
                      SETTINGS.embedlyKey,
                      item.content_data.image_src,
                      50,
                      50
                    )}
                  />
                </div>
                <div>{item.content_data.title}</div>
              </div>
            ))}
          </div>
        ) : null}
        {!emptyOrNil(object.topics) ? (
          <div>
            <div className="course-subheader row">Topics</div>
            <div className="course-topics">
              {object.topics.map((topic, i) => (
                <div className="grey-surround facet" key={i}>
                  {topic.name}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {!isLearningPath ? (
          <div>
            <div className="course-subheader row">Info</div>
            <div className="course-info-row">
              <i className="material-icons attach_money">attach_money</i>
              <div className="course-info-label">Cost:</div>
              <div className="course-info-value">
                {minPrice(isProgram ? object : selectedRun)}
              </div>
            </div>
          </div>
        ) : null}
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
        {isProgram ? (
          <div className="course-info-row">
            <i className="material-icons menu_book">menu_book</i>
            <div className="course-info-label">Number of Courses:</div>
            <div className="course-info-value">
              {`${object.items.length} Courses in Program`}
            </div>
          </div>
        ) : null}
        {isLearningPath ? null : (
          <div className="course-info-row">
            <i className="material-icons language">language</i>
            <div className="course-info-label">Language:</div>
            <div className="course-info-value">
              {languageName(selectedRun ? selectedRun.language : "en")}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpandedLearningResourceDisplay
