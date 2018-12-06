import React from "react"
import Select from "react-select"
import sinon from "sinon"
import { mount } from "enzyme/build"
import { expect } from "chai"

import { makeOptionsFromList } from "../../lib/widgets"
import WidgetForm from "./WidgetForm"

describe("<WidgetForm />", () => {
  const selectConfig = {
    key:       "dummySelectKey",
    label:     "dummySelectLabel",
    inputType: "select",
    props:     {
      isMulti:     false,
      placeholder: "dummySelectPlaceholder"
    },
    choices: {
      1: "some",
      2: "good",
      3: "choices"
    }
  }
  const selectValues = [["2"], ["3"], ["1"], []]
  const multiSelectConfig = {
    key:       "dummyMultiSelectKey",
    label:     "dummyMultiSelectLabel",
    inputType: "select",
    props:     {
      isMulti:     true,
      placeholder: "dummyMultiSelectPlaceholder"
    },
    choices: {
      1: "some",
      2: "real",
      3: "good",
      4: "choices"
    }
  }
  const multiSelectValues = [["1", "2"], ["3"], [], ["1", "3"]]
  const textareaConfig = {
    key:       "dummyTextareaKey",
    label:     "dummyTextareaLabel",
    inputType: "textarea",
    props:     {
      placeholder: "dummyTextareaPlaceholder"
    }
  }
  const textareaValues = [
    "",
    "some text",
    "This is just a large text block with dangerous characters to ensure that " +
      "nothing breaks if the user enters weird data into the text block. The sample value for text will also contain the " +
      "special characters but not so much text because textareas are supposed to be bigger `~!@#$%^&*()_+-=}{][|\\'\";:>" +
      "<,./?"
  ]
  const textConfig = {
    key:       "dummyTextKey",
    label:     "dummyTextLabel",
    inputType: "text",
    props:     {
      placeholder: "dummyTextPlaceholder",
      autoFocus:   true
    }
  }
  const textValues = ["", "some text", "`~!@#$%^&*()_+-=}{][|\\'\";:><,./?"]
  const testInputs = [
    {
      testType:      "text",
      inputType:     "text",
      config:        textConfig,
      values:        textValues,
      findComponent: wrap =>
        wrap.find("input").filterWhere(input => input.prop("type") === "text"),
      restoreDefault: value => value
    },
    {
      testType:       "textarea",
      inputType:      "textarea",
      config:         textareaConfig,
      values:         textareaValues,
      findComponent:  wrap => wrap.find("textarea"),
      restoreDefault: value => value
    },
    {
      testType:      "select",
      inputType:     "select",
      config:        selectConfig,
      values:        selectValues,
      findComponent: wrap =>
        wrap
          .find(Select)
          .filterWhere(select => select.prop("isMulti") === false),
      restoreDefault: options => options.map(option => option.value)
    },
    {
      testType:      "multiSelect",
      inputType:     "select",
      config:        multiSelectConfig,
      values:        multiSelectValues,
      findComponent: wrap =>
        wrap.find(Select).filterWhere(select => select.prop("isMulti")),
      restoreDefault: options => options.map(option => option.value)
    }
  ]

  testInputs.forEach(inputObject => {
    const {
      testType,
      inputType,
      config,
      values,
      findComponent,
      restoreDefault
    } = inputObject

    describe(`WidgetForm new widget input test - ${testType}`, () => {
      // props for a WidgetForm passed from a NewWidgetForm
      const dummyNewFormProps = {
        formData:                  { title: null },
        onSubmit:                  sinon.spy(),
        widgetClasses:             ["testClass", "dummyClass"],
        widgetClassConfigurations: {
          testClass:  [config],
          dummyClass: []
        }
      }

      const resetSpyHistory = () => dummyNewFormProps.onSubmit.resetHistory()

      // Test default behavior
      it("renders a widget class select by default if there is more than one widget class", () => {
        const wrap = mount(<WidgetForm {...dummyNewFormProps} />)
        expect(
          wrap
            .find(Select)
            .filterWhere(select => select.hasClass("widget-class-input-select"))
        ).to.have.lengthOf(1)
        expect(wrap.find(".widget-form-input-group")).to.have.lengthOf(1)
      })

      // method tests
      values.forEach(value => {
        it(`onChange sets the state appropriately for value: ${value}`, () => {
          const wrap = mount(<WidgetForm {...dummyNewFormProps} />)
          const instance = wrap.instance()

          instance.onChange(config.key, value)
          expect(wrap.state("formData")[config.key]).to.equal(value)
        })

        it(`onSubmit calls the prop onSubmit with widgetClass and formData matching default value: ${value}`, () => {
          const wrap = mount(<WidgetForm {...dummyNewFormProps} />)
          const dummyFormData = {}
          dummyFormData[config.key] = value
          const newState = {
            formData:    dummyFormData,
            widgetClass: "testClass"
          }
          wrap.setState(newState)
          const instance = wrap.instance()

          resetSpyHistory()
          instance.onSubmit(document.createEvent("Event"))
          expect(
            wrap.prop("onSubmit").withArgs("testClass", dummyFormData).callCount
          ).to.equal(1)
        })
      })

      it("makeWidgetClassSelect creates a select with options that match the widgetClasses given", () => {
        const wrap = mount(<WidgetForm {...dummyNewFormProps} />)
        const instance = wrap.instance()
        const widgetClassSelect = mount(instance.makeWidgetClassSelect())

        expect(widgetClassSelect.exists(".widget-class-input-select")).to.equal(
          true
        )
        expect(widgetClassSelect.prop("options")).to.deep.equal(
          makeOptionsFromList(
            Object.keys(dummyNewFormProps.widgetClassConfigurations)
          )
        )
      })

      values.forEach(value => {
        it(`renderInputs creates an appropriate input for a ${testType} input with defaultValue: ${value}`, () => {
          const defaultValues = {}
          defaultValues[config.key] = value
          const wrap = mount(
            <WidgetForm {...dummyNewFormProps} formData={defaultValues} />
          )
          const instance = wrap.instance()
          const inputForm = mount(instance.renderInputs([config]))
          expect(
            findComponent(inputForm).filterWhere(input =>
              input.hasClass(`widget-form-input-${config.key}`)
            )
          ).to.have.lengthOf(1)
          const component = findComponent(inputForm)

          expect(component.is(`.widget-form-input-${inputType}`)).to.equal(true)
          expect(restoreDefault(component.prop("defaultValue"))).to.deep.equal(
            value
          )
          expect(component.props()).to.include(config.props)

          values.forEach(newValue => {
            if (inputType === "select") {
              const selection = []
              component.prop("options").forEach(option => {
                if (newValue && newValue.includes(option.value)) {
                  selection.push(option)
                }
              })
              component.props().onChange(selection)
            } else {
              component.simulate("change", { target: { value: newValue } })
            }
            expect(wrap.state("formData")[config.key]).to.deep.equal(newValue)
          })
        })
      })
    })

    values.forEach(value => {
      // props for a WidgetForm called by an EditWidgetForm
      const dummyEditFormProps = {
        formData:                  {},
        onSubmit:                  sinon.spy(),
        widgetClasses:             ["testClass"],
        widgetClassConfigurations: { testClass: [config] },
        widgetClass:               "testClass"
      }
      dummyEditFormProps.formData[config.key] = value
      // Test edit widget
      it(`renders no widget class select when editing and populates default value: ${value}`, () => {
        const wrap = mount(<WidgetForm {...dummyEditFormProps} />)

        expect(wrap.exists(".widget-class-input-select")).to.equal(false)
        expect(wrap.exists(`.widget-form-input-${config.key}`)).to.equal(true)
        expect(wrap.state("formData")[config.key]).to.deep.equal(value)
        expect(wrap.state("widgetClass")).to.equal("testClass")
      })
    })
  })
})
