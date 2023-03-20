import { faker } from "@faker-js/faker"
import { UserList } from "ol-search-ui"
import * as factories from "ol-search-ui/src/factories"
import { urls as lrUrls } from "../../api/learning-resources"
import { EditListDialog } from "./ManageListDialogs"
import ItemsListing from "./ItemsListing"
import {
  screen,
  renderTestApp,
  setMockResponse,
  user,
  expectProps,
  waitFor
} from "../../test-utils"
import { User } from "../../types/settings"

jest.mock("./ManageListDialogs", () => {
  const actual = jest.requireActual("./ManageListDialogs")
  return {
    ...actual,
    EditListDialog: jest.fn(actual.EditListDialog)
  }
})
jest.mock("./ItemsListing", () => {
  const actual = jest.requireActual("./ItemsListing")
  return {
    __esModule: true,
    ...actual,
    default:    jest.fn(actual.default)
  }
})

const spyEditListDialog = jest.mocked(EditListDialog)
const spyItemsListing = jest.mocked(ItemsListing)

describe("UserListDetailsPage", () => {
  /**
   * Set up the mock API responses for lists page.
   */
  const setup = ({
    user,
    list
  }: { user?: Partial<User>; list?: Partial<UserList> } = {}) => {
    const userList = factories.makeUserList(list)
    const paginatedItems = factories.makeUserListItemsPaginated(
      faker.datatype.number({ min: 2, max: 5 })
    )
    const items = paginatedItems.results.map(r => r.content_data)
    const topics = [
      ...userList.topics,
      ...factories.makeTopicsPaginated(3).results
    ]
    setMockResponse.get(lrUrls.userList.details(userList.id), userList)
    setMockResponse.get(
      lrUrls.userList.itemsListing(userList.id),
      paginatedItems
    )
    setMockResponse.get(lrUrls.topics.listing, topics)

    const { history } = renderTestApp({ url: `/lists/${userList.id}`, user })
    return { history, userList, items, paginatedItems }
  }

  test("renders list title", async () => {
    const { userList } = setup()
    await screen.findByRole("heading", { name: userList.title })
  })

  test.each([
    { authorId: 1, userId: 1, canEdit: true },
    { authorId: 1, userId: 2, canEdit: false },
    { authorId: 1, userId: null, canEdit: false }
  ])(
    "Shows edit button if and only if user is the author",
    async ({ userId, authorId, canEdit }) => {
      const { userList } = setup({
        user: { id: userId },
        list: { author: authorId }
      })
      await screen.findByRole("heading", { name: userList.title })

      const editButton = screen.queryByRole("button", { name: "Edit" })
      expect(!!editButton).toBe(canEdit)
    }
  )

  test("Edit buttons opens editing dialog", async () => {
    const userId = faker.datatype.number()
    const { userList } = setup({
      user: { id: userId },
      list: { author: userId }
    })
    const editButton = await screen.findByRole("button", { name: "Edit" })
    await user.click(editButton)
    await screen.findByRole("dialog", { name: "Edit list" })
    expectProps(spyEditListDialog, { resource: userList })
  })

  test("Passes appropriate props to ItemsListing", async () => {
    const { paginatedItems } = setup()
    expectProps(spyItemsListing, {
      isLoading:    true,
      data:         undefined,
      emptyMessage: "There are no items in this list yet."
    })

    await waitFor(() => {
      expectProps(
        spyItemsListing,
        {
          isLoading:    false,
          data:         paginatedItems,
          emptyMessage: "There are no items in this list yet."
        },
        -1
      )
    })
  })
})
