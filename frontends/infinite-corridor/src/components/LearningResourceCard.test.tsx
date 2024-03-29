import React from "react"
import * as NiceModal from "@ebay/nice-modal-react"
import {
  makeLearningResource,
  makeListItemMember,
  makeSearchResult
} from "ol-search-ui/src/factories"
import { renderWithProviders, user, screen, within } from "../test-utils"
import type { User } from "../test-utils"
import LearningResourceCard from "./LearningResourceCard"
import type { LearningResourceCardProps } from "./LearningResourceCard"
import AddToListDialog from "../pages/resource-lists/AddToListDialog"

jest.mock("@ebay/nice-modal-react", () => {
  const actual = jest.requireActual("@ebay/nice-modal-react")
  return {
    __esModule: true,
    ...actual,
    show:       jest.fn()
  }
})

type SetupOptions = {
  userSettings?: Partial<User>
  props?: Partial<LearningResourceCardProps>
}
const setup = ({ userSettings: user, props = {} }: SetupOptions = {}) => {
  const { resource = makeLearningResource(), variant = "column" } = props
  const { view, history } = renderWithProviders(
    <LearningResourceCard {...props} resource={resource} variant={variant} />,
    { user }
  )
  return { resource, view, history }
}

const labels = {
  addToUserLists:  "Add to my lists",
  addToStaffLists: "Add to MIT lists"
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
    { userSettings: { is_authenticated: true }, canAddToList: true },
    { userSettings: { is_authenticated: false }, canAddToList: false },
    {
      userSettings: { is_authenticated: false },
      canAddToList: false,
      // Unauthenticated users have search results with lists = undefined
      resource:     { ...makeSearchResult()._source, lists: undefined }
    }
  ])(
    "Shows 'Add to my lists' button if and only if user is logged in",
    ({ userSettings, canAddToList, resource }) => {
      setup({ userSettings, props: { resource } })
      const button = screen.queryByRole("button", {
        name: labels.addToUserLists
      })
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
      setup({ props, userSettings: { is_authenticated: true } })
      const button = screen.getByRole("button", { name: labels.addToUserLists })
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
        userSettings: { is_authenticated: true },
        props:        { resource }
      })
      const button = screen.getByRole("button", { name: labels.addToUserLists })
      within(button).getByTestId(testId)
    }
  )

  test.each([
    {
      userSettings: { is_authenticated: true },
      btnLabel:     labels.addToUserLists,
      mode:         "userlist"
    },
    {
      userSettings: { is_staff_list_editor: true },
      btnLabel:     labels.addToStaffLists,
      mode:         "stafflist"
    }
  ])(
    "Clicking $btnLabel button opens AddToListDialog(mode=$mode)",
    async ({ userSettings, mode, btnLabel }) => {
      const showModal = jest.mocked(NiceModal.show)

      const { resource } = setup({ userSettings })
      const button = screen.getByRole("button", { name: btnLabel })

      expect(showModal).not.toHaveBeenCalled()
      await user.click(button)
      expect(showModal).toHaveBeenCalledWith(AddToListDialog, {
        resourceKey: resource,
        mode
      })
    }
  )

  test("Applies className to the resource card", () => {
    const { view } = setup({ props: { className: "test-class" } })
    expect(view.container.firstChild).toHaveClass("test-class")
  })

  test.each([
    { userSettings: { is_staff_list_editor: false }, shouldShow: false },
    { userSettings: { is_staff_list_editor: true }, shouldShow: true }
  ])(
    "Shows 'Add to my lists' button if and only if user is logged in",
    ({ userSettings, shouldShow }) => {
      setup({ userSettings })
      const button = screen.queryByRole("button", {
        name: labels.addToStaffLists
      })
      expect(!!button).toBe(shouldShow)
    }
  )

  test("Clicking 'Add to MIT lists' button opens AddToListDialog", async () => {
    const showModal = jest.mocked(NiceModal.show)

    const { resource } = setup({ userSettings: { is_staff_list_editor: true } })
    const button = screen.getByRole("button", { name: labels.addToStaffLists })

    expect(showModal).not.toHaveBeenCalled()
    await user.click(button)
    expect(showModal).toHaveBeenCalledWith(AddToListDialog, {
      resourceKey: resource,
      mode:        "stafflist"
    })
  })
})
