// @flow
import { assert } from "chai"
import sinon from "sinon"

import WidgetList, { WidgetList as InnerWidgetList } from "./WidgetList"
import { makeWidgetListResponse } from "../../factories/widgets"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("WidgetList", () => {
  let helper, listResponse, render, initialState, initialProps

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    listResponse = makeWidgetListResponse()
    helper.getWidgetListStub.returns(Promise.resolve(listResponse))
    initialState = {
      widgets: {
        loaded: false,
        data:   {
          widgets: []
        }
      }
    }
    initialProps = {
      widgetListId: listResponse.id
    }
    render = helper.configureHOCRenderer(
      WidgetList,
      InnerWidgetList,
      initialState,
      initialProps
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("returns loader if no widget instance is loaded yet", async () => {
    const { inner } = await render()

    assert.isTrue(inner.find("Loading").exists())
    sinon.assert.calledWith(helper.getWidgetListStub, listResponse.id)
  })

  it("renders a list of WidgetInstances", async () => {
    const { inner } = await render({
      widgets: {
        loaded: true,
        data:   listResponse
      }
    })

    assert.equal(
      inner.find("WidgetInstance").length,
      listResponse.widgets.length
    )

    listResponse.widgets.forEach((widgetInstance, i) => {
      assert.deepEqual(
        inner
          .find("WidgetInstance")
          .at(i)
          .prop("widgetInstance"),
        widgetInstance
      )
    })
  })
})
