import React from "react"
import { render, screen } from "@testing-library/react"
import { default as user } from "@testing-library/user-event"

import SortableItem from "./SortableItem"

describe("SortableItem", () => {
  let deleteStub = jest.fn()

  const renderItem = () =>
    render(
      <SortableItem
        deleteItem={deleteStub}
        item="item-id"
        id="item-id"
        title="A TITLE"
      />
    )

  beforeEach(() => {
    deleteStub = jest.fn()
  })

  it("should display the title and a drag handle", async () => {
    renderItem()
    const sortableItem = await screen.findByText("drag_indicator")
    // eslint-disable-next-line testing-library/no-node-access
    expect(sortableItem.closest("div").innerHTML).toContain("A TITLE")
  })

  it("should include a delete button", async () => {
    renderItem()
    const deleteButton = await screen.findByText("remove_circle_outline")
    await user.click(deleteButton)
    expect(deleteStub).toBeCalledWith("item-id")
  })
})
