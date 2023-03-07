import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SearchInput, { SearchInputProps } from "./SearchInput"
import { assert } from "chai"
import sinon from "sinon"

const getSearchInput = () => {
  const element = screen.getByLabelText("Search for")
  if (element instanceof HTMLInputElement) return element
  throw new Error("Expected an HTMLInputElement")
}

/**
 * There are two search buttons at the moment, a magnifier on the left
 * and an arrow -> on the right.
 */
const getSearchButton = ({ rhs = false } = {}): HTMLButtonElement => {
  const buttonIndex = rhs ? 1 : 0
  const button = screen.getAllByLabelText("Search")[buttonIndex]
  if (button instanceof HTMLButtonElement) return button
  throw new Error("Expected an HTMLButtonElement")
}

/**
 * This actually returns an icon (inside a button)
 */
const getClearButton = (): HTMLButtonElement => {
  const button = screen.getByLabelText("Clear")
  if (button instanceof HTMLButtonElement) return button
  throw new Error("Expected an HTMLButtonElement")
}

describe("SearchInput", () => {
  const renderSearchInput = (props: Partial<SearchInputProps> = {}) => {
    const { value = "", ...otherProps } = props
    const onSubmit = sinon.stub()
    const onChange = sinon.spy(e => e.persist())
    const onClear = sinon.stub()
    render(
      <SearchInput
        value={value}
        onSubmit={onSubmit}
        onChange={onChange}
        onClear={onClear}
        {...otherProps}
      />
    )
    const user = userEvent.setup()
    const spies = { onClear, onChange, onSubmit }
    return { user, spies }
  }

  it("Renders the given value in input", () => {
    renderSearchInput({ value: "math" })
    assert.equal(getSearchInput().value, "math")
  })

  it("Calls onChange when text is typed", async () => {
    const { user, spies } = renderSearchInput({ value: "math" })
    const input = getSearchInput()
    await user.type(getSearchInput(), "s")
    sinon.assert.calledWith(spies.onChange, sinon.match({ target: input }))
  })

  const sides = [
    { rhs: false, label: "left" },
    { rhs: true, label: "right" }
  ]
  sides.forEach(({ rhs, label }) => {
    it(`Calls onSubmit when ${label} search is clicked`, async () => {
      const { user, spies } = renderSearchInput({ value: "chemistry" })
      await user.click(getSearchButton({ rhs }))
      const input = getSearchInput()
      await user.click(input)
      sinon.assert.calledWith(
        spies.onSubmit,
        sinon.match({ target: { value: "chemistry" } })
      )
    })
  })

  it("Calls onClear clear is clicked", async () => {
    const { user, spies } = renderSearchInput({ value: "biology" })
    await user.click(getClearButton())
    sinon.assert.calledOnce(spies.onClear)
  })
})
