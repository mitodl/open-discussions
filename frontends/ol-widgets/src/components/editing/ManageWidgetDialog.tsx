import * as React from "react"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Button from "@mui/material/Button"
import RadioGroup from "@mui/material/RadioGroup"
import Radio from "@mui/material/Radio"
import FormControlLabel from "@mui/material/FormControlLabel"
import { useId } from "ol-util"
import { Formik, Form, Field, ErrorMessage, FieldProps } from "formik"
import { isNil } from "lodash"
import { AnonymousWidget, WidgetSpec, WidgetTypes } from "../../interfaces"
import { getWidgetFieldComponent, renameFieldProps } from "./widgetFields"
import { useCallback, useEffect, useMemo, useState } from "react"
import { getWidgetSchema } from "./schemas"
import classNames from "classnames"

type WidgetSubmitEvent =
  | {
      type: "edit"
      widget: AnonymousWidget
    }
  | {
      type: "add"
      widget: AnonymousWidget
    }

type WidgetSubmitHandler = (event: WidgetSubmitEvent) => void

interface ManageWidgetDialogProps {
  widget?: AnonymousWidget | null
  specs: WidgetSpec[]
  isOpen: boolean
  onCancel: () => void
  onSubmit: WidgetSubmitHandler
  classes?: WidgetDialogClasses
}

type WidgetDialogClasses = {
  dialog?: string
  error?: string
  fieldGroup?: string
  field?: string
  label?: string
  detail?: string
}

interface WidgetEditingProps {
  widget: AnonymousWidget
  spec: WidgetSpec
  onSubmit: WidgetSubmitHandler
  onCancel: () => void
  isNew: boolean
  classes?: WidgetDialogClasses
}

interface FormFieldAttrs {
  field: {
    id: string
    "aria-invalid"?: boolean
    "aria-errormessage"?: string
  }
  label: {
    htmlFor: string
  }
  error: {
    id: string
  }
}

/**
 * Returns React-style HTML attributes to associate form field labels and error
 * messages with the field input.
 *
 * @param fieldId The id of the form field input
 * @param errMsg An error message for the form field, if there is one
 * @returns
 */
const formFieldAttrs = (fieldId: string, errMsg?: string): FormFieldAttrs => {
  const errorId = `${fieldId}:error`
  const fieldErrorAttrs = errMsg ?
    { "aria-invalid": true, "aria-errormessage": errorId } :
    {}
  const field = { id: fieldId, ...fieldErrorAttrs }
  const label = { htmlFor: fieldId }
  const error = { id: errorId }
  return { field, label, error }
}

const DialogContentEditing: React.FC<WidgetEditingProps> = ({
  widget,
  spec,
  onSubmit,
  onCancel,
  classes,
  isNew
}) => {
  const formId = useId()
  const validationSchema = useMemo(
    () => getWidgetSchema(widget.widget_type),
    [widget.widget_type]
  )
  const title = useMemo(() => {
    if (isNew) {
      return `Add new ${spec.description} widget`
    }
    return "Edit widget"
  }, [isNew, spec])
  const onSubmitForm = useCallback(
    (value: AnonymousWidget) => {
      const event: WidgetSubmitEvent = isNil((value as any).id) ?
        {
          type:   "add",
          widget: { ...value, id: null }
        } :
        {
          type:   "edit",
          widget: value
        }
      onSubmit(event)
    },
    [onSubmit]
  )
  return (
    <>
      <DialogTitle>{title}</DialogTitle>
      <Formik
        initialValues={widget as AnonymousWidget<Record<string, unknown>>}
        validationSchema={validationSchema}
        validateOnChange={false}
        onSubmit={onSubmitForm}
      >
        {({ handleSubmit, values, errors }) => {
          const titleFieldId = `${formId}:${title}`
          const titleAttrs = formFieldAttrs(titleFieldId, errors.title)
          return (
            <Form onSubmit={handleSubmit}>
              <DialogContent>
                <div className={classes?.fieldGroup}>
                  <label className={classes?.label} {...titleAttrs.label}>
                    Title
                  </label>
                  <Field
                    {...titleAttrs.field}
                    className={classes?.field}
                    name="title"
                    type="text"
                    value={values.title}
                  />
                  <ErrorMessage name="title">
                    {message => (
                      <div className={classes?.error} {...titleAttrs}>
                        {message}
                      </div>
                    )}
                  </ErrorMessage>
                </div>
                {spec.form_spec.map(fieldSpec => {
                  const fieldName = fieldSpec.field_name
                  // Formik uses dot notation for nested objects as name attrs
                  // https://formik.org/docs/guides/arrays#nested-objects
                  const attrName = `configuration.${fieldName}`
                  const fieldId = `${formId}:${attrName}`
                  const attrs = formFieldAttrs(
                    fieldId,
                    errors.configuration?.[fieldName]
                  )
                  const FieldComponent = getWidgetFieldComponent(fieldSpec)
                  return (
                    <div className={classes?.fieldGroup} key={fieldName}>
                      <label className={classes?.label} {...attrs.label}>
                        {fieldSpec.label}
                      </label>
                      <Field
                        value={values.configuration[fieldSpec.field_name]}
                        name={attrName}
                      >
                        {({ field }: FieldProps<string | null>) => {
                          return (
                            <FieldComponent
                              {...attrs.field}
                              className={classes?.field}
                              name={field.name}
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              {...renameFieldProps(fieldSpec)}
                            />
                          )
                        }}
                      </Field>
                      {fieldSpec.under_text && (
                        <small className={classes?.detail}>
                          {fieldSpec.under_text}
                        </small>
                      )}
                      <ErrorMessage name={attrName}>
                        {errMsg => (
                          <div className={classes?.error} {...attrs.error}>
                            {errMsg}
                          </div>
                        )}
                      </ErrorMessage>
                    </div>
                  )
                })}
              </DialogContent>
              <DialogActions>
                <Button variant="outlined" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained">
                  Submit
                </Button>
              </DialogActions>
            </Form>
          )
        }}
      </Formik>
    </>
  )
}

