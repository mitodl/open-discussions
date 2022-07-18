import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SearchInput, { SearchInputProps } from "./SearchInput"
import { assertInstanceOf } from "ol-util"

const getSearchInput = () => {
  const element = screen.getByLabelText("Search for")
  assertInstanceOf(element, HTMLInputElement)
  return element
}

/**
 * There are two search buttons at the moment, a magnifier on the left
 * and an arrow -> on the right.
 */
const getSearchButton = ({ rhs = false } = {}): HTMLButtonElement => {
  const buttonIndex = rhs ? 1 : 0
  const button = screen.getAllByLabelText("Search")[buttonIndex]
  assertInstanceOf(button, HTMLButtonElement)
  return button
}

/**
 * This actually returns an icon (inside a button)
 */
const getClearButton = (): HTMLButtonElement => {
  const button = screen.getByLabelText("Clear")
  assertInstanceOf(button, HTMLButtonElement)
  return button
}

const searchEvent = (value: string) =>
  expect.objectContaining({ target: { value } })

describe("Searchbox", () => {
  const renderSearchInput = (props: Partial<SearchInputProps> = {}) => {
    const { value = "", ...otherProps } = props
    const onSubmit = jest.fn()
    const onChange = jest.fn((e) => e.persist())
    const onClear = jest.fn()
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
    expect(getSearchInput().value).toBe("math")
  })

  it("Calls onChange when text is typed", async () => {
    const { user, spies } = renderSearchInput({ value: "math" })
    const input = getSearchInput()
    await user.type(getSearchInput(), "s")
    expect(spies.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: input })
    )
  })

  it.each([{ rhs: false }, { rhs: true }])(
    "Calls onSubmit when search is clicked",
    async ({ rhs }) => {
      const { user, spies } = renderSearchInput({ value: "chemistry" })
      await user.click(getSearchButton({ rhs }))
      expect(spies.onSubmit).toHaveBeenCalledWith(searchEvent("chemistry"))
    }
  )

  it("Calls onClear clear is clicked", async () => {
    const { user, spies } = renderSearchInput({ value: "biology" })
    await user.click(getClearButton())
    expect(spies.onClear).toHaveBeenCalled()
  })
})
