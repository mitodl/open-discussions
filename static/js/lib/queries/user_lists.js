// @flow
import R from "ramda"

import { userListURL } from "../url"
import { DEFAULT_POST_OPTIONS } from "../redux_query"

import type { UserList } from "../../flow/discussionTypes"

export const userListRequest = (userListId: string) => ({
  queryKey:  `userListRequest${userListId}`,
  url:       `${userListURL}/${userListId}/`,
  transform: (userList: any) => ({
    userLists: { [userList.id]: userList }
  }),
  update: {
    userLists: R.merge
  }
})

export const favoriteUserListMutation = (userList: UserList) => ({
  queryKey: "userListMutation",
  body:     userList,
  url:      `${userListURL}/${userList.id}/${
    userList.is_favorite ? "unfavorite" : "favorite"
  }/`,
  transform: () => {
    const updateduserList = {
      ...userList,
      is_favorite: !userList.is_favorite
    }

    return {
      userLists: {
        [updateduserList.id]: updateduserList
      }
    }
  },
  update: {
    userLists: R.mergeDeepRight
  },
  options: {
    method: "POST",
    ...DEFAULT_POST_OPTIONS
  }
})
