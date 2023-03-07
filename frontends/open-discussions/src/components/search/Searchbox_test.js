import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { assert } from "chai"
import sinon from "sinon"
import Searchbox, { SearchboxProps } from "./Searchbox"
import * as SearchInput from "./SearchInput"

const SearchInputSpy = sinon.spy(SearchInput, "default")

describe("Searchbox", () => {
  const renderSearchbox = (props: Partial<SearchboxProps> = {}) => {
    const { value = "", ...otherProps } = props
    const onSubmit = sinon.stub()
    const onChange = sinon.spy(e => e.persist())
    const onClear = sinon.stub()
    render(
      <Searchbox
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

  it("Passes the appropriate props to SearchInput", () => {
    const searchInputProps: SearchInputProps = {
      className:       "some-classname",
      classNameSubmit: "some-classname-submit",
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
    sinon.assert.calledWith(SearchInputSpy, sinon.match(searchInputProps))
  })

  it("does not show an alert if no validation message", () => {
    renderSearchbox()
    assert.equal(screen.queryByRole("alert"), null)
  })

  it("does show an alert if validation message", () => {
    renderSearchbox({ validation: "Oh no" })
    const alertEl = screen.getByRole("alert")
    assert.ok(alertEl.textContent.includes("Oh no"))
  })

  it("Renders children", () => {
    renderSearchbox({ children: <div>Some child element</div> })
    screen.getByText("Some child element")
  })
})
