import React from "react"
import { faker } from "@faker-js/faker"
import { SortableList, assertNotNil } from "ol-util"
import LearningResourceCard from "../../components/LearningResourceCard"
import * as factories from "ol-search-ui/src/factories"
import {
  screen,
  expectProps,
  renderWithProviders,
  setMockResponse,
  waitFor
} from "../../test-utils"
import UserListItems, { UserListItemsProps } from "./ItemsListing"
import { allowConsoleErrors } from "ol-util/src/test-utils"
import axios from "../../libs/axios"
import { urls } from "../../api/learning-resources"

jest.mock("ol-util", () => {
  const actual = jest.requireActual("ol-util")
  return {
    __esModule:   true,
    ...actual,
    SortableList: jest.fn(actual.SortableList)
  }
})

const spyLearningResourceCard = jest.mocked(LearningResourceCard)
const spySortableList = jest.mocked(SortableList)

describe("ItemsListing", () => {
  const setup = (props: Partial<UserListItemsProps>) => {
    const defaultProps: UserListItemsProps = {
      isLoading:    true,
      emptyMessage: "Empty message"
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
      const items = factories.makeUserListItemsPaginated({ count }).results
      setup({ isLoading: false, emptyMessage, items })
      const emptyMessageElement = screen.queryByText(emptyMessage)
      expect(!!emptyMessageElement).toBe(hasEmptyMessage)
    }
  )

  test("Shows a list of LearningResourceCards", () => {
    const items = factories.makeUserListItemsPaginated({ count: 3 }).results
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
    const items = factories.makeUserListItemsPaginated({ count: 3 }).results
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
    const items = factories.makeUserListItemsPaginated({ count: 3 }).results
    expect(() => {
      setup({ isLoading: false, items, sortable: true })
    }).toThrow("Sortable list must have an id")
  })
})

describe("Sorting ItemListing", () => {
  const setup = (props: Partial<UserListItemsProps> = {}) => {
    const items = factories.makeUserListItemsPaginated({ count: 5 }).results
    const listId = faker.datatype.number()
    const defaultProps: UserListItemsProps = {
      id:           listId,
      items:        items,
      isLoading:    false,
      sortable:     true,
      emptyMessage: "Empty message"
    }
    const allProps = { ...defaultProps, ...props }
    const { history } = renderWithProviders(<UserListItems {...allProps} />)

    const { cancelSort } = spySortableList.mock.lastCall[0]
    assertNotNil(cancelSort)

    const simulateDrag = (from: number, to: number) => {
      const active = items[from]
      const over = items[to]
      cancelSort({
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

  test("Dragging an item to a new position calls API correctly", async () => {
    const { simulateDrag, items, listId } = setup()
    const [from, to] = [1, 3]
    const active = items[from]
    const over = items[to]
    const patchUrl = urls.userList.itemDetails(listId, active.id)
    setMockResponse.patch(patchUrl)

    simulateDrag(from, to)

    expect(axios.patch).toHaveBeenCalledTimes(0)
    await waitFor(() => expect(axios.patch).toHaveBeenCalled())
    expect(axios.patch).toHaveBeenCalledWith(patchUrl, {
      position: over.position
    })
  })
})
