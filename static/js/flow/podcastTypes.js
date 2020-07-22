// @flow
export type Podcast = {
  created_on: string,
  episode_count: number,
  full_description: string,
  id: number,
  image_src: string,
  offered_by: Array<string>,
  podcast_id: string,
  short_description: string,
  title: string,
  topics: Array<string>,
  updated_on: string,
  url: string,
  is_favorite: boolean,
  google_podcasts_url: ?string,
  apple_podcasts_url: ?string
}

export type PodcastEpisode = {
  created_on: string,
  episode_id: string,
  full_description: string,
  id: number,
  image_src: string,
  last_modified: string,
  offered_by: Array<string>,
  podcast: number,
  short_description: string,
  title: string,
  topics: Array<string>,
  updated_on: string,
  url: string,
  is_favorite: boolean,
  podcast_title: string
}
