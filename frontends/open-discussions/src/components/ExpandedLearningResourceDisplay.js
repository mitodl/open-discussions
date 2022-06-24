// @flow
/* global SETTINGS: false */
import React, { useState, useEffect } from "react"
import { createSelector } from "reselect"
import { useSelector } from "react-redux"
import R from "ramda"
import striptags from "striptags"
import { AllHtmlEntities } from "html-entities"
import moment from "moment"

import TruncatedText from "./TruncatedText"
import Embedly from "./Embedly"
import ShareTooltip from "./ShareTooltip"
import PodcastPlayButton from "./PodcastPlayButton"
import PaginatedPodcastEpisodes from "./PaginatedPodcastEpisodes"
import PodcastSubscribeButton from "./PodcastSubscribeButton"

import { LearningResourceRow } from "./LearningResourceCard"
import { PaginatedUserListItems } from "./UserListItems"
import {
  LR_TYPE_PROGRAM,
  LR_TYPE_VIDEO,
  LR_PRIVATE,
  LR_TYPE_PODCAST_EPISODE,
  LR_TYPE_PODCAST,
  platforms,
  platformLogos,
  readableLearningResources
} from "../lib/constants"
import {
  bestRun,
  minPrice,
  getStartDate,
  getInstructorName,
  isCoursewareResource,
  formatDurationClockTime,
  hasCourseList,
  isUserList
} from "../lib/learning_resources"
import { podcastsSelector } from "../lib/queries/podcasts"
import {
  defaultResourceImageURL,
  embedlyThumbnail,
  learningResourcePermalink
} from "../lib/url"
import { capitalize, emptyOrNil, languageName, getImageSrc } from "../lib/util"
import { SEARCH_LIST_UI } from "../lib/search"
import { useSearchResultToFavoriteLR } from "../hooks/learning_resources"

import type { LearningResourceResult } from "../flow/searchTypes"

const COURSE_IMAGE_DISPLAY_HEIGHT = 239
const COURSE_IMAGE_DISPLAY_WIDTH = 440
const entities = new AllHtmlEntities()

type Props = {
  object: any, // honestly we had like 10 FlowFixMe in this file before, I think this is just easier
  runId: number,
  setShowResourceDrawer: Function,
  embedly: ?Object,
  similarItems: Array<LearningResourceResult>,
  hideSimilarLearningResources: boolean
}

const lrInfoRow = (iconName, label, value) => (
  <div className="info-row">
    <div className="col-1">
      <i className={`material-icons ${iconName}`}>{iconName}</i>
      <div className="label">{label}</div>
    </div>
    {value ? <div className="col-2 value">{value}</div> : null}
  </div>
)

type CollapsableSectionProps = {
  title: string,
  setShow: Function,
  show: boolean,
  icon: string
}

const CollapsableSection = ({
  title,
  setShow,
  show,
  icon,
  children
}: CollapsableSectionProps & { children: any }) => (
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
    {show ? children : null}
  </div>
)

type ListItemsSectionProps = CollapsableSectionProps & {
  objects: any
}

const isPodcastObject = object =>
  object.object_type === LR_TYPE_PODCAST_EPISODE ||
  object.object_type === LR_TYPE_PODCAST

const ListItemsSection = ({ objects, ...props }: ListItemsSectionProps) => (
  <CollapsableSection {...props}>
    {objects.map((object, i) => (
      <LearningResourceRow
        key={i}
        object={object}
        searchResultLayout={SEARCH_LIST_UI}
      />
    ))}
  </CollapsableSection>
)

