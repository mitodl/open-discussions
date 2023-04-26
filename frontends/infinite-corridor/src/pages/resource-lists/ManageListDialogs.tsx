import React, { useCallback, useState } from "react"
import UpsertListDialog from "./UpsertListDialog"
import type { UpsertListDialogProps } from "./UpsertListDialog"
import BasicDialog from "../../components/BasicDialog"
import { useToggle } from "ol-util"
import type { StaffList, UserList } from "ol-search-ui"
import { useDeleteUserList } from "../../api/learning-resources"

type CreateListDialogProps = {
  open: boolean
  onClose: () => void,
  mode: UpsertListDialogProps["mode"]
}
const CreateListDialog: React.FC<CreateListDialogProps> = ({
  open,
  onClose,
  mode
}) => {
  return <UpsertListDialog mode={mode} open={open} onClose={onClose} title="Create list" />
}

type EditListDialogProps = {
  onClose: () => void
  resource: UpsertListDialogProps["resource"]
  mode: UpsertListDialogProps["mode"]
}
const EditListDialog: React.FC<EditListDialogProps> = ({
  onClose,
  resource,
  mode
}) => {
  return (
    <UpsertListDialog
      mode={mode}
      open={!!resource}
      resource={resource}
      onClose={onClose}
      title="Edit list"
    />
  )
}

type DeleteListDialogProps = {
  onClose: () => void
  resource: UserList | null
}
const DeleteListDialog: React.FC<DeleteListDialogProps> = ({
  onClose,
  resource
}) => {
  const deleteUserList = useDeleteUserList()
  const handleConfirm = useCallback(async () => {
    if (!resource) return
    await deleteUserList.mutateAsync(resource.id)
  }, [deleteUserList, resource])
  return (
    <BasicDialog
      open={!!resource}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Delete list"
      confirmText="Yes, delete"
    >
      Are you sure you want to delete this list?
    </BasicDialog>
  )
}

const useCreationDialog = () => {
  const [isOpen, toggleOpen] = useToggle(false)
  return {
    isOpen,
    handleStart:  toggleOpen.on,
    handleFinish: toggleOpen.off
  }
}

const useEditingDialog = () => {
  const [resourceToEdit, setResourceToEdit] = useState<UserList | StaffList | null>(null)
  const isOpen = !!resourceToEdit
  const handleStart = useCallback((resource: UserList | StaffList) => {
    setResourceToEdit(resource)
  }, [])
  const handleFinish = useCallback(() => {
    setResourceToEdit(null)
  }, [])
  return {
    resource: resourceToEdit,
    isOpen,
    handleStart,
    handleFinish
  }
}

const useDeleteListDialog = () => {
  const [resourceToDelete, setResourceToDelete] = useState<UserList | StaffList | null>(
    null
  )
  const isOpen = !!resourceToDelete
  const handleStart = useCallback((resource: UserList | StaffList) => {
    setResourceToDelete(resource)
  }, [])
  const handleFinish = useCallback(() => {
    setResourceToDelete(null)
  }, [])
  return {
    resource: resourceToDelete,
    isOpen,
    handleStart,
    handleFinish
  }
}

export {
  CreateListDialog,
  EditListDialog,
  DeleteListDialog,
  useCreationDialog,
  useEditingDialog,
  useDeleteListDialog
}
