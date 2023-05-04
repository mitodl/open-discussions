import { Facets } from "@mitodl/course-search-utils"
import { PaginatedResult } from "ol-util"

export enum LearningResourceType {
  Course = "course",
  Program = "program",
  Video = "video",
  Podcast = "podcast",
  PodcastEpisode = "podcastepisode",
  Userlist = "userlist",
  LearningPath = "learningpath",
  StaffList = "list",
  StaffPath = "path"
}

/**
 * "favorites" and "popular" are not real learning resource types in the sense that none of
 * the resource objects returned by the /catalogs API endpoints have
 * object_type === "favorites".
 *
 * We occasionally treat it somewhat like a LearningResourceType, though
 * (Example: LearningResourceCardTemplate can render a list of "Favorites"
 * similarly to a UserList.)

 */
export const TYPE_FAVORITES = "favorites"

export const TYPE_POPULAR = "popular"

export enum PrivacyLevel {
  Public = "public",
  Private = "private"
}

export type LearningResource = {
  id: number
  title: string
  topics: CourseTopic[]
  short_description?: string | null
  full_description?: string | null
  object_type: LearningResourceType
  lists: ListItemMember[]
  image_src: string | null
  runs?: LearningResourceRun[]
  offered_by?: string[]
  platform?: string
  is_favorite?: boolean
  audience?: string[]
  certification: string[]
  duration?: string | null
  url?: string | null
  last_modified?: string | null
  item_count?: number // userlist annotation
  course_id?: string // required for courses
  video_id?: string // required for videos
}

type SearchResult<T> = Omit<T, "topics" | "lists"> & {
  topics?: string[]
  lists?: ListItemMember[]
}

export type LearningResourceSearchResult = SearchResult<LearningResource>

export interface Course extends LearningResource {
  runs: NonNullable<LearningResource["runs"]>
  object_type: LearningResourceType.Course
}

interface LearningList extends LearningResource {
  image_description?: string | null
  list_type: string
  privacy_level: PrivacyLevel
  author: number
  author_name: string
  item_count: number
}

export interface UserList extends LearningList {
  object_type: LearningResourceType.Userlist | LearningResourceType.LearningPath
}
export interface StaffList extends LearningList {
  object_type: LearningResourceType.StaffList | LearningResourceType.StaffPath
}

export interface Favorites
  extends Omit<LearningResource, "id" | "object_type"> {
  image_description?: string | null
  list_type: string
  item_count: number
  object_type: typeof TYPE_FAVORITES
}

/**
 * items in userlists / stafflists
 */
export type ListItem = {
  id: number
  object_id: number
  position: number
  content_type: string
  content_data: LearningResource
}

export type CourseTopic = {
  id?: number
  name: string
}

export type LearningResourceRun = {
  id: number
  language: string | null
  semester: string | null
  year: string | null
  level: string | null
  start_date: string | null
  end_date: string | null
  enrollment_start: string | null
  enrollment_end: string | null
  best_start_date: string | null
  best_end_date: string | null
  instructors: CourseInstructor[]
  prices: CoursePrice[]
  availability: string | null
  url: string | null
}

export type LearningResourceRef = {
  /**
   * The learning resource type
   */
  content_type: LearningResourceType
  /**
   * id of the learning resource itself
   */
  object_id: number
}

export type ListItemMember = {
  /**
   * The id of the list
   */
  list_id: number
  /**
   * The id of the item member record, **not** the id of the learning resource,
   * which is available at `listItemMember.object_id`.
   */
  item_id: number
} & LearningResourceRef

export type CoursePrice = {
  price: number
  mode: string
}

export type CourseInstructor = {
  first_name: string | null
  last_name: string | null
  full_name: string | null
}

export type FacetKey = keyof Facets
export type FacetManifest = [FacetKey, string][]

export type CardMinimalResource =
  | Pick<
      LearningResource,
      | "runs"
      | "certification"
      | "title"
      | "offered_by"
      | "object_type"
      | "image_src"
      | "platform"
      | "item_count"
    >
  | Favorites

export type EmbedlyConfig = {
  embedlyKey: string
  ocwBaseUrl: string
  width: number
  height: number
}

export type PaginatedListItems = PaginatedResult<ListItem>

export type PaginatedUserLists = PaginatedResult<UserList>
