import axios from "axios"

/**
 * Our axios instance with default baseURL, heads, etc.
 */
const instance = axios.create({
  baseURL: "/api/v0"
})

export default instance
