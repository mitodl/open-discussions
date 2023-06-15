import axios from "axios"

/**
 * Our axios instance with default baseURL, heads, etc.
 */
const instance = axios.create({
  baseURL:        "/api/v0",
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken"
})

window.axios1 = instance

export default instance
