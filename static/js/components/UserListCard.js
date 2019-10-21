// @flow
/* global SETTINGS:false */
import React from "react"
import R from "ramda"

import Card from "./Card"

import { defaultResourceImageURL, embedlyThumbnail } from "../lib/url"
import {
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  readableLearningResources
} from "../lib/constants"

import type { UserList } from "../flow/discussionTypes"

const readableLength = (length: number) =>
  length === 1 ? "1 Item" : `${String(length)} Items`

const userListCoverImage = R.pathOr(null, [
  "items",
  0,
  "content_data",
  "image_src"
])

type Props = {
  userList: UserList
}

export default function UserListCard(props: Props) {
  const { userList } = props

  return (
    <Card className="user-list-card">
      <div className="userlist-info">
        <div className="platform">
          {readableLearningResources[userList.object_type]}
        </div>
        <div className="ul-title">{userList.title}</div>
        <div className="actions-and-count">
          <div className="actions" />
          <div className="count">{readableLength(userList.items.length)}</div>
        </div>
      </div>
      {userList.items.length > 0 ? (
        <img
          src={embedlyThumbnail(
            SETTINGS.embedlyKey,
            userListCoverImage(userList) || defaultResourceImageURL(),
            CAROUSEL_IMG_HEIGHT,
            CAROUSEL_IMG_WIDTH
          )}
          height={CAROUSEL_IMG_HEIGHT}
          alt={`cover image for ${userList.title}`}
          className="cover-img"
        />
      ) : null}
    </Card>
  )
}
