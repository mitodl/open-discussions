// @flow
import { assert } from "chai"
import R from "ramda"

import {
  filterFavorites,
  getResourceSelectorAndRequest
} from "./learning_resources"
import {
  makeCourse,
  makeBootcamp,
  makeLearningResource
} from "../../factories/learning_resources"
import {
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_VIDEO,
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_PROGRAM
} from "../constants"
import { courseRequest, courseSelector } from "./courses"
import { bootcampRequest, bootcampSelector } from "./bootcamps"
import { programRequest, programSelector } from "./programs"
import { videoRequest, videoSelector } from "./videos"
import { userListRequest, userListSelector } from "./user_lists"

describe("learning resource favorite queries", () => {
  let favorites

  beforeEach(() => {
    favorites = [...R.times(makeCourse, 5), ...R.times(makeBootcamp, 5)]
  })

  //
  ;[LR_TYPE_COURSE, LR_TYPE_BOOTCAMP].forEach(resourceType => {
    it("filterFavorites should separate by content type", () => {
      const filtered = filterFavorites(favorites, resourceType)
      filtered.forEach(object => {
        assert.equal(resourceType, object.content_type)
      })
    })
  })

  it("should filter out null content_data objects", () => {
    favorites[3].content_data = null
    assert.notInclude(
      filterFavorites(favorites, LR_TYPE_COURSE).map(item => item.id),
      favorites[3].id
    )
  })

  //
  ;[
    [LR_TYPE_BOOTCAMP, bootcampSelector, bootcampRequest],
    [LR_TYPE_COURSE, courseSelector, courseRequest],
    [LR_TYPE_PROGRAM, programSelector, programRequest],
    [LR_TYPE_VIDEO, videoSelector, videoRequest],
    [LR_TYPE_USERLIST, userListSelector, userListRequest],
    [LR_TYPE_LEARNINGPATH, userListSelector, userListRequest]
  ].forEach(([objectType, objectSelector, objectRequest]) => {
    it(`getResourceSelectorAndRequest returns correct selector and request for  ${objectType}`, () => {
      const resource = makeLearningResource(objectType)
      assert.deepEqual(getResourceSelectorAndRequest(resource), [
        objectSelector,
        objectRequest
      ])
    })
  })
})
