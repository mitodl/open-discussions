import { render, screen } from "@testing-library/react"
import user from "@testing-library/user-event"
import React, { useCallback } from "react"
import { MemoryRouter } from "react-router"
import useSearchParams from "./useSearchParams"

const TestComponent = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const onClick = useCallback(() => {
    const clicks = Number(searchParams.get("count")) || 0
    const newParams = new URLSearchParams()
    newParams.set("count", String(clicks + 1))
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])
  return (
    <div>
      <button onClick={onClick}></button>
      <div>{`params: ${searchParams}`}</div>
    </div>
  )
}

describe("useSearchParams", () => {
  it.each([
    { search: "?count=3", text: "params: count=3" },
    { search: "", text: "params:" }
  ])("Makes searchParams available", ({ search, text }) => {
    const initialEntries = [search]
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <TestComponent />
      </MemoryRouter>
    )
    screen.getByText(text)
  })

  it("re-renders when setSearchParams is called", async () => {
    const initialEntries = ["?count=3"]
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <TestComponent />
      </MemoryRouter>
    )
    screen.getByText("params: count=3")
    const button = screen.getByRole("button")
    user.click(button)
    await screen.findByText("params: count=4")
  })
})
