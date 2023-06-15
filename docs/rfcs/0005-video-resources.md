---
layout: default
parent: RFCs
nav_order: 5
has_toc: true
---

# 0005: OCW Video Resources
{: .no_toc }

## Table of Contents
{: .no_toc .text-delta }

- Table of Contents
{:toc}

### Abstract
Parse the `course_embedded_media` section of OCW parsed.json files.  Search for Youtube videos within that section.
If found, add the video as a resource, including the thumbnail image and transcript text.


### Acceptance Criteria

- [ ] Each Youtube video found for an OCW will be saved as a `ContentFile` resource in the database
- [ ] The resource will include a thumbnail image and transcript text if found.
- [ ] The OpenSearch index will include the resource along with the thumbnail and text.


### Architecture Changes

The `ContentFile` model will need an additional nullable field, `image_src`, to store the value of the video thumbnail if it exists.  The existing `content` attribute can be used to hold the transcript text.
The current ETL process for OCW resources will need to be modified to process the `course_embedded_media` section:
  - Youtube videos in that section will have a `title` & `id` of "Video-YouTube-Stream", with a `media_location` equal to the Youtube video id.
  - Once a Youtube video is identified, check for the existence of a `Video` object with the same `video_id`
  - If a matching video is found, copy that video's `image_src` and `transcript` values to the resource's `image_src` and `content` fields.
  - If a matching `Video` object is NOT found:
    - Find the `course_embedded_media` object with `id` of "Thumbnail-YouTube-JPG" and use its `media_location` as the `image_src` value.
    - If the `transcript` attribute of the object exists and use that (stripped of HTML via BeautifulSoup) for the `content` value.
    - If the `content` is still empty/null, find the `course_embedded_media` object with `id` of "<Youtube_video_id>.pdf". Use tika to retrieve (via `technical_location` url) and parse the contents and save to the `content` attribute.
  - The `ContentFile` will have a `content_type` of "video" and a `file_type` of "youtube"
  - If no Youtube video object is found, ignore the section and move on.

### Security Considerations
None

### Testing & Rollout
After running the `get_ocw_files` function, there should be new `ContentFile` objects for each Youtube video found.
These new resources should also be in the OpenSearch index with populated `image_src` and `content` fields.
