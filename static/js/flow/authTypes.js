// @flow

// Form types

export type EmailForm = {
  email: string
}

export type EmailFormValidation = {
  email: string
}

export type PasswordForm = {
  password: string
}


export type PasswordFormValidation = {
  password: string
}

export type DetailsForm = {
  name: string,
  tos:  boolean
} & PasswordForm

export type DetailsFormValidation = {
  name: string,
  tos:  string
} & PasswordFormValidation


// API response types
export type AuthStates =
  |"success"
  | "inactive"
  | "error"
  | "login/email"
  | "login/password"
  | "register/email"
  | "register/confirm-sent"
  | "register/confirm"
  | "register/details"

export type AuthFlow = "register" | "login"

export type AuthResponse = {
  partial_token: string,
  flow:          AuthFlow,
  state:         AuthStates,
  email:         ?string
}
