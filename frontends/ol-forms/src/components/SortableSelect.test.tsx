import React from "react"
import { zip } from "ramda"
import { faker } from "@faker-js/faker"
import { render, screen } from "@testing-library/react"

import SortableSelect, { SortableItem } from "./SortableSelect"
import { Option } from "./SelectField"

const createFakeOptions = (times: number): Option[] =>
  Array(times)
    .fill(0)
    .map(() => ({
      value: faker.unique(faker.datatype.number).toString(),
      label: faker.lorem.words()
    }))

describe("SortableSelect", () => {
  let options: Option[], onChange: jest.Mock, loadOptions: jest.Mock

  const renderItem = () =>
    render(
      <SortableSelect
        name="test-select"
        value={options
          .slice(0, 4)
          .map(option => ({ id: option.value, title: option.label }))}
        onChange={onChange}
        options={options}
        loadOptions={loadOptions}
      />
    )

  beforeEach(() => {
    options = createFakeOptions(10)
    onChange = jest.fn()
    loadOptions = jest.fn().mockResolvedValue(options)
  })

  it("should render sortable items for the current value", async () => {
    renderItem()
    const values: SortableItem[] = options.slice(0, 4).map(option => ({
      id:    option.value,
      title: option.label
    }))
    const drags = await screen.findAllByText("drag_indicator")
    zip(values, drags).forEach(([value, draggable]) => {
      // eslint-disable-next-line testing-library/no-node-access
      const titleDiv = draggable.closest("div").children[1]
      expect(titleDiv.innerHTML).toEqual(value.title)
    })
  })

  it("should have an add button", async () => {
    renderItem()
    await screen.findByText("Add")
  })
})
