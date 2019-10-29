// @flow
import R from "ramda"
import { createSelector } from "reselect"

import { userListApiURL } from "../url"
import { DEFAULT_POST_OPTIONS, constructIdMap } from "../redux_query"

import type { UserList } from "../../flow/discussionTypes"

export const userListRequest = (userListId: string) => ({
  queryKey:  `userListRequest${userListId}`,
  url:       `${userListApiURL}/${userListId}/`,
  transform: (userList: any) => ({
    userLists: { [userList.id]: userList }
  }),
  update: {
    userLists: R.merge
  }
})

export const userListsRequest = () => ({
  queryKey:  "userListsRequest",
  url:       userListApiURL,
  transform: (body: ?{ results: Array<UserList> }) => ({
    userLists: body ? constructIdMap(body.results) : {}
  }),
  update: {
    userLists: R.merge
  }
})

export const userListsSelector = createSelector(
  state => state.entities.userLists,
  userLists => userLists
)

export const favoriteUserListMutation = (userList: UserList) => ({
  queryKey: "userListMutation",
  url:      `${userListApiURL}/${userList.id}/${
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
