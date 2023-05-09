import {
  UserList,
  LearningResourceType as LRT,
  StaffList,
  isUserListOrPath
} from "ol-search-ui"
import {
  makeUserList,
  makeStaffList,
  makeListItemsPaginated,
  makeTopicsPaginated
} from "ol-search-ui/src/factories"
import { urls as lrUrls } from "../../api/learning-resources"
import { manageListDialogs } from "./ManageListDialogs"
import ItemsListing from "./ItemsListing"
import {
  screen,
  renderTestApp,
  setMockResponse,
  user,
  expectProps,
  waitFor,
  act
} from "../../test-utils"
import { User } from "../../types/settings"
import invariant from "tiny-invariant"

jest.mock("./ItemsListing", () => {
  const actual = jest.requireActual("./ItemsListing")
  return {
    __esModule: true,
    ...actual,
    default:    jest.fn(actual.default)
  }
})

const spyItemsListing = jest.mocked(ItemsListing)

/**
 * Set up the mock API responses for lists page.
 */
const setup = ({
  userSettings,
  list
}: {
  userSettings?: Partial<User>
  list: UserList | StaffList
}) => {
  const paginatedItems = makeListItemsPaginated({ count: list.item_count })
  const items = paginatedItems.results.map(r => r.content_data)
  const topics = [...list.topics, ...makeTopicsPaginated({ count: 3 }).results]
  const detailsUrl = isUserListOrPath(list) ?
    lrUrls.userList.details(list.id) :
    lrUrls.staffList.details(list.id)
  const itemsUrl = isUserListOrPath(list) ?
    lrUrls.userList.itemsListing(list.id) :
    lrUrls.staffList.itemsListing(list.id)
  setMockResponse.get(detailsUrl, list)
  setMockResponse.get(itemsUrl, paginatedItems)
  setMockResponse.get(lrUrls.topics.listing, topics)

  const url = isUserListOrPath(list) ?
    `/lists/${list.id}` :
    `/stafflists/${list.id}`
  const { history, queryClient } = renderTestApp({ url, user: userSettings })
  return { history, items, paginatedItems, queryClient }
}

const modes = [
  {
    Page:     "UserListDetailsPage",
    makeList: makeUserList
  },
  {
    Page:     "StaffListDetailsPage",
    makeList: makeUserList
  }
] as const

test.each(modes)("$Page renders list title", async ({ makeList }) => {
  const list = makeList()
  setup({ list })
  await screen.findByRole("heading", { name: list.title })
})

test.each([
  {
    userSettings: { id: null },
    list:         makeUserList(),
    type:         "userlist"
  },
  {
    userSettings: { id: null },
    list:         makeStaffList(),
    type:         "stafflist"
  }
])(
  "Unauthenicated users cannot edit or reorder $type",
  async ({ list, userSettings }) => {
    setup({ userSettings, list })
    await screen.findByRole("heading", { name: list.title })

    const editButton = screen.queryByRole("button", { name: "Edit" })
    expect(editButton).toBe(null)
    const reorderButton = screen.queryByRole("button", { name: "Reorder" })
    expect(reorderButton).toBe(null)
  }
)

test.each([
  {
    userSettings: { id: 1 },
    list:         makeUserList({ author: 1, object_type: LRT.LearningPath }),
    canEdit:      true,
    canSort:      true
  },
  {
    userSettings: { id: 1 },
    list:         makeUserList({ author: 1, object_type: LRT.Userlist }),
    canEdit:      true,
    canSort:      false
  },
  {
    userSettings: { id: 2 },
    list:         makeUserList({ author: 1, object_type: LRT.LearningPath }),
    canEdit:      false,
    canSort:      false
  },
  {
    userSettings: { id: 2 },
    list:         makeUserList({ author: 1, object_type: LRT.Userlist }),
    canEdit:      false,
    canSort:      false
  }
])(
  "Authenticated users can edit userlists & sort paths if and only if they are the author",
  async ({ list, userSettings, canEdit, canSort }) => {
    setup({ userSettings, list })
    await screen.findByRole("heading", { name: list.title })

    const editButton = screen.queryByRole("button", { name: "Edit" })
    expect(!!editButton).toBe(canEdit)

    const reorderButton = screen.queryByRole("button", { name: "Reorder" })
    expect(!!reorderButton).toBe(canSort)
  }
)

