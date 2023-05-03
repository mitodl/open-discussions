import { isUserListOrPath, isStaffListOrPath } from "./util"
import { LearningResourceType as LR } from "./interfaces"
import * as factories from "./factories"

test.each([
  {
    list:     factories.makeUserList({ object_type: LR.Userlist }),
    expected: true
  },
  {
    list:     factories.makeUserList({ object_type: LR.LearningPath }),
    expected: true
  },
  {
    list:     factories.makeStaffList({ object_type: LR.StaffList }),
    expected: false
  },
  {
    list:     factories.makeStaffList({ object_type: LR.StaffPath }),
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
    list:     factories.makeUserList({ object_type: LR.Userlist }),
    expected: false
  },
  {
    list:     factories.makeUserList({ object_type: LR.LearningPath }),
    expected: false
  },
  {
    list:     factories.makeStaffList({ object_type: LR.StaffList }),
    expected: true
  },
  {
    list:     factories.makeStaffList({ object_type: LR.StaffPath }),
    expected: true
  }
])(
  "isStaffListOrPath on $list.object_type returns $expected",
  ({ list, expected }) => {
    expect(isStaffListOrPath(list)).toBe(expected)
  }
)
