// @flow
import { assert } from "chai"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makeWidgetListResponse } from "../factories/widgets"

describe("widgets reducer", () => {
  let helper, response

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    response = makeWidgetListResponse()
    helper.getWidgetListStub.returns(Promise.resolve(response))
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should let you fetch a widget list", () => {
    const { requestType, successType } = actions.widgets.get
    return helper
      .dispatchThen(actions.widgets.get(response.id), [
        requestType,
        successType
      ])
      .then(() => {
        assert.isOk(helper.getWidgetListStub.calledWith(response.id))
      })
  })
})
