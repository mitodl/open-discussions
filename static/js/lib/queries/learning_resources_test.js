// @flow
import { assert } from "chai"
import R from "ramda"

import {
  filterFavorites,
  similarResourcesRequest,
  learningResourceSelector,
  normalizeResourcesByObjectType,
  mapResourcesToResourceRefs,
  filterObjectType
} from "./learning_resources"
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
  LR_TYPE_USERLIST,
  LR_TYPE_VIDEO,
  LR_TYPE_PROGRAM
} from "../constants"
import { similarResourcesURL } from "../url"

describe("learning resource queries", () => {
  let favorites

  beforeEach(() => {
    favorites = [...R.times(makeCourse, 5), ...R.times(makeBootcamp, 5)]
  })

  it("mapResourcesToResourceRefs should map learning resources to a ref object", () => {
    assert.deepEqual(
      mapResourcesToResourceRefs([
        {
          id:          1,
          object_type: "course"
        },
        {
          id:          2,
          object_type: "video"
        }
      ]),
      [
        {
          object_id:    1,
          content_type: "course"
        },
        {
          object_id:    2,
          content_type: "video"
        }
      ]
    )
  })

  it("filterObjectType returns only objects of the specified object_type", () => {
    assert.deepEqual(
      filterObjectType([{ object_type: "abc" }, { object_type: "def" }], "abc"),
      [{ object_type: "abc" }]
    )
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

  it("learningResourceSelector should return objects correctly", () => {
    // this is a regression to ensure we're correctly figuring out when to hit
    // the cache and when to skip it
    const state = {
      entities: {
        courses: {
          // $FlowFixMe
          4: { id: 4, message: "im a course" }
        },
        videos: {
          // $FlowFixMe
          4: { id: 4, message: "🙃 🙃 🙃" }
        }
      }
    }
    const getter = learningResourceSelector(state)
    assert.notDeepEqual(getter(4, LR_TYPE_COURSE), getter(4, LR_TYPE_VIDEO))
  })

  it("normalizeResourcesByObjectType normalizes objects into the correct key", () => {
    const course = makeLearningResource(LR_TYPE_COURSE)
    const video = makeLearningResource(LR_TYPE_VIDEO)
    const bootcamp = makeLearningResource(LR_TYPE_BOOTCAMP)
    const userList = makeLearningResource(LR_TYPE_USERLIST)
    const program = makeLearningResource(LR_TYPE_PROGRAM)
    const resources = [course, video, bootcamp, userList, program]
    const normalized = normalizeResourcesByObjectType(resources)

    assert.deepEqual(normalized, {
      courses: {
        [course.id]: course
      },
      videos: {
        [video.id]: video
      },
      bootcamps: {
        [bootcamp.id]: bootcamp
      },
      userLists: {
        [userList.id]: userList
      },
      programs: {
        [program.id]: program
      }
    })
  })
})
