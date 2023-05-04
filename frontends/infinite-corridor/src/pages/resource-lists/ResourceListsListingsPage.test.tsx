import React from "react"
import { faker } from "@faker-js/faker"
import {
  Favorites,
  LearningResourceCardTemplate as LRCardTemplate,
  StaffList,
  TYPE_FAVORITES,
  UserList
} from "ol-search-ui"
import * as factories from "ol-search-ui/src/factories"
import { urls as lrUrls } from "../../api/learning-resources"
import { manageListDialogs } from "./ManageListDialogs"
import {
  StaffListsListingPage,
  UserListsListingPage
} from "./ResourceListsListingsPage"
import {
  screen,
  renderWithProviders,
  setMockResponse,
  user,
  expectProps
} from "../../test-utils"
import axios from "../../libs/axios"

const spyLRCardTemplate = jest.mocked(LRCardTemplate)

const modes = [
  {
    label:      "UserLists",
    pageName:   "UserListsListingPage",
    mode:       "userlist",
    listingUrl: lrUrls.userList.listing()
  },
  {
    label:      "StaffLists",
    pageName:   "StaffListsListingPage",
    mode:       "stafflist",
    listingUrl: lrUrls.staffList.listing()
  }
] as const
/**
 * Set up the mock API responses for lists pages.
 */
const setup = (
  mode: "userlist" | "stafflist",
  {
    favoritesCount = faker.datatype.number({ min: 2, max: 5 }),
    listsCount = faker.datatype.number({ min: 2, max: 5 })
  } = {}
) => {
  const favorites = factories.makeFavorites({ count: favoritesCount })
  const userLists = factories.makeUserListsPaginated({ count: listsCount })
  const staffLists = factories.makeStaffListsPaginated({ count: listsCount })
  setMockResponse.get(lrUrls.favorite.listing(), favorites)
  setMockResponse.get(lrUrls.userList.listing(), userLists)
  setMockResponse.get(lrUrls.staffList.listing(), staffLists)

  const PageComponent =
    mode === "userlist" ? UserListsListingPage : StaffListsListingPage
  const url = mode === "userlist" ? "/lists" : "/stafflists"
  const lists = mode === "userlist" ? userLists : staffLists

  const { history } = renderWithProviders(<PageComponent />, { url })

  const randomList = faker.helpers.arrayElement(
    lists.results as (StaffList | UserList)[]
  )

  return { favorites, lists, randomList, history }
}

test("UserListsListingPage is titled 'My Lists'", () => {
  setup("userlist")
  screen.getByRole("heading", { name: "My Lists" })
})

test("StaffListsListingPage is titled 'Learning Lists'", () => {
  setup("stafflist")
  screen.getByRole("heading", { name: "Learning Lists" })
})

test.each(modes)(
  "$pageName renders a card for each userlist",
  async ({ mode, listingUrl }) => {
    const { lists } = setup(mode)
    const titles = lists.results.map(resource => resource.title)
    const headings = await screen.findAllByRole("heading", {
      name: value => titles.includes(value)
    })

    // listing API queried
    expect(axios.get).toHaveBeenCalledWith(listingUrl)

    // for sanity
    expect(headings.length).toBeGreaterThan(0)
    expect(titles.length).toBe(headings.length)

    expect(headings.map(h => h.textContent)).toEqual(titles)
    lists.results.forEach(resource => {
      expectProps(spyLRCardTemplate, { resource })
    })
  }
)

test("UserListsListingPage renders a card for favorites with correct length", async () => {
  const { favorites } = setup("userlist")
  const numFavorites = favorites.count
  // for sanity
  expect(numFavorites).toBeGreaterThan(0)

  await screen.findByRole("heading", { name: "My Favorites" })

  const favoritesList: Partial<Favorites> = {
    title:       "My Favorites",
    item_count:  numFavorites,
    object_type: TYPE_FAVORITES
  }
  expectProps(spyLRCardTemplate, {
    resource: expect.objectContaining(favoritesList)
  })
})

test.each(modes)(
  "$pageName: Clicking edit -> Edit on opens the editing dialog",
  async ({ mode }) => {
    const editList = jest
      .spyOn(manageListDialogs, "editList")
      .mockImplementationOnce(jest.fn())

    const { randomList } = setup(mode)
    const menuButton = await screen.findByRole("button", {
      name: `Edit list ${randomList.title}`
    })
    await user.click(menuButton)
    const editButton = screen.getByRole("menuitem", { name: "Edit" })
    await user.click(editButton)

    expect(editList).toHaveBeenCalledWith(randomList)
  }
)

test.each(modes)(
  "$pageName: Clicking edit -> Delete opens the deletion dialog",
  async ({ mode }) => {
    const deleteList = jest
      .spyOn(manageListDialogs, "deleteList")
      .mockImplementationOnce(jest.fn())

    const { randomList } = setup(mode)
    const menuButton = await screen.findByRole("button", {
      name: `Edit list ${randomList.title}`
    })
    await user.click(menuButton)
    const deleteButton = screen.getByRole("menuitem", { name: "Delete" })

    await user.click(deleteButton)

    // Check details of this dialog elsewhere
    expect(deleteList).toHaveBeenCalledWith(randomList)
  }
)

test.each(modes)(
  "$pageName: Clicking new list opens the creation dialog",
  async ({ mode }) => {
    const createList = jest
      .spyOn(manageListDialogs, "createList")
      .mockImplementationOnce(jest.fn())
    setup(mode)
    const newListButton = await screen.findByRole("button", {
      name: "Create new list"
    })

    expect(createList).not.toHaveBeenCalled()
    await user.click(newListButton)

    // Check details of this dialog elsewhere
    expect(createList).toHaveBeenCalledWith(mode)
  }
)

test.each(modes)(
  "Clicking on list title navigates to list page",
  async ({ mode }) => {
    const { randomList, history } = setup(mode)
    const listTitle = await screen.findByRole("heading", {
      name: randomList.title
    })
    await user.click(listTitle)
    const viewPath = mode === "userlist" ? "lists" : "stafflists"
    expect(history.location).toEqual(
      expect.objectContaining({
        pathname: `/infinite/${viewPath}/${randomList.id}`,
        search:   "",
        hash:     ""
      })
    )
  }
)
