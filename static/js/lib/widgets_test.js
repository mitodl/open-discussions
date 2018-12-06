import { expect } from "chai"

import { apiPath, makeOptionsFromList, makeOptionsFromObject } from "./widgets"

describe("widget utility functions", () => {
  describe("apiPath", () => {
    const dummyWidgetListId = 11
    const dummyWidgetId = 5

    it("returns the get_lists url properly", () => {
      expect(apiPath("get_lists")).to.equal("/api/v1/list/")
    })

    it("returns the get_configurations url properly", () => {
      expect(apiPath("get_configurations")).to.equal(
        "/api/v1/list/get_configurations/"
      )
    })

    it("returns the widget_list url properly", () => {
      expect(apiPath("widget_list")).to.equal(`/api/v1/list/`)
      expect(apiPath("widget_list", dummyWidgetListId)).to.equal(
        `/api/v1/list/${dummyWidgetListId}/`
      )
    })

    it("returns the widget url properly", () => {
      expect(apiPath("widget")).to.equal(`/api/v1/widget/`)
      expect(apiPath("widget", dummyWidgetId)).to.equal(
        `/api/v1/widget/${dummyWidgetId}/`
      )
    })
  })

  describe("makeOptionsFromList", () => {
    const optionsList = ["some", "great", "options"]

    it("returns a list of options objects that have totally matching key, label, and value to the original value", () => {
      const options = makeOptionsFromList(optionsList)

      expect(options).to.have.length(optionsList.length)
      for (let i = 0; i < options.length; i++) {
        expect(options[i]).to.deep.equal({
          key:   optionsList[i],
          value: optionsList[i],
          label: optionsList[i]
        })
      }
    })
  })

  describe("makeOptionsFromObject", () => {
    const optionsObject = {
      1: "some",
      2: "better",
      3: "options"
    }

    it("returns a list of options objects that have totally matching key, label, and value to the original value", () => {
      const options = makeOptionsFromObject(optionsObject)

      expect(options).to.have.length(Object.keys(optionsObject).length)
      for (const option of options) {
        expect(option).to.include.keys("value")
        expect(optionsObject).to.include.keys(option.value)
        const key = optionsObject[option.value]
        expect(option).to.deep.equal({
          key:   key,
          value: option.value,
          label: key
        })
      }
    })
  })
})
