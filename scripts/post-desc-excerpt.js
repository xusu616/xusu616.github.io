'use strict'

// Override Butterfly theme's postDesc helper to support the `excerpt` frontmatter field.
// Theme loads first, site scripts load second — this re-registration takes priority.

const { stripHTML, truncate } = require('hexo-util')

const truncateContent = (content, length, encrypt = false) => {
  if (!content || encrypt) return ''
  return truncate(stripHTML(content).replace(/\n/g, ' '), { length })
}

hexo.extend.helper.register('postDesc', data => {
  const { description, excerpt, content, postDesc, encrypt } = data

  if (postDesc) return postDesc

  const { length, method } = hexo.theme.config.index_post_content

  if (method === false) return

  let result
  switch (method) {
    case 1:
      result = description || excerpt
      break
    case 2:
      result = description || excerpt || truncateContent(content, length, encrypt)
      break
    default:
      result = excerpt || truncateContent(content, length, encrypt)
  }

  data.postDesc = result
  return result
})
