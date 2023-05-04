import React, { useCallback, useMemo } from "react"
import { useFormik, FormikConfig } from "formik"
import * as NiceModal from "@ebay/nice-modal-react"
import TextField from "@mui/material/TextField"
import Autocomplete from "@mui/material/Autocomplete"
import { RadioChoiceField, RadioChoiceProps, FormDialog } from "ol-forms"
import {
  UserList,
  StaffList,
  LearningResourceType as LRT,
  PrivacyLevel
} from "ol-search-ui"
import * as Yup from "yup"
import {
  useTopics,
  useCreateUserList,
  useUpdateUserList,
  useCreateStaffList,
  useUpdateStaffList,
  useDeleteUserList,
  useDeleteStaffList
} from "../../api/learning-resources"
import Alert from "@mui/material/Alert"
import BasicDialog from "../../components/BasicDialog"

type DialogMode = "stafflist" | "userlist"

type ListFormSchema = Pick<
  UserList | StaffList,
  "title" | "list_type" | "privacy_level" | "short_description" | "topics"
>

const getFormSchema = (mode: DialogMode): Yup.SchemaOf<ListFormSchema> => {
  const defaultListType = mode === "stafflist" ? LRT.StaffList : LRT.Userlist
  return Yup.object().shape({
    title:     Yup.string().default("").required("Title is required."),
    list_type: Yup.string()
      .default(defaultListType)
      .required("List type is required."),
    privacy_level: Yup.mixed<PrivacyLevel>()
      .oneOf(Object.values(PrivacyLevel))
      .default(PrivacyLevel.Private)
      .required("A privacy setting is required."),
    short_description: Yup.string()
      .default("")
      .required("Description is required."),
    topics: Yup.array()
      .of(
        Yup.object().shape({
          id:   Yup.number().required(),
          name: Yup.string().required()
        })
      )
      .min(1, "Select between 1 and 3 subjects.")
      .max(3, "Select between 1 and 3 subjects.")
      .default([])
      .required()
  })
}

const variantProps = { InputLabelProps: { shrink: true } }

const getListTypeChoices = (mode: DialogMode): RadioChoiceProps[] => {
  return [
    {
      value: mode === "stafflist" ? LRT.StaffList : LRT.Userlist,
      label: (
        <>
          <span className="option-header">Learning List</span>
          <span className="option-detail">
            Create a list of of any of our learning resources.
          </span>
        </>
      ),
      className: "radio-option"
    },
    {
      value: mode === "stafflist" ? LRT.StaffPath : LRT.LearningPath,
      label: (
        <>
          <span className="option-header">Learning Path</span>
          <span className="option-detail">
            An ordered list of learning resources.
          </span>
        </>
      ),
      className: "radio-option"
    }
  ]
}
const PRIVACY_CHOICES = [
  {
    value:     PrivacyLevel.Private,
    label:     "Private",
    className: "radio-option"
  },
  {
    value:     PrivacyLevel.Public,
    label:     "Public",
    className: "radio-option"
  }
]

interface UpsertListDialogProps {
  title: string
  resource?: UserList | StaffList | null
  mode: "stafflist" | "userlist"
}

