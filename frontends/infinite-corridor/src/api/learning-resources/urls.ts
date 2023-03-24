import UrlAssembler from "url-assembler"
import { LearningResourceType as LRT, TYPE_FAVORITES } from "ol-search-ui"
import type { PaginationSearchParams } from "ol-util"

const DEFAULT_PAGINATION_PARAMS: PaginationSearchParams = {
  offset: 0,
  limit:  50
}

const courseApi = UrlAssembler("/courses/")
const courseDetailsApi = courseApi.segment(":id/")
const courseUrls = {
  details: (id: number) => courseDetailsApi.param({ id }).toString(),
  listing: (options: PaginationSearchParams = {}) =>
    courseApi.param({ ...DEFAULT_PAGINATION_PARAMS, ...options }).toString()
}

const programApi = UrlAssembler("/programs/")
const programDetailsApi = programApi.segment(":id/")
const programUrls = {
  details: (id: number) => programDetailsApi.param({ id }).toString(),
  listing: (options: PaginationSearchParams = {}) =>
    programApi.param({ ...DEFAULT_PAGINATION_PARAMS, ...options }).toString()
}

const videoApi = UrlAssembler("/videos/")
const videoDetailsApi = videoApi.segment(":id/")
const videoUrls = {
  details: (id: number) => videoDetailsApi.param({ id }).toString(),
  listing: (options: PaginationSearchParams = {}) =>
    videoApi.param({ ...DEFAULT_PAGINATION_PARAMS, ...options }).toString()
}

const podcastApi = UrlAssembler("/podcasts/")
const podcastDetailsApi = podcastApi.segment(":id/")
const podcastUrls = {
  details: (id: number) => podcastDetailsApi.param({ id }).toString(),
  listing: (options: PaginationSearchParams = {}) =>
    podcastApi.param({ ...DEFAULT_PAGINATION_PARAMS, ...options }).toString()
}

const podcastEpisodeApi = UrlAssembler("/podcastepisodes/")
const podcastEpisodeDetailsApi = podcastEpisodeApi.segment(":id/")
const podcastEpisodeUrls = {
  details: (id: number) => podcastEpisodeDetailsApi.param({ id }).toString(),
  listing: (options: PaginationSearchParams = {}) =>
    podcastEpisodeApi
      .param({ ...DEFAULT_PAGINATION_PARAMS, ...options })
      .toString()
}

const favoriteApi = UrlAssembler("/favorites/")
const favoriteUrls = {
  listing: (options: PaginationSearchParams = {}) =>
    favoriteApi.param({ ...DEFAULT_PAGINATION_PARAMS, ...options }).toString()
}

const userListApi = UrlAssembler("/userlists/")
const userListDetailApi = userListApi.segment(":id/")
const userListItemsApiU = userListDetailApi.segment("items/")
const userListItemsDetailApi = userListItemsApiU.segment(":itemId/")

type UserListOptions = { public?: boolean } & PaginationSearchParams
const userListUrls = {
  details: (id: number) => userListDetailApi.param({ id }).toString(),
  create:  userListApi.toString(),
  listing: (options: UserListOptions = {}) =>
    userListApi.param({ ...DEFAULT_PAGINATION_PARAMS, ...options }).toString(),
  itemsListing: (id: number, options: PaginationSearchParams = {}) =>
    userListItemsApiU
      .param({ id, ...DEFAULT_PAGINATION_PARAMS, ...options })
      .toString(),
  itemDetails: (id: number, itemId: number) =>
    userListItemsDetailApi.param({ id, itemId }).toString()
}

const resourceUrls = {
  details: (type: string, id: number) => {
    switch (type) {
    case LRT.Course:
      return courseUrls.details(id)
    case LRT.Program:
      return programUrls.details(id)
    case LRT.Video:
      return videoUrls.details(id)
    case LRT.Podcast:
      return podcastUrls.details(id)
    case LRT.PodcastEpisode:
      return podcastEpisodeUrls.details(id)
    case LRT.Userlist:
      return userListUrls.details(id)
    default:
      throw new Error(`Unknown resource type: ${type}`)
    }
  }
}

const topicsUrls = {
  listing: "/topics/"
}

const urls = {
  course:         courseUrls,
  program:        programUrls,
  video:          videoUrls,
  podcast:        podcastUrls,
  podcastEpisode: podcastEpisodeUrls,
  favorite:       favoriteUrls,
  userList:       userListUrls,
  resource:       resourceUrls,
  topics:         topicsUrls
}

const baseKey = "learning-resources"
const resourceKeys = (type: string) => {
  return {
    all: [baseKey, type],
    id:  (id: number) => ({
      all:     [baseKey, type, id],
      details: [baseKey, type, id, "details"]
    }),
    listing: {
      all:  [baseKey, type, "listing"],
      page: <T extends PaginationSearchParams>(opts?: T) => [
        baseKey,
        type,
        "listing",
        opts
      ]
    }
  }
}

/**
 * Hierarchical key structure for use as query keys with react-query.
 *
 * Some entries, e.g., `resource.all()` are not used directly as query keys.
 * Rather, they are used to conveniently invalidate a portion of the cache.
 */
const keys = {
  all:      [baseKey],
  resource: resourceKeys,
  userList: {
    all: () => resourceKeys(LRT.Userlist).all,
    id:  (id: number) => ({
      ...resourceKeys(LRT.Userlist).id(id),
      itemsListing: (options?: PaginationSearchParams) => [
        ...keys.userList.id(id).all,
        "items",
        options
      ]
    }),
    listing: {
      all:  resourceKeys(LRT.Userlist).listing.all,
      page: (opts?: UserListOptions) =>
        resourceKeys(LRT.Userlist).listing.page(opts)
    }
  },
  topics:    [baseKey, "topics"],
  favorites: {
    all:     resourceKeys(TYPE_FAVORITES).all,
    listing: resourceKeys(TYPE_FAVORITES).listing
  }
}

export { urls, keys, DEFAULT_PAGINATION_PARAMS }
export type { UserListOptions }
