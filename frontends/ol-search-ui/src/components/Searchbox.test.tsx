import React from "react"
import { ThemeProvider } from "styled-components"
import { render, screen, prettyDOM } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Searchbox, { SearchboxProps } from "./Searchbox"
import { combinedTheme, assertInstanceOf } from "ol-util"

const getSearchInput = () => {
  const element = screen.getByLabelText("Search for")
  assertInstanceOf(element, HTMLInputElement)
  return element
}

const getSearchButton = (): HTMLButtonElement  => {
  const button = screen.getAllByLabelText("Search")[0]
  assertInstanceOf(button, HTMLButtonElement)
  return button
}

/**
 * This actually returns an icon (inside a button)
 */
 const getClearButton = (): HTMLButtonElement  => {
  const button = screen.getByLabelText("Clear")
  assertInstanceOf(button, HTMLButtonElement)
  return button
}

const searchEvent = (value: string) =>
  expect.objectContaining({ target: { value } })

describe("Searchbox", () => {
  const renderSearchbox = (props: Partial<SearchboxProps> = {}) => {
    const { value = "", ...otherProps } = props
    const onSubmit = jest.fn()
    const onChange = jest.fn(e => e.persist())
    const onClear = jest.fn()
    render(
      <ThemeProvider theme={combinedTheme}>
        <Searchbox
          value={value}
          onSubmit={onSubmit}
          onChange={onChange}
          onClear={onClear}
          {...otherProps}
        />
      </ThemeProvider>
    )
    const user = userEvent.setup()
    const spies = { onClear, onChange, onSubmit }
    return { user, spies }
  }

  it("Renders the given value in input", () => {
    renderSearchbox({value: "math"})
    expect(getSearchInput().value).toBe("math")
  })

  it("Calls onChange when text is typed", async () => {
    const { user, spies } = renderSearchbox({ value: "math" })
    const input = getSearchInput()
    await user.type(getSearchInput(), "s")
    expect(spies.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: input })
    )
  })

  it("Calls onSubmit when search is clicked", async () => {
    const { user, spies } = renderSearchbox({ value: "chemistry" })
    await user.click(getSearchButton())
    expect(spies.onSubmit).toHaveBeenCalledWith(searchEvent("chemistry"))
  })

  it("Calls onClear clear is clicked", async () => {
    const { user, spies } = renderSearchbox({ value: "biology" })
    await user.click(getClearButton())
    expect(spies.onClear).toHaveBeenCalled()
  })

  it("does not show an alert if no validation message", () => {
    renderSearchbox()
    expect(screen.queryByRole("alert")).toBe(null)
  })

  it("does show an alert if validation message", () => {
    renderSearchbox({ validation: "Oh no" })
    const alertEl = screen.getByRole("alert")
    expect(alertEl).toHaveTextContent("Oh no")
  })

  it("Renders children", () => {
    renderSearchbox({ children: <div>Some child element</div> })
    const theChild = screen.getByText("Some child element")
    expect(theChild).toBeInstanceOf(HTMLDivElement)
  })
})
