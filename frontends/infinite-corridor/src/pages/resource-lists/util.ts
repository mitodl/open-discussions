import { LearningResourceType as LRT } from "ol-search-ui"
import type { UserList, StaffList } from "ol-search-ui"

const isUserListOrPath = (
  resource: UserList | StaffList
): resource is UserList => {
  return (
    resource.object_type === LRT.Userlist ||
    resource.object_type === LRT.LearningPath
  )
}
const isStaffListOrPath = (
  resource: UserList | StaffList
): resource is StaffList => {
  return (
    resource.object_type === LRT.StaffList ||
    resource.object_type === LRT.StaffPath
  )
}

export { isUserListOrPath, isStaffListOrPath }
