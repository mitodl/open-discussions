import { isUserListOrPath, isStaffListOrPath } from "./util"
import { LearningResourceType as LRT } from "ol-search-ui"
import * as factories from "ol-search-ui/src/factories"

test.each([
  {
    list:     factories.makeUserList({ object_type: LRT.Userlist }),
    expected: true
  },
  {
    list:     factories.makeUserList({ object_type: LRT.LearningPath }),
    expected: true
  },
  {
    list:     factories.makeStaffList({ object_type: LRT.StaffList }),
    expected: false
  },
  {
    list:     factories.makeStaffList({ object_type: LRT.StaffPath }),
    expected: false
  }
])(
  "isUserListOrPath on $list.object_type returns $expected",
  ({ list, expected }) => {
    expect(isUserListOrPath(list)).toBe(expected)
  }
)

test.each([
  {
    list:     factories.makeUserList({ object_type: LRT.Userlist }),
    expected: false
  },
  {
    list:     factories.makeUserList({ object_type: LRT.LearningPath }),
    expected: false
  },
  {
    list:     factories.makeStaffList({ object_type: LRT.StaffList }),
    expected: true
  },
  {
    list:     factories.makeStaffList({ object_type: LRT.StaffPath }),
    expected: true
  }
])(
  "isStaffListOrPath on $list.object_type returns $expected",
  ({ list, expected }) => {
    expect(isStaffListOrPath(list)).toBe(expected)
  }
)
