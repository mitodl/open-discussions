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
  tos: boolean
} & PasswordForm

export type DetailsFormValidation = {
  name: string,
  tos: string
} & PasswordFormValidation


// API response types
export type CommonStates = "success" | "inactive" | "error"
export type LoginState = CommonStates | "login/email" | "login/password"
export type RegisterState = CommonStates | "register/email" | "register/confirm-sent" | "register/confirm" | "register/details"

export type LoginResponse = {
  partial_token: string,
  state: LoginState,
}

export type RegisterResponse = {
  partial_token: string,
  state: RegisterState,
}
