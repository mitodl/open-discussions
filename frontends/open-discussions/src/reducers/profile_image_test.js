// @flow
import sinon from "sinon"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("profile image reducer", () => {
  let helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.patchProfileImageStub.returns(Promise.resolve())
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should let you patch a photo", async () => {
    const blob = "blob"
    const name = "name"
    const username = "username"
    const { requestType, successType } = actions.profileImage.patch

    await helper.dispatchThen(
      actions.profileImage.patch(username, blob, name),
      [requestType, successType]
    )
    sinon.assert.calledWith(helper.patchProfileImageStub, username, blob, name)
  })
})
