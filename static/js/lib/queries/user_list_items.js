// @flow
/* global SETTINGS: false */
import { useMemo } from "react"
import R from "ramda"
import { createSelector } from "reselect"
import arrayMove from "array-move"

import { OBJECT_TYPE_MAPPING } from "../constants"
import { userListItemsApiURL, userListItemsDetailApiURL } from "../url"
import { DEFAULT_POST_OPTIONS } from "../redux_query"
import {
  OBJECT_TYPE_ENTITY_ROUTING,
  normalizeResourcesByObjectType,
  updateLearningResources,
  learningResourceSelector
} from "./learning_resources"

import type {
  ListItem,
  ListItemMember,
  LearningResourceSummary
} from "../../flow/discussionTypes"
import type { PaginatedResponse } from "../../flow/restTypes"

export type UserListItemsResult = {
  count: number,
  items: Array<ListItem>
}

export type ResourceItem = {
  resource: LearningResourceSummary,
  item: ListItemMember
}

export const normalizeListItemsByObjectType = R.compose(
  normalizeResourcesByObjectType,
  R.map(R.prop("content_data"))
)

const userListItemsKey = (userListId: number) => `userList.${userListId}.items`

const increment = R.compose(
  R.add(1),
  R.defaultTo(0)
)
const decrement = R.compose(
  R.max(0),
  R.add(-1),
  R.defaultTo(0)
)

export const transformListItem = R.curry(
  (userListId: number, item: ListItem): ListItemMember => ({
    content_type: item.content_type,
    object_id:    item.object_id,
    item_id:      item.id,
    list_id:      userListId
  })
)

export const useUserListItemsSelector = (userListId: number) => {
  const selector = useMemo(
    () => {
      const key = userListItemsKey(userListId)
      return createSelector(
        learningResourceSelector,
        state => state.entities[`${key}.items`] || [],
        state => state.entities[`${key}.count`] || 0,
        (lrSelector, items, count) => {
          return {
            items: items
              .map((item: ListItemMember) => ({
                resource: lrSelector(item.object_id, item.content_type),
                item
              }))
              .filter(item => !R.isNil(item.resource)),
            count
          }
        }
      )
    },
    [userListId]
  )
  return selector
}

export const useUserListItemsPageSelector = (
  userListId: number,
  begin: number,
  end: number
) => {
  const itemsSelector = useUserListItemsSelector(userListId)
  return useMemo(
    () =>
      createSelector(itemsSelector, ({ items, count }) => ({
        items: items.slice(begin, end),
        count
      })),
    [itemsSelector, begin, end]
  )
}

export const userListItemsRequest = (
  userListId: number,
  offset: number,
  limit: number
) => {
  const key = userListItemsKey(userListId)
  return {
    url:       userListItemsApiURL.param({ userListId }).toString(),
    queryKey:  `${key}Request.page[${offset}:${offset + limit}]`,
    body:      { offset, limit },
    force:     true,
    transform: (body: ?PaginatedResponse<ListItem>) => {
      return body
        ? {
          ...normalizeListItemsByObjectType(body.results),
          [`${key}.items`]: body.results.map(transformListItem(userListId)),
          [`${key}.count`]: body.count
        }
        : {}
    },
    update: {
      ...updateLearningResources,
      [`${key}.items`]: (prev, next) => {
        const items = [...(prev || [])]
        items.splice(offset, limit, ...next)
        return items
      },
      [`${key}.count`]: (prev, next) => next
    }
  }
}

export const createUserListItemMutation = (
  userListId: number,
  resource: LearningResourceSummary
) => {
  const key = userListItemsKey(userListId)
  const entityKey = OBJECT_TYPE_ENTITY_ROUTING[resource.object_type]
  const contentType = OBJECT_TYPE_MAPPING[resource.object_type]

  // NOTE: we can't reasonably add a value into `${key}.items` here because:
  // a) we don't know the item id yet for optimistic updates
  // b) we don't know the position of the item relative to other items
  // c) even if we knew both of the others, we may still not be able to
  //    append to the list because we may not have loaded everything preceding
  //    the item and having a huge gap would pose design and ux issues
  //
  // However, we can modify the resource's list of lists it is appearing in
  // and in most cases that should be sufficient for the UX we want
  return {
    queryKey: "createUserListItemMutation",
    body:     {
      content_type: contentType,
      object_id:    resource.id
    },
    url:       userListItemsApiURL.param({ userListId }).toString(),
    transform: (item: ?ListItem) => ({
      [entityKey]: item ? transformListItem(userListId, item) : null
    }),
    update: {
      [entityKey]: (prev, next: ?ListItemMember) => {
        return next
          ? R.evolve({
            [resource.id]: {
              lists: R.map(
                R.ifElse(
                  R.propEq("list_id", userListId),
                  R.always(next),
                  R.identity
                )
              )
            }
          })(prev)
          : prev
      }
    },
    optimisticUpdate: {
      [entityKey]: R.evolve({
        [resource.id]: {
          // this allows the UI to show that the resource is in a list before we know that the item id is
          lists: R.append({
            list_id:      userListId,
            item_id:      null,
            object_id:    resource.id,
            content_type: contentType
          })
        }
      }),
      userLists: R.evolve({
        [userListId]: {
          item_count: increment
        }
      }),
      // we can reasonably update the count optimistically
      [`${key}.count`]: increment
    },
    options: {
      method: "POST",
      ...DEFAULT_POST_OPTIONS
    }
  }
}

export const updateUserListItemPositionMutation = (
  userListId: number,
  itemId: number,
  oldPosition: number,
  newPosition: number
) => {
  const key = userListItemsKey(userListId)
  return {
    queryKey:         "updateUserListItemPositionMutation",
    body:             { position: newPosition },
    url:              userListItemsDetailApiURL.param({ userListId, itemId }).toString(),
    // the response is paginated, so we need to just trust the local state is correct
    // as long as there aren't concurrent updates, things should be ok
    transform:        () => ({}),
    optimisticUpdate: {
      // we optimistically update to the orderings passed in
      [`${key}.items`]: prev => arrayMove(prev, oldPosition, newPosition)
    },
    options: {
      method: "PATCH",
      ...DEFAULT_POST_OPTIONS
    }
  }
}

export const deleteUserListItemMutation = (
  userListId: number,
  item: ListItemMember
) => {
  const key = userListItemsKey(userListId)
  const entityKey = OBJECT_TYPE_ENTITY_ROUTING[item.content_type]
  const evictItem = R.reject(R.propEq("item_id", item.item_id))
  return {
    queryKey: "deleteUserListItemMutation",
    url:      userListItemsDetailApiURL
      .param({ userListId, itemId: item.item_id })
      .toString(),
    optimisticUpdate: {
      [entityKey]: R.evolve({
        [item.object_id]: {
          lists: evictItem
        }
      }),
      userLists: R.evolve({
        [userListId]: {
          item_count: decrement
        }
      }),
      // evict the item, decrement the count
      [`${key}.items`]: R.compose(
        evictItem,
        value => value || []
      ),
      [`${key}.count`]: decrement
    },
    options: {
      method: "DELETE",
      ...DEFAULT_POST_OPTIONS
    }
  }
}
