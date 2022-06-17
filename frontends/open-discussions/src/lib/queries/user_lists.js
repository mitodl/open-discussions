// @flow
/* global SETTINGS: false */
import R from "ramda"
import { createSelector } from "reselect"

import { userListApiURL, userListDetailApiURL } from "../url"
import { DEFAULT_POST_OPTIONS, constructIdMap } from "../redux_query"

import type { UserList } from "../../flow/discussionTypes"

export const userListRequest = (userListId: number) => ({
  queryKey:  `userListRequest${userListId}`,
  url:       userListDetailApiURL.param({ userListId }).toString(),
  transform: (userList: any) => ({
    userLists: { [userList.id]: userList }
  }),
  update: {
    userLists: R.merge
  }
})

export const userListsRequest = () => ({
  queryKey:  "userListsRequest",
  url:       userListApiURL.toString(),
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

export const myUserListsSelector = createSelector(
  userListsSelector,
  userLists =>
    userLists
      ? Object.values(userLists).filter(
        (userList: any) => userList.author === SETTINGS.user_id
      )
      : []
)

export const favoriteUserListMutation = (userList: UserList) => ({
  queryKey: "userListMutation",
  url:      `${userListDetailApiURL.param({ userListId: userList.id }).toString()}${
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

export const createUserListMutation = (params: Object) => ({
  queryKey:  "createUserListMutation",
  body:      params,
  url:       userListApiURL.toString(),
  transform: (newUserList: ?UserList) => {
    return newUserList
      ? {
        userLists: {
          [newUserList.id]: newUserList
        }
      }
      : {}
  },
  update: {
    userLists: R.mergeDeepRight
  },
  options: {
    method: "POST",
    ...DEFAULT_POST_OPTIONS
  }
})

export const deleteUserListMutation = (userList: UserList) => ({
  queryKey: "deleteUserListMutation",
  url:      userListDetailApiURL.param({ userListId: userList.id }).toString(),
  update:   {
    userLists: R.dissoc(userList.id)
  },
  options: {
    method: "DELETE",
    ...DEFAULT_POST_OPTIONS
  }
})

export const userListMutation = (userList: Object) => ({
  queryKey:  "userListMutation",
  body:      userList,
  url:       userListDetailApiURL.param({ userListId: userList.id }).toString(),
  transform: (userList: any) => ({
    userLists: { [userList.id]: userList }
  }),
  update: {
    userLists: R.mergeDeepRight
  },
  options: {
    method: "PATCH",
    ...DEFAULT_POST_OPTIONS
  }
})
