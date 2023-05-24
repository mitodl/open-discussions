import UrlAssembler from "url-assembler"
import {
  LearningResourceType as LRT,
  TYPE_FAVORITES,
  TYPE_POPULAR
} from "ol-search-ui"
import type { PaginationSearchParams } from "ol-util"
import type { SearchQueryParams } from "@mitodl/course-search-utils"

const DEFAULT_PAGINATION_PARAMS: PaginationSearchParams = {
  offset: 0,
  limit:  50
}

const popularContentApi = UrlAssembler("/popular-content/")
const popularContentUrls = {
  listing: (options: PaginationSearchParams = {}) =>
    popularContentApi
      .param({ ...DEFAULT_PAGINATION_PARAMS, ...options })
      .toString()
}

type CourseOptions = PaginationSearchParams & { offered_by?: string }
const courseApi = UrlAssembler("/courses/")
const courseDetailsApi = courseApi.segment(":id/")
const courseUrls = {
  details:  (id: number) => courseDetailsApi.param({ id }).toString(),
  upcoming: (options: CourseOptions = {}) =>
    courseApi
      .segment("upcoming/")
      .param({ ...DEFAULT_PAGINATION_PARAMS, ...options })
      .toString(),
  listing: (options: PaginationSearchParams = {}) =>
    courseApi.param({ ...DEFAULT_PAGINATION_PARAMS, ...options }).toString(),
  favorite: (id: number) =>
    courseDetailsApi.segment("favorite/").param({ id }).toString(),
  unfavorite: (id: number) =>
    courseDetailsApi.segment("unfavorite/").param({ id }).toString()
}

const programApi = UrlAssembler("/programs/")
const programDetailsApi = programApi.segment(":id/")
const programUrls = {
  details: (id: number) => programDetailsApi.param({ id }).toString(),
  listing: (options: PaginationSearchParams = {}) =>
    programApi.param({ ...DEFAULT_PAGINATION_PARAMS, ...options }).toString(),
  favorite: (id: number) =>
    programDetailsApi.segment("favorite/").param({ id }).toString(),
  unfavorite: (id: number) =>
    programDetailsApi.segment("unfavorite/").param({ id }).toString()
}

const videoApi = UrlAssembler("/videos/")
const videoDetailsApi = videoApi.segment(":id/")
const videoUrls = {
  details: (id: number) => videoDetailsApi.param({ id }).toString(),
  listing: (options: PaginationSearchParams = {}) =>
    videoApi.param({ ...DEFAULT_PAGINATION_PARAMS, ...options }).toString(),
  favorite: (id: number) =>
    videoDetailsApi.segment("favorite/").param({ id }).toString(),
  unfavorite: (id: number) =>
    videoDetailsApi.segment("unfavorite/").param({ id }).toString(),
  new: (options: PaginationSearchParams = {}) =>
    videoApi
      .segment("new/")
      .param({ ...DEFAULT_PAGINATION_PARAMS, ...options })
      .toString()
}

const podcastApi = UrlAssembler("/podcasts/")
const podcastDetailsApi = podcastApi.segment(":id/")
const podcastUrls = {
  details: (id: number) => podcastDetailsApi.param({ id }).toString(),
  listing: (options: PaginationSearchParams = {}) =>
    podcastApi.param({ ...DEFAULT_PAGINATION_PARAMS, ...options }).toString(),
  favorite: (id: number) =>
    podcastDetailsApi.segment("favorite/").param({ id }).toString(),
  unfavorite: (id: number) =>
    podcastDetailsApi.segment("unfavorite/").param({ id }).toString()
}

const podcastEpisodeApi = UrlAssembler("/podcastepisodes/")
const podcastEpisodeDetailsApi = podcastEpisodeApi.segment(":id/")
const podcastEpisodeUrls = {
  details: (id: number) => podcastEpisodeDetailsApi.param({ id }).toString(),
  listing: (options: PaginationSearchParams = {}) =>
    podcastEpisodeApi
      .param({ ...DEFAULT_PAGINATION_PARAMS, ...options })
      .toString(),
  favorite: (id: number) =>
    podcastEpisodeDetailsApi.segment("favorite/").param({ id }).toString(),
  unfavorite: (id: number) =>
    podcastEpisodeDetailsApi.segment("unfavorite/").param({ id }).toString()
}

const favoriteApi = UrlAssembler("/favorites/")
const favoriteUrls = {
  listing: (options: PaginationSearchParams = {}) =>
    favoriteApi.param({ ...DEFAULT_PAGINATION_PARAMS, ...options }).toString()
}

const userListApi = UrlAssembler("/userlists/")
const userListDetailApi = userListApi.segment(":id/")
const userListItemsApi = userListDetailApi.segment("items/")
const userListItemsDetailApi = userListItemsApi.segment(":itemId/")

type UserListOptions = { public?: boolean } & PaginationSearchParams
const userListUrls = {
  details: (id: number) => userListDetailApi.param({ id }).toString(),
  create:  userListApi.toString(),
  listing: (options: UserListOptions = {}) =>
    userListApi.param({ ...DEFAULT_PAGINATION_PARAMS, ...options }).toString(),
  itemAdd: (listId: number) =>
    userListItemsApi.param({ id: listId }).toString(),
  itemsListing: (listId: number, options: PaginationSearchParams = {}) =>
    userListItemsApi
      .param({ id: listId, ...DEFAULT_PAGINATION_PARAMS, ...options })
      .toString(),
  itemDetails: (id: number, itemId: number) =>
    userListItemsDetailApi.param({ id, itemId }).toString(),
  favorite: (id: number) =>
    userListDetailApi.segment("favorite/").param({ id }).toString(),
  unfavorite: (id: number) =>
    userListDetailApi.segment("unfavorite/").param({ id }).toString()
}

