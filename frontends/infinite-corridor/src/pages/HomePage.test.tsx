import { assertInstanceOf, assertNotNil } from "ol-util"
import {
  screen,
  renderTestApp,
  setMockResponse,
  user,
  within
} from "../test-utils"
import { urls } from "../api/learning-resources"
import * as lrFactory from "ol-search-ui/src/factories"
import { LearningResource } from "ol-search-ui"
import LearningResourceCard from "../components/LearningResourceCard"

const getSearchTextInput = (): HTMLInputElement => {
  const textInput = screen.getByPlaceholderText("What do you want to learn?", {
    exact: false
  })
  assertInstanceOf(textInput, HTMLInputElement)
  return textInput
}

const spyLearningResourceCard = jest.mocked(LearningResourceCard)

const checkLRC = async (container: HTMLElement, resource: LearningResource) => {
  await within(container).findByText(resource.title)
  expect(spyLearningResourceCard).toHaveBeenCalledWith(
    expect.objectContaining({ resource }),
    expect.anything()
  )
}

describe("HomePage", () => {
  test("Submitting search goes to search page", async () => {
    setMockResponse.post("search/", { hits: { hits: [], total: 0 } })
    setMockResponse.get(urls.course.upcoming(), [])
    setMockResponse.get(
      urls.course.upcoming({ offered_by: "Micromasters" }),
      []
    )
    setMockResponse.get(urls.video.new(), [])
    setMockResponse.get(urls.popularContent.listing(), [])

    const { history } = renderTestApp()

    const textInput = getSearchTextInput()
    await user.type(textInput, "Physics or math{Enter}")
    expect(history.location).toStrictEqual(
      expect.objectContaining({
        pathname: "/infinite/search",
        search:   "?q=Physics+or+math"
      })
    )
  })

  it("renders a resource carusel with upcoming courses", async () => {
    const coursesResult = lrFactory.makeCoursesPaginated({ count: 4 })

    setMockResponse.post("search/", { hits: { hits: [], total: 0 } })

    setMockResponse.get(urls.course.upcoming(), coursesResult)
    setMockResponse.get(
      urls.course.upcoming({ offered_by: "Micromasters" }),
      []
    )
    setMockResponse.get(urls.video.new(), [])
    setMockResponse.get(urls.popularContent.listing(), [])

    renderTestApp()

    const title = await screen.findByText("Upcoming Courses")
    assertNotNil(title)

    const upcomingCoursesDiv = title.closest("div")

    assertNotNil(upcomingCoursesDiv)

    const [course1, course2, course3, course4] = coursesResult.results

    await checkLRC(upcomingCoursesDiv, course1)
    await checkLRC(upcomingCoursesDiv, course2)
    await checkLRC(upcomingCoursesDiv, course3)
    await checkLRC(upcomingCoursesDiv, course4)

    const prev = within(upcomingCoursesDiv).getByText("Previous")
    const next = within(upcomingCoursesDiv).getByText("Next")
    expect(prev).toBeInstanceOf(HTMLButtonElement)
    expect(next).toBeInstanceOf(HTMLButtonElement)
  })

  it("renders a resource carusel with new videos", async () => {
    const videosResult = lrFactory.makeVideosPaginated({ count: 4 })

    setMockResponse.post("search/", { hits: { hits: [], total: 0 } })

    setMockResponse.get(urls.course.upcoming(), [])
    setMockResponse.get(
      urls.course.upcoming({ offered_by: "Micromasters" }),
      []
    )
    setMockResponse.get(urls.video.new(), videosResult)
    setMockResponse.get(urls.popularContent.listing(), [])

    renderTestApp()

    const title = await screen.findByText("New Videos From MIT")
    assertNotNil(title)

    const newVideosDiv = title.closest("div")

    assertNotNil(newVideosDiv)

    const [video1, video2, video3, video4] = videosResult.results

    await checkLRC(newVideosDiv, video1)
    await checkLRC(newVideosDiv, video2)
    await checkLRC(newVideosDiv, video3)
    await checkLRC(newVideosDiv, video4)

    const prev = within(newVideosDiv).getByText("Previous")
    const next = within(newVideosDiv).getByText("Next")
    expect(prev).toBeInstanceOf(HTMLButtonElement)
    expect(next).toBeInstanceOf(HTMLButtonElement)
  })

  it("renders a resource carusel with popular learning resources", async () => {
    const popularResult = lrFactory.makeLearningResourcesPaginated({ count: 4 })

    setMockResponse.post("search/", { hits: { hits: [], total: 0 } })

    setMockResponse.get(urls.course.upcoming(), [])
    setMockResponse.get(
      urls.course.upcoming({ offered_by: "Micromasters" }),
      []
    )
    setMockResponse.get(urls.video.new(), [])
    setMockResponse.get(urls.popularContent.listing(), popularResult)

    renderTestApp()

    const title = await screen.findByText("Popular Learning Resources")
    assertNotNil(title)

    const popularResourcesDiv = title.closest("div")

    assertNotNil(popularResourcesDiv)

    const [resource1, resource2, resource3, resource4] = popularResult.results

    await checkLRC(popularResourcesDiv, resource1)
    await checkLRC(popularResourcesDiv, resource2)
    await checkLRC(popularResourcesDiv, resource3)
    await checkLRC(popularResourcesDiv, resource4)

    const prev = within(popularResourcesDiv).getByRole("button", {
      name: "Previous"
    })
    const next = within(popularResourcesDiv).getByRole("button", {
      name: "Next"
    })
    expect(prev).toBeInstanceOf(HTMLButtonElement)
    expect(next).toBeInstanceOf(HTMLButtonElement)
  })
})
