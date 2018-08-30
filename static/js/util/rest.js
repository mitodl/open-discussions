// @flow
import R from "ramda"

export const anyProcessing = R.any(R.propEq("processing", true))

export const allLoaded = R.both(
  R.complement(R.isEmpty),
  R.all(R.propEq("loaded", true))
)

const hasError = R.propSatisfies(R.complement(R.isNil), "error")

export const anyError = R.any(hasError)

export const anyErrorExcept = (codes: Array<number>) =>
  R.compose(
    R.any(
      R.either(
        R.propSatisfies(R.isNil, "errorStatusCode"),
        R.propSatisfies(
          R.complement(R.contains(R.__, codes)),
          "errorStatusCode"
        )
      )
    ),
    R.map(R.prop("error")),
    R.filter(hasError)
  )

const anySpecificError = code =>
  R.compose(
    R.any(R.propSatisfies(R.equals(code), "errorStatusCode")),
    R.map(R.prop("error")),
    R.filter(hasError)
  )

export const any404Error = anySpecificError(404)
export const anyErrorExcept404 = anyErrorExcept([404])
export const anyErrorExcept404or410 = anyErrorExcept([404, 410])

// 401/403 status codes are unreliable for detecting authentication errors.
// Our auth endpoints return an error type in the response, and these values
// can be matched to that error type to properly detect authentication errors.
export const NOT_AUTHENTICATED_ERROR_TYPE = "NotAuthenticated"
export const AUTHENTICATION_FAILED_ERROR_TYPE = "AuthenticationFailed"
export const NOT_AUTHORIZED_ERROR_TYPE = "PermissionDenied"
export const AUTHENTICATION_ERRORS = [
  NOT_AUTHENTICATED_ERROR_TYPE,
  AUTHENTICATION_FAILED_ERROR_TYPE
]

const anyErrorTypes = errorTypes =>
  R.propSatisfies(R.contains(R.__, errorTypes), "error_type")

const anySpecificErrorTypes = errorTypes =>
  R.compose(
    R.any(anyErrorTypes(errorTypes)),
    R.map(R.prop("error")),
    R.filter(hasError)
  )

export const isNotAuthenticatedErrorType = anyErrorTypes(AUTHENTICATION_ERRORS)
export const anyNotAuthorizedErrorType = anySpecificErrorTypes([
  NOT_AUTHORIZED_ERROR_TYPE
])
