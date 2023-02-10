import React from "react"
import { faker } from "@faker-js/faker"
import { LearningResourceCard, UserList } from "ol-search-ui"
import * as factories from "ol-search-ui/build/factories"
import { urls as lrUrls } from "../../api/learning-resources"
import { EditListDialog } from "./ManageListDialogs"
import {
  screen,
  renderTestApp,
  setMockResponse,
  user,
  expectProps
} from "../../test-utils"
import { waitForElementToBeRemoved } from "@testing-library/react"

const spyLearningResourceCard = jest.mocked(LearningResourceCard)

jest.mock("./ManageListDialogs", () => {
  const actual = jest.requireActual("./ManageListDialogs")
  return {
    ...actual,
    EditListDialog: jest.fn(actual.EditListDialog)
  }
})
jest.mock("../LearningResourceDrawer", () => {
  const actual = jest.requireActual("../LearningResourceDrawer")
  return {
    __esModule: true,
    ...actual,
    default:    jest.fn(() => <div>LearningResourceDrawer</div>)
  }
})

const spyEditListDialog = jest.mocked(EditListDialog)

describe("UserListDetailsPage", () => {
  /**
   * Set up the mock API responses for lists page.
   */
  const setup = (itemsCount?: number, listOverrides?: Partial<UserList>) => {
    const userList = factories.makeUserList(listOverrides)
    const paginatedItems = factories.makeUserListItemsPaginated(
      itemsCount ?? faker.datatype.number({ min: 2, max: 5 })
    )
    const items = paginatedItems.results.map(r => r.content_data)
    const topics = [
      ...userList.topics,
      ...factories.makeTopicsPaginated(3).results
    ]
    setMockResponse.get(lrUrls.userListDetails(userList.id), userList)
    setMockResponse.get(lrUrls.userListItems(userList.id), paginatedItems)
    setMockResponse.get(lrUrls.topics(), topics)

    const { history } = renderTestApp({ url: `/lists/${userList.id}` })
    return { history, userList, items }
  }

  test("renders list title", async () => {
    const { userList } = setup()
    await screen.findByRole("heading", { name: userList.title })
  })

  test("Renders a card for each item in list", async () => {
    const { items } = setup()
    const titles = items.map(item => item.title)
    const headings = await screen.findAllByRole("heading", {
      name: value => titles.includes(value)
    })
    expect(headings.map(h => h.textContent)).toEqual(titles)
    items.forEach(resource => {
      expectProps(spyLearningResourceCard, { resource })
    })
  })

  test("Edit buttons opens editing dialog", async () => {
    const { userList } = setup()
    const editButton = await screen.findByRole("button", { name: "Edit" })
    await user.click(editButton)
    await screen.findByRole("dialog", { name: "Edit list" })
    expectProps(spyEditListDialog, { resource: userList })
  })

  test.each([
    { count: 0, nullMessage: false },
    { count: 3, nullMessage: true }
  ])(
    "Renders empty message if and only if list is empty",
    async ({ count, nullMessage }) => {
      setup(count)
      const loading = screen.getByText("Loading", { exact: false })
      await waitForElementToBeRemoved(loading)
      const message = screen.queryByText("There are no items in this list yet.")
      expect(message === null).toBe(nullMessage)
    }
  )

  test("Clicking a card title routes to resource drawer", async () => {
    const { items, history } = setup()
    const item = faker.helpers.arrayElement(items)
    const cardTitle = await screen.findByRole("heading", { name: item.title })

    await user.click(cardTitle)
    const searchParams = new URLSearchParams(history.location.search)
    expect(searchParams.get("resource_id")).toEqual(String(item.id))
    expect(searchParams.get("resource_type")).toEqual(item.object_type)
  })
})
