// @flow
import { assert } from "chai"
import R from "ramda"

import { filterFavorites, getQuerySelector } from "./learning_resources"
import {
  makeCourse,
  makeBootcamp,
  makeLearningResource
} from "../../factories/learning_resources"
import {
  LR_TYPE_COURSE,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_ALL
} from "../constants"
import { shouldIf } from "../test_utils"

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

  LR_TYPE_ALL.forEach(resourceType => {
    [true, false].forEach(isFinished => {
      it(`getQuerySelector function ${shouldIf(
        isFinished
      )} return the correct ${resourceType}`, () => {
        const resource = makeLearningResource(resourceType)
        const queryType = [LR_TYPE_LEARNINGPATH, LR_TYPE_USERLIST].includes(
          resourceType
        )
          ? "userList"
          : resourceType
        const pluralType = `${queryType}s`
        const queryKey = `${queryType}Request${resource.id}`
        const query = {
          [queryKey]: {
            isFinished
          }
        }
        const state = {
          entities: {
            [pluralType]: {
              [resource.id]: resource
            }
          },
          queries: query
        }

        assert.equal(
          getQuerySelector(state, resource)(state),
          isFinished ? resource : null
        )
      })
    })
  })
})
