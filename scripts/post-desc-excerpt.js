'use strict'

// Copy `excerpt` → `description` before each post renders, so Butterfly theme's
// existing postDesc helper picks it up.  No theme files are touched.
//
// This runs automatically when you `hexo generate` or `hexo server`.
// Restart Hexo after adding this file.

hexo.extend.filter.register('before_post_render', data => {
  if (data.excerpt && !data.description) {
    data.description = data.excerpt
  }
  return data
})
