// @flow
import sinon from "sinon"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makeWidgetListResponse } from "../factories/widgets"

describe("widgets reducer", () => {
  let helper, response

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    response = makeWidgetListResponse()
    helper.getWidgetListStub.returns(Promise.resolve(response))
    helper.patchWidgetListStub.returns(Promise.resolve(response))
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should let you fetch a widget list", async () => {
    const { requestType, successType } = actions.widgets.get
    await helper.dispatchThen(actions.widgets.get(response.id), [
      requestType,
      successType
    ])
    sinon.assert.calledWith(helper.getWidgetListStub, response.id)
  })

  it("should patch a widget list", async () => {
    const payload = { some: "arguments" }
    const { requestType, successType } = actions.widgets.patch
    await helper.dispatchThen(actions.widgets.patch(response.id, payload), [
      requestType,
      successType
    ])
    sinon.assert.calledWith(helper.patchWidgetListStub, response.id, payload)
  })
})
