import React from "react"
import { makeLearningResource } from "ol-search-ui/src/factories"
import { renderWithProviders } from "../test-utils"
import LearningResourceDrawer from "./LearningResourceDrawer"
import LearningResourceCard from "./LearningResourceCard"
import type { LearningResourceCardProps } from "./LearningResourceCard"
import AddToListDialog from "../pages/user-lists/AddToListDialog"

jest.mock("./LearningResourceDrawer", () => {
  const actual = jest.requireActual("./LearningResourceDrawer")
  return {
    __esModule: true,
    ...actual,
    default:    jest.fn(() => <div>LearningResourceDrawer</div>)
  }
})
jest.mock("../pages/user-lists/AddToListDialog", () => {
  const actual = jest.requireActual("../pages/user-lists/AddToListDialog")
  return {
    __esModule: true,
    ...actual,
    default:    jest.fn(() => <div>AddToListDialog</div>)
  }
})

const setup = (props: Partial<LearningResourceCardProps> = {}) => {
  const {
    resource = makeLearningResource(),
    variant = "column",
  } = props
  renderWithProviders(
    <>
      <LearningResourceCard {...props} resource={resource} variant={variant} />
      <LearningResourceDrawer />
    </>
  )
}

describe("LearningResourceCard", () => {
  test("addition", () => {
    expect(1 + 1).toBe(2)
  })
})
