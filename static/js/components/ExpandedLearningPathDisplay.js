// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import striptags from "striptags"
import { AllHtmlEntities } from "html-entities"
import ClampLines from "react-clamp-lines"

import {
  LR_TYPE_USERLIST
} from "../lib/constants"
import { defaultResourceImageURL, embedlyThumbnail } from "../lib/url"
import {
  capitalize,
  defaultProfileImageUrl,
  emptyOrNil
} from "../lib/util"
import type {UserList} from "../flow/discussionTypes";

const COURSE_IMAGE_DISPLAY_HEIGHT = 239
const COURSE_IMAGE_DISPLAY_WIDTH = 440
const entities = new AllHtmlEntities()

type Props = {
  object: UserList,
  objectType: string
}

const ExpandedLearningPathDisplay = (props: Props) => {
  const { object, objectType } = props

  const listItems =
    R.has("items", object) && objectType === LR_TYPE_USERLIST
      ? object.items.filter(item => item.content_data)
      : null

  return (
    <div className="expanded-course-summary">
      <div className="summary">
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
          <React.Fragment>
            <div className="course-info-row centered">
              <div>
                <img
                  src={object.profile_img || defaultProfileImageUrl}
                  alt="profile image"
                  className="profile-image medium-small"
                />
              </div>
              <div className="course-info-value">{object.profile_name}</div>
            </div>
            <div className="course-subheader row bordered">{`List of Items (${
              listItems.length
            })`}</div>
            {listItems.map((item, key) => (
              <div className="course-info-row centered bordered" key={key}>
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
          </React.Fragment>
        ) : null}
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
        <div className="course-subheader row">Privacy</div>
        <div className="course-info-value privacy">
          {capitalize(object.privacy_level)}
        </div>
      </div>
    </div>
  )
}

export default ExpandedLearningPathDisplay
