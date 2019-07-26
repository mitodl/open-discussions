// @flow
import { assert } from "chai"
import sinon from "sinon"

import IntegrationTestHelper from "../util/integration_test_helper"
import { actions } from "../actions"
import { makeCourse } from "../factories/learning_resources"

describe("course reducers", () => {
  let helper, response, dispatchThen

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    response = makeCourse()
    helper.getCourseStub.returns(Promise.resolve(response))
    dispatchThen = helper.store.createDispatchThen(state => state.courses)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should fetch course data", async () => {
    const { requestType, successType } = actions.courses.get
    const { data } = await dispatchThen(actions.courses.get(response.id), [
      requestType,
      successType
    ])
    sinon.assert.calledWith(helper.getCourseStub, response.id)
    assert.equal(data.get(response.id), response)
  })
})
