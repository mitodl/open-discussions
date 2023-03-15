/* eslint-disable no-var */
export type User = {
  id: number | null
  is_authenticated: boolean
  is_list_staff: boolean
}

export declare global {
  declare var SETTINGS

  /**
   * Settings injected by Django
   */
  interface SETTINGS {
    search_page_size: number
    embedlyKey: string
    ocw_next_base_url: string
    user: User
  }
}
