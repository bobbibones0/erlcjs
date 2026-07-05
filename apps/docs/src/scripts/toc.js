let lastScrollTop = 0;
let currentDir = 'down';

let animProgress = { startLength: 0, endLength: 0 };
let currentPathLength = 0;
let isAnimating = false;

window.addEventListener('scroll', () => {
  let st = window.pageYOffset || document.documentElement.scrollTop;
  currentDir = st > lastScrollTop ? 'down' : 'up';
  lastScrollTop = st <= 0 ? 0 : st;
  updateLineCoords();
  updateMobileProgress();
}, { passive: true });

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const id = entry.target.getAttribute('id');
    const tocLink = document.querySelector(`starlight-toc nav ul li a[href="#${id}"]`);
    if (!tocLink) return;
    if (entry.isIntersecting) {
      tocLink.classList.add('is-visible');
    } else {
      tocLink.classList.remove('is-visible');
    }
  });
  updateLineCoords();
}, { rootMargin: '-2% 0px -2% 0px', threshold: 0 });

function updateMobileProgress() {
  const mobileSummary = document.querySelector('mobile-starlight-toc summary');
  if (!mobileSummary) return;

  let progressContainer = mobileSummary.querySelector('.mobile-toc-progress-container');
  if (!progressContainer) {
    progressContainer = document.createElement('div');
    progressContainer.setAttribute('class', 'mobile-toc-progress-container');
    progressContainer.innerHTML = '<div class="mobile-toc-progress-bar"></div><span class="mobile-toc-direction-circle"></span>';
    mobileSummary.appendChild(progressContainer);
  }

  const bar = progressContainer.querySelector('.mobile-toc-progress-bar');
  const circle = progressContainer.querySelector('.mobile-toc-direction-circle');

  const h = document.documentElement;
  const b = document.body;
  const st = 'scrollTop';
  const sh = 'scrollHeight';
  const percent = (h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight) * 100;

  bar.style.width = percent + '%';
  circle.style.left = percent + '%';
}

function generateCurvedPath(points) {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].yStart} L ${points[0].x} ${points[0].yEnd}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    if (prev.x !== curr.x) {
      const midY = prev.yEnd + (curr.yStart - prev.yEnd) * 0.5;
      d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.yStart}`;
    } else {
      d += ` L ${curr.x} ${curr.yStart}`;
    }
    d += ` L ${curr.x} ${curr.yEnd}`;
  }
  return d;
}

function updateLineCoords() {
  const container = document.querySelector('starlight-toc nav');
  const rootUl = document.querySelector('starlight-toc > nav > ul');
  if (!container || !rootUl) return;

  const allLinks = Array.from(container.querySelectorAll('ul li a'));
  const visibleLinks = Array.from(container.querySelectorAll('ul li a.is-visible'));
  const currentLink = container.querySelector('ul li a[aria-current="true"]');
  
  let targets = [...visibleLinks];
  if (currentLink && !targets.includes(currentLink)) {
    targets.push(currentLink);
  }
  
  targets.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

  if (targets.length === 0 || allLinks.length === 0) return;

  const containerRect = container.getBoundingClientRect();
  const baseLeftX = rootUl.getBoundingClientRect().left - containerRect.left;
  
  let svg = container.querySelector('.toc-indicator-svg');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'toc-indicator-svg');
    svg.innerHTML = `
      <path class="toc-indicator-rail" />
      <path class="toc-indicator-line" />
      <circle class="toc-indicator-circle" r="2.5" />
    `;
    container.appendChild(svg);
  }
  
  const railEl = svg.querySelector('.toc-indicator-rail');
  let railPoints = [];
  allLinks.forEach((link) => {
    const linkRect = link.getBoundingClientRect();
    const depthOffset = link.parentElement.closest('ul ul') ? 12 : 0;
    const x = baseLeftX + depthOffset;
    const yStart = linkRect.top - containerRect.top + 6;
    const yEnd = linkRect.bottom - containerRect.top - 6;
    railPoints.push({ x, yStart, yEnd });
  });
  railEl.setAttribute('d', generateCurvedPath(railPoints));

  const pathEl = svg.querySelector('.toc-indicator-line');
  pathEl.setAttribute('d', generateCurvedPath(railPoints));
  currentPathLength = pathEl.getTotalLength();

  let targetPoints = [];
  targets.forEach((link) => {
    const linkRect = link.getBoundingClientRect();
    const depthOffset = link.parentElement.closest('ul ul') ? 12 : 0;
    const x = baseLeftX + depthOffset;
    const yStart = linkRect.top - containerRect.top + 6;
    const yEnd = linkRect.bottom - containerRect.top - 6;
    targetPoints.push({ x, yStart, yEnd });
  });

  let startOffsetPixel = 0;
  let endOffsetPixel = currentPathLength;

  const steps = 100;
  let foundStart = false;
  for (let i = 0; i <= steps; i++) {
    const len = (i / steps) * currentPathLength;
    const pt = pathEl.getPointAtLength(len);
    
    if (!foundStart && pt.y >= targetPoints[0].yStart - 1) {
      startOffsetPixel = len;
      foundStart = true;
    }
    if (pt.y <= targetPoints[targetPoints.length - 1].yEnd + 1) {
      endOffsetPixel = len;
    }
  }

  animProgress.targetStart = startOffsetPixel;
  animProgress.targetEnd = endOffsetPixel;

  if (!isAnimating) {
    if (animProgress.startLength === 0 && animProgress.endLength === 0) {
      animProgress.startLength = startOffsetPixel;
      animProgress.endLength = endOffsetPixel;
    }
    isAnimating = true;
    renderLoop();
  }
}

function renderLoop() {
  const container = document.querySelector('starlight-toc nav');
  if (!container) {
    isAnimating = false;
    return;
  }

  const svg = container.querySelector('.toc-indicator-svg');
  const pathEl = svg.querySelector('.toc-indicator-line');
  const circleEl = svg.querySelector('.toc-indicator-circle');

  const ease = 0.2;
  
  animProgress.startLength += (animProgress.targetStart - animProgress.startLength) * ease;
  animProgress.endLength += (animProgress.targetEnd - animProgress.endLength) * ease;

  const s = Math.max(0, animProgress.startLength);
  const e = Math.min(currentPathLength, animProgress.endLength);

  pathEl.style.strokeDasharray = `${e - s} ${currentPathLength}`;
  pathEl.style.strokeDashoffset = `-${s}`;

  try {
    const activeLengthLocation = currentDir === 'down' ? e : s;
    const pt = pathEl.getPointAtLength(activeLengthLocation);
    circleEl.setAttribute('cx', pt.x);
    circleEl.setAttribute('cy', pt.y);
  } catch (err) {}

  const dist = Math.abs(animProgress.targetStart - animProgress.startLength) + 
               Math.abs(animProgress.targetEnd - animProgress.endLength);

  if (dist < 0.1) {
    animProgress.startLength = animProgress.targetStart;
    animProgress.endLength = animProgress.targetEnd;
    isAnimating = false;
  } else {
    requestAnimationFrame(renderLoop);
  }
}

function initTocObserver() {
  document.querySelectorAll('main h2, main h3').forEach(heading => observer.observe(heading));
  setTimeout(() => { updateLineCoords(); updateMobileProgress(); }, 150);
}

document.addEventListener('astro:page-load', initTocObserver);
document.addEventListener('DOMContentLoaded', initTocObserver);
window.addEventListener('resize', () => { updateLineCoords(); updateMobileProgress(); });