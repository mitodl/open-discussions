import React from "react"
import { Router } from "react-router"
import { createMemoryHistory } from "history"
import { render, screen } from "@testing-library/react"

import { urls } from "../api/fields"
import * as factories from "../api/fields/factories"
import { setMockResponse, user } from "../test-utils"
import FieldMenu from "./FieldMenu"

describe("FieldMenu", () => {
  it("Includes a link to the FieldChannel edit page", async () => {
    const field = factories.makeField()
    setMockResponse.get(urls.fieldDetails(field.name), field)
    const history = createMemoryHistory()
    render(
      <Router history={history}>
        <FieldMenu field={field} />
      </Router>
    )
    const dropdown = await screen.findByText("settings")
    await user.click(dropdown)
    const link = (await screen.findByRole("link")) as HTMLLinkElement
    expect(link.href).toContain(`/infinite/fields/${field.name}/manage/`)
  })
})
