import React from "react"
import { faker } from "@faker-js/faker"
import {
  Favorites,
  LearningResourceCardTemplate as LRCardTemplate,
  TYPE_FAVORITES
} from "ol-search-ui"
import * as factories from "ol-search-ui/src/factories"
import { urls as lrUrls } from "../../api/learning-resources"
import { manageListDialogs } from "./ManageListDialogs"
import { UserListsListingPage } from "./ResourceListsListingsPage"
import {
  screen,
  renderWithProviders,
  setMockResponse,
  user,
  expectProps
} from "../../test-utils"

const spyLRCardTemplate = jest.mocked(LRCardTemplate)

describe("UserListsListingPage", () => {
  /**
   * Set up the mock API responses for lists page.
   */
  const setup = ({
    favoritesCount = faker.datatype.number({ min: 2, max: 5 }),
    listsCount = faker.datatype.number({ min: 2, max: 5 })
  } = {}) => {
    const favorites = factories.makeFavorites({ count: favoritesCount })
    const userLists = factories.makeUserListsPaginated({ count: listsCount })
    const topics = [
      ...userLists.results,
      ...favorites.results.map(fav => fav.content_data)
    ].flatMap(list => list.topics)
    setMockResponse.get(lrUrls.favorite.listing(), favorites)
    setMockResponse.get(lrUrls.userList.listing(), userLists)
    setMockResponse.get(lrUrls.topics.listing, topics)
    const { history } = renderWithProviders(<UserListsListingPage />, {
      url: "/lists"
    })
    return { favorites, userLists, history }
  }

  test("renders a card for each userlist", async () => {
    const { userLists } = setup()
    const titles = userLists.results.map(resource => resource.title)
    const headings = await screen.findAllByRole("heading", {
      name: value => titles.includes(value)
    })

    // for sanity
    expect(headings.length).toBeGreaterThan(0)
    expect(titles.length).toBe(headings.length)

    expect(headings.map(h => h.textContent)).toEqual(titles)
    userLists.results.forEach(resource => {
      expectProps(spyLRCardTemplate, { resource })
    })
  })

  test("renders a card for favorites with correct length", async () => {
    const { favorites } = setup()
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

  test("Clicking edit -> Edit opens the editing dialog", async () => {
    const editList = jest
      .spyOn(manageListDialogs, "editList")
      .mockImplementationOnce(jest.fn())

    const { userLists } = setup()
    const targetList = faker.helpers.arrayElement(userLists.results)
    const menuButton = await screen.findByRole("button", {
      name: `Edit list ${targetList.title}`
    })
    await user.click(menuButton)
    const editButton = screen.getByRole("menuitem", { name: "Edit" })
    await user.click(editButton)

    expect(editList).toHaveBeenCalledWith(targetList)
  })

  test("Clicking edit -> Delete opens the deletion dialog", async () => {
    const deleteList = jest
      .spyOn(manageListDialogs, "deleteList")
      .mockImplementationOnce(jest.fn())

    const { userLists } = setup()
    const targetList = faker.helpers.arrayElement(userLists.results)
    const menuButton = await screen.findByRole("button", {
      name: `Edit list ${targetList.title}`
    })
    await user.click(menuButton)
    const deleteButton = screen.getByRole("menuitem", { name: "Delete" })

    await user.click(deleteButton)

    // Check details of this dialog elsewhere
    expect(deleteList).toHaveBeenCalledWith(targetList)
  })

  test("Clicking new list opens the creation dialog", async () => {
    const createUserList = jest
      .spyOn(manageListDialogs, "createUserList")
      .mockImplementationOnce(jest.fn())
    setup()
    const newListButton = await screen.findByRole("button", {
      name: "Create new list"
    })

    expect(createUserList).not.toHaveBeenCalled()
    await user.click(newListButton)

    // Check details of this dialog elsewhere
    expect(createUserList).toHaveBeenCalled()
  })

  test("Clicking on list title navigates to list page", async () => {
    const { userLists, history } = setup()
    const targetList = faker.helpers.arrayElement(userLists.results)
    const listTitle = await screen.findByRole("heading", {
      name: targetList.title
    })
    await user.click(listTitle)
    expect(history.location).toEqual(
      expect.objectContaining({
        pathname: `/infinite/lists/${targetList.id}`,
        search:   "",
        hash:     ""
      })
    )
  })
})
