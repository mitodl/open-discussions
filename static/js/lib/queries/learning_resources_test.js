// @flow
import { assert } from "chai"
import R from "ramda"

import { filterFavorites } from "./learning_resources"
import { makeCourse, makeBootcamp } from "../../factories/learning_resources"
import { LR_TYPE_COURSE, LR_TYPE_BOOTCAMP } from "../constants"

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
})
