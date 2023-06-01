import React from "react"
import { render, screen } from "@testing-library/react"
import SearchFilter from "./SearchFilter"
import { fireEvent, waitFor } from "@testing-library/react"

describe("SearchFilter", () => {
  const onClickStub = jest.fn()

  const upperCase = (text: string) => {
    return text.toUpperCase()
  }

  const renderSearchFilter = (props = {}) => {
    render(<SearchFilter clearFacet={onClickStub} value="" {...props} />)
  }

  it("should render a search filter correctly", () => {
    const value = "Upcoming"

    renderSearchFilter({
      value,
      labelFunction: upperCase
    })
    expect(screen.getByText("UPCOMING")).toBeInTheDocument()
  })

  it("should trigger clearFacet function on click", async () => {
    renderSearchFilter({ value: "ocw" })
    await waitFor(async () => {
      await fireEvent.click(screen.getByText("close"))
    })
    expect(onClickStub).toHaveBeenCalledTimes(1)
  })
})
