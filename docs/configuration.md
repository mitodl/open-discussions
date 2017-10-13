Configuration
---

Required settings are defined in [app.json](../blob/master/app.json). This project requires a functional Reddit backend running from the source code at [mitodl/reddit](https://github.com/mitodl/reddit).

There are a few nuances of how this configuration works with other projects

|Setting|Notes|
|---|---|
|`OPEN_DISCUSSIONS_COOKIE_NAME`|This value should be unique per environment and agree across all integrating applications in that environment. If neither of those criteria are met, `open-discussions` will not find the correct cookie and treat the user as unauthenticated.|
|`OPEN_DISCUSSIONS_JWT_SECRET`|This value should be unique per environment and agree across all integrating applications in that environment. If these values don't match, `open-discussions` will reject JWT tokens from those applications and treat the user as unauthenticated.|
|`OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL`|This should only be set to `False` for local environments as it means communications with the Reddit backend are insecure.|
