import type { CloudServicesConfig } from "@ckeditor/ckeditor5-cloud-services"
import axios from "axios"

const cloudServicesConfig: CloudServicesConfig = {
  uploadUrl: SETTINGS.ckeditor_upload_url,
  tokenUrl:  async () => {
    const { data } = await axios.get("/api/v0/ckeditor/")
    return data
  }
}

export default cloudServicesConfig
