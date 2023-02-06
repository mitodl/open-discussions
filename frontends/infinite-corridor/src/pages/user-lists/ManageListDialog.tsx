import React, { useCallback, useState } from "react"
import ManageListForm from "./ManageListForm"
import BasicDialog from "../../components/BasicDialog"
import { useToggle } from "ol-util"
import type { UserList } from "ol-search-ui"

type CreateListDialogProps = {
  open: boolean
  onClose: () => void
}
const CreateListDialog: React.FC<CreateListDialogProps> = ({
  open,
  onClose
}) => {
  return (
    <BasicDialog
      open={open}
      onClose={onClose}
      title="Create a new list"
      fullWidth
      confirmButtonProps={{ type: "submit", form: "manage-list-form" }}
      closeOnConfirm={false}
    >
      <ManageListForm
        id="manage-list-form"
        onSubmit={onClose}
      />
    </BasicDialog>
  )
}

type EditListDialogProps = {
  onClose: () => void
  resource: UserList | null
}
const EditListDialog: React.FC<EditListDialogProps> = ({
  onClose,
  resource
}) => {
  const handleConfirm = useCallback(() => {
    console.log(`Editing list`)
  }, [])
  return (
    <BasicDialog
      open={!!resource}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Edit list"
    >
      <ManageListForm
        id="manage-list-form"
        onSubmit={onClose}
        resource={resource}
      />
    </BasicDialog>
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
  const handleConfirm = useCallback(() => {
    console.log(`Deleting list`)
  }, [])
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
    console.log("Done editing")
  }, [])
  return {
    resource: resourceToEdit,
    isOpen,
    handleStart,
    handleFinish
  }
}

const useDeletionDialog = () => {
  const [resourceToDelete, setResourceToDelete] = useState<UserList | null>(null)
  const isOpen = !!resourceToDelete
  const handleStart = useCallback((resource: UserList) => {
    setResourceToDelete(resource)
  }, [])
  const handleFinish = useCallback(() => {
    setResourceToDelete(null)
    console.log("Done editing")
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
