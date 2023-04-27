import React, { useCallback } from "react"
import * as NiceModal from "@ebay/nice-modal-react"
import BasicDialog from "../../components/BasicDialog"
import type { StaffList, UserList } from "ol-search-ui"
import { useDeleteUserList } from "../../api/learning-resources"

type DeleteListDialogProps = {
  resource: UserList | StaffList
}
const DeleteListDialog = NiceModal.create(
  ({ resource }: DeleteListDialogProps) => {
    const modal = NiceModal.useModal()
    const deleteUserList = useDeleteUserList()
    const handleConfirm = useCallback(async () => {
      if (!resource) return
      await deleteUserList.mutateAsync(resource.id)
      modal.hide()
    }, [deleteUserList, resource, modal])
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
