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
  platforms,
  platformLogos
} from "../lib/constants"
import {
  bestRun,
  minPrice,
  getStartDate,
  getInstructorName,
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

const lrInfoRow = (iconName, label, value) => (
  <div className="info-row">
    <div className="col-1">
      <i className={`material-icons ${iconName}`}>{iconName}</i>
      <div className="label">{label}</div>
    </div>
    {value ? <div className="col-2 value">{value}</div> : null}
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

export default function ExpandedLearningResourceDisplay(props: Props) {
  const { object, runId, setShowResourceDrawer, embedly, similarItems } = props

  const [showSimilar, setShowSimilar] = useState(false)
  const [showCourseList, setShowCourseList] = useState(false)
  const similarIcon = showSimilar ? "remove" : "add"
  const coursesIcon = showCourseList ? "remove" : "add"

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

  const offeredBy = object.offered_by.join(", ")
  const instructors =
    selectedRun && selectedRun.instructors
      ? selectedRun.instructors.map(instructor => getInstructorName(instructor))
      : []

  return (
    <React.Fragment>
      <div className="expanded-lr-summary">
        <div className="summary">
          {selectedRun ? (
            <div className="info-row form centered">
              <div className="col-1">
                <i className="material-icons school">school</i>
                <div className="info-label">
                  {// $FlowFixMe: only courses will access platform
                    object.platform === platforms.OCW
                      ? "As Taught In"
                      : "Start Date"}
                  :
                </div>
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
          <div className="image-div">
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
            <div className="external-links">
              <a
                className="link-button blue-btn"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {`Take ${capitalize(object.object_type)}`}
              </a>
              <div className="platform-logo">
                <span>on</span>
                <img
                  src={
                    platformLogos[
                      object.object_type === LR_TYPE_BOOTCAMP
                        ? platforms.bootcamps
                        : object.platform || object.offered_by
                    ]
                  }
                />
              </div>
            </div>
          ) : null}
          <div className="title">{object.title}</div>
          <div className="description">
            <TruncatedText
              text={entities.decode(striptags(object.short_description))}
              lines={5}
              estCharsPerLine={100}
              showExpansionControls
            />
          </div>
          {!emptyOrNil(object.topics) ? (
            <div className="topics">
              <div className="section-label">Subjects</div>
              <div className="topics-list">
                {object.topics.map((topic, i) => (
                  <div className="grey-surround facet" key={i}>
                    {topic.name}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="lr-metadata">
            <div className="section-label">Info</div>
            {cost ? lrInfoRow("attach_money", "Cost:", cost) : null}
            {selectedRun && selectedRun.level
              ? lrInfoRow("bar_chart", "Level:", selectedRun.level)
              : null}
            {!emptyOrNil(instructors)
              ? lrInfoRow("school", "Instructors:", R.join(", ", instructors))
              : null}
            {object.object_type === LR_TYPE_PROGRAM
              ? lrInfoRow(
                "menu_book",
                "Number of Courses:",
                object.items.length
              )
              : null}
            {isCoursewareResource(object.object_type)
              ? lrInfoRow(
                "language",
                "Language:",
                languageName(selectedRun ? selectedRun.language : "en")
              )
              : null}
            {object.object_type === LR_TYPE_VIDEO ? (
              <React.Fragment>
                {// $FlowFixMe: only videos will get to this code
                  object.duration
                    ? lrInfoRow(
                      "restore",
                      "Duration:",
                      formatDurationClockTime(object.duration)
                    )
                    : null}
                {offeredBy
                  ? lrInfoRow("local_offer", "Offered By:", offeredBy)
                  : null}
                {lrInfoRow(
                  "calendar_today",
                  "Date Posted:",
                  moment(object.last_modified).format("MMM D, YYYY")
                )}
              </React.Fragment>
            ) : null}
            {isUserList(object.object_type) ? (
              <React.Fragment>
                {object.author_name
                  ? lrInfoRow("local_offer", "Created By:", object.author_name)
                  : null}
                {lrInfoRow(
                  "lock",
                  "Privacy:",
                  capitalize(object.privacy_level)
                )}
                {lrInfoRow("view_list", "Items in list:", object.items.length)}
              </React.Fragment>
            ) : null}
          </div>
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