const UpsertListDialog = NiceModal.create(
  ({ resource, title, mode }: UpsertListDialogProps) => {
    const modal = NiceModal.useModal()
    const createUserList = useCreateUserList()
    const updateUserList = useUpdateUserList()
    const createStaffList = useCreateStaffList()
    const updateStaffList = useUpdateStaffList()
    const createList = mode === "stafflist" ? createStaffList : createUserList
    const updateList = mode === "stafflist" ? updateStaffList : updateUserList
    const mutation = resource?.id ? updateList : createList
    const handleSubmit: FormikConfig<Partial<ListFormSchema>>["onSubmit"] =
      useCallback(
        async values => {
          if (resource?.id) {
            await updateList.mutateAsync({ id: resource.id, ...values })
          } else {
            await createList.mutateAsync(values)
          }
          modal.hide()
        },
        [resource, createList, updateList, modal]
      )

    const schema = useMemo(() => getFormSchema(mode), [mode])
    const formik = useFormik({
      enableReinitialize: true,
      initialValues:
        resource ?? (schema.getDefault() as Partial<ListFormSchema>),
      validationSchema: schema,
      onSubmit:         handleSubmit,
      validateOnChange: false,
      validateOnBlur:   false
    })

    const topicsQuery = useTopics()
    const topics = topicsQuery.data?.results ?? []

    const canChangePrivacy =
      mode === "stafflist" || SETTINGS.user.is_public_list_editor

    const typeChoices = useMemo(() => getListTypeChoices(mode), [mode])

    return (
      <FormDialog
        {...NiceModal.muiDialogV5(modal)}
        title={title}
        formClassName="manage-list-form"
        onReset={formik.resetForm}
        onSubmit={formik.handleSubmit}
        noValidate
        footerContent={
          mutation.isError &&
          !formik.isSubmitting && (
            <Alert severity="error">
              There was a problem saving your list. Please try again later.
            </Alert>
          )
        }
      >
        <RadioChoiceField
          className="form-row"
          name="list_type"
          label="List Type"
          choices={typeChoices}
          value={formik.values.list_type}
          row
          onChange={formik.handleChange}
        />
        {canChangePrivacy && (
          <RadioChoiceField
            className="form-row"
            name="privacy_level"
            label="Privacy"
            choices={PRIVACY_CHOICES}
            value={formik.values.privacy_level}
            row
            onChange={formik.handleChange}
          />
        )}
        <TextField
          required
          className="form-row"
          name="title"
          label="Title"
          placeholder="List Title"
          value={formik.values.title}
          error={!!formik.errors.title}
          helperText={formik.errors.title}
          onChange={formik.handleChange}
          {...variantProps}
          fullWidth
        />
        <TextField
          required
          className="form-row"
          label="Description"
          name="short_description"
          placeholder="List Description"
          value={formik.values.short_description}
          error={!!formik.errors.short_description}
          helperText={formik.errors.short_description}
          onChange={formik.handleChange}
          {...variantProps}
          fullWidth
          multiline
          minRows={3}
        />
        <Autocomplete
          className="form-row"
          multiple
          options={topics}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          getOptionLabel={option => option.name}
          value={formik.values.topics}
          onChange={(_event, value) => formik.setFieldValue("topics", value)}
          renderInput={params => (
            <TextField
              {...params}
              {...variantProps}
              required
              error={!!formik.errors.topics}
              helperText={formik.errors.topics}
              label="Subjects"
              name="topics"
              placeholder={
                formik.values.topics?.length ?
                  undefined :
                  "Pick 1 to 3 subjects"
              }
            />
          )}
        />
      </FormDialog>
    )
  }
)

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

type DeleteListDialogProps = {
  resource: UserList | StaffList
}

const useDeleteList = (resource: UserList | StaffList) => {
  const deleteUserList = useDeleteUserList()
  const deleteStaffList = useDeleteStaffList()
  if (isUserListOrPath(resource)) {
    return deleteUserList
  }
  if (isStaffListOrPath(resource)) {
    return deleteStaffList
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

const manageListDialogs = {
  createList: (mode: DialogMode) =>
    NiceModal.show(UpsertListDialog, {
      title:    "Create list",
      mode:     mode,
      resource: null
    }),
  editList: (resource: UserList | StaffList) => {
    if (isUserListOrPath(resource)) {
      NiceModal.show(UpsertListDialog, {
        title: "Edit list",
        mode:  "userlist",
        resource
      })
    } else {
      NiceModal.show(UpsertListDialog, {
        title: "Edit list",
        mode:  "stafflist",
        resource
      })
    }
  },
  deleteList: (resource: UserList | StaffList) =>
    NiceModal.show(DeleteListDialog, { resource })
}

export { manageListDialogs }
