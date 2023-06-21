/* eslint-disable no-var */

/**
 * Settings injected by Django
 */

export declare global {
  declare var SETTINGS

  interface SETTINGS {
    search_page_size: number
    embedlyKey: string
    ocw_next_base_url: string
  }
}
