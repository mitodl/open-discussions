/* eslint-disable testing-library/no-node-access */
import React from "react"
import { faker } from "@faker-js/faker/locale/en"
import { assertInstanceOf } from "ol-util"
import { render, screen, waitFor } from "@testing-library/react"
import EmbedlyCard, { EmbedlyCardProps } from "./EmbedlyCard"
import { dispatchCardCreated } from "./util"

const emulateEmbedly = (parent: HTMLElement) => {
  const anchors = parent.querySelectorAll("a.embedly-card")
  if (anchors.length !== 1) throw new Error("Expected 1 .embedly-card anchor")
  const a = anchors[0]
  const iframe = document.createElement("iframe")
  a.remove()
  parent.appendChild(iframe)
  dispatchCardCreated(iframe)
}

describe("EmbedlyCard", () => {
  const setupTest = ({ url, ...others }: Partial<EmbedlyCardProps> = {}) => {
    const { container } = render(
      <EmbedlyCard
        url={url ?? new URL(faker.internet.url()).toString()}
        {...others}
      />
    )
    return { container }
  }

  it("renders an anchor tag with embedly data props", async () => {
    const url = new URL(faker.internet.url()).toString()
    setupTest({ url })
    const a = screen.getByRole("link")
    assertInstanceOf(a, HTMLAnchorElement)
    expect(a.href).toBe(url)
    expect(a.dataset.cardChrome).toBe("0")
    expect(a.dataset.cardControls).toBe("0")
    expect(a.dataset.cardKey).toBe("fake-embedly-key")
    expect(a).toHaveClass("embedly-card")
    expect(typeof a.dataset.cardKey).toBe("string")
  })

  it("applies a given class to the card", () => {
    const { container } = setupTest({ className: "foo" })
    expect(container.firstChild).toHaveClass("foo")
  })

  it("Updates correctly when given a new url", async () => {
    /**
     * Embedly replaces anchor tags with iframes and this is done outside of
     * React's normal rendering process.
     *
     * The goal here is largely to check that when the url is updated, the old
     * embedly iframe is remvoed from the DOM.
     */
    const url1 = "https://url1.com/"
    const { rerender } = render(<EmbedlyCard url={url1} className="the-card" />)
    const card = document.querySelector(".the-card") as HTMLElement

    const a1 = screen.getByRole("link") as HTMLAnchorElement
    expect(a1.href).toBe(url1)
    expect(card.querySelectorAll("iframe").length).toBe(0)
    expect(a1).toBeInTheDocument()
    emulateEmbedly(card)
    expect(card.querySelectorAll("iframe").length).toBe(1)

    const url2 = "https://url2.com/"
    expect(url1).not.toBe(url2)
    rerender(<EmbedlyCard url={url2} className="the-card" />)

    const a2 = screen.getByRole("link") as HTMLAnchorElement
    expect(a2.href).toBe(url2)
    await waitFor(() => {
      expect(card.querySelectorAll("iframe").length).toBe(0)
    })

    expect(a2).toBeInTheDocument()
    emulateEmbedly(card)
    expect(card.querySelectorAll("iframe").length).toBe(1)
  })

  it.each([
    { url: "some-invalid-url", valid: false },
    { url: "https://valid-url.com", valid: true },
    { url: "protocol-not-required.com", valid: true }
  ])("only renders the embedly anchor if url is valid", ({ url, valid }) => {
    render(<EmbedlyCard url={url} />)
    expect(document.querySelector("a") !== null).toBe(valid)
  })

  it("removes old anchor even if new url is invalid", () => {
    /**
     * Since EmbedlyCard does DOM manipulation outside of react's usual process,
     * let's check this explicitly
     */
    const url1 = "https://mit.edu"
    const { rerender } = render(<EmbedlyCard url={url1} />)
    expect(document.querySelectorAll("a").length).toBe(1)
    rerender(<EmbedlyCard url="invalidurl" />)
    expect(document.querySelectorAll("a").length).toBe(0)
  })
})
