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
import { Formik, Form, Field, ErrorMessage } from "formik"
import { isNil } from "lodash"
import { AnonymousWidget, WidgetSpec, WidgetTypes } from "../../interfaces"
import { getWidgetFieldComponent } from "./getWidgetFieldComponent"
import { useCallback, useEffect, useMemo, useState } from "react"
import { getWidgetSchema } from "./schemas"

type NascentWidget = AnonymousWidget & { id: null }

type WidgetSubmitEvent =
  | {
      type: "edit"
      widget: AnonymousWidget
    }
  | {
      type: "add"
      widget: NascentWidget
    }

type WidgetSubmitHandler = (event: WidgetSubmitEvent) => void

interface ManageWidgetDialogProps {
  widget?: AnonymousWidget | null
  specs: WidgetSpec[]
  isOpen: boolean
  onCancel: () => void
  onSubmit: WidgetSubmitHandler
  className?: string
  errorClassName?: string
  fieldClassName?: string
}

interface WidgetEditingProps {
  widget: AnonymousWidget
  spec: WidgetSpec
  onSubmit: WidgetSubmitHandler
  onCancel: () => void
  errorClassName?: string
  fieldClassName?: string
  isNew: boolean
}

const DialogContentEditing: React.FC<WidgetEditingProps> = ({
  widget,
  spec,
  onSubmit,
  onCancel,
  fieldClassName,
  errorClassName,
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
        {({ handleSubmit, values }) => (
          <Form onSubmit={handleSubmit}>
            <DialogContent>
              <label htmlFor={`${formId}:${title}`}>Title</label>
              <Field
                id={`${formId}:${title}`}
                className={fieldClassName}
                name="title"
                type="text"
                value={values.title}
              />
              <ErrorMessage
                className={errorClassName}
                component="div"
                name="title"
              />
              {spec.form_spec.map(fieldSpec => {
                const fieldName = fieldSpec.field_name
                // Formik uses dot notation for nested objects as name attrs
                // https://formik.org/docs/guides/arrays#nested-objects
                const attrName = `configuration.${fieldName}`
                const fieldId = `${formId}:${attrName}`
                return (
                  <React.Fragment key={fieldName}>
                    <label htmlFor={fieldId}>{fieldSpec.label}</label>
                    <Field
                      id={fieldId}
                      className={fieldClassName}
                      as={getWidgetFieldComponent(fieldSpec)}
                      name={attrName}
                      value={values.configuration[fieldSpec.field_name]}
                    />
                    <ErrorMessage
                      className={errorClassName}
                      component="div"
                      name={attrName}
                    />
                  </React.Fragment>
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
        )}
      </Formik>
    </>
  )
}

interface WidgetAddingProps {
  specs: WidgetSpec[]
  onCancel: () => void
  onSubmit: (widget: NascentWidget) => void
}

type AddWidgetFormValues = {
  widget_type: string
}

const DialogContentAdding: React.FC<WidgetAddingProps> = ({
  specs,
  onCancel,
  onSubmit
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
      const widget: NascentWidget = {
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
              <RadioGroup name="widget_type" value={values.widget_type}>
                {supportedSpecs.map(spec => (
                  <FormControlLabel
                    key={spec.widget_type}
                    value={spec.widget_type}
                    control={<Radio />}
                    label={spec.description}
                  />
                ))}
              </RadioGroup>
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
  className,
  fieldClassName,
  errorClassName
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
    <Dialog fullWidth className={className} open={isOpen} onClose={onCancel}>
      {widget ? (
        <DialogContentEditing
          widget={widget}
          spec={mustFindSpec(specs, widget.widget_type)}
          onSubmit={onSubmit}
          onCancel={onCancel}
          fieldClassName={fieldClassName}
          errorClassName={errorClassName}
          isNew={isNew}
        />
      ) : (
        <DialogContentAdding
          specs={specs}
          onSubmit={handlePickNewWidget}
          onCancel={onCancel}
        />
      )}
    </Dialog>
  )
}

export default ManageWidgetDialog
export type { ManageWidgetDialogProps, WidgetSubmitHandler }
