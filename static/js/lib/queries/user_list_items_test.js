import { assert } from "chai"
import R from "ramda"

import {
  userListItemsRequest,
  createUserListItemMutation,
  updateUserListItemPositionMutation,
  deleteUserListItemMutation,
  normalizeListItemsByObjectType,
  transformListItem
} from "./user_list_items"
import { OBJECT_TYPE_ENTITY_ROUTING } from "./learning_resources"
import {
  makeUserListItems,
  makeUserListItem,
  makeUserList
} from "../../factories/learning_resources"
import { userListItemsApiURL, userListItemsDetailApiURL } from "../url"
import {
  LR_TYPE_ALL,
  LR_TYPE_PODCAST,
  LR_TYPE_PODCAST_EPISODE,
  OBJECT_TYPE_MAPPING
} from "../constants"
// import { constructIdMap } from "../redux_query"

describe("UserList Items API", () => {
  let items, userList, key, userListId

  beforeEach(() => {
    userList = makeUserList()
    userList.items = makeUserListItems(5)
    userList.item_count = userList.items.length
    items = userList.items
    userListId = userList.id
    key = `userList.${userListId}.items`
  })

  describe("userlistItemsRequest", () => {
    it("allows fetching a user list's items", () => {
      const request = userListItemsRequest(userListId, 0, 5)
      assert.equal(
        request.url,
        userListItemsApiURL.param({ userListId }).toString()
      )
      assert.deepEqual(request.body, { offset: 0, limit: 5 })
    })

    it("transforms the response data", () => {
      const request = userListItemsRequest(userListId, 0, 5)
      assert.deepEqual(
        request.transform({
          count:   100,
          results: items,
          prev:    null,
          next:    null
        }),
        {
          ...normalizeListItemsByObjectType(items),
          [`${key}.count`]: 100,
          [`${key}.items`]: items.map(item => ({
            item_id:      item.id,
            list_id:      userListId,
            content_type: item.content_type,
            object_id:    item.object_id
          }))
        }
      )
    })

    it("updates the state", () => {
      const request = userListItemsRequest(userListId, 5, 5)
      const updateItems = request.update[`${key}.items`]
      const updateCount = request.update[`${key}.count`]
      assert.deepEqual(updateItems([], items), items)
      assert.deepEqual(updateItems(items, items), items.concat(items))
      assert.equal(updateCount(5, 10), 10)
    })
  })

  describe("createUserListItemMutation", () => {
    // TEMPORARY! when we add full support for podcasts and podcast episodes
    // in user lists we can change this
    LR_TYPE_ALL.filter(
      objectType =>
        objectType !== LR_TYPE_PODCAST && objectType !== LR_TYPE_PODCAST_EPISODE
    ).forEach(objectType => {
      let item, resource, request, entityKey, contentType

      beforeEach(() => {
        contentType = OBJECT_TYPE_MAPPING[objectType]
        item = makeUserListItem(objectType)
        resource = item.content_data
        request = createUserListItemMutation(userListId, resource)
        entityKey = OBJECT_TYPE_ENTITY_ROUTING[resource.object_type]
      })

      it(`allows creating a user list item with content_type=${contentType} from object of object_type=${objectType}`, () => {
        assert.equal(
          request.url,
          userListItemsApiURL.param({ userListId }).toString()
        )
        assert.deepEqual(request.body, {
          object_id:    resource.id,
          content_type: contentType
        })
        assert.equal(request.options.method, "POST")
      })

      it("transforms the response data", () => {
        assert.deepEqual(request.transform(item), {
          [entityKey]: {
            item_id:      item.id,
            list_id:      userListId,
            object_id:    resource.id,
            content_type: contentType
          }
        })
      })

      it("optimistically updates the state", () => {
        const state = {
          [entityKey]: {
            [resource.id]: resource
          },
          userLists: {
            [userListId]: userList
          },
          [`${key}.count`]: items.length
        }
        assert.deepEqual(R.evolve(request.optimisticUpdate, state), {
          [entityKey]: {
            [resource.id]: {
              ...resource,
              lists: [
                ...resource.lists,
                {
                  list_id:      userListId,
                  item_id:      null,
                  content_type: contentType,
                  object_id:    resource.id
                }
              ]
            }
          },
          userLists: {
            [userListId]: {
              ...userList,
              item_count: userList.item_count + 1
            }
          },
          [`${key}.count`]: items.length + 1
        })
      })

      it("updates the state", () => {
        const listItem = {
          list_id:      userListId,
          item_id:      item.id,
          content_type: contentType,
          object_id:    resource.id
        }
        resource = {
          ...resource,
          lists: [{ list_id: userListId }]
        }
        const prev = {
          [resource.id]: resource
        }
        assert.deepEqual(request.update[entityKey](prev, listItem), {
          ...prev,
          [resource.id]: {
            ...resource,
            lists: [listItem]
          }
        })
      })
    })
  })

  describe("updateUserListItemPositionMutation", () => {
    let orderings, request, state

    beforeEach(() => {
      orderings = [
        {
          item: {
            item_id: 0
          }
        },
        {
          item: {
            item_id: 1
          }
        }
      ]
      state = {
        [`${key}.items`]: R.reverse(orderings)
      }
      request = updateUserListItemPositionMutation(userListId, 1, 0, 1)
    })

    it("allows reordering user list items", () => {
      assert.equal(
        request.url,
        userListItemsDetailApiURL.param({ userListId, itemId: 1 }).toString()
      )
      assert.deepEqual(request.body, { position: 1 })
      assert.equal(request.options.method, "PATCH")
    })

    it("transforms the response data into an empty change", () => {
      assert.deepEqual(request.transform(), {})
    })

    it("optimistically updates the state", () => {
      assert.deepEqual(R.evolve(request.optimisticUpdate, state), {
        [`${key}.items`]: orderings
      })
    })
  })

  describe("deleteUserListItemMutation", () => {
    it("allows deleting a user list item", () => {
      const itemId = 123
      const request = deleteUserListItemMutation(userListId, {
        item_id: itemId
      })
      assert.equal(
        request.url,
        userListItemsDetailApiURL.param({ userListId, itemId }).toString()
      )
      assert.equal(request.options.method, "DELETE")
    })

    // TEMPORARY! when we add full support for podcasts and podcast episodes
    // in user lists we can change this
    LR_TYPE_ALL.filter(
      objectType =>
        objectType !== LR_TYPE_PODCAST && objectType !== LR_TYPE_PODCAST_EPISODE
    ).forEach(contentType => {
      it(`optimistically updates the state for contentType=${contentType}`, () => {
        const userList = makeUserList()
        const item = makeUserListItem(contentType)
        const ref = transformListItem(userList.id, item)
        const request = deleteUserListItemMutation(userListId, ref)
        const entityKey = OBJECT_TYPE_ENTITY_ROUTING[contentType]
        const state = {
          [entityKey]: {
            [item.object_id]: {
              ...item.content_data,
              lists: [
                {
                  list_id: userListId,
                  item_id: item.id
                }
              ]
            }
          },
          userLists: {
            [userListId]: {
              ...userList,
              item_count: 1
            }
          },
          [`${key}.items`]: [
            {
              list_id: userListId,
              item_id: item.id
            }
          ],
          [`${key}.count`]: 1
        }
        assert.deepEqual(R.evolve(request.optimisticUpdate, state), {
          [entityKey]: {
            [item.object_id]: {
              ...item.content_data,
              lists: []
            }
          },
          userLists: {
            [userListId]: {
              ...userList,
              item_count: 0
            }
          },
          [`${key}.items`]: [],
          [`${key}.count`]: 0
        })
      })
    })
  })
})
