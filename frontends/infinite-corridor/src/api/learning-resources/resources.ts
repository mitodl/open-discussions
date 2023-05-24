import type { CourseTopic, LearningResource } from "ol-search-ui"
import axios from "../../libs/axios"
import { useQuery } from "@tanstack/react-query"
import type { UseQueryOptions } from "@tanstack/react-query"
import { urls, keys } from "./urls"
import type { CourseOptions } from "./urls"
import type { PaginatedResult, PaginationSearchParams } from "ol-util"

const useResource = (
  type: string,
  id: number,
  options: Pick<UseQueryOptions, "enabled"> = {}
) => {
  const key = keys.resource(type).id(id).details
  return useQuery<LearningResource>(
    key,
    async () => {
      const url = urls.resource.details(type, id)
      return axios.get(url).then(res => res.data)
    },
    options
  )
}

const useTopics = (opts?: Pick<UseQueryOptions, "enabled">) => {
  const key = keys.topics
  const url = urls.topics.listing
  return useQuery<PaginatedResult<CourseTopic>>(
    key,
    () => axios.get(url).then(res => res.data),
    opts
  )
}

const useUpcomingCourses = (options?: CourseOptions) => {
  const url = urls.course.upcoming(options)

  const key = keys.courses.upcoming.page(options)

  return useQuery<PaginatedResult<LearningResource>>(key, () =>
    axios.get(url).then(res => res.data)
  )
}

const usePopularContent = (options?: PaginationSearchParams) => {
  const url = urls.popularContent.listing(options)

  const key = keys.popularContent.listing.page(options)

  return useQuery<PaginatedResult<LearningResource>>(key, () =>
    axios.get(url).then(res => res.data)
  )
}

const useNewVideos = (options?: PaginationSearchParams) => {
  const url = urls.video.new(options)

  const key = keys.videos.new.page(options)

  return useQuery<PaginatedResult<LearningResource>>(key, () =>
    axios.get(url).then(res => res.data)
  )
}

export {
  useResource,
  useTopics,
  useUpcomingCourses,
  usePopularContent,
  useNewVideos
}
