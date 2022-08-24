import React from "react"
import { LearningResourceDrawer } from "./LearningResourceDrawer"
import { makeCourseResult } from "../factories"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

const mock = jest.fn()

let resource
jest.mock("react-query", () => {
  return {
    __esModule: true,
    useQuery:   jest.fn(() => resource)
  }
})

describe("LearningResourceDrawer", () => {
  test("should display the resource when a drawer object is set", async () => {
    resource = { data: makeCourseResult() }

    render(
      <LearningResourceDrawer
        drawerObject={{ id: 24, type: "course" }}
        setDrawerObject={mock}
      />
    )
    expect(screen.getByText(resource.data.title)).toBeInTheDocument()
  })

  test("should have a button to dismiss the drawer", async () => {
    resource = { data: makeCourseResult() }

    render(
      <LearningResourceDrawer
        drawerObject={{ id: 2, type: "course" }}
        setDrawerObject={mock}
      />
    )

    expect(screen.getByText(resource.data.title)).toBeInTheDocument()

    await waitFor(async () => {
      await fireEvent.click(screen.getByText("clear"))
    })

    expect(mock).toHaveBeenCalledWith(null)
  })
})
