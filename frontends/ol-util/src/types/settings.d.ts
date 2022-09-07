/* eslint-disable no-var */

/**
 * Settings injected by Django
 */
interface SETTINGS {
  search_page_size: number
  embedlyKey: string
  ocw_next_base_url: string
}
export declare global {
  declare var SETTINGS: SETTINGS
}
