import { assert } from "chai"
import { mergeAll, times } from "ramda"

import {
  userListRequest,
  favoriteUserListMutation,
  createUserListMutation,
  deleteUserListMutation,
  userListMutation,
  userListsSelector,
  myUserListsMapSelector
} from "./user_lists"
import { makeUserList } from "../../factories/learning_resources"
import { userListApiURL } from "../url"
import { LR_TYPE_USERLIST, LR_PUBLIC } from "../constants"
import {constructIdMap, DEFAULT_POST_OPTIONS} from "../redux_query"

describe("UserLists API", () => {
  let userList, results, testState, author

  beforeEach(() => {
    results = times(makeUserList, 5)
    author = results[0].author
    userList = results[0]
    testState = {
      entities: {
        userLists: mergeAll(constructIdMap(results))
      }
    }
  })

  it("userList request allows fetching a userList", () => {
    const request = userListRequest("fake-id")
    assert.equal(request.url, `${userListApiURL}/fake-id/`)
    assert.deepEqual(request.transform({ id: "foobar" }), {
      userLists: {
        foobar: { id: "foobar" }
      }
    })
  })

  //
  ;[true, false].forEach(isFavorite => {
    it(`userListFavoriteMutation does the right stuff if ${
      isFavorite ? "is" : "is not"
    } favorite`, () => {
      userList.is_favorite = isFavorite
      const mutation = favoriteUserListMutation(userList)
      assert.equal(
        mutation.url,
        `${userListApiURL}/${userList.id}/${
          isFavorite ? "unfavorite" : "favorite"
        }/`
      )
      assert.deepEqual(mutation.transform(), {
        userLists: {
          [userList.id]: {
            ...userList,
            is_favorite: !isFavorite
          }
        }
      })
    })
  })

  it("createUserListMutation should return a good query", () => {
    const params = {
      title:             "My TITLE!",
      short_description: "Well and truly described",
      list_type:         LR_TYPE_USERLIST,
      privacy:           LR_PUBLIC
    }
    const query = createUserListMutation(params)
    assert.deepEqual(query.body, params)
    assert.equal(query.queryKey, "createUserListMutation")
    assert.equal(query.url, `${userListApiURL}/`)
    assert.deepEqual(query.options, {
      method: "POST",
      ...DEFAULT_POST_OPTIONS
    })
    assert.deepEqual(query.transform(), {})
    assert.deepEqual(query.transform(userList), {
      userLists: {
        [userList.id]: userList
      }
    })
  })

  it("deleteUserListMutation should return what we expect", () => {
    const query = deleteUserListMutation(userList)
    assert.isUndefined(query.body)
    assert.equal(query.queryKey, "deleteUserListMutation")
    assert.equal(query.url, `${userListApiURL}/${userList.id}/`)
    assert.deepEqual(query.options, {
      method: "DELETE",
      ...DEFAULT_POST_OPTIONS
    })
    assert.deepEqual(
      query.update.userLists({
        [userList.id]: userList
      }),
      {}
    )
  })

  it("userListMutation should return a correct query", () => {
    const userList = makeUserList()
    const query = userListMutation(userList)
    assert.deepEqual(query.body, userList)
    assert.equal(query.queryKey, "userListMutation")
    assert.equal(query.url, `${userListApiURL}/${userList.id}/`)
    assert.deepEqual(query.options, {
      method: "PATCH",
      ...DEFAULT_POST_OPTIONS
    })
    assert.deepEqual(query.transform(userList), {
      userLists: {
        [userList.id]: userList
      }
    })
  })

  it("userListsSelector should grab the right stuff", () => {
    assert.deepEqual(userListsSelector(testState), testState.entities.userLists)
  })

  it("myUserListsMapSelector should grab the right stuff", () => {
    assert.deepEqual(
      myUserListsMapSelector(testState),
      Object.keys(results)
        .map(key => results[key])
        .filter(result => result.author === author)
    )
  })
})
