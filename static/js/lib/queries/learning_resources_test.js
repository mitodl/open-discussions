// @flow
import { assert } from "chai"
import R from "ramda"

import { filterFavorites, similarResourcesRequest } from "./learning_resources"
import {
  makeCourse,
  makeBootcamp,
  makeLearningResource
} from "../../factories/learning_resources"
import {
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_ALL,
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_USERLIST
} from "../constants"
import { similarResourcesURL } from "../url"

describe("learning resource queries", () => {
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

  LR_TYPE_ALL.forEach(resourceType => {
    it(`similarResourcesRequest allows fetching similar resources for a ${resourceType}`, () => {
      const resource = makeLearningResource(resourceType)
      const objectType =
        resourceType === LR_TYPE_LEARNINGPATH ? LR_TYPE_USERLIST : resourceType
      const request = similarResourcesRequest(resource)
      assert.equal(request.url, similarResourcesURL)
      assert.deepEqual(request.body, {
        id:                resource.id,
        object_type:       objectType,
        title:             resource.title,
        short_description: resource.short_description
      })
      assert.deepEqual(request.transform({ id: "foobar" }), {
        similarResources: {
          [`${objectType}_${resource.id}`]: { id: "foobar" }
        }
      })
    })
  })
})
