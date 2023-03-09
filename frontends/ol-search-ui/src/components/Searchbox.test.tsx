import React from "react"
import { ThemeProvider } from "styled-components"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Searchbox, { SearchboxProps } from "./Searchbox"
import { combinedTheme } from "ol-util"
import SearchInput, { SearchInputProps } from "./SearchInput"

const SearchInputSpy = SearchInput as jest.Mock<
  ReturnType<typeof SearchInput>,
  Parameters<typeof SearchInput>
>

jest.mock("./SearchInput", () => {
  const actual = jest.requireActual("./SearchInput")
  return {
    ...actual,
    __esModule: true,
    default:    jest.fn(actual.default)
  }
})

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

  it("Passes the appropriate props to SearchInput", () => {
    const searchInputProps: SearchInputProps = {
      onSubmit:        jest.fn(),
      onClear:         jest.fn(),
      onChange:        jest.fn(),
      className:       "some-classname",
      classNameClear:  "some-classname-clear",
      classNameSearch: "some-classname-search",
      value:           "some-value",
      placeholder:     "some-placeholder",
      autoFocus:       true
    }
    /**
     * Need to rename className to classNameInput for Searchbox
     */
    const { className, ...others } = searchInputProps
    const searchboxProps = { ...others, classNameInput: className }
    renderSearchbox(searchboxProps)
    expect(SearchInputSpy).toHaveBeenCalledWith(
      expect.objectContaining(searchInputProps),
      expect.anything() // Functional components second arg is Context
    )
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
