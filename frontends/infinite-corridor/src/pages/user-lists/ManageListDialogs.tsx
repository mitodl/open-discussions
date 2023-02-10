import React, { useCallback, useState } from "react"
import UpsertListDialog from "./UpsertListDialog"
import BasicDialog from "../../components/BasicDialog"
import { useToggle } from "ol-util"
import type { UserList } from "ol-search-ui"
import { useDeleteUserList } from "../../api/learning-resources"

type CreateListDialogProps = {
  open: boolean
  onClose: () => void
}
const CreateListDialog: React.FC<CreateListDialogProps> = ({
  open,
  onClose
}) => {
  return <UpsertListDialog open={open} onClose={onClose} title="Create list" />
}

type EditListDialogProps = {
  onClose: () => void
  resource: UserList | null
}
const EditListDialog: React.FC<EditListDialogProps> = ({
  onClose,
  resource
}) => {
  return (
    <UpsertListDialog
      open={!!resource}
      resource={resource}
      onClose={onClose}
      title="Edit list"
    />
  )
}

type DeletionDialogProps = {
  onClose: () => void
  resource: UserList | null
}
const DeletionDialog: React.FC<DeletionDialogProps> = ({
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
  const [resourceToEdit, setResourceToEdit] = useState<UserList | null>(null)
  const isOpen = !!resourceToEdit
  const handleStart = useCallback((resource: UserList) => {
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

const useDeletionDialog = () => {
  const [resourceToDelete, setResourceToDelete] = useState<UserList | null>(
    null
  )
  const isOpen = !!resourceToDelete
  const handleStart = useCallback((resource: UserList) => {
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
  DeletionDialog,
  useCreationDialog,
  useEditingDialog,
  useDeletionDialog
}
