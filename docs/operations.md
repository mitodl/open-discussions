Operations
---

## Common Operations

#### Resetting Data
 - If you clear data on the Reddit backend:
   - You must also clear all `django.contrib.auth.models.User` and `profiles.models.Profile` records on `open-discussions`.
   - You must also clear all integrating applications of any data that references objects in `open-discussions` or the Reddit backend:
     - **MicroMasters:**
       - Delete all `discussions.models.DiscussionUser` records
       - Delete all `discussions.models.Channel` records