test.each([
  {
    userSettings: { is_staff_list_editor: true },
    list:         makeStaffList({ object_type: LRT.StaffPath }),
    canEdit:      true,
    canSort:      true
  },
  {
    userSettings: { is_staff_list_editor: true },
    list:         makeStaffList({ object_type: LRT.StaffList }),
    canEdit:      true,
    canSort:      false
  },
  {
    userSettings: { is_staff_list_editor: false },
    list:         makeStaffList({ object_type: LRT.StaffPath }),
    canEdit:      false,
    canSort:      false
  },
  {
    userSettings: { is_staff_list_editor: false },
    list:         makeStaffList({ object_type: LRT.StaffList }),
    canEdit:      false,
    canSort:      false
  }
])(
  "Authenticated users can edit stafflists & sort learning paths if and only if they are the author",
  async ({ list, userSettings, canEdit, canSort }) => {
    setup({ userSettings, list })
    await screen.findByRole("heading", { name: list.title })

    const editButton = screen.queryByRole("button", { name: "Edit" })
    expect(!!editButton).toBe(canEdit)

    const reorderButton = screen.queryByRole("button", { name: "Reorder" })
    expect(!!reorderButton).toBe(canSort)
  }
)

test.each([
  {
    list:         makeUserList({ object_type: LRT.LearningPath, author: 123 }),
    userSettings: { id: 123 }
  },
  {
    list:         makeStaffList({ object_type: LRT.StaffPath }),
    userSettings: { is_staff_list_editor: true }
  }
])(
  "Clicking reorder makes items reorderable, clicking Done makes them static",
  async ({ list, userSettings }) => {
    setup({ userSettings, list })
    const reorderButton = await screen.findByRole("button", { name: "Reorder" })
    expectProps(spyItemsListing, { sortable: false }, -1)
    await user.click(reorderButton)
    expectProps(spyItemsListing, { sortable: true }, -1)

    const doneButton = await screen.findByRole("button", {
      name: "Done ordering"
    })
    await user.click(doneButton)
    expectProps(spyItemsListing, { sortable: false }, -1)
  }
)

test.each([
  {
    list:       makeUserList({ object_type: LRT.LearningPath, item_count: 0 }),
    canReorder: false
  },
  {
    list:       makeUserList({ object_type: LRT.LearningPath, item_count: 2 }),
    canReorder: true
  },
  {
    list:       makeStaffList({ object_type: LRT.StaffPath, item_count: 0 }),
    canReorder: false
  },
  {
    list:       makeStaffList({ object_type: LRT.StaffList, item_count: 3 }),
    canReorder: false
  }
])(
  "Shows 'Reorder' button if and only not empty (item count = $list.item_count; $list.object_type)",
  async ({ list, canReorder }) => {
    setup({ userSettings: { id: list.author }, list })
    await screen.findByRole("heading", { name: list.title })
    const reorderButton = screen.queryByRole("button", { name: "Reorder" })
    expect(!!reorderButton).toBe(canReorder)
  }
)

test.each([
  { list: makeUserList({ author: 1 }), userSettings: { id: 1 } },
  { list: makeStaffList(), userSettings: { is_staff_list_editor: true } }
])(
  "Edit buttons opens editing dialog ($list.object_type)",
  async ({ list, userSettings }) => {
    setup({ list, userSettings })
    const editButton = await screen.findByRole("button", { name: "Edit" })

    const editList = jest.spyOn(manageListDialogs, "editList")
    editList.mockImplementationOnce(jest.fn())

    expect(editList).not.toHaveBeenCalled()
    await user.click(editButton)
    expect(editList).toHaveBeenCalledWith(list)
  }
)

test.each([
  { list: makeUserList(), listUrls: lrUrls.userList },
  { list: makeStaffList(), listUrls: lrUrls.staffList }
])(
  "Passes isRefetching=true to ItemsList while reloading data",
  async ({ list, listUrls }) => {
    const { queryClient, paginatedItems } = setup({ list })
    await waitFor(() => expectProps(spyItemsListing, { isLoading: false }))
    expectProps(spyItemsListing, { isRefetching: false }, -1)
    spyItemsListing.mockClear()

    let resolve = () => invariant("Not yet assigned")
    const itemsResponse = new Promise(res => {
      resolve = () => res(paginatedItems)
    })
    setMockResponse.get(listUrls.itemsListing(list.id), itemsResponse)

    spyItemsListing.mockClear()
    // invalidate the cache entry for paginatedItems and check that
    // isFetching is gets passed to ItemsListing
    act(() => {
      queryClient.invalidateQueries({
        predicate: query => {
          // @ts-expect-error Since this is all queries, data is unknown
          return query.state.data?.pages?.[0] === paginatedItems
        }
      })
    })
    await waitFor(() => expectProps(spyItemsListing, { isRefetching: true }))
    spyItemsListing.mockClear()
    await act(async () => {
      resolve()
      await itemsResponse
    })
    await waitFor(() => expectProps(spyItemsListing, { isRefetching: false }))
  }
)
