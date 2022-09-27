import { Router } from "react-router"
import { createMemoryHistory } from "history"
import RoutedDrawer, { RoutedDrawerProps } from "./RoutedDrawer"
import { render, screen } from "@testing-library/react"
import user from "@testing-library/user-event"
import React from "react"

const TestDrawerContents = ({ closeDrawer }: { closeDrawer: () => void }) => (
  <section>
    <h2>DrawerContent</h2>
    <button type="button" onClick={closeDrawer}>
      CloseFn
    </button>
  </section>
)
const assertDrawerIsOpen = () =>
  screen.getByRole("heading", { name: "DrawerContent" })
const assertDrawerIsClosed = () => {
  expect(screen.queryByRole("heading", { name: "DrawerContent" })).toBe(null)
}

const renderRoutedDrawer = <P extends string, R extends P>(
  props: Omit<RoutedDrawerProps<P, R>, "children">,
  initialSearchParams: string
) => {
  const history = createMemoryHistory({
    initialEntries: [{ search: initialSearchParams }]
  })
  const childFn = jest.fn(TestDrawerContents)
  render(
    <Router history={history}>
      <RoutedDrawer {...props}>{childFn}</RoutedDrawer>
    </Router>
  )
  return { history, childFn }
}

describe("RoutedDrawer", () => {
  it.each([
    {
      params:         ["a", "b", "c"],
      requiredParams: ["a", "b"],
      initialSearch:  "?a=1",
      calls:          0
    },
    {
      params:         ["a", "b"],
      requiredParams: ["a", "b"],
      initialSearch:  "?a=1&b=2",
      calls:          1
    },
    {
      params:         ["a", "b", "c"],
      requiredParams: ["a", "b"],
      initialSearch:  "?a=1&b=2",
      calls:          1
    }
  ])(
    "Calls childFn if and only all required params are present in URL",
    ({ params, requiredParams, initialSearch, calls }) => {
      const { childFn } = renderRoutedDrawer(
        { params, requiredParams },
        initialSearch
      )
      expect(childFn).toHaveBeenCalledTimes(calls)
    }
  )

  it.each([
    {
      params:         ["a", "b", "c"],
      requiredParams: ["a", "b"],
      initialSearch:  "?a=1&b=2&c=3&d=4",
      childProps:     {
        params:      { a: "1", b: "2", c: "3" },
        closeDrawer: expect.any(Function)
      }
    },
    {
      params:         ["a", "b", "c"],
      requiredParams: ["a", "b"],
      initialSearch:  "?a=1&b=2&d=4",
      childProps:     {
        params:      { a: "1", b: "2", c: null },
        closeDrawer: expect.any(Function)
      }
    }
  ])(
    "Calls childFn with only the params specified in props.params",
    ({ params, requiredParams, initialSearch, childProps }) => {
      const { childFn } = renderRoutedDrawer(
        { params, requiredParams },
        initialSearch
      )
      expect(childFn).toHaveBeenCalledWith(childProps)
    }
  )

  it("Includes a close button that closes drawer", async () => {
    const params = ["a"]
    const requiredParams = ["a"]
    const initialSearch = "?a=1"
    const { history } = renderRoutedDrawer(
      { params, requiredParams },
      initialSearch
    )

    assertDrawerIsOpen()
    await user.click(screen.getByRole("button", { name: "CloseFn" }))
    assertDrawerIsClosed()

    expect(history.location.search).toBe("")
  })

  it("Passes a closeDrawer callback to child that can close the drawer", async () => {
    const params = ["a"]
    const requiredParams = ["a"]
    const initialSearch = "?a=1"
    const { history } = renderRoutedDrawer(
      { params, requiredParams },
      initialSearch
    )

    assertDrawerIsOpen()
    await user.click(screen.getByRole("button", { name: "Close" }))
    assertDrawerIsClosed()

    expect(history.location.search).toBe("")
  })
})
