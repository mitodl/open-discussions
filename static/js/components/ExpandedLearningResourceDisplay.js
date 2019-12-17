// @flow
/* global SETTINGS: false */
import React, { useState } from "react"
import R from "ramda"
import striptags from "striptags"
import { AllHtmlEntities } from "html-entities"
import moment from "moment"

import TruncatedText from "./TruncatedText"
import Embedly from "./Embedly"

import { LearningResourceRow } from "./LearningResourceCard"
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
  formatDurationClockTime,
  userListCoverImage,
  hasCourseList,
  isUserList
} from "../lib/learning_resources"
import { defaultResourceImageURL, embedlyThumbnail } from "../lib/url"
import { capitalize, emptyOrNil, languageName } from "../lib/util"
import { SEARCH_LIST_UI, searchResultToLearningResource } from "../lib/search"

import type { LearningResourceResult } from "../flow/searchTypes"

const COURSE_IMAGE_DISPLAY_HEIGHT = 239
const COURSE_IMAGE_DISPLAY_WIDTH = 440
const entities = new AllHtmlEntities()

type Props = {
  object: any, // honestly we had like 10 FlowFixMe in this file before, I think this is just easier
  runId: number,
  setShowResourceDrawer: Function,
  embedly: ?Object,
  similarItems: Array<LearningResourceResult>
}

const getObjectImg = object =>
  isUserList(object.object_type) ? userListCoverImage(object) : object.image_src

const courseInfoRow = (iconName, label, value) => (
  <div className="course-info-row">
    <i className={`material-icons ${iconName}`}>{iconName}</i>
    <div className="course-info-label">{label}</div>
    <div className="course-info-value">{value}</div>
  </div>
)

const renderListItems = (
  title: string,
  setShow: Function,
  show: boolean,
  icon: string,
  objects: any
) => (
  <div className="expanded-learning-resource-list">
    <div className="list-header">
      {title}
      <i
        className={`material-icons float-right ${icon}`}
        onClick={() => setShow(!show)}
      >
        {icon}
      </i>
    </div>
    {show
      ? objects.map((object, i) => (
        <LearningResourceRow
          key={i}
          object={object}
          searchResultLayout={SEARCH_LIST_UI}
        />
      ))
      : null}
  </div>
)

const ExpandedLearningResourceDisplay = (props: Props) => {
  const [showSimilar, setShowSimilar] = useState(false)
  const [showCourseList, setShowCourseList] = useState(false)
  const similarIcon = showSimilar ? "remove" : "add"
  const coursesIcon = showCourseList ? "remove" : "add"
  const { object, runId, setShowResourceDrawer, embedly, similarItems } = props

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
    <React.Fragment>
      <div className="expanded-course-summary">
        <div className="summary">
          {selectedRun ? (
            <div className="course-info-row form centered">
              <i className="material-icons school">school</i>
              <div className="course-info-label">
                {// $FlowFixMe: only courses will access platform
                  object.platform === platforms.OCW
                    ? "As Taught In"
                    : "Start Date"}
                :
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
                  getObjectImg(object) || defaultResourceImageURL(),
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
          {cost ? courseInfoRow("attach_money", "Cost:", cost) : null}
          {selectedRun && selectedRun.level
            ? courseInfoRow("bar_chart", "Level:", selectedRun.level)
            : null}
          {!emptyOrNil(instructors)
            ? courseInfoRow("school", "Instructors:", R.join(", ", instructors))
            : null}
          {object.object_type === LR_TYPE_PROGRAM
            ? courseInfoRow(
              "menu_book",
              "Number of Courses:",
              object.items.length
            )
            : null}
          {isCoursewareResource(object.object_type)
            ? courseInfoRow(
              "language",
              "Language:",
              languageName(selectedRun ? selectedRun.language : "en")
            )
            : null}
          {object.object_type === LR_TYPE_VIDEO ? (
            <React.Fragment>
              {// $FlowFixMe: only videos will get to this code
                object.duration
                  ? courseInfoRow(
                    "restore",
                    "Duration:",
                    formatDurationClockTime(object.duration)
                  )
                  : null}
              {offeredBy
                ? courseInfoRow("local_offer", "Offered By:", offeredBy)
                : null}
              {courseInfoRow(
                "calendar_today",
                "Date Posted:",
                moment(object.last_modified).format("MMM D, YYYY")
              )}
            </React.Fragment>
          ) : null}
          {isUserList(object.object_type) ? (
            <React.Fragment>
              {object.author_name
                ? courseInfoRow(
                  "local_offer",
                  "Created By:",
                  object.author_name
                )
                : null}
              {courseInfoRow(
                "lock",
                "Privacy:",
                capitalize(object.privacy_level)
              )}
              {courseInfoRow(
                "view_list",
                "Items in list:",
                object.items.length
              )}
            </React.Fragment>
          ) : null}
        </div>
      </div>
      {hasCourseList(object.object_type) && !emptyOrNil(object.items)
        ? renderListItems(
          object.object_type === LR_TYPE_PROGRAM
            ? "Learning Resources in this Program"
            : "Learning Resources in this List",
          setShowCourseList,
          showCourseList,
          coursesIcon,
          object.items.map(item => item.content_data)
        )
        : null}
      {!emptyOrNil(similarItems)
        ? renderListItems(
          "Similar Learning Resources",
          setShowSimilar,
          showSimilar,
          similarIcon,
          similarItems.map(item => searchResultToLearningResource(item))
        )
        : null}
    </React.Fragment>
  )
}

export default ExpandedLearningResourceDisplay
