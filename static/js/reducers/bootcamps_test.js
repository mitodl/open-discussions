// @flow
import { assert } from "chai"
import sinon from "sinon"

import IntegrationTestHelper from "../util/integration_test_helper"
import { actions } from "../actions"
import { makeBootcamp } from "../factories/resources"

describe("bootcamp reducers", () => {
  let helper, response, dispatchThen

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    response = makeBootcamp()
    helper.getBootcampStub.returns(Promise.resolve(response))
    dispatchThen = helper.store.createDispatchThen(state => state.bootcamps)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should fetch bootcamp data", async () => {
    const { requestType, successType } = actions.bootcamps.get
    const { data } = await dispatchThen(actions.bootcamps.get(response.id), [
      requestType,
      successType
    ])
    sinon.assert.calledWith(helper.getBootcampStub, response.id)
    assert.equal(data.get(response.id), response)
  })
})
