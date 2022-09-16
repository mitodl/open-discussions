import FacetDisplay, { Props } from "./FacetDisplay"
import { render, screen } from "@testing-library/react"
import React from "react"
import { when } from "jest-when"

describe("FacetDisplay", () => {
  const facetMap = [
    ["topics", "Topics"],
    ["type", "Types"],
    ["offered_by", "Offered By"]
  ]

  const renderFacetDisplay = (props: Partial<Props> = {}) => {
    const activeFacets = {}
    const facetOptions = jest.fn()

    when(facetOptions)
      .calledWith("offered_by")
      .mockReturnValue({ buckets: [{ key: "OCW" }, { key: "MITx" }] })

    const onUpdateFacets = jest.fn()
    const clearAllFilters = jest.fn()
    const toggleFacet = jest.fn()

    render(
      <FacetDisplay
        facetMap={facetMap}
        facetOptions={facetOptions}
        activeFacets={activeFacets}
        onUpdateFacets={onUpdateFacets}
        clearAllFilters={clearAllFilters}
        toggleFacet={toggleFacet}
        {...props}
      />
    )
  }

  it("renders a FacetDisplay with expected FilterableFacets", () => {
    renderFacetDisplay()
    expect(screen.getByText("Topics")).toBeInTheDocument()
    expect(screen.getByText("Types")).toBeInTheDocument()
    expect(screen.getByText("Offered By")).toBeInTheDocument()
    expect(screen.getByText("OCW")).toBeInTheDocument()
    expect(screen.getByText("MITx")).toBeInTheDocument()
  })

  it("Excludes options that should be filtered out", () => {
    const facetOptionsFilter = { offered_by: ["MITx"] }

    renderFacetDisplay({ facetOptionsFilter })
    expect(screen.getByText("Topics")).toBeInTheDocument()
    expect(screen.getByText("Types")).toBeInTheDocument()
    expect(screen.getByText("Offered By")).toBeInTheDocument()
    expect(screen.queryByText("OCW")).not.toBeInTheDocument()
    expect(screen.getByText("MITx")).toBeInTheDocument()
  })
})
