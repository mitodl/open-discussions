import FacetDisplay, { FacetDisplayProps } from "./FacetDisplay"
import type { FacetManifest } from "../interfaces"
import { render, screen } from "@testing-library/react"
import React from "react"

describe("FacetDisplay", () => {
  const facetMap: FacetManifest = [
    ["topics", "Topics"],
    ["type", "Types"],
    ["department_name", "Departments"]
  ]

  const renderFacetDisplay = (props: Partial<FacetDisplayProps> = {}) => {
    const activeFacets = {}
    const facetOptions = jest.fn()
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
    expect(screen.getByText("Departments")).toBeInTheDocument()
  })
})
