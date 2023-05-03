import React from "react"
import { faker } from "@faker-js/faker"
import { SortableList, SortableItem } from "ol-util"
import LearningResourceCard from "../../components/LearningResourceCard"
import * as factories from "ol-search-ui/src/factories"
import {
  screen,
  expectProps,
  renderWithProviders,
  setMockResponse,
  waitFor,
  act
} from "../../test-utils"
import UserListItems, { ResourceListItemsProps } from "./ItemsListing"
import { allowConsoleErrors } from "ol-util/src/test-utils"
import axios from "../../libs/axios"
import { urls } from "../../api/learning-resources"
import invariant from "tiny-invariant"

jest.mock("ol-util", () => {
  const actual = jest.requireActual("ol-util")
  return {
    __esModule:   true,
    ...actual,
    SortableList: jest.fn(actual.SortableList),
    SortableItem: jest.fn(actual.SortableItem)
  }
})

const spyLearningResourceCard = jest.mocked(LearningResourceCard)
const spySortableList = jest.mocked(SortableList)
const spySortableItem = jest.mocked(SortableItem)

describe("ItemsListing", () => {
  const setup = (props: Partial<ResourceListItemsProps>) => {
    const defaultProps: ResourceListItemsProps = {
      isLoading:    true,
      emptyMessage: "Empty message",
      mode:         "userlist"
    }
    const allProps = { ...defaultProps, ...props }
    const { history } = renderWithProviders(<UserListItems {...allProps} />)
    return { history }
  }

  test("Shows loading message while loading", () => {
    setup({ isLoading: true })
    screen.getByLabelText("Loading")
  })

  test.each([
    { count: 0, hasEmptyMessage: true },
    { count: 3, hasEmptyMessage: false }
  ])(
    "Shows empty message when there are no items",
    ({ count, hasEmptyMessage }) => {
      const emptyMessage = faker.lorem.sentence()
      const items = factories.makeListItemsPaginated({ count }).results
      setup({ isLoading: false, emptyMessage, items })
      const emptyMessageElement = screen.queryByText(emptyMessage)
      expect(!!emptyMessageElement).toBe(hasEmptyMessage)
    }
  )

  test("Shows a list of LearningResourceCards", () => {
    const items = factories.makeListItemsPaginated({ count: 3 }).results
    setup({ isLoading: false, items })
    const titles = items.map(item => item.content_data.title)
    const headings = screen.getAllByRole("heading", {
      name: value => titles.includes(value)
    })
    expect(headings.map(h => h.textContent)).toEqual(titles)
    items.forEach(item => {
      expectProps(spyLearningResourceCard, { resource: item.content_data })
    })
  })

  test("Shows a list of sortable LearningResourceCards when sortable=true", () => {
    const items = factories.makeListItemsPaginated({ count: 3 }).results
    setup({ isLoading: false, items, id: 1, sortable: true })
    const titles = items.map(item => item.content_data.title)
    const headings = screen.getAllByRole("heading", {
      name: value => titles.includes(value)
    })
    expect(headings.map(h => h.textContent)).toEqual(titles)
    items.forEach(item => {
      expectProps(spyLearningResourceCard, {
        resource: item.content_data,
        sortable: true
      })
    })
  })

  test("Throws error if passed 'sortable' without a list id", () => {
    allowConsoleErrors()
    const items = factories.makeListItemsPaginated({ count: 3 }).results
    expect(() => {
      setup({ isLoading: false, items, sortable: true })
    }).toThrow("Sortable list must have an id")
  })
})

describe("Sorting ItemListing", () => {
  const setup = (props: Partial<ResourceListItemsProps> = {}) => {
    const items = factories.makeListItemsPaginated({ count: 5 }).results
    const listId = faker.datatype.number()
    const defaultProps: ResourceListItemsProps = {
      id:           listId,
      items:        items,
      isLoading:    false,
      sortable:     true,
      mode:         "userlist",
      emptyMessage: "Empty message"
    }
    const allProps = { ...defaultProps, ...props }
    const { history } = renderWithProviders(<UserListItems {...allProps} />)

    const { cancelDrop } = spySortableList.mock.lastCall[0]
    invariant(cancelDrop)

    const simulateDrag = (from: number, to: number) => {
      const active = items[from]
      const over = items[to]
      cancelDrop({
        activeIndex: from,
        overIndex:   to,
        active:      {
          data: {
            // @ts-expect-error not fully simulated
            current: active
          }
        },
        over: {
          data: {
            // @ts-expect-error not fully simulated
            current: over
          }
        }
      })
    }

    return { history, simulateDrag, items, listId }
  }

  test.each([
    {
      mode:     "userlist",
      patchUrl: urls.userList.itemDetails
    },
    {
      mode:     "stafflist",
      patchUrl: urls.staffList.itemDetails
    }
  ] as const)(
    "Dragging an item to a new position calls API correctly",
    async ({ mode, patchUrl }) => {
      const { simulateDrag, items, listId } = setup({ mode })
      const [from, to] = [1, 3]
      const active = items[from]
      const over = items[to]

      setMockResponse.patch(patchUrl(listId, active.id))

      act(() => simulateDrag(from, to))

      expect(axios.patch).toHaveBeenCalledTimes(0)
      await waitFor(() => expect(axios.patch).toHaveBeenCalled())
      expect(axios.patch).toHaveBeenCalledWith(patchUrl(listId, active.id), {
        position: over.position
      })
    }
  )

  test("Dragging is disabled while API call is made", async () => {
    const { simulateDrag, items, listId } = setup()
    const [from, to] = [1, 3]

    const patchUrl = urls.userList.itemDetails(listId, items[from].id)
    let resolvePatch: () => void = jest.fn()
    const patchResponse = new Promise<void>(resolve => {
      resolvePatch = resolve
    })
    setMockResponse.patch(patchUrl, patchResponse)
    act(() => simulateDrag(from, to))

    await waitFor(() => expect(axios.patch).toHaveBeenCalled())

    expectProps(spySortableItem, { disabled: true })
    await act(async () => {
      resolvePatch()
      await patchResponse
    })

    expectProps(spySortableItem, { disabled: false })
  })

  test("Sorting is disabled when isRefetching=true", async () => {
    setup({ isRefetching: true })
    expectProps(spySortableItem, { disabled: true })
  })
})
