## Indexing link preview content from Embedly to make link posts searchable 

Read the description of [#1811](https://github.com/mitodl/open-discussions/issues/1811) for a description of the problem we're solving here. This RFC is to address some decisions about how we go about indexing content from Embedly responses and the index structure in general.
The goal of this RFC is to call attention to some of the finer points of implementation.

#### 1) Using a more descriptive Embedly API endpoint

Here's a direct comparison between two Embedly endpoints using the same URL:

- ['oembed' endpoint](https://embed.ly/docs/explore/oembed?url=https%3A%2F%2Fwww.theatlantic.com%2Fscience%2Farchive%2F2019%2F02%2Fhow-to-stop-mosquito-bites%2F582190%2F)
- ['extract' endpoint](https://embed.ly/docs/explore/extract?url=https://www.theatlantic.com/science/archive/2019/02/how-to-stop-mosquito-bites/582190/)

`extract` potentially gives us much more text content to index in the `content` field than `oembed` does in the `description` field (this isn't [always true](https://embed.ly/docs/explore/extract?url=https%3A%2F%2Fwww.mit.edu) though). 

*Proposal*: Use the `extract` endpoint instead of `oembed`; if `content` exists, strip the HTML and save that as the link preview text since it's more complete/descriptive; if `content` doesn't exist, use the `description` value. 

*Drawbacks*: Larger responses both from Embedly and from our own API (since ES documents for link posts will be larger), but that's very unlikely to have any significant impact on performance. Text/article posts are already liable to have a similar amount of raw content.

#### 2) Including additional content in the text that we index for a link

Here's a partial document from an embedly response:

```json
{
  "content": "<div><p>NPY acts by sticking to receptor proteins, and the pharmaceutical industry ...",
  "title": "A New Way to Keep Mosquitoes From Biting",
  "provider_name": "The Atlantic",
  ...
}
```

The `title` and `provider_name` are potentially significant in terms of the search-ability and relatability of these document (example: if I search "Atlantic", it makes some sense to include this link post from the publication called "The Atlantic" in the results). 

*Proposal*: Prepend `provider_name` and `title` to the text that we index for link posts, and separate the values by dashes (et al). Using the example above, the text that we index would look like this: `"The Atlantic - A New Way to Keep Mosquitoes From Biting - NPY acts by sticking to receptor proteins, and ..."`

#### 3) Using the existing `text` model field for storing link preview text

*Proposal*:  Save the preview text for a link post in the `channels.models.Post.text` field (we wouldn't attempt to save text for the corresponding reddit object)

*Potential Issues*: There might still be some application logic on the back- _or_ front-end that considers a post with non-blank `text` value to be a self/text post. This would break that logic.

#### 4) (Related, but separate issue) Getting rid of either the `plain_text` or `text` field in ES documents

After reviewing this a bit, it became clear that we don't seem to be using the ES documents' `text` field. We only care about the plain text content of these posts (stored in the `plain_text` field). 

*Proposal*: (a) Get rid of the `text` field in ES documents, or (b) get rid of `plain_text`, and instead store only plain text content in the `text` field.

*Drawbacks*: For (a) there may still be some application logic that makes use of that value. For (b) it could be jarring to have two properties with the same name on the model object and its corresponding ES document with different values.

If this makes sense, this change would be made in a separate issue (i.e.: not as part of #1811)