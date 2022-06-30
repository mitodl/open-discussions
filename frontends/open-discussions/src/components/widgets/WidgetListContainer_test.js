// @flow
import { assert } from "chai"
import sinon from "sinon"
import { arrayMove } from "react-sortable-hoc"
import casual from "casual-browserify"

import WidgetListContainer, {
  WidgetListContainer as InnerWidgetListContainer
} from "./WidgetListContainer"

import {
  WIDGET_CREATE,
  WIDGET_EDIT,
  WIDGET_TYPE_SELECT
} from "../../components/widgets/WidgetEditDialog"
import * as WidgetEditDialogModule from "../../components/widgets/WidgetEditDialog"

import {
  makeWidgetInstance,
  makeWidgetListResponse
} from "../../factories/widgets"
import IntegrationTestHelper from "../../util/integration_test_helper"
import { getWidgetKey, WIDGET_FORM_KEY } from "../../lib/widgets"
import * as widgetFuncs from "../../lib/widgets"
import { FORM_END_EDIT, FORM_UPDATE } from "../../actions/forms"
import {
  DIALOG_EDIT_WIDGET,
  HIDE_DIALOG,
  SET_DIALOG_DATA,
  SHOW_DIALOG
} from "../../actions/ui"
import { shouldIf } from "../../lib/test_utils"

import type { WidgetDialogData } from "../../flow/widgetTypes"

