// @flow
import { assert } from "chai"
import sinon from "sinon"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import { getWidgetList, patchWidgetList } from "./widgets"
import { makeWidgetListResponse } from "../../factories/widgets"

describe("widget functions", () => {
  let fetchJSONStub, sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetchJSONStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("fetches a widget list", async () => {
    const widgetList = makeWidgetListResponse()
    fetchJSONStub.returns(Promise.resolve(widgetList))
    const widgetListId = widgetList.id
    const response = await getWidgetList(widgetListId)
    assert.deepEqual(response, widgetList)
    sinon.assert.calledWith(
      fetchJSONStub,
      `/api/v0/widget_lists/${widgetListId}/`
    )
  })

  it("patches a widget list", async () => {
    const widgetList = makeWidgetListResponse()
    fetchJSONStub.returns(Promise.resolve(widgetList))
    const widgetListId = widgetList.id
    const args = { some: "args" }
    const response = await patchWidgetList(widgetListId, args)
    assert.deepEqual(response, widgetList)
    sinon.assert.calledWith(
      fetchJSONStub,
      `/api/v0/widget_lists/${widgetListId}/`,
      {
        method: "PATCH",
        body:   JSON.stringify(args)
      }
    )
  })
})
