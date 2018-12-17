// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import casual from "casual-browserify"

import WidgetEditDialog from "./WidgetEditDialog"

import {
  DIALOG_EDIT_WIDGET_CONFIGURATION,
  DIALOG_EDIT_WIDGET_SELECT_TYPE
} from "../../actions/ui"
import {
  makeFieldSpec,
  makeWidgetInstance,
  makeWidgetListResponse,
  makeWidgetSpec,
  validFieldSpecTypes,
  validWidgetTypes
} from "../../factories/widgets"

describe("WidgetEditDialog", () => {
  let sandbox,
    setDialogDataStub,
    setDialogVisibilityStub,
    updateFormStub,
    dialogData,
    specs

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    setDialogDataStub = sandbox.stub()
    setDialogVisibilityStub = sandbox.stub()
    updateFormStub = sandbox.stub()

    dialogData = {
      instance:  makeWidgetInstance(),
      isEditing: false,
      state:     DIALOG_EDIT_WIDGET_SELECT_TYPE
    }
    specs = makeWidgetListResponse().available_widgets
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
  ;[[true, "Edit widget"], [false, "Add widget"]].forEach(
    ([isEditing, title]) => {
      it(`sets the title based on isEditing=${String(isEditing)}`, () => {
        dialogData = {
          ...dialogData,
          isEditing
        }
        const wrapper = render()
        assert.equal(wrapper.find("OurDialog").prop("title"), title)
      })
    }
  )
  ;[
    [true, DIALOG_EDIT_WIDGET_SELECT_TYPE, "Next"],
    [false, DIALOG_EDIT_WIDGET_SELECT_TYPE, "Next"],
    [true, DIALOG_EDIT_WIDGET_CONFIGURATION, "Update widget"],
    [false, DIALOG_EDIT_WIDGET_CONFIGURATION, "Create widget"]
  ].forEach(([isEditing, state, expectedSubmitText]) => {
    it(`set the button text based on isEditing=${String(
      isEditing
    )} and state=${state}`, () => {
      dialogData = {
        ...dialogData,
        isEditing,
        state
      }
      const wrapper = render()
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

    validWidgetTypes.forEach(widgetType => {
      it(`renders fields for a widget configuration for widgetType=${widgetType}`, () => {
        const spec = {
          ...makeWidgetSpec(widgetType),
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
            widget_type: widgetType,
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
          assert.equal(field.text(), fieldSpec.label)
          assert.equal(
            field.find(".field").prop("value"),
            configuration[fieldSpec.field_name]
          )
          const newValue = "newValue"

          setDialogDataStub.reset()
          field.find(".field").prop("onChange")({ target: { value: newValue } })
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
    })

    describe("fields", () => {
      const renderField = fieldType => {
        const fieldSpec = makeFieldSpec(fieldType)
        const spec = {
          ...makeWidgetSpec(),
          form_spec: [fieldSpec]
        }
        specs = [spec]
        const configuration = {
          [fieldSpec.field_name]: casual.word
        }

        dialogData = {
          ...dialogData,
          instance: {
            ...dialogData.instance,
            widget_type: spec.widget_type,
            configuration
          }
        }
        return { wrapper: render(), fieldSpec }
      }
      ;["text", "textarea"].forEach(fieldType => {
        it(`renders a ${fieldType} input field`, () => {
          const { wrapper, fieldSpec } = renderField(fieldType)

          const field = wrapper.find(".configuration-field .field")
          const props = field.props()
          if (fieldType === "textarea") {
            assert.equal(field.name(), "textarea")
          } else {
            assert.equal(props.type, "text")
            assert.equal(field.name(), "input")
          }
          assert.equal(props.maxLength, fieldSpec.props.max_length)
          assert.equal(props.minLength, fieldSpec.props.min_length)
          assert.equal(props.placeholder, fieldSpec.props.placeholder)
        })
      })

      it("renders a number field", () => {
        const { wrapper, fieldSpec } = renderField("number")

        const props = wrapper.find(".configuration-field .field").props()
        assert.equal(props.type, "number")
        assert.equal(props.max, fieldSpec.props.max)
        assert.equal(props.min, fieldSpec.props.min)
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
