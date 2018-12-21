// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import casual from "casual-browserify"

import WidgetEditDialog from "./WidgetEditDialog"
import * as validationFuncs from "../../lib/validation"

import {
  DIALOG_EDIT_WIDGET_CONFIGURATION,
  DIALOG_EDIT_WIDGET_SELECT_TYPE
} from "../../actions/ui"
import {
  makeFieldSpec,
  makeWidgetInstance,
  makeWidgetListResponse,
  makeWidgetSpec,
  validFieldSpecTypes
} from "../../factories/widgets"

describe("WidgetEditDialog", () => {
  let sandbox,
    setDialogDataStub,
    setDialogVisibilityStub,
    updateFormStub,
    dialogData,
    validationStub,
    specs

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    setDialogDataStub = sandbox.stub()
    setDialogVisibilityStub = sandbox.stub()
    updateFormStub = sandbox.stub()

    dialogData = {
      instance:   makeWidgetInstance(),
      isEditing:  false,
      state:      DIALOG_EDIT_WIDGET_SELECT_TYPE,
      validation: {}
    }
    specs = makeWidgetListResponse().available_widgets
    validationStub = sandbox
      .stub(validationFuncs, "validateWidgetDialog")
      .returns({})
  })

  afterEach(() => {
    sandbox.restore()
  })

  const render = (props = {}) =>
    shallow(
      <WidgetEditDialog
        dialogData={dialogData}
        dialogOpen={true}
        setDialogData={setDialogDataStub}
        setDialogVisibility={setDialogVisibilityStub}
        specs={specs}
        updateForm={updateFormStub}
        {...props}
      />
    )

  it("doesn't render the dialog if there's no data", () => {
    const wrapper = render({ dialogData: null })
    assert.equal(wrapper.html(), null)
  })
  ;[true, false].forEach(dialogOpen => {
    it(`sets open to ${String(dialogOpen)}`, () => {
      const wrapper = render({ dialogOpen })
      assert.equal(wrapper.find("OurDialog").prop("open"), dialogOpen)
    })
  })
  ;[
    [true, DIALOG_EDIT_WIDGET_SELECT_TYPE, "Select widget", "Next"],
    [false, DIALOG_EDIT_WIDGET_SELECT_TYPE, "Select widget", "Next"],
    [true, DIALOG_EDIT_WIDGET_CONFIGURATION, "Edit widget", "Update widget"],
    [false, DIALOG_EDIT_WIDGET_CONFIGURATION, "Add widget", "Create widget"]
  ].forEach(([isEditing, state, expectedTitle, expectedSubmitText]) => {
    it(`sets the title and submit text based on isEditing=${String(
      isEditing
    )} and state=${state}`, () => {
      dialogData = {
        ...dialogData,
        isEditing,
        state
      }
      const wrapper = render()
      assert.equal(wrapper.find("OurDialog").prop("title"), expectedTitle)
      assert.equal(
        wrapper.find("OurDialog").prop("submitText"),
        expectedSubmitText
      )
    })
  })

  it("hides the dialog", () => {
    const wrapper = render()
    wrapper.find("OurDialog").prop("hideDialog")()
    sinon.assert.calledWith(setDialogVisibilityStub, false)
  })

  describe("widget type selection", () => {
    beforeEach(() => {
      dialogData = {
        ...dialogData,
        state:     DIALOG_EDIT_WIDGET_SELECT_TYPE,
        isEditing: false
      }
    })

    it("checks validation when onAccept is called", () => {
      const updatedValidation = { error: "missing field" }
      validationStub.returns(updatedValidation)
      const wrapper = render()
      wrapper.prop("onAccept")()
      sinon.assert.calledWith(setDialogDataStub, {
        ...dialogData,
        validation: updatedValidation
      })
      assert.equal(updateFormStub.callCount, 0)
      assert.equal(setDialogVisibilityStub.callCount, 0)
    })

    it("changes state from widget type to configuration when onAccept is called", () => {
      const wrapper = render()
      wrapper.prop("onAccept")()
      sinon.assert.calledWith(setDialogDataStub, {
        ...dialogData,
        state: DIALOG_EDIT_WIDGET_CONFIGURATION
      })
      assert.equal(updateFormStub.callCount, 0)
      assert.equal(setDialogVisibilityStub.callCount, 0)
    })

    it("renders radio buttons for each widget type", () => {
      const wrapper = render()
      const props = wrapper.find("Radio").props()

      const expectedOptions = specs.map(spec => ({
        label: spec.widget_type,
        value: spec.widget_type
      }))
      assert.deepEqual(props.options, expectedOptions)
      assert.equal(props.value, dialogData.instance.widget_type)

      const widgetType = "xyz"
      props.onChange({ target: { value: widgetType } })
      sinon.assert.calledWith(setDialogDataStub, {
        ...dialogData,
        instance: {
          ...dialogData.instance,
          widget_type: widgetType
        }
      })
    })

    it("renders validation for widget type", () => {
      dialogData = {
        ...dialogData,
        validation: {
          widget_type: "Missing field"
        }
      }
      const wrapper = render()
      assert.equal(
        wrapper.find(".validation-message").text(),
        // $FlowFixMe
        dialogData.validation.widget_type
      )
    })
  })

  describe("configuration", () => {
    beforeEach(() => {
      dialogData = {
        ...dialogData,
        state:     DIALOG_EDIT_WIDGET_CONFIGURATION,
        isEditing: true
      }
    })

    it("renders the widget title field", () => {
      const wrapper = render()

      const field = wrapper.find(".widget-title-field")
      assert.equal(field.text(), "Widget title")

      assert.equal(field.find("input").prop("value"), dialogData.instance.title)
      const newValue = "newValue"
      setDialogDataStub.reset()
      field.find("input").prop("onChange")({ target: { value: newValue } })
      sinon.assert.calledWith(setDialogDataStub, {
        ...dialogData,
        instance: {
          ...dialogData.instance,
          title: newValue
        }
      })
    })

    it("renders validation for the widget title field", () => {
      dialogData = {
        ...dialogData,
        validation: {
          title: "Missing field"
        }
      }
      const wrapper = render()
      assert.equal(
        wrapper.find(".validation-message").text(),
        // $FlowFixMe
        dialogData.validation.title
      )
    })

    it("renders fields for a widget configuration", () => {
      const spec = {
        ...makeWidgetSpec(),
        form_spec: validFieldSpecTypes.map(specType =>
          makeFieldSpec(specType, specType)
        )
      }
      specs = [spec]
      const configuration = {}
      for (const fieldSpec of spec.form_spec) {
        configuration[fieldSpec.field_name] = casual.word
      }

      dialogData = {
        ...dialogData,
        instance: {
          ...dialogData.instance,
          widget_type: spec.widget_type,
          configuration
        }
      }
      const wrapper = render()

      assert.equal(
        wrapper.find(".configuration-field").length,
        validFieldSpecTypes.length
      )
      wrapper.find(".configuration-field").forEach((field, i) => {
        const fieldSpec = spec.form_spec[i]
        assert.equal(field.childAt(0).text(), fieldSpec.label)
        assert.equal(
          field.find("WidgetField").prop("value"),
          configuration[fieldSpec.field_name]
        )
        const newValue = "newValue"

        setDialogDataStub.reset()
        field.find("WidgetField").prop("onChange")({
          target: { value: newValue }
        })
        sinon.assert.calledWith(setDialogDataStub, {
          ...dialogData,
          instance: {
            ...dialogData.instance,
            configuration: {
              ...dialogData.instance.configuration,
              [fieldSpec.field_name]: newValue
            }
          }
        })
      })
    })

    it("submits the dialog data when onAccept is called", () => {
      const wrapper = render()
      wrapper.prop("onAccept")()
      sinon.assert.calledWith(updateFormStub, dialogData)
      sinon.assert.calledWith(setDialogVisibilityStub, false)
    })
  })
})
