import getCloudServicesConfig from "./cloudServices"
import axios from "axios"

jest.mock("axios")

describe("cloudServicesConfig", () => {
  test("tokenUrl queries correct API", async () => {
    const cloud = getCloudServicesConfig()
    const mockGet = axios.get as jest.Mock
    mockGet.mockResolvedValue({ data: "the-cool-token" })
    const token = await cloud.tokenUrl()
    expect(token).toBe("the-cool-token")
  })

  test("ckeditor_upload_url is set from global SETTINGS", () => {
    SETTINGS.ckeditor_upload_url = "https://meowmeow.com"
    const cloud = getCloudServicesConfig()
    expect(cloud.uploadUrl).toBe("https://meowmeow.com")
  })
})