const staffListsApi = UrlAssembler("/stafflists/")
const staffListsDetailApi = staffListsApi.segment(":id/")
const staffListsItemsApi = staffListsDetailApi.segment("items/")
const staffListsItemsDetailApi = staffListsItemsApi.segment(":itemId/")

type StaffListOptions = { public?: boolean } & PaginationSearchParams
const staffListUrls = {
  details: (id: number) => staffListsDetailApi.param({ id }).toString(),
  create:  staffListsApi.toString(),
  listing: (options: UserListOptions = {}) =>
    staffListsApi
      .param({ ...DEFAULT_PAGINATION_PARAMS, ...options })
      .toString(),
  itemAdd: (listId: number) =>
    staffListsItemsApi.param({ id: listId }).toString(),
  itemsListing: (listId: number, options: PaginationSearchParams = {}) =>
    staffListsItemsApi
      .param({ id: listId, ...DEFAULT_PAGINATION_PARAMS, ...options })
      .toString(),
  itemDetails: (id: number, itemId: number) =>
    staffListsItemsDetailApi.param({ id, itemId }).toString(),
  favorite: (id: number) =>
    staffListsDetailApi.segment("favorite/").param({ id }).toString(),
  unfavorite: (id: number) =>
    staffListsDetailApi.segment("unfavorite/").param({ id }).toString()
}

type ResourceUrls = {
  details: (id: number) => string
  favorite: (id: number) => string
  unfavorite: (id: number) => string
}
const getResourceUrls = (type: string): ResourceUrls => {
  switch (type) {
  case LRT.Course:
    return courseUrls
  case LRT.Program:
    return programUrls
  case LRT.Video:
    return videoUrls
  case LRT.Podcast:
    return podcastUrls
  case LRT.PodcastEpisode:
    return podcastEpisodeUrls
  case LRT.Userlist:
    return userListUrls
  case LRT.LearningPath:
    return userListUrls // LearningPaths & UserLists are handled by the same api
  case LRT.StaffList:
    return staffListUrls
  case LRT.StaffPath:
    return staffListUrls // StaffPaths & StaffLists are handled by the same api
  default:
    throw new Error(`Unknown resource type: ${type}`)
  }
}
const resourceUrls = {
  details:    (type: string, id: number) => getResourceUrls(type).details(id),
  favorite:   (type: string, id: number) => getResourceUrls(type).favorite(id),
  unfavorite: (type: string, id: number) => getResourceUrls(type).unfavorite(id)
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
  staffList:      staffListUrls,
  resource:       resourceUrls,
  topics:         topicsUrls,
  search:         "search/",
  popularContent: popularContentUrls
}

const baseKey = "learning-resources"
const resourceKeys = (type: string) => {
  let normalized = type
  if (type === LRT.LearningPath) {
    normalized = LRT.Userlist
  } else if (type === LRT.StaffPath) {
    normalized = LRT.StaffList
  }
  return {
    all: [baseKey, normalized],
    id:  (id: number) => ({
      all:     [baseKey, normalized, id],
      details: [baseKey, normalized, id, "details"]
    }),
    listing: {
      all:  [baseKey, normalized, "listing"],
      page: <T extends PaginationSearchParams>(opts?: T) => [
        baseKey,
        normalized,
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
  topics:   [baseKey, "topics"],
  search:   {
    all:   [baseKey, "search"],
    pages: (params: Omit<SearchQueryParams, "from">) => [
      ...keys.search.all,
      params
    ]
  },
  userList: {
    ...resourceKeys(LRT.Userlist),
    /**
     * Why not nest this under `userList.id(id: number)`?
     *
     * Because changing a resource can affect the itemsListing response for any
     * userlist. Suppose resource X is mutated. By placing the itemsListing key
     * here, we can more easily invalidate all itemsListings that depend on
     * resource X.
     */
    itemsListing: {
      all: [...resourceKeys(LRT.Userlist).all, "items"],
      for: (listId: number) => {
        const allForId = [...resourceKeys(LRT.Userlist).all, "items", listId]
        return {
          all:      allForId,
          infinite: <T extends Omit<PaginationSearchParams, "offset">>(
            opts?: T
          ) => [...allForId, "infinite", opts]
        }
      }
    }
  },
  staffList: {
    ...resourceKeys(LRT.StaffList),
    itemsListing: {
      all: [...resourceKeys(LRT.StaffList).all, "items"],
      for: (listId: number) => {
        const allForId = [...resourceKeys(LRT.StaffList).all, "items", listId]
        return {
          all:      allForId,
          infinite: <T extends Omit<PaginationSearchParams, "offset">>(
            opts?: T
          ) => [...allForId, "infinite", opts]
        }
      }
    }
  },
  favorites: {
    all:     resourceKeys(TYPE_FAVORITES).all,
    listing: resourceKeys(TYPE_FAVORITES).listing
  },
  courses: {
    upcoming: {
      all:  [...resourceKeys(LRT.Course).all, "upcoming"],
      page: (opts?: CourseOptions) => [
        ...resourceKeys(LRT.Course).all,
        "upcoming",
        opts
      ]
    }
  },
  videos: {
    new: {
      all:  [...resourceKeys(LRT.Video).all, "new"],
      page: (opts?: PaginationSearchParams) => [
        ...resourceKeys(LRT.Video).all,
        "new",
        opts
      ]
    }
  },
  popularContent: {
    listing: resourceKeys(TYPE_POPULAR).listing
  }
}

export { urls, keys, DEFAULT_PAGINATION_PARAMS }
export type { UserListOptions, StaffListOptions, CourseOptions }
