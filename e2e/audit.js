// Layout audit shared by the layout matrix and the mobile journeys. Runs inside the page and returns
// human-readable problems: sideways scroll, controls off-screen, small touch targets, truncated text,
// map overlaps, panel content that cannot be reached, stretched controls and stretched gaps.

/** @param {import('@playwright/test').Page} page */
async function audit(page, { touch, scope = 'document' }) {
  return page.evaluate(({ touch, scope }) => {
    const out = [];
    const W = innerWidth, H = innerHeight;
    if (document.documentElement.scrollWidth > W + 1) out.push(`page scrolls sideways by ${document.documentElement.scrollWidth - W}px`);
    const inScroller = el => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
    const visible = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < H; };
    const label = el => (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
    const root = scope === 'document' ? document : document.querySelector(scope);
    if (!root) return [`scope ${scope} not found`];
    const controls = [...root.querySelectorAll('button, a[href], input, [role="button"]')].filter(visible).filter(el => !el.closest('svg') && !el.closest('[hidden]'));
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      if (!inScroller(el) && !el.closest('.board-canvas') && (r.left < -1 || r.right > W + 1)) out.push(`control off-screen: "${label(el)}" (${Math.round(r.left)}..${Math.round(r.right)} of ${W})`);
      if (touch && el.tagName !== 'INPUT' && !el.closest('.zoom-ctl') && (r.width < 24 || r.height < 24)) out.push(`touch target under 24px: "${label(el)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    // buttons keep a normal height: a .btn taller than 72px has been stretched by its container
    for (const el of root.querySelectorAll('.btn')) {
      if (!visible(el)) continue;
      const hgt = el.getBoundingClientRect().height;
      if (hgt > 72) out.push(`control stretched: "${label(el)}" is ${Math.round(hgt)}px tall`);
    }
    // headings and button labels must not be cut with an ellipsis
    for (const el of root.querySelectorAll('h1, h2, h3, h4, .btn, .lab')) {
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.push(`text truncated: "${el.textContent.trim().slice(0, 40)}"`);
    }
    // every panel and page region either fits its content or can scroll to the rest of it
    const regions = [...root.querySelectorAll('.panel-body, .panel-body > *, .p-main, .p-aside, .idx, .insp, .tour')].filter(visible);
    for (const el of regions) {
      const oy = getComputedStyle(el).overflowY;
      if (el.scrollHeight > el.clientHeight + 2 && oy !== 'auto' && oy !== 'scroll') out.push(`content cut off: .${[...el.classList].join('.')} holds ${el.scrollHeight}px in ${el.clientHeight}px and cannot scroll`);
    }
    // stacked panels keep their rhythm: a gap over 56px between consecutive items means the stack was stretched
    for (const stack of root.querySelectorAll('.insp, .lvl-card, .idx-intro')) {
      if (!visible(stack)) continue;
      const kids = [...stack.children].filter(k => { const r = k.getBoundingClientRect(); return r.height > 0 && getComputedStyle(k).display !== 'none'; });
      for (let i = 1; i < kids.length; i++) {
        const gap = kids[i].getBoundingClientRect().top - kids[i - 1].getBoundingClientRect().bottom;
        if (gap > 56) out.push(`stretched gap of ${Math.round(gap)}px before "${label(kids[i])}"`);
      }
    }
    // map: nodes, labels and the START tag must never overlap each other
    const parts = [...document.querySelectorAll('.mnode, .stop .lab, .start-bubble')].filter(visible).map(el => ({ el, r: el.getBoundingClientRect() }));
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i], b = parts[j];
      if (a.el.contains(b.el) || b.el.contains(a.el) || a.el.closest('.stop') === b.el.closest('.stop')) continue;
      const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ox > 2 && oy > 2) out.push(`map overlap: "${a.el.textContent.trim().slice(0, 20)}" and "${b.el.textContent.trim().slice(0, 20)}"`);
    }
    return [...new Set(out)];
  }, { touch, scope });
}

module.exports = { audit };
