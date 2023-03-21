import React from "react"
import { makeLearningResource } from "ol-search-ui/src/factories"
import { renderWithProviders, user, screen, expectProps } from "../test-utils"
import LearningResourceCard from "./LearningResourceCard"
import type { LearningResourceCardProps } from "./LearningResourceCard"
import AddToListDialog from "../pages/user-lists/AddToListDialog"

jest.mock("../pages/user-lists/AddToListDialog", () => {
  const actual = jest.requireActual("../pages/user-lists/AddToListDialog")
  return {
    __esModule: true,
    ...actual,
    default:    jest.fn(() => <div>AddToListDialog</div>)
  }
})

const spyAddToListDialog = jest.mocked(AddToListDialog)

type SetupOptions = {
  isAuthenticated?: boolean
  props?: Partial<LearningResourceCardProps>
}
const setup = ({ isAuthenticated = false, props = {} }: SetupOptions = {}) => {
  const { resource = makeLearningResource(), variant = "column" } = props
  const { view, history } = renderWithProviders(
    <LearningResourceCard {...props} resource={resource} variant={variant} />,
    {
      user: { is_authenticated: isAuthenticated }
    }
  )
  return { resource, view, history }
}

describe("LearningResourceCard", () => {
  test("Clicking resource title routes to LearningResourceDrawer", async () => {
    const { resource, history } = setup()
    expect(history.location.search).toBe("") // Drawer is closed
    await user.click(screen.getByRole("heading", { name: resource.title }))

    const actual = new URLSearchParams(history.location.search).sort()
    const expected = new URLSearchParams(
      Object.entries({
        resource_type: resource.object_type,
        resource_id:   String(resource.id)
      })
    ).sort()
    expect(actual).toEqual(expected)
  })

  test.each([
    { isAuthenticated: true, canAddToList: true },
    { isAuthenticated: false, canAddToList: false }
  ])(
    "Shows 'add to list' button if and only if user is logged in",
    ({ isAuthenticated, canAddToList }) => {
      setup({ isAuthenticated })
      const button = screen.queryByRole("button", { name: "Add to list" })
      expect(!!button).toBe(canAddToList)
    }
  )

  test("Clicking 'add to list' button opens AddToListDialog", async () => {
    const { resource } = setup({ isAuthenticated: true })
    const button = screen.getByRole("button", { name: "Add to list" })
    expect(spyAddToListDialog).not.toHaveBeenCalled()
    await user.click(button)
    expectProps(spyAddToListDialog, {
      resourceKey: expect.objectContaining({
        id:          resource.id,
        object_type: resource.object_type
      }),
      open: true
    })
  })

  test("Applies className to the resource card", () => {
    const { view } = setup({ props: { className: "test-class" } })
    expect(view.container.firstChild).toHaveClass("test-class")
  })
})
