import React from "react"
import * as NiceModal from "@ebay/nice-modal-react"
import {
  makeLearningResource,
  makeListItemMember,
  makeSearchResult
} from "ol-search-ui/src/factories"
import { renderWithProviders, user, screen, within } from "../test-utils"
import LearningResourceCard from "./LearningResourceCard"
import type { LearningResourceCardProps } from "./LearningResourceCard"
import AddToListDialog from "../pages/user-lists/AddToListDialog"

jest.mock("@ebay/nice-modal-react", () => {
  const actual = jest.requireActual("@ebay/nice-modal-react")
  return {
    __esModule: true,
    ...actual,
    show:       jest.fn()
  }
})

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
    { isAuthenticated: false, canAddToList: false },
    {
      isAuthenticated: false,
      canAddToList:    false,
      resource:        {
        ...makeSearchResult()._source,
        lists: undefined
      }
    }
  ])(
    "Shows 'add to list' button if and only if user is logged in",
    ({ isAuthenticated, canAddToList, resource }) => {
      setup({ isAuthenticated, props: { resource } })
      const button = screen.queryByRole("button", { name: "Add to list" })
      expect(!!button).toBe(canAddToList)
    }
  )

  test.each([
    // The testId is added by MUI
    {
      style:    "outlined",
      is:       "is not",
      testId:   "BookmarkBorderIcon",
      resource: makeLearningResource({ lists: [] })
    },
    {
      style:    "filled",
      is:       "is",
      testId:   "BookmarkIcon",
      resource: makeLearningResource({ lists: [makeListItemMember()] })
    }
  ])(
    "Bookmark icon is $style if resource $is in list",
    ({ testId, resource }) => {
      const props = { resource }
      setup({ isAuthenticated: true, props })
      const button = screen.getByRole("button", { name: "Add to list" })
      within(button).getByTestId(testId)
    }
  )

  test.each([
    // The testId is added by MUI
    {
      style:    "outlined",
      testId:   "BookmarkBorderIcon",
      resource: makeLearningResource({ is_favorite: false })
    },
    {
      style:    "filled",
      testId:   "BookmarkIcon",
      resource: makeLearningResource({ is_favorite: true })
    }
  ])(
    "Bookmark icon is $style if resource.is_favorite=$resource.is_favorite",
    ({ testId, resource }) => {
      setup({
        isAuthenticated: true,
        props:           { resource }
      })
      const button = screen.getByRole("button", { name: "Add to list" })
      within(button).getByTestId(testId)
    }
  )

  test("Clicking 'add to list' button opens AddToListDialog", async () => {
    const showModal = jest.mocked(NiceModal.show)

    const { resource } = setup({ isAuthenticated: true })
    const button = screen.getByRole("button", { name: "Add to list" })

    expect(showModal).not.toHaveBeenCalled()
    await user.click(button)
    expect(showModal).toHaveBeenCalledWith(AddToListDialog, {
      resourceKey: resource
    })
  })

  test("Applies className to the resource card", () => {
    const { view } = setup({ props: { className: "test-class" } })
    expect(view.container.firstChild).toHaveClass("test-class")
  })
})
