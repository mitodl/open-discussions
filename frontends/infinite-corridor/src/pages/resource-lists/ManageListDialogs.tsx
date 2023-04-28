import React, { useCallback } from "react"
import * as NiceModal from "@ebay/nice-modal-react"
import BasicDialog from "../../components/BasicDialog"
import { LearningResourceType as LRT, StaffList, UserList } from "ol-search-ui"
import {
  useDeleteStaffList,
  useDeleteUserList
} from "../../api/learning-resources"

type DeleteListDialogProps = {
  resource: UserList | StaffList
}

const useDeleteList = (resource: UserList | StaffList) => {
  const deleteUserList = useDeleteUserList()
  const deleteStaffList = useDeleteStaffList()
  const type = resource.object_type
  if (type === LRT.StaffList || type === LRT.StaffPath) {
    return deleteStaffList
  }
  if (type === LRT.Userlist || type === LRT.LearningPath) {
    return deleteUserList
  }
  throw new Error("Expected a stafflist or userlist")
}

const DeleteListDialog = NiceModal.create(
  ({ resource }: DeleteListDialogProps) => {
    const modal = NiceModal.useModal()
    const hideModal = modal.hide
    const deleteList = useDeleteList(resource)

    const handleConfirm = useCallback(async () => {
      await deleteList.mutateAsync(resource.id)
      hideModal()
    }, [deleteList, resource, hideModal])
    return (
      <BasicDialog
        {...NiceModal.muiDialogV5(modal)}
        onConfirm={handleConfirm}
        title="Delete list"
        confirmText="Yes, delete"
      >
        Are you sure you want to delete this list?
      </BasicDialog>
    )
  }
)

export { DeleteListDialog }
