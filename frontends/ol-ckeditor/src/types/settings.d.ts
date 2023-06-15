/* eslint-disable no-var */

/**
 * Settings injected by Django
 */
interface SETTINGS {
  ckeditor_upload_url?: string
}

export declare global {
  declare var SETTINGS: SETTINGS
}