interface WidgetAddingProps {
  specs: WidgetSpec[]
  onCancel: () => void
  onSubmit: (widget: AnonymousWidget) => void
  classes?: WidgetDialogClasses
}

type AddWidgetFormValues = {
  widget_type: string
}

const DialogContentAdding: React.FC<WidgetAddingProps> = ({
  specs,
  onCancel,
  onSubmit,
  classes
}) => {
  const supportedSpecs = useMemo(
    () =>
      specs.filter(spec => {
        return Object.values(WidgetTypes).includes(
          spec.widget_type as WidgetTypes
        )
      }),
    [specs]
  )
  const initialValues = useMemo(
    () => ({ widget_type: supportedSpecs[0]?.widget_type }),
    [supportedSpecs]
  )
  const onSubmitType = useCallback(
    (values: AddWidgetFormValues) => {
      const spec = mustFindSpec(specs, values.widget_type)
      const widget: AnonymousWidget = {
        id:            null,
        title:         "New widget",
        configuration: Object.fromEntries(
          spec.form_spec.map(fieldSpec => [
            fieldSpec.field_name,
            fieldSpec.default
          ])
        ),
        widget_type: spec.widget_type
      }
      onSubmit(widget)
    },
    [specs, onSubmit]
  )
  return (
    <>
      <DialogTitle>New widget</DialogTitle>
      <Formik initialValues={initialValues} onSubmit={onSubmitType}>
        {({ handleSubmit, values }) => (
          <Form onSubmit={handleSubmit}>
            <DialogContent>
              <Field
                className={classes?.field}
                name="widget_type"
                value={values.widget_type}
              >
                {({ field }: FieldProps) => (
                  <RadioGroup {...field}>
                    {supportedSpecs.map(spec => (
                      <FormControlLabel
                        key={spec.widget_type}
                        value={spec.widget_type}
                        control={<Radio />}
                        label={spec.description}
                      />
                    ))}
                  </RadioGroup>
                )}
              </Field>
            </DialogContent>
            <DialogActions>
              <Button variant="outlined" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Next
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </>
  )
}

const mustFindSpec = (specs: WidgetSpec[], widgetType: string): WidgetSpec => {
  const spec = specs.find(s => s.widget_type === widgetType)
  if (!spec) {
    throw new Error(`Could not find spec for widget of type ${widgetType}`)
  }
  return spec
}

/**
 * A dialog for editing the widget. If you need to style it, pass a classname
 * and use normal MUI classes.
 */
const ManageWidgetDialog: React.FC<ManageWidgetDialogProps> = ({
  widget: initialWidget = null,
  specs,
  onSubmit,
  isOpen,
  onCancel,
  classes
}) => {
  const [widget, setWidget] = useState<AnonymousWidget | null>(null)
  const isNew = !initialWidget
  useEffect(() => {
    setWidget(initialWidget)
  }, [
    initialWidget,
    isOpen // clear the editing widget whenever modal opens/closes
  ])
  const handlePickNewWidget: WidgetAddingProps["onSubmit"] = useCallback(
    nascentWidget => setWidget(nascentWidget),
    []
  )
  return (
    <Dialog
      fullWidth
      className={classNames("ol-widget-dialog", classes?.dialog)}
      open={isOpen}
      onClose={onCancel}
      /**
       * Normally MUI Dialogs trap focus, but CKEditor renders tooltips outside
       * of the modal element. We need to disable focus-trapping else the
       * tooltips are not focusable.
       *
       * See also https://ckeditor.com/docs/ckeditor5/latest/installation/getting-started/frameworks/css.html#bootstrap-modals
       */
      disableEnforceFocus
    >
      {widget ? (
        <DialogContentEditing
          widget={widget}
          spec={mustFindSpec(specs, widget.widget_type)}
          onSubmit={onSubmit}
          onCancel={onCancel}
          classes={classes}
          isNew={isNew}
        />
      ) : (
        <DialogContentAdding
          specs={specs}
          onSubmit={handlePickNewWidget}
          onCancel={onCancel}
          classes={classes}
        />
      )}
    </Dialog>
  )
}

export default ManageWidgetDialog
export type {
  ManageWidgetDialogProps,
  WidgetSubmitHandler,
  WidgetDialogClasses
}
