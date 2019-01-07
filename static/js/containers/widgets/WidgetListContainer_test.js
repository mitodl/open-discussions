// @flow
import { assert } from "chai"
import sinon from "sinon"
import { arrayMove } from "react-sortable-hoc"

import WidgetListContainer, {
  WidgetListContainer as InnerWidgetListContainer
} from "./WidgetListContainer"
import {
  WIDGET_CREATE,
  WIDGET_EDIT,
  WIDGET_TYPE_SELECT
} from "../../components/widgets/WidgetEditDialog"

import {
  makeWidgetInstance,
  makeWidgetListResponse
} from "../../factories/widgets"
import IntegrationTestHelper from "../../util/integration_test_helper"
import { WIDGET_FORM_KEY } from "../../lib/widgets"
import * as widgetFuncs from "../../lib/widgets"
import { FORM_END_EDIT, FORM_UPDATE } from "../../actions/forms"
import { actions } from "../../actions"
import {
  DIALOG_EDIT_WIDGET,
  HIDE_DIALOG,
  SET_DIALOG_DATA,
  SHOW_DIALOG
} from "../../actions/ui"
import type { WidgetDialogData } from "../../flow/widgetTypes"

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
        data:   listResponse
      },
      forms: {
        [WIDGET_FORM_KEY]: {
          value: updatedWidgetList
        }
      },
      ui: {
        dialogs: new Map()
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

  it("clears the form on unmount", async () => {
    const { inner, store } = await render()
    inner.unmount()
    assert.isTrue(
      store.getActions().filter(action => action.type === FORM_END_EDIT)
        .length >= 1
    )
  })

  describe("WidgetList", () => {
    it("returns loader if no widget instance is loaded yet", async () => {
      const { inner } = await render({ widgets: { loaded: false } })
      assert.isTrue(inner.find("Loading").exists())
      sinon.assert.calledWith(helper.getWidgetListStub, listResponse.id)
    })
    ;[true, false].forEach(hasForm => {
      it(`renders a WidgetList ${
        hasForm ? "with" : "without"
      } a form`, async () => {
        const { wrapper } = await render({
          forms: {
            [WIDGET_FORM_KEY]: hasForm ? { some: "form" } : null
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
        assert.deepEqual(props.editing, hasForm)
        assert.isTrue(props.useDragHandle)
        wrapper.find("WidgetListContainer").unmount()
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

    it("opens a dialog to add a new widget", async () => {
      const aNewWidgetInstance = { widget: "instance" }
      const newWidgetInstanceStub = helper.sandbox
        .stub(widgetFuncs, "newWidgetInstance")
        .returns(aNewWidgetInstance)
      const { wrapper, store } = await render()
      wrapper
        .dive()
        .find("sortableList")
        .prop("startAddInstance")()
      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 2], {
        type:    SHOW_DIALOG,
        payload: DIALOG_EDIT_WIDGET
      })
      assert.deepEqual(actions[actions.length - 1], {
        type:    SET_DIALOG_DATA,
        payload: {
          dialogKey: DIALOG_EDIT_WIDGET,
          data:      {
            instance:   aNewWidgetInstance,
            state:      WIDGET_TYPE_SELECT,
            validation: {}
          }
        }
      })
      sinon.assert.calledWith(newWidgetInstanceStub)
    })

    it("opens a dialog to edit a widget", async () => {
      const { wrapper, store } = await render()
      const instance = updatedWidgetList[0]
      wrapper
        .dive()
        .find("sortableList")
        .prop("startEditInstance")(instance)
      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 2], {
        type:    SHOW_DIALOG,
        payload: DIALOG_EDIT_WIDGET
      })
      assert.deepEqual(actions[actions.length - 1], {
        type:    SET_DIALOG_DATA,
        payload: {
          dialogKey: DIALOG_EDIT_WIDGET,
          data:      {
            instance:   instance,
            state:      WIDGET_EDIT,
            validation: {}
          }
        }
      })
    })
  })

  describe("WidgetEditDialog", () => {
    describe("updateForm", () => {
      it("updates the widget list with an updated widget instance", async () => {
        const { wrapper, store } = await render()
        const updateId = updatedWidgetList[0].id
        const replaceInstance = {
          ...makeWidgetInstance(),
          id:             updateId,
          react_renderer: undefined,
          html:           ""
        }
        const list = updatedWidgetList.map(
          item => (item.id === updateId ? replaceInstance : item)
        )
        const data: WidgetDialogData = {
          instance:   replaceInstance,
          state:      WIDGET_EDIT,
          validation: {}
        }
        wrapper
          .dive()
          .find("WidgetEditDialog")
          .prop("updateForm")(data)
        const actions = store.getActions()
        assert.deepEqual(actions[actions.length - 1], {
          type:    FORM_UPDATE,
          payload: {
            formKey: WIDGET_FORM_KEY,
            value:   list
          }
        })
      })

      it("updates the widget list with a new widget instance", async () => {
        const { wrapper, store } = await render()
        const data: WidgetDialogData = {
          instance:   makeWidgetInstance(),
          state:      WIDGET_CREATE,
          validation: {}
        }
        wrapper
          .dive()
          .find("WidgetEditDialog")
          .prop("updateForm")(data)
        const actions = store.getActions()
        assert.deepEqual(actions[actions.length - 1], {
          type:    FORM_UPDATE,
          payload: {
            formKey: WIDGET_FORM_KEY,
            value:   updatedWidgetList.concat([
              {
                ...data.instance,
                react_renderer: undefined,
                html:           ""
              }
            ])
          }
        })
      })
    })
    ;[true, false].forEach(newVisibility => {
      it(`sets dialog visibility=${String(newVisibility)}`, async () => {
        const { wrapper, store } = await render()
        wrapper
          .dive()
          .find("WidgetEditDialog")
          .prop("setDialogVisibility")(newVisibility)
        const actions = store.getActions()
        assert.deepEqual(actions[actions.length - 1], {
          type:    newVisibility ? SHOW_DIALOG : HIDE_DIALOG,
          payload: DIALOG_EDIT_WIDGET
        })
      })
    })

    it("sets dialog data", async () => {
      const { wrapper, store } = await render()
      const data: WidgetDialogData = {
        instance:   makeWidgetInstance(),
        state:      WIDGET_CREATE,
        validation: { field: "missing" }
      }
      wrapper
        .dive()
        .find("WidgetEditDialog")
        .prop("setDialogData")(data)
      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 1], {
        type:    SET_DIALOG_DATA,
        payload: {
          dialogKey: DIALOG_EDIT_WIDGET,
          data
        }
      })
    })
    ;[true, false].forEach(isOpen => {
      it(`passes props when the dialog is ${
        isOpen ? "" : "not "
      }open`, async () => {
        const data = { some: "data", validation: { field: "missing" } }
        const { wrapper } = await render({
          ui: {
            dialogs: new Map(isOpen ? [[DIALOG_EDIT_WIDGET, data]] : [])
          }
        })
        const props = wrapper
          .dive()
          .find("WidgetEditDialog")
          .props()
        assert.equal(props.dialogData, isOpen ? data : undefined)
        assert.equal(props.dialogOpen, isOpen)
        assert.deepEqual(props.specs, listResponse.available_widgets)
        assert.deepEqual(props.validation, isOpen ? data.validation : {})
      })
    })
  })
})