describe("WidgetListContainer", () => {
  let helper,
    listResponse,
    render,
    initialState,
    initialProps,
    updatedWidgetList,
    updatedExpanded

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    listResponse = makeWidgetListResponse()
    updatedWidgetList = makeWidgetListResponse().widgets
    updatedExpanded = {}
    updatedWidgetList.forEach((instance, i) => {
      if (i % 2 === 0) {
        updatedExpanded[getWidgetKey(instance)] = casual.boolean
      }
    })
    helper.getWidgetListStub.returns(Promise.resolve(listResponse))
    initialState = {
      widgets: {
        loaded: true,
        data:   listResponse
      },
      forms: {
        [WIDGET_FORM_KEY]: {
          value: {
            instances: updatedWidgetList,
            expanded:  updatedExpanded
          }
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
    const { wrapper, store } = await render()
    wrapper.unmount()
    delete helper.wrapper
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

    //
    ;[
      ["is present", { value: { instances: true } }, true],
      ["is missing the instances", { value: { instances: null } }, false],
      ["is missing the value", { value: null }, false],
      ["doesn't exist", null, false]
    ].forEach(([description, form, expected]) => {
      it(`${shouldIf(
        expected
      )} use the widget instances in a form when the form ${description}`, async () => {
        if (form && form.value && form.value.instances) {
          // $FlowFixMe: workaround since this variable isn't defined at test definition time
          form.value.instances = updatedWidgetList
        }
        const { wrapper } = await render({
          forms: {
            [WIDGET_FORM_KEY]: form
          }
        })
        const props = wrapper.find("sortableList").at(0).props()
        assert.deepEqual(
          props.widgetInstances,
          expected ? updatedWidgetList : listResponse.widgets
        )
        assert.deepEqual(props.editing, !!form)
        assert.isTrue(props.useDragHandle)
      })
    })

    it("reorders widgets", async () => {
      const { wrapper, store } = await render()
      const oldIndex = 1
      const newIndex = 0
      wrapper.find("sortableList").at(0).prop("onSortEnd")({
        oldIndex,
        newIndex
      })
      const updated = arrayMove(updatedWidgetList, oldIndex, newIndex)
      const lastAction = store.getActions()[store.getActions().length - 1]
      assert.deepEqual(lastAction, {
        type:    FORM_UPDATE,
        payload: {
          formKey: WIDGET_FORM_KEY,
          value:   {
            instances: updated
          }
        }
      })
    })

    it("clears the form", async () => {
      const { wrapper, store } = await render()
      wrapper.find("sortableList").at(0).prop("clearForm")()
      const lastAction = store.getActions()[store.getActions().length - 1]
      assert.deepEqual(lastAction, {
        type:    FORM_END_EDIT,
        payload: { formKey: WIDGET_FORM_KEY }
      })
    })

    it("deletes a widget instance", async () => {
      const { wrapper, store } = await render()
      const deletedInstance = updatedWidgetList[0]
      wrapper.find("sortableList").at(0).prop("deleteInstance")(deletedInstance)
      const lastAction = store.getActions()[store.getActions().length - 1]
      assert.deepEqual(lastAction, {
        type:    FORM_UPDATE,
        payload: {
          formKey: WIDGET_FORM_KEY,
          value:   {
            instances: updatedWidgetList.slice(1)
          }
        }
      })
    })

    it("opens a dialog to add a new widget", async () => {
      const aNewWidgetInstance = { widget: "instance" }
      const newWidgetInstanceStub = helper.sandbox
        .stub(widgetFuncs, "newWidgetInstance")
        .returns(aNewWidgetInstance)
      const { wrapper, store } = await render()
      wrapper.find("sortableList").at(0).prop("startAddInstance")()
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
      wrapper.find("sortableList").at(0).prop("startEditInstance")(instance)
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

    describe("expand/collapse", () => {
      [
        ["is present", { value: { expanded: true } }, true],
        ["is missing expanded", { value: { expanded: null } }, false],
        ["is missing the value", { value: null }, false],
        ["doesn't exist", null, false]
      ].forEach(([description, form, expected]) => {
        it(`${shouldIf(
          expected
        )} use expanded from the form when the form ${description}`, async () => {
          if (form && form.value && form.value.expanded) {
            // $FlowFixMe: workaround since this variable isn't defined at test definition time
            form.value.expanded = updatedExpanded
          }
          const { wrapper } = await render({
            forms: {
              [WIDGET_FORM_KEY]: form
            }
          })
          const props = wrapper.find("sortableList").at(0).props()
          assert.deepEqual(props.expanded, expected ? updatedExpanded : {})
          assert.deepEqual(props.editing, !!form)
          assert.isTrue(props.useDragHandle)
        })
      })

      it("updates the list of expanded items", async () => {
        const { wrapper, store } = await render()
        const keys = ["key1", "key2", "key3"]
        const value = "value"
        wrapper.find("sortableList").at(0).prop("setExpanded")(keys, value)
        const actions = store.getActions()
        assert.deepEqual(actions[actions.length - 1], {
          type:    FORM_UPDATE,
          payload: {
            formKey: WIDGET_FORM_KEY,
            value:   {
              expanded: {
                key1: value,
                key2: value,
                key3: value
              }
            }
          }
        })
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
          id: updateId
        }
        const list = updatedWidgetList.map(item =>
          item.id === updateId ? replaceInstance : item
        )
        const data: WidgetDialogData = {
          instance:   replaceInstance,
          state:      WIDGET_EDIT,
          validation: {}
        }
        wrapper.find("WidgetEditDialog").prop("updateForm")(data)
        const actions = store.getActions()
        assert.deepEqual(actions[actions.length - 1], {
          type:    FORM_UPDATE,
          payload: {
            formKey: WIDGET_FORM_KEY,
            value:   {
              instances: list
            }
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
        wrapper.find("WidgetEditDialog").prop("updateForm")(data)
        const actions = store.getActions()
        assert.deepEqual(actions[actions.length - 1], {
          type:    FORM_UPDATE,
          payload: {
            formKey: WIDGET_FORM_KEY,
            value:   {
              instances: updatedWidgetList.concat([data.instance])
            }
          }
        })
      })
    })

    //
    ;[true, false].forEach(newVisibility => {
      it(`sets dialog visibility=${String(newVisibility)}`, async () => {
        const { wrapper, store } = await render()
        wrapper.find("WidgetEditDialog").prop("setDialogVisibility")(
          newVisibility
        )
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
      wrapper.find("WidgetEditDialog").prop("setDialogData")(data)
      const actions = store.getActions()
      assert.deepEqual(actions[actions.length - 1], {
        type:    SET_DIALOG_DATA,
        payload: {
          dialogKey: DIALOG_EDIT_WIDGET,
          data
        }
      })
    })

    //
    ;[true, false].forEach(isOpen => {
      it(`passes props when the dialog is ${
        isOpen ? "" : "not "
      }open`, async () => {
        helper.stubComponent(WidgetEditDialogModule, "WidgetEditDialog")

        const data = { some: "data", validation: { field: "missing" } }
        const { wrapper } = await render({
          ui: {
            dialogs: new Map(isOpen ? [[DIALOG_EDIT_WIDGET, data]] : [])
          }
        })
        const props = wrapper.find("WidgetEditDialog").at(0).props()
        assert.equal(props.dialogData, isOpen ? data : undefined)
        assert.equal(props.dialogOpen, isOpen)
        assert.deepEqual(props.specs, listResponse.available_widgets)
        assert.deepEqual(props.validation, isOpen ? data.validation : {})
      })
    })
  })
})
