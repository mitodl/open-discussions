import React from "react"
import { ThemeProvider } from "styled-components"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Searchbox, { SearchboxUncontrolled } from "./Searchbox"
import { combinedTheme, assertInstanceOf } from "ol-util"

const getSearchInput = () => {
  const element = screen.getByLabelText("Search for")
  assertInstanceOf(element, HTMLInputElement)
  return element
}

/**
 * This actually returns an icon (inside a button)
 */
const getSearchButton = () => screen.getByText("search")

/**
 * This actually returns an icon (inside a button)
 */
const getClearButton = () => screen.getByText("clear")

const searchEvent = (value: string) =>
  expect.objectContaining({ target: { value } })

describe("Uncontrolled Searchbox", () => {
  const renderUncontrolledSearchbox = (
    props: Partial<SearchboxUncontrolled> = {}
  ) => {
    const onSubmit = jest.fn()
    render(
      <ThemeProvider theme={combinedTheme}>
        <Searchbox onSubmit={onSubmit} {...props} />
      </ThemeProvider>
    )
    const user = userEvent.setup()
    const spies = { onSubmit }
    return { spies, user }
  }

  it("types text", async () => {
    const { user } = renderUncontrolledSearchbox()
    const input = getSearchInput()
    await user.type(input, "physics")

    expect(input.value).toBe("physics")
  })

  it("calls onSubmit with search value when clicked", async () => {
    const { spies, user } = renderUncontrolledSearchbox()
    const input = getSearchInput()
    await user.type(input, "physics")

    await user.click(getSearchButton())
    expect(spies.onSubmit).toHaveBeenCalledWith(searchEvent("physics"))
  })

  it("calls onSubmit with search value when user hits enter", async () => {
    const { spies, user } = renderUncontrolledSearchbox()
    const input = getSearchInput()
    await user.type(input, "physics")
    await user.type(input, "{Enter}")
    expect(spies.onSubmit).toHaveBeenCalledWith(searchEvent("physics"))
  })

  it("Clears input when clear is clicked", async () => {
    const { user } = renderUncontrolledSearchbox()
    const input = getSearchInput()
    await user.type(input, "physics")

    expect(input.value).toBe("physics")
    await user.click(getClearButton())
    expect(input.value).toBe("")
  })

  it("does not show an alert if no validation message", () => {
    renderUncontrolledSearchbox()
    expect(screen.queryByRole("alert")).toBe(null)
  })

  it("does show an alert if validation message", () => {
    renderUncontrolledSearchbox({ validation: "Oh no" })
    const alertEl = screen.getByRole("alert")
    expect(alertEl).toHaveTextContent("Oh no")
  })

  it("Renders children", () => {
    renderUncontrolledSearchbox({ children: <div>Some child element</div> })
    const theChild = screen.getByText("Some child element")
    expect(theChild).toBeInstanceOf(HTMLDivElement)
  })
})

describe("Controlled searchbox", () => {
  const renderControlledSearchbox = (value: string) => {
    const onSubmit = jest.fn()
    const onChange = jest.fn((e) => e.persist())
    const onClear = jest.fn()
    render(
      <ThemeProvider theme={combinedTheme}>
        <Searchbox
          onSubmit={onSubmit}
          value={value}
          onChange={onChange}
          onClear={onClear}
        />
      </ThemeProvider>
    )
    const user = userEvent.setup()
    const spies = { onClear, onChange, onSubmit }
    return { user, spies }
  }

  it("Renders the given value in input", () => {
    renderControlledSearchbox("math")
    expect(getSearchInput().value).toBe("math")
  })

  it("Calls onChange when text is typed", async () => {
    const { user, spies } = renderControlledSearchbox("math")
    const input = getSearchInput()
    await user.type(getSearchInput(), "s")
    expect(spies.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: input })
    )
  })

  it("Calls onSubmit when search is clicked", async () => {
    const { user, spies } = renderControlledSearchbox("chemistry")
    await user.click(getSearchButton())
    expect(spies.onSubmit).toHaveBeenCalledWith(searchEvent("chemistry"))
  })

  it("Calls onClear clear is clicked", async () => {
    const { user, spies } = renderControlledSearchbox("biology")
    await user.click(getClearButton())
    expect(spies.onClear).toHaveBeenCalled()
  })
})
