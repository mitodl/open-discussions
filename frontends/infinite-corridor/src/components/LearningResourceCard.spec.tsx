import React from "react"
import {
  makeLearningResource,
  makeListItemMember
} from "ol-search-ui/src/factories"
import {
  renderWithProviders,
  user,
  screen,
  expectProps,
  within
} from "../test-utils"
import LearningResourceCard from "./LearningResourceCard"
import type { LearningResourceCardProps } from "./LearningResourceCard"
import AddToListDialog from "../pages/user-lists/AddToListDialog"
import { LearningResource } from "ol-search-ui"

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
  resourceOverrides?: Partial<LearningResource>
}
const setup = ({
  isAuthenticated = false,
  props = {},
  resourceOverrides
}: SetupOptions = {}) => {
  const {
    resource = makeLearningResource(resourceOverrides),
    variant = "column"
  } = props
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

  test.each([
    // The testId is added by MUI
    {
      style:  "outlined",
      is:     "is not",
      testId: "BookmarkBorderIcon",
      lists:  []
    },
    {
      style:  "filled",
      is:     "is",
      testId: "BookmarkIcon",
      lists:  [makeListItemMember()]
    }
  ])("Bookmark icon is $style if resource $is in list", ({ testId, lists }) => {
    setup({ isAuthenticated: true, resourceOverrides: { lists } })
    const button = screen.getByRole("button", { name: "Add to list" })
    within(button).getByTestId(testId)
  })

  test.each([
    // The testId is added by MUI
    { style: "outlined", testId: "BookmarkBorderIcon", isFavorite: false },
    { style: "filled", testId: "BookmarkIcon", isFavorite: true }
  ])(
    "Bookmark icon is $style if resource isFavorite=$isFavorite",
    ({ testId, isFavorite }) => {
      setup({
        isAuthenticated:   true,
        resourceOverrides: { is_favorite: isFavorite }
      })
      const button = screen.getByRole("button", { name: "Add to list" })
      within(button).getByTestId(testId)
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
