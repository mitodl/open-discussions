import React from "react"
import { act, render, screen } from "@testing-library/react"
import { DndContext } from "@dnd-kit/core"
import type {
  Active,
  DragStartEvent,
  DragEndEvent,
  UniqueIdentifier as Id
} from "@dnd-kit/core"
import type { SortableData } from "@dnd-kit/sortable"
import SortableList from "./SortableList"

jest.mock("@dnd-kit/core", () => {
  const actual = jest.requireActual("@dnd-kit/core")

  return {
    __esModule:  true,
    ...actual,
    DndContext:  jest.fn(({ children }) => <div>{children}</div>),
    /**
     * DragOverlay's children are normally only visible while dragging.
     * Since dnd-kit is non-functional in JSDom, let's always render the children.
     */
    DragOverlay: ({ children }) => <div>{children}</div>
  }
})

jest.mock("./SortableList", () => {
  const actual = jest.requireActual("./SortableList")
  return {
    __esModule: true,
    default:    jest.fn(actual.default)
  }
})

const makeDragInfo = (itemIds: Id[], index: number) => {
  const currentData: SortableData = {
    sortable: {
      containerId: "some-container",
      items:       itemIds,
      index:       index
    }
  }
  return {
    id:   itemIds[index],
    data: { current: currentData }
  }
}

/**
 * This sets up a test for SortableList.
 *
 * Testing drag-and-drop in JSDom is hard, and a little moreso with @testing-library,
 * since it doesn't support direct observation of React component props.
 *
 * Our approach is:
 *  1. Mocked DndContext from @dnd-kit/core
 *  2. To simulate drag-and-drop, call the handlers passed to DndContext.
 *  3. Observe that SortableList emits the expected events.
 *
 * The downsides to this approach are that
 *  - step 2 is not particularly simple (we have to access the handlers via
 *    mock.lastCall and manually create dnd-kit's events)
 *  - very much a unit test for SortableList; does not test SortableItem's
 *    integration with dnd-kit.
 */
const setupTest = (itemIds: string[]) => {
  const spyDndContext = jest.mocked(DndContext)
  const spies = {
    renderActive: jest.fn((a: Active) => <div>Active Item {a.id}</div>),
    onSortEnd:    jest.fn(),
    SortableList: jest.mocked(SortableList)
  }
  render(
    <SortableList
      renderActive={spies.renderActive}
      onSortEnd={spies.onSortEnd}
      itemIds={itemIds}
    />
  )
  const dnd = {
    onDragStart: (e: DragStartEvent) => {
      const props = spyDndContext.mock.lastCall[0]
      if (!props.onDragStart) {
        throw new Error("props.onDragStart should be defined")
      }
      props.onDragStart(e)
    },
    onDragEnd: (e: DragEndEvent) => {
      const props = spyDndContext.mock.lastCall[0]
      if (!props.onDragEnd) throw new Error("props.onDragEnd should be defined")
      props.onDragEnd(e)
    }
  }

  const dndEvents = {
    start: (activeIndex: number): DragStartEvent => {
      return {
        active: makeDragInfo(itemIds, activeIndex)
      } as unknown as DragStartEvent
    },
    end: (activeIndex: number, overIndex: number): DragEndEvent => {
      return {
        active: makeDragInfo(itemIds, activeIndex),
        over:   makeDragInfo(itemIds, overIndex)
      } as unknown as DragEndEvent
    }
  }

  return {
    /**
     * Spy on the props of SortableList
     */
    spies,
    /**
     * Simulate dnd by calling DndContext handlers
     */
    dnd,
    /**
     * Helpers to create dnd events.
     */
    dndEvents
  }
}

describe("SortableList", () => {
  test("renders the active item with renderActive while dragging", () => {
    const { spies, dnd, dndEvents } = setupTest(["A", "B", "C", "D", "E"])

    const startEvent = dndEvents.start(1)
    act(() => dnd.onDragStart(startEvent))
    expect(spies.renderActive).toHaveBeenCalledTimes(1)
    expect(spies.renderActive).toHaveBeenCalledWith(startEvent.active)
    const activeItem = screen.getByText("Active Item B")
    expect(activeItem).toBeVisible()

    const endEvent = dndEvents.end(1, 2)
    act(() => dnd.onDragEnd(endEvent))
    expect(spies.renderActive).toHaveBeenCalledTimes(1)
    expect(activeItem).not.toBeVisible()
  })

  test.each([
    {
      itemIds:   ["A", "B", "C", "D"],
      afterIds:  ["B", "A", "C", "D"],
      dragIndex: 1,
      dropIndex: 0
    },
    {
      itemIds:   ["A", "B", "C", "D"],
      afterIds:  ["A", "B", "C", "D"],
      dragIndex: 1,
      dropIndex: 1
    },
    {
      itemIds:   ["A", "B", "C", "D"],
      afterIds:  ["A", "C", "B", "D"],
      dragIndex: 1,
      dropIndex: 2
    },
    {
      itemIds:   ["A", "B", "C", "D"],
      afterIds:  ["A", "C", "D", "B"],
      dragIndex: 1,
      dropIndex: 3
    },
    {
      itemIds:   ["A", "B", "C", "D"],
      afterIds:  ["C", "A", "B", "D"],
      dragIndex: 2,
      dropIndex: 0
    }
  ])(
    "it emits the correct onSortEnd events ($dragIndex --> $dropIndex, $afterIds)",
    ({ itemIds, afterIds, dragIndex, dropIndex }) => {
      const { spies, dnd, dndEvents } = setupTest(itemIds)

      const startEvent = dndEvents.start(dragIndex)
      const endEvent = dndEvents.end(dragIndex, dropIndex)
      act(() => dnd.onDragStart(startEvent))
      act(() => dnd.onDragEnd(endEvent))
      expect(spies.onSortEnd).toHaveBeenCalledTimes(1)
      expect(spies.onSortEnd).toHaveBeenCalledWith({
        itemIds: afterIds
      })
    }
  )
})
