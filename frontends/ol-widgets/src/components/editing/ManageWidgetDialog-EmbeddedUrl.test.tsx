import React from "react"
import { screen, render } from "@testing-library/react"
import user from "@testing-library/user-event"
import { assertInstanceOf, assertNotNil } from "ol-util"
import {
  makeEmbeddedUrlWidgetSpec,
  makeEmbeddedUrlWidget
} from "../../factories"
import ManageWidgetDialog from "./ManageWidgetDialog"
import { WIDGET_FIELD_TYPES } from "../../constants"
import { EmbedlyCard } from "../embedly"
import { EmbeddedUrlWidgetInstance } from "../../interfaces"

const getErrorFor = (el: HTMLElement) => {
  const errId = el.getAttribute("aria-errormessage")
  if (errId === null) {
    throw new Error(
      "The specified element does not have an associated errormessage."
    )
  }
  // eslint-disable-next-line testing-library/no-node-access
  const errEl = document.getElementById(errId)
  assertInstanceOf(errEl, HTMLElement)
  return errEl
}

jest.mock("../embedly", () => {
  const actual = jest.requireActual("../embedly")
  return {
    __esModule:  true,
    ...actual,
    EmbedlyCard: jest.fn(actual.EmbedlyCard)
  }
})
const spyEmbedlyCard = jest.mocked(EmbedlyCard)

const setupEmbeddedUrlTest = ({
  config,
  fieldProps
}: {
  config?: EmbeddedUrlWidgetInstance["configuration"]
  fieldProps?: Record<string, unknown>
} = {}) => {
  const widget = makeEmbeddedUrlWidget()
  if (config !== undefined) {
    widget.configuration = config
  }
  const spec = makeEmbeddedUrlWidgetSpec()
  const urlFieldSpec = spec.form_spec.find(
    s => s.input_type === WIDGET_FIELD_TYPES.url
  )
  assertNotNil(urlFieldSpec)
  urlFieldSpec.props = { ...urlFieldSpec.props, ...fieldProps }

  const spies = { onSubmit: jest.fn(), onCancel: jest.fn() }
  render(
    <ManageWidgetDialog
      isOpen={true}
      onSubmit={spies.onSubmit}
      onCancel={spies.onCancel}
      specs={[spec]}
      widget={widget}
    />
  )

  const input = screen.getByLabelText(urlFieldSpec.label)
  assertInstanceOf(input, HTMLInputElement)
  return { spies, urlFieldSpec, input, widget }
}

describe("URL Field", () => {
  it("renders the url text", () => {
    const { input, widget } = setupEmbeddedUrlTest()
    expect(input.value).toBe(widget.configuration.url)
  })

  it.each([{ showEmbed: true }, { showEmbed: false }])(
    "Shows the embed preview if showEmbed=true (case: $showEmbed)",
    ({ showEmbed }) => {
      const { widget } = setupEmbeddedUrlTest({ fieldProps: { showEmbed } })
      expect(spyEmbedlyCard.mock.calls.length > 0).toBe(showEmbed)
      if (showEmbed) {
        expect(spyEmbedlyCard).toHaveBeenLastCalledWith(
          expect.objectContaining({
            url: widget.configuration.url
          }),
          expect.anything()
        )
      }
    }
  )
})

describe("EmbeddedUrl widget editing", () => {
  it.each([
    {
      url:    "",
      errMsg: /required/,
      valid:  false
    },
    {
      url:    "mit-dot-edu",
      errMsg: /invalid/,
      valid:  false
    },
    {
      url:    "https://mit.edu",
      errMsg: null,
      valid:  true
    }
  ])("validates the submitted URL", async ({ url, valid, errMsg }) => {
    const { spies, urlFieldSpec } = setupEmbeddedUrlTest({ config: { url } })
    await user.click(screen.getByRole("button", { name: "Submit" }))
    screen.getAllByRole("textbox")

    const input = screen.getByLabelText(urlFieldSpec.label)

    if (valid) {
      expect(input).toBeValid()
      expect(spies.onSubmit).toHaveBeenCalled()
    } else {
      expect(input).toBeInvalid()
      expect(spies.onSubmit).not.toHaveBeenCalled()
      const error = getErrorFor(input)
      assertNotNil(errMsg)
      expect(error).toHaveTextContent(errMsg)
    }
  })
})
