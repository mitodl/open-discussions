// @flow
import React from "react"
import { assert } from "chai"
import R from "ramda"
import { shallow } from "enzyme"
import sinon from "sinon"

import UserListCard from "./UserListCard"

import { makeUserList, makeUserListItem } from "../factories/learning_resources"
import { LR_TYPE_COURSE, readableLearningResources } from "../lib/constants"
import * as urlLib from "../lib/url"

describe("UserListCard tests", () => {
  const renderUserListCard = (props = {}) =>
    shallow(<UserListCard userList={userList} {...props} />)

  let userList, sandbox

  beforeEach(() => {
    userList = makeUserList()
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should print the list type (learning path || list)", () => {
    assert.equal(
      renderUserListCard()
        .find(".platform")
        .text(),
      readableLearningResources[userList.object_type]
    )
  })

  it("should put the title", () => {
    assert.equal(
      renderUserListCard()
        .find(".ul-title")
        .text(),
      userList.title
    )
  })

  //
  ;[[0, "Items"], [1, "Item"], [2, "Items"], [10, "Items"]].forEach(
    ([itemCount, expectedText]) => {
      it(`should have a properly-formatted count of ${String(
        itemCount
      )} items`, () => {
        userList.items = R.times(
          () => makeUserListItem(LR_TYPE_COURSE),
          itemCount
        )
        const text = renderUserListCard()
          .find(".count")
          .text()
        assert.include(text, expectedText)
      })
    }
  )

  it("should render the image of the first list item", () => {
    sandbox.stub(urlLib, "embedlyThumbnail").returns("南瓜")
    const { src } = renderUserListCard()
      .find("img")
      .props()
    assert.equal(src, "南瓜")
  })
})
