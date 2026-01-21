import { assert } from "chai"

import { LearningResourceCard } from "./LearningResourceCard"
import SearchResult from "./SearchResult"

import {
  makeProfileResult,
  makeLearningResourceResult
} from "../factories/search"
import {
  searchResultToLearningResource,
  searchResultToProfile
} from "../lib/search"
import { PROFILE_IMAGE_SMALL } from "./ProfileImage"
import { profileURL } from "../lib/url"
import { LR_TYPE_COURSE, LR_TYPE_PROGRAM } from "../lib/constants"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("SearchResult", () => {
  let helper, render

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    render = helper.configureReduxQueryRenderer(SearchResult)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("renders a profile card", async () => {
    const result = makeProfileResult()
    const { wrapper } = await render({ result })
    const profile = searchResultToProfile(result)
    const profileImage = wrapper.find("Connect(ProfileImage)")
    assert.deepEqual(profileImage.prop("profile"), profile)
    assert.equal(profileImage.prop("imageSize"), PROFILE_IMAGE_SMALL)
    assert.equal(
      wrapper.find(".name").at(0).prop("to"),
      profileURL(profile.username)
    )
    assert.equal(wrapper.find(".name").at(0).children().text(), profile.name)
    assert.equal(wrapper.find(".headline").children().text(), profile.headline)
  })

  //
  ;[LR_TYPE_COURSE, LR_TYPE_PROGRAM].forEach(objectType => {
    it(`renders a ${objectType}`, async () => {
      const result = makeLearningResourceResult(objectType)
      const object = searchResultToLearningResource(result)
      const { wrapper } = await render({ result })
      const resourceDisplay = wrapper.find(LearningResourceCard)
      assert.deepEqual(resourceDisplay.prop("object"), object)
    })
  })
})
