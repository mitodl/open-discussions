// @flow
import { assert } from "chai"

import ManageWidgetHeader, {
  ManageWidgetHeader as InnerManageWidgetHeader
} from "./ManageWidgetHeader"

import { FORM_END_EDIT } from "../../actions/forms"
import { actions } from "../../actions"
import { makeChannel } from "../../factories/channels"
import { makeWidgetListResponse } from "../../factories/widgets"
import { WIDGET_FORM_KEY } from "../../lib/widgets"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("ManageWidgetHeader", () => {
  let helper,
    render,
    initialState,
    initialProps,
    listResponse,
    updatedWidgetList,
    channel

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    listResponse = makeWidgetListResponse()
    updatedWidgetList = makeWidgetListResponse().widgets
    helper.patchWidgetListStub.returns(Promise.resolve(listResponse))
    channel = makeChannel()
    initialState = {
      forms: {
        [WIDGET_FORM_KEY]: {
          value: updatedWidgetList
        }
      }
    }
    initialProps = {
      channel
    }

    render = helper.configureHOCRenderer(
      ManageWidgetHeader,
      InnerManageWidgetHeader,
      initialState,
      initialProps
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("has a cancel button which cancels", async () => {
    const { inner, store } = await render({ editing: true })
    inner.find(".cancel").prop("onClick")()
    const lastAction = store.getActions()[store.getActions().length - 1]
    assert.deepEqual(lastAction, {
      type:    FORM_END_EDIT,
      payload: { formKey: WIDGET_FORM_KEY }
    })
  })

  it("submits the form", async () => {
    const { inner, store } = await render()
    await inner.find(".submit").prop("onClick")()

    const actionsList = store.getActions()
    assert.deepEqual(actionsList[actionsList.length - 1], {
      type:    FORM_END_EDIT,
      payload: { formKey: WIDGET_FORM_KEY }
    })
    assert.deepEqual(actionsList[actionsList.length - 2], {
      type:    actions.widgets.patch.successType,
      payload: listResponse
    })
  })

  it("won't submit the form if there is no form", async () => {
    const { inner } = await render({
      forms: {
        [WIDGET_FORM_KEY]: {
          value: null
        }
      }
    })
    await inner.find(".submit").prop("onClick")()
    assert.equal(helper.patchWidgetListStub.callCount, 0)
  })
})
