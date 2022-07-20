/**
 * Testing-library's methods are designed for accessible element access,
 * which <link /> very much is not.
 */
/* eslint-disable testing-library/no-container */
/* eslint-disable testing-library/no-node-access */
import React from "react"
import { render } from "@testing-library/react"
import CanonicalLink from "./CanonicalLink"

const baseURL = "https://fake.url/"
const partialUrl = "fake/url/stub"
const fullUrl = `${baseURL}${partialUrl}`

const originalLocation = window.location

const getLink = (container: HTMLElement): HTMLLinkElement => {
  const links = container.getElementsByTagName("link")
  if (links.length > 1) {
    throw new Error("Too many link tags found.")
  }
  const link = links.item(0)
  if (link === null) {
    throw new Error(`No link tag found`)
  }
  return link
}

describe("CanonicalLink", () => {
  /**
   * Assign `loc` to window.location, using the original object's properties
   * where not specified.
   *
   * Properties cannot be set on the real `window.location` directly, they only
   * have getters.
   */
  const assignLocation = (loc: Partial<Location>) => {
    // @ts-expect-error window.location is not assignable, need to delete it first.
    delete window.location
    window.location = { ...originalLocation, ...loc }
  }
  afterAll(() => {
    window.location = originalLocation
  })

  it("renders a <link> with expected href when given a relative url", () => {
    assignLocation({ origin: baseURL })
    const { container } = render(<CanonicalLink relativeUrl={partialUrl} />)
    const link = getLink(container)
    expect(link.href).toBe(fullUrl)
    expect(link.rel).toBe("canonical")
  })

  it("renders a <link> with expected href when given a react-router match-like object", () => {
    assignLocation({ origin: baseURL })
    const match = { url: partialUrl }
    const { container } = render(<CanonicalLink match={match} />)
    const link = getLink(container)
    expect(link.href).toBe(fullUrl)
    expect(link.rel).toBe("canonical")
  })

  it("prefers the relative url if given both a relative url and a match-like object", () => {
    assignLocation({ origin: baseURL })
    const match = { url: "different/url/stub" }
    expect(match.url).not.toBe(partialUrl)
    const { container } = render(
      <CanonicalLink relativeUrl={partialUrl} match={match} />
    )
    const link = getLink(container)
    expect(link.href).toBe(fullUrl)
    expect(link.rel).toBe("canonical")
  })

  it.each([{}, { relativeUrl: "" }, { relativeUrl: undefined }])(
    "renders nothing when neither a relative URL or a Match object are provided",
    props => {
      const { container } = render(<CanonicalLink {...props} />)
      expect(container.getElementsByTagName("link").length).toBe(0)
    }
  )

  it("removes a trailing slash from the link's href value", () => {
    assignLocation({ origin: baseURL })
    const relativeUrl = "url/with/slash/"
    const { container } = render(<CanonicalLink relativeUrl={relativeUrl} />)
    const link = getLink(container)

    expect(relativeUrl.endsWith("/")).toBe(true)
    expect(link.href).toBe(`${baseURL}url/with/slash`)
  })
})
