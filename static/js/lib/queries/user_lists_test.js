import { assert } from "chai"

import { userListRequest, favoriteUserListMutation } from "./user_lists"
import { makeUserList } from "../../factories/learning_resources"
import { userListApiURL } from "../url"

describe("UserLists API", () => {
  let userList

  beforeEach(() => {
    userList = makeUserList()
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
})
