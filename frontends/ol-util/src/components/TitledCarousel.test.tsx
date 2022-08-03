/* eslint-disable testing-library/no-node-access */
import React from "react"
import { faker } from "@faker-js/faker"
import { render, screen } from "@testing-library/react"
import user from "@testing-library/user-event"
import TitledCarousel, { TitledCarouselProps } from "./TitledCarousel"
import TrueNukaCarousel from "nuka-carousel"

jest.mock("nuka-carousel", () => {
  const actual = jest.requireActual("nuka-carousel")
  return {
    ...actual,
    default:    jest.fn(() => <div />),
    __esModule: true
  }
})

const NukaCarousel = jest.mocked(TrueNukaCarousel)

const setupCarousel = (props?: Partial<TitledCarouselProps>) =>
  render(
    <TitledCarousel
      title="My Cool Title"
      pageSize={2}
      previous={<button>PrevPage!</button>}
      next={<button>NextPage!</button>}
      {...props}
    >
      <div>Child 1</div>
      <div>Child 2</div>
      <div>Child 3</div>
      <div>Child 4</div>
      <div>Child 5</div>
    </TitledCarousel>
  )

const getNextPageButton = () => screen.getByText("NextPage!")
const getPrevPageButton = () => screen.getByText("PrevPage!")

describe("Card component", () => {
  it("passes pageSize to NukaCarousel", async () => {
    const pageSize = faker.datatype.number({ min: 2, max: 4 })
    setupCarousel({ pageSize })
    expect(NukaCarousel).toHaveBeenCalledWith(
      expect.objectContaining({ slidesToShow: pageSize }),
      expect.anything()
    )
  })

  it("passes animationDuration to NukaCarousel", async () => {
    const animationDuration = faker.datatype.number()
    setupCarousel({ animationDuration })
    expect(NukaCarousel).toHaveBeenCalledWith(
      expect.objectContaining({ speed: animationDuration }),
      expect.anything()
    )
  })

  it("Flips pages with Next and Prev buttons", async () => {
    setupCarousel()

    const prev = getPrevPageButton()
    const next = getNextPageButton()

    // first page: items 0, 1 of 0, 1, 2, 3, 4
    expect(NukaCarousel).toHaveBeenLastCalledWith(
      expect.objectContaining({ slideIndex: 0 }),
      expect.anything()
    )
    expect(prev).toBeDisabled()
    expect(next).not.toBeDisabled()

    // second page: items 2, 3 of 0, 1, 2, 3, 4
    await user.click(next)
    expect(NukaCarousel).toHaveBeenLastCalledWith(
      expect.objectContaining({ slideIndex: 2 }),
      expect.anything()
    )
    expect(prev).not.toBeDisabled()
    expect(next).not.toBeDisabled()

    // second page: items 4 of 0, 1, 2, 3, 4
    await user.click(next)
    expect(NukaCarousel).toHaveBeenLastCalledWith(
      expect.objectContaining({ slideIndex: 4 }),
      expect.anything()
    )

    expect(prev).not.toBeDisabled()
    expect(next).toBeDisabled()

    // second page: items 2, 3 of 0, 1, 2, 3, 4
    await user.click(prev)
    expect(NukaCarousel).toHaveBeenLastCalledWith(
      expect.objectContaining({ slideIndex: 2 }),
      expect.anything()
    )
    expect(prev).not.toBeDisabled()
    expect(next).not.toBeDisabled()

    // second page: items 2, 3 of 0, 1, 2, 3, 4
    await user.click(prev)
    expect(NukaCarousel).toHaveBeenLastCalledWith(
      expect.objectContaining({ slideIndex: 0 }),
      expect.anything()
    )
    expect(prev).toBeDisabled()
    expect(next).not.toBeDisabled()
  })

  it.each([
    {
      componnent: undefined,
      tagName:    "DIV"
    },
    {
      componnent: "div" as const,
      tagName:    "DIV"
    },
    {
      componnent: "section" as const,
      tagName:    "SECTION"
    }
  ])(
    "renders a container determined by `props.as`",
    ({ componnent, tagName }) => {
      const { container } = setupCarousel({ as: componnent })
      const root = container.firstChild as HTMLElement
      expect(root.tagName).toBe(tagName)
    }
  )

  it("Renders the container with the given className", () => {
    const { container } = setupCarousel({ className: "best-class ever" })

    expect(container.firstChild).toHaveClass("best-class")
    expect(container.firstChild).toHaveClass("ever")
  })
})
