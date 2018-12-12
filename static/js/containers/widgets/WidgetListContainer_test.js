// @flow
import { assert } from "chai"
import sinon from "sinon"
import { arrayMove } from "react-sortable-hoc"

import WidgetListContainer, {
  WidgetListContainer as InnerWidgetListContainer
} from "./WidgetListContainer"

import { makeWidgetListResponse } from "../../factories/widgets"
import IntegrationTestHelper from "../../util/integration_test_helper"
import { WIDGET_FORM_KEY } from "../../lib/widgets"
import { FORM_END_EDIT, FORM_UPDATE } from "../../actions/forms"
import { actions } from "../../actions"

describe("WidgetListContainer", () => {
  let helper,
    listResponse,
    render,
    initialState,
    initialProps,
    updatedWidgetList

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    listResponse = makeWidgetListResponse()
    updatedWidgetList = makeWidgetListResponse().widgets
    helper.getWidgetListStub.returns(Promise.resolve(listResponse))
    helper.patchWidgetListStub.returns(Promise.resolve(listResponse))
    initialState = {
      widgets: {
        loaded: true,
        data:   {
          widgets: listResponse.widgets
        }
      },
      forms: {
        [WIDGET_FORM_KEY]: {
          value: updatedWidgetList
        }
      }
    }
    initialProps = {
      widgetListId: listResponse.id
    }
    render = helper.configureHOCRenderer(
      WidgetListContainer,
      InnerWidgetListContainer,
      initialState,
      initialProps
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("returns loader if no widget instance is loaded yet", async () => {
    const { inner } = await render({ widgets: { loaded: false } })
    assert.isTrue(inner.find("Loading").exists())
    sinon.assert.calledWith(helper.getWidgetListStub, listResponse.id)
  })
  ;[true, false].forEach(hasForm => {
    it(`renders a WidgetList ${
      hasForm ? "with" : "without"
    } a form`, async () => {
      const form = hasForm ? { value: updatedWidgetList } : null
      const { wrapper, store } = await render({
        forms: {
          [WIDGET_FORM_KEY]: form
        }
      })
      const props = wrapper
        .dive()
        .find("sortableList")
        .props()
      assert.deepEqual(
        props.widgetInstances,
        hasForm ? updatedWidgetList : listResponse.widgets
      )
      assert.deepEqual(props.form, form)
      assert.isTrue(props.useDragHandle)
      // assert that componentDidMount cleared the form
      assert.isTrue(
        store.getActions().filter(action => action.type === FORM_END_EDIT)
          .length >= 1
      )
    })
  })

  it("reorders widgets", async () => {
    const { wrapper, store } = await render()
    const oldIndex = 1
    const newIndex = 0
    wrapper
      .dive()
      .find("sortableList")
      .prop("onSortEnd")({ oldIndex, newIndex })
    const updated = arrayMove(updatedWidgetList, oldIndex, newIndex)
    const lastAction = store.getActions()[store.getActions().length - 1]
    assert.deepEqual(lastAction, {
      type:    FORM_UPDATE,
      payload: {
        formKey: WIDGET_FORM_KEY,
        value:   updated
      }
    })
  })

  it("clears the form", async () => {
    const { wrapper, store } = await render()
    wrapper
      .dive()
      .find("sortableList")
      .prop("clearForm")()
    const lastAction = store.getActions()[store.getActions().length - 1]
    assert.deepEqual(lastAction, {
      type:    FORM_END_EDIT,
      payload: { formKey: WIDGET_FORM_KEY }
    })
  })

  it("won't submit the form if there is no form", async () => {
    const { wrapper } = await render({
      forms: {
        [WIDGET_FORM_KEY]: {
          value: null
        }
      }
    })
    wrapper
      .dive()
      .find("sortableList")
      .prop("submitForm")()
    assert.equal(helper.patchWidgetListStub.callCount, 0)
  })

  it("submits the form", async () => {
    const { wrapper, store } = await render()
    await wrapper
      .dive()
      .find("sortableList")
      .prop("submitForm")()

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

  it("deletes a widget instance", async () => {
    const { wrapper, store } = await render()
    const deletedInstance = updatedWidgetList[0]
    wrapper
      .dive()
      .find("sortableList")
      .prop("deleteInstance")(deletedInstance)
    const lastAction = store.getActions()[store.getActions().length - 1]
    assert.deepEqual(lastAction, {
      type:    FORM_UPDATE,
      payload: {
        formKey: WIDGET_FORM_KEY,
        value:   updatedWidgetList.slice(1)
      }
    })
  })
})
