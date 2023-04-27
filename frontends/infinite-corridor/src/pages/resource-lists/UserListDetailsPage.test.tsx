import { faker } from "@faker-js/faker"
import { UserList, LearningResourceType as LRT } from "ol-search-ui"
import * as factories from "ol-search-ui/src/factories"
import { urls as lrUrls } from "../../api/learning-resources"
import UpsertListDialog from "./UpsertListDialog"
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
import NiceModal from "@ebay/nice-modal-react"

jest.mock("@ebay/nice-modal-react", () => {
  const actual = jest.requireActual("@ebay/nice-modal-react")
  return {
    ...actual,
    show: jest.fn(actual.show)
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
    const count = faker.datatype.number({ min: 2, max: 5 })
    const paginatedItems = factories.makeListItemsPaginated({ count })
    const items = paginatedItems.results.map(r => r.content_data)
    const topics = [
      ...userList.topics,
      ...factories.makeTopicsPaginated({ count: 3 }).results
    ]
    setMockResponse.get(lrUrls.userList.details(userList.id), userList)
    setMockResponse.get(
      lrUrls.userList.itemsListing(userList.id),
      paginatedItems
    )
    setMockResponse.get(lrUrls.topics.listing, topics)

    const { history, queryClient } = renderTestApp({
      url: `/lists/${userList.id}`,
      user
    })
    return { history, userList, items, paginatedItems, queryClient }
  }

  test("renders list title", async () => {
    const { userList } = setup()
    await screen.findByRole("heading", { name: userList.title })
  })

  test.each([
    {
      data:     { authorId: 1, userId: 1, type: LRT.LearningPath },
      expected: { canEdit: true, canReorder: true }
    },
    {
      data:     { authorId: 1, userId: 1, type: LRT.Userlist },
      expected: { canEdit: true, canReorder: false }
    },
    {
      data:     { authorId: 1, userId: 2, type: LRT.LearningPath },
      expected: { canEdit: false, canReorder: false }
    },
    {
      data:     { authorId: 1, userId: 2, type: LRT.Userlist },
      expected: { canEdit: false, canReorder: false }
    },
    {
      data:     { authorId: 1, userId: null, type: LRT.LearningPath },
      expected: { canEdit: false, canReorder: false }
    },
    {
      data:     { authorId: 1, userId: null, type: LRT.Userlist },
      expected: { canEdit: false, canReorder: false }
    }
  ] as const)(
    "For $data.type, shows edit ($expected.canEdit) and reorder ($expected.canReorder) buttons if userId=$data.userId and authorId=$data.authorId",
    async ({ data, expected }) => {
      const { userId, authorId, type } = data
      const { canEdit, canReorder } = expected
      const { userList } = setup({
        user: { id: userId },
        list: { author: authorId, object_type: type }
      })
      await screen.findByRole("heading", { name: userList.title })

      const editButton = screen.queryByRole("button", { name: "Edit" })
      expect(!!editButton).toBe(canEdit)

      await new Promise(resolve => setTimeout(resolve, 1000))

      const reorderButton = screen.queryByRole("button", { name: "Reorder" })
      expect(!!reorderButton).toBe(canReorder)
    }
  )

  test("Clicking reorder makes items reorderable, clicking Done makes them static", async () => {
    setup({
      user: { id: 1 },
      list: { author: 1, object_type: LRT.LearningPath }
    })
    const reorderButton = await screen.findByRole("button", { name: "Reorder" })
    expectProps(spyItemsListing, { sortable: false }, -1)
    await user.click(reorderButton)
    expectProps(spyItemsListing, { sortable: true }, -1)

    const doneButton = await screen.findByRole("button", {
      name: "Done ordering"
    })
    await user.click(doneButton)
    expectProps(spyItemsListing, { sortable: false }, -1)
  })

  test.each([
    {
      count:      0,
      canReorder: false
    },
    {
      count:      faker.datatype.number({ min: 1, max: 3 }),
      canReorder: true
    }
  ])(
    "Shows 'Reorder' button for authorized paths if and only if not empty (item count = $count)",
    async ({ count, canReorder }) => {
      const { userList } = setup({
        user: { id: 1 },
        list: { author: 1, object_type: LRT.LearningPath, item_count: count }
      })
      await screen.findByRole("heading", { name: userList.title })
      const reorderButton = screen.queryByRole("button", { name: "Reorder" })
      expect(!!reorderButton).toBe(canReorder)
    }
  )

  test("Edit buttons opens editing dialog", async () => {
    const userId = faker.datatype.number()
    const { userList } = setup({
      user: { id: userId },
      list: { author: userId }
    })
    const editButton = await screen.findByRole("button", { name: "Edit" })

    expect(NiceModal.show).not.toHaveBeenCalled()
    await user.click(editButton)
    await screen.findByRole("dialog", { name: "Edit list" })
    expect(NiceModal.show).toHaveBeenCalledWith(
      UpsertListDialog,
      expect.objectContaining({ resource: userList })
    )
  })

  test("Passes appropriate props to ItemsListing", async () => {
    const { paginatedItems } = setup()
    expectProps(spyItemsListing, {
      isLoading:    true,
      items:        undefined,
      emptyMessage: "There are no items in this list yet."
    })

    await waitFor(() => {
      expectProps(
        spyItemsListing,
        {
          isLoading:    false,
          items:        paginatedItems.results,
          emptyMessage: "There are no items in this list yet."
        },
        -1
      )
    })
  })

  test("Passes isRefetching=true to ItemsList while reloading data", async () => {
    const { queryClient, paginatedItems } = setup()

    await waitFor(() => expectProps(spyItemsListing, { isLoading: false }))

    expectProps(spyItemsListing, { isRefetching: false }, -1)
    spyItemsListing.mockClear()
    // invalidate the cache entry for paginatedItems and check that
    // isFetching is gets passed to ItemsListing
    queryClient.invalidateQueries({
      predicate: query => {
        // @ts-expect-error Since this is all queries, data is unknown
        return query.state.data?.pages?.[0] === paginatedItems
      }
    })
    await waitFor(() => expectProps(spyItemsListing, { isRefetching: true }))
  })
})
