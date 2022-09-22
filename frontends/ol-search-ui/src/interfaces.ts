import { Facets } from "@mitodl/course-search-utils"

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

export type LearningResource = {
  id: number
  title: string
  topics: CourseTopic[]
  object_type: LearningResourceType
  lists: ListItemMember[]
  image_src: string | null
  runs?: LearningResourceRun[]
  offered_by?: string[]
  platform?: string
  is_favorite?: boolean
  audience?: string[]
  certification: string[]
}

export interface LearningResourceResult {
  id: number
  course_id?: string
  video_id?: string
  url?: string
  title: string
  image_src: string | null
  object_type: LearningResourceType
  offered_by?: string[]
  short_description?: string | null
  full_description?: string | null
  platform?: string
  topics?: string[]
  runs?: LearningResourceRun[]
  lists: ListItemMember[]
  is_favorite: boolean
  certification: string[]
  audience: string[]
  item_count?: number
  last_modified?: string | null
  duration?: string | null
}

export interface CourseResult extends LearningResourceResult {
  runs: NonNullable<LearningResourceResult["runs"]>
  object_type: LearningResourceType.Course
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
  | "id"
>

export type EmbedlyConfig = {
  embedlyKey: string
  ocwBaseUrl: string
  width: number
  height: number
}
