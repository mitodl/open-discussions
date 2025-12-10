// @flow
/* global SETTINGS: false */
import IntegrationTestHelper from "../util/integration_test_helper"
import { makeProfile } from "../factories/profiles"

describe("ProfilePage", function() {
  let helper, profile

  beforeEach(() => {
    profile = makeProfile()
    helper = new IntegrationTestHelper()
    helper.getProfileStub.returns(Promise.resolve(profile))
  })

  afterEach(() => {
    helper.cleanup()
  })

  // Tests removed - ProfilePage functionality related to user contributions/posts/comments
  // has been removed as part of removing posts/comments functionality
})