export default function ExpandedLearningResourceDisplay(props: Props) {
  const {
    object,
    runId,
    setShowResourceDrawer,
    embedly,
    similarItems,
    hideSimilarLearningResources
  } = props
  const [showSimilar, setShowSimilar] = useState(false)
  const [showCourseList, setShowCourseList] = useState(false)
  const [showResourceList, setShowResourceList] = useState(false)
  const [showPodcastList, setShowPodcastList] = useState(true)
  const similarIcon = showSimilar ? "remove" : "add"
  const coursesIcon = showCourseList ? "remove" : "add"
  const resourcesIcon = showResourceList ? "remove" : "add"
  const podcastIcon = showPodcastList ? "remove" : "add"

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

  useEffect(() => {
    if (
      object &&
      !isUserList(object.object_type) &&
      object.object_type !== LR_TYPE_PROGRAM
    ) {
      setShowSimilar(true)
    }
  }, [object])

  const shouldHideShareMenu =
    (isUserList(object.object_type) && object.privacy_level === LR_PRIVATE) ||
    isPodcastObject(object)

  const episodePodcastSelector = createSelector(podcastsSelector, podcasts =>
    podcasts ? podcasts[object.podcast] : null
  )
  const episodePodcast = useSelector(episodePodcastSelector)

  const searchResultToFavoriteLR = useSearchResultToFavoriteLR()

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
                  getImageSrc(object.image_src, object.platform) ||
                    defaultResourceImageURL(),
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
                  src={platformLogos[object.platform || object.offered_by]}
                />
              </div>
            </div>
          ) : null}
          {object.object_type === LR_TYPE_PODCAST_EPISODE ? (
            <div className="podcast-subtitle">{object.podcast_title}</div>
          ) : null}
          <div
            className={isPodcastObject(object) ? "podcast-main-title" : "title"}
          >
            {object.title}
          </div>
          <div className="description">
            <TruncatedText
              text={entities.decode(striptags(object.short_description))}
              lines={5}
              estCharsPerLine={100}
              showExpansionControls
            />
          </div>
          {isPodcastObject(object) ? (
            <div className="podcast-detail-row">
              {object.object_type === LR_TYPE_PODCAST_EPISODE ? (
                <PodcastPlayButton episode={object} />
              ) : null}
              <a
                tabIndex="0"
                className="link podcast-detail-link"
                href={
                  object.object_type === LR_TYPE_PODCAST
                    ? object.url ?? "#"
                    : object.episode_link ?? episodePodcast?.url ?? "#"
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                View{" "}
                {object.object_type === LR_TYPE_PODCAST ? "Podcast" : "Episode"}{" "}
                Details
              </a>
            </div>
          ) : null}
          {object.object_type === LR_TYPE_PODCAST ? (
            <div className="row">
              <PodcastSubscribeButton
                rssUrl={object.rss_url}
                appleUrl={object.apple_podcasts_url}
                googleUrl={object.google_podcasts_url}
                buttonText="Subscribe"
              />
            </div>
          ) : null}
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
          {!isPodcastObject(object) ? (
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
                  object.item_count
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
                    ? lrInfoRow(
                      "local_offer",
                      "Created By:",
                      object.author_name
                    )
                    : null}
                  {lrInfoRow(
                    "lock",
                    "Privacy:",
                    capitalize(object.privacy_level)
                  )}
                  {lrInfoRow("view_list", "Items in list:", object.item_count)}
                </React.Fragment>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {shouldHideShareMenu ? null : (
        <div className="elr-share">
          <ShareTooltip
            url={learningResourcePermalink(object)}
            objectType={readableLearningResources[object.object_type]}
            placement="topLeft"
          >
            <div className="share-contents">
              <i className="material-icons reply">reply</i>
              Share
            </div>
          </ShareTooltip>
        </div>
      )}
      {hasCourseList(object.object_type) && !emptyOrNil(object.items) ? (
        <ListItemsSection
          title="Learning Resources in this Program"
          setShow={setShowCourseList}
          show={showCourseList}
          icon={coursesIcon}
          objects={object.items.map(item => item.content_data)}
        />
      ) : null}
      {isUserList(object.object_type) ? (
        <CollapsableSection
          title="Learning Resources in this List"
          setShow={setShowResourceList}
          show={showResourceList}
          icon={resourcesIcon}
        >
          <PaginatedUserListItems userList={object} pageSize={10} />
        </CollapsableSection>
      ) : null}
      {object.object_type === LR_TYPE_PODCAST ? (
        <CollapsableSection
          title="Episodes"
          setShow={setShowPodcastList}
          show={showPodcastList}
          icon={podcastIcon}
        >
          <PaginatedPodcastEpisodes podcast={object} pageSize={10} />
        </CollapsableSection>
      ) : null}
      {!emptyOrNil(similarItems) && !hideSimilarLearningResources ? (
        <ListItemsSection
          title="Similar Learning Resources"
          setShow={setShowSimilar}
          show={showSimilar}
          icon={similarIcon}
          objects={similarItems.map(searchResultToFavoriteLR)}
        />
      ) : null}
    </React.Fragment>
  )
}
