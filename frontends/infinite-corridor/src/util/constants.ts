import type { EmbedlyConfig } from "ol-search-ui"

const imgConfigs = {
  row: {
    ocwBaseUrl: SETTINGS.ocw_next_base_url,
    embedlyKey: SETTINGS.embedlyKey,
    width:      170,
    height:     130
  },
  "row-reverse": {
    ocwBaseUrl: SETTINGS.ocw_next_base_url,
    embedlyKey: SETTINGS.embedlyKey,
    width:      170,
    height:     130
  },
  "row-reverse-small": {
    ocwBaseUrl: SETTINGS.ocw_next_base_url,
    embedlyKey: SETTINGS.embedlyKey,
    width:      160,
    height:     100
  },
  column: {
    ocwBaseUrl: SETTINGS.ocw_next_base_url,
    embedlyKey: SETTINGS.embedlyKey,
    width:      220,
    height:     170
  }
} satisfies Record<string, EmbedlyConfig>

export { imgConfigs }
