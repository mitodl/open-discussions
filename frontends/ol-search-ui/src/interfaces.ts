export type LearningResourceSummary = {
  id: number
  title: string
  image_src: string | null
  platform?: string | null
  topics: CourseTopic[]
  offered_by: string[]
  object_type: string
  runs: LearningResourceRun[]
  lists: ListItemMember[]
  is_favorite?: boolean
  audience: string[]
  certification: string[]
}

export type LearningResourceResult = {
  id: number
  course_id?: string
  url?: string
  title: string
  image_src: string | null
  object_type: string
  offered_by?: string[]
  short_description?: string | null
  full_description?: string | null
  platform?: string
  topics: string[]
  runs: LearningResourceRun[]
  lists: ListItemMember[]
  is_favorite: boolean
  certification: string[]
  audience: string[]
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
