import { Facets } from "@mitodl/course-search-utils"
import { PaginatedResult } from "ol-util"

export enum LearningResourceType {
  Course = "course",
  Program = "program",
  Userlist = "userlist",
  LearningPath = "learningpath",
  Video = "video",
  Podcast = "podcast",
  PodcastEpisode = "podcastepisode",
  Favorites = "favorites"
}

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

type SearchResult<T> = Omit<T, "topics"> & {
  topics?: string[]
}

export type LearningResourceResult = SearchResult<LearningResource>

export interface Course extends LearningResource {
  runs: NonNullable<LearningResource["runs"]>
  object_type: LearningResourceType.Course
}

export interface UserList extends LearningResource {
  image_description?: string | null
  list_type: string
  privacy_level: string
  author: number
  author_name: string
  item_count: number
  object_type: LearningResourceType.Userlist | LearningResourceType.LearningPath
}

export type UserListItem = {
  id: number
  is_favorite: boolean
  object_id: number
  position: number
  program: number
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
  object_id: number
  content_type: string
}

export type ListItemMember = {
  list_id: number
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

export type CardMinimalResource = Pick<
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

export type EmbedlyConfig = {
  embedlyKey: string
  ocwBaseUrl: string
  width: number
  height: number
}

export type PaginatedUserListItems = PaginatedResult<UserListItem>

export type PaginatedUserLists = PaginatedResult<UserList>
