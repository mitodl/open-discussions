// @flow
import React from "react"
import R from "ramda"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import casual from "casual-browserify"

import WidgetEditDialog, {
  WIDGET_CREATE,
  WIDGET_EDIT,
  WIDGET_TYPE_SELECT
} from "./WidgetEditDialog"
import * as validationFuncs from "../../lib/validation"

import {
  makeFieldSpec,
  makeWidgetInstance,
  makeWidgetListResponse,
  makeWidgetSpec,
  validFieldSpecTypes
} from "../../factories/widgets"
import {
  WIDGET_TYPE_MARKDOWN,
  WIDGET_TYPE_RSS,
  WIDGET_TYPE_URL
} from "../../lib/constants"
import { isIf, shouldIf } from "../../lib/test_utils"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("WidgetEditDialog", () => {
  let helper,
    setDialogDataStub,
    setDialogVisibilityStub,
    updateFormStub,
    dialogData,
    validationStub,
    specs

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    setDialogDataStub = helper.sandbox.stub()
    setDialogVisibilityStub = helper.sandbox.stub()
    updateFormStub = helper.sandbox.stub()

    dialogData = {
      instance:   makeWidgetInstance(),
      state:      WIDGET_TYPE_SELECT,
      validation: {}
    }
    specs = makeWidgetListResponse().available_widgets
    validationStub = helper.sandbox
      .stub(validationFuncs, "validateWidgetDialog")
      .returns({})
  })

  afterEach(() => {
    helper.cleanup()
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
    [WIDGET_TYPE_SELECT, "Select widget", "Next"],
    [WIDGET_EDIT, "Edit widget", "Update widget"]
  ].forEach(([state, expectedTitle, expectedSubmitText]) => {
    it(`sets the title and submit text based on isEditing=${String()} and state=${state}`, () => {
      dialogData = {
        ...dialogData,
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

  it("uses the widget instance title for the dialog for creating a new widget", () => {
    dialogData = {
      ...dialogData,
      state: WIDGET_CREATE
    }
    const spec = specs.find(
      spec => spec.widget_type === dialogData.instance.widget_type
    )
    // $FlowFixMe
    const expectedTitle = `Add ${spec.description} widget`
    const wrapper = render()
    assert.equal(wrapper.find("OurDialog").prop("title"), expectedTitle)
    assert.equal(wrapper.find("OurDialog").prop("submitText"), "Create widget")
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
        state: WIDGET_TYPE_SELECT
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
        state: WIDGET_CREATE
      })
      assert.equal(updateFormStub.callCount, 0)
      assert.equal(setDialogVisibilityStub.callCount, 0)
    })

    it("renders radio buttons for each widget type", () => {
      const wrapper = render()
      const props = wrapper.find("Radio").props()

      const expectedOptions = specs.map(spec => ({
        label: spec.description,
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
    ;[
      [true, WIDGET_TYPE_SELECT, true],
      [false, WIDGET_TYPE_SELECT, false],
      [false, WIDGET_CREATE, true],
      [false, WIDGET_CREATE, false],
      [false, WIDGET_EDIT, true],
      [false, WIDGET_EDIT, false]
    ].forEach(([expected, dialogState, dialogOpen]) => {
      it(`${shouldIf(
        expected
      )} shift focus from radio buttons when state=${dialogState} and dialog ${isIf(
        dialogOpen
      )} open`, async () => {
        dialogData.state = dialogState

        const focusStub = helper.sandbox.stub()
        helper.sandbox.stub(document, "querySelector").returns({
          focus: focusStub
        })
        const wrapper = render({ dialogOpen })
        wrapper.instance().componentDidMount()
        assert.equal(focusStub.callCount > 0, expected)
      })
    })
  })

  describe("configuration", () => {
    beforeEach(() => {
      dialogData = {
        ...dialogData,
        state: WIDGET_EDIT
      }
    })

    it("renders the widget title field", () => {
      const wrapper = render()

      const field = wrapper.find(".widget-title-field")
      assert.equal(field.text(), "Title")

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
    ;[
      [
        "widget title",
        WIDGET_TYPE_MARKDOWN,
        { title: "Missing field" },
        "Missing field"
      ],
      [
        "embed url",
        WIDGET_TYPE_URL,
        { configuration: { url: "URL is not valid" } },
        "URL is not valid"
      ],
      [
        "rss url",
        WIDGET_TYPE_RSS,
        { configuration: { url: "URL is not valid" } },
        "URL is not valid"
      ]
    ].forEach(([description, widgetType, validation, expectedMessage]) => {
      it(`renders validation for ${description}`, () => {
        dialogData = {
          ...dialogData,
          instance: makeWidgetInstance(widgetType),
          validation
        }
        const wrapper = render()
        assert.equal(
          wrapper.find(".validation-message").text(),
          expectedMessage
        )
      })
    })

    describe("fields", () => {
      let spec

      beforeEach(() => {
        spec = {
          ...makeWidgetSpec(),
          form_spec: validFieldSpecTypes.map(specType =>
            makeFieldSpec(specType, specType)
          )
        }
        specs = [spec]
        const configuration = {}
        const json = {}
        for (const fieldSpec of spec.form_spec) {
          configuration[fieldSpec.field_name] = casual.word
          json[fieldSpec.field_name] = casual.word
        }

        dialogData = {
          ...dialogData,
          instance: {
            ...dialogData.instance,
            widget_type: spec.widget_type,
            configuration,
            json
          }
        }
      })

      it("renders fields for a widget configuration", () => {
        const wrapper = render()

        assert.equal(
          wrapper.find(".configuration-field").length,
          validFieldSpecTypes.length
        )
        wrapper.find(".configuration-field").forEach((field, i) => {
          const fieldSpec = spec.form_spec[i]
          assert.equal(field.childAt(0).text(), fieldSpec.label)
          const fieldWrapper = field.find("WidgetField")
          assert.deepEqual(fieldWrapper.prop("fieldSpec"), fieldSpec)
          assert.equal(
            wrapper.instance().getValue,
            fieldWrapper.prop("getValue")
          )
          assert.equal(
            wrapper.instance().updateValues,
            fieldWrapper.prop("updateValues")
          )
        })
      })

      describe("lenses", () => {
        let configurationLens, jsonLens, fieldSpec

        beforeEach(() => {
          // make a people widget since they have both configuration and json set
          fieldSpec = spec.form_spec[0]
          configurationLens = R.lensPath([
            "configuration",
            fieldSpec.field_name
          ])
          jsonLens = R.lensPath(["json", fieldSpec.field_name])
        })

        it("gets a value", () => {
          const wrapper = render()
          const value = wrapper.instance().getValue(configurationLens)
          assert.equal(
            dialogData.instance.configuration[fieldSpec.field_name],
            value
          )
        })

        it("sets multiple values", () => {
          const wrapper = render()
          const configValue = "config value here"
          const jsonValue = "json value here"
          wrapper
            .instance()
            .updateValues(
              [configurationLens, jsonLens],
              [configValue, jsonValue]
            )
          sinon.assert.calledWith(setDialogDataStub, {
            ...dialogData,
            instance: {
              ...dialogData.instance,
              json: {
                ...dialogData.instance.json,
                [fieldSpec.field_name]: jsonValue
              },
              configuration: {
                ...dialogData.instance.configuration,
                [fieldSpec.field_name]: configValue
              }
            }
          })
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
