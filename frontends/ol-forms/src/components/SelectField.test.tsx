import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { default as user } from "@testing-library/user-event"

import SelectField, { Option } from "./SelectField"

describe("SelectField", () => {
  let name: string, options: Array<string | Option>, min: number, max: number

  beforeEach(() => {
    options = ["one", "two", { label: "Three", value: "3" }]
    min = 1
    max = 3
  })

  const renderField = (props: object = {}) =>
    render(
      <SelectField
        onChange={jest.fn()}
        name={name}
        min={min}
        max={max}
        options={options}
        {...props}
      />
    )

  it("should pass placeholder to Select", async () => {
    const placeText = "This place is held!"
    renderField({
      placeholder: placeText
    })
    await screen.findByText(placeText)
  })

  describe("not multiple choice", () => {
    it("renders a combobox widget", async () => {
      const value = "initialValue"
      renderField({ value })
      await screen.findByText(value)
      const selectElement = await screen.findByRole("combobox")
      await user.click(selectElement)
      screen.getByText("Three")
    })

    it("handles an empty value gracefully", async () => {
      renderField({ value: null })
      const selectElement = await screen.findByRole("combobox")
      await user.click(selectElement)
      screen.getByText("Three")
      const nullTextDivs = screen.queryAllByText("null")
      expect(nullTextDivs.length).toEqual(0)
    })
  })

  describe("multiple choice", () => {
    it("renders a combobox widget", async () => {
      const values = ["initial", "values", "3", "4"]
      renderField({ values, multiple: true })
      const selectElement = (await screen.findByRole(
        "combobox"
      )) as HTMLInputElement
      const newValue = ["newValue", "value2"]
      await fireEvent.change(selectElement, {
        target: { value: newValue }
      })
      expect(selectElement.value.split(",")).toEqual(newValue)
    })

    it("handles an empty value gracefully", async () => {
      renderField({ value: null, multiple: true })
      const selectElement = await screen.findByRole("combobox")
      await user.click(selectElement)
      screen.getByText("Three")
      const nullTextDivs = screen.queryAllByText("null")
      expect(nullTextDivs.length).toEqual(0)
    })
  })
})