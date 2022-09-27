import type { CardVariant, EmbedlyConfig } from "ol-search-ui"

const imgConfigs: Record<CardVariant, EmbedlyConfig> = {
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
  column: {
    ocwBaseUrl: SETTINGS.ocw_next_base_url,
    embedlyKey: SETTINGS.embedlyKey,
    width:      220,
    height:     170
  }
}

export { imgConfigs }
