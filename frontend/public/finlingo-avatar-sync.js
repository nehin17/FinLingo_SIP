/* FINLINGO avatar source consistency.
   Navbar renders the signed-in user's `profilePicture`, while older Settings
   screens may render a different `avatarUrl`. Reuse the actual displayed navbar
   image in Settings, including whenever routes or profile state change.
   No hardcoded picture, no network request, no user data stored. */
(() => {
  'use strict'
  const settings = '.account-settings'
  const target = '.account-settings .as-avatar img, .account-settings .as-small-avatar img'
  let queued = false
  function getAvatarCandidate() {
    const root = document.querySelector(settings)
    if (!root) return null
    const name = (root.querySelector('.as-identity-text h2')?.textContent || '').trim().toLowerCase()
    const images = [...document.querySelectorAll('img[src]')]
    const candidates = images.filter(img => !img.matches(target) && !img.closest('.as-identity-banner, .as-photo-row') && img.getAttribute('src')?.trim())
    const ranked = candidates.map(img => {
      const alt = (img.getAttribute('alt') || '').toLowerCase()
      const labels = [img.className, img.parentElement?.className, img.parentElement?.parentElement?.className]
        .map(v => typeof v === 'string' ? v : '').join(' ').toLowerCase()
      const within = img.closest('nav, header, [class*="navbar"], [class*="Navbar"], [class*="sidebar"], [class*="Sidebar"]')
      const src = (img.getAttribute('src') || '').toLowerCase()
      if (/\b(logo|brand|flag|chart|icon|banner|ad)\b/i.test(alt)) return {img,score:-100}
      let score = 0
      if (within) score += 8
      if (/avatar|profile|rounded-full|user|account/.test(labels)) score += 8
      if (/avatar|profile|photo|picture/.test(alt + ' ' + src)) score += 5
      if (name && alt.includes(name)) score += 12
      if (/\b(logo|wordmark|icon|banner)\b/.test(labels)) score -= 16
      if (img.naturalWidth && img.naturalHeight && img.naturalWidth / img.naturalHeight > 1.5) score -= 7
      if (img.width && img.height && img.width / img.height > 1.5) score -= 7
      // A clearly rounded user picture in the actual nav is the source of truth.
      return { img, score }
    }).sort((a,b) => b.score - a.score)
    return ranked[0]?.score >= 8 ? ranked[0].img : null
  }
  function sync() {
    queued = false
    const navbarPhoto = getAvatarCandidate()
    if (!navbarPhoto) return
    const src = navbarPhoto.getAttribute('src')
    if (!src) return
    const srcset = navbarPhoto.getAttribute('srcset')
    document.querySelectorAll(target).forEach(img => {
      if (img.getAttribute('src') !== src) img.setAttribute('src', src)
      if (srcset && img.getAttribute('srcset') !== srcset) img.setAttribute('srcset', srcset)
      if (!srcset && img.hasAttribute('srcset')) img.removeAttribute('srcset')
      img.style.objectFit = 'cover'
      img.style.objectPosition = 'center'
    })
  }
  function schedule() {
    if (queued) return
    queued = true
    queueMicrotask(sync)
  }
  function init() {
    const obs = new MutationObserver(schedule)
    obs.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['src','srcset']})
    window.addEventListener('focus',schedule)
    window.addEventListener('pageshow',schedule)
    document.addEventListener('visibilitychange', () => {if (!document.hidden) schedule()})
    schedule()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true})
  else init()
})()
