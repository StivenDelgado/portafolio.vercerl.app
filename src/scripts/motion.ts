// Small, dependency-free motion layer for the portfolio.
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* Split text into masked characters (keeps words together for wrapping). */
document.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
  const text = el.textContent?.trim() ?? "";
  el.setAttribute("aria-label", text);
  el.textContent = "";
  let i = 0;
  text.split(" ").forEach((word, w, words) => {
    const wordEl = document.createElement("span");
    wordEl.style.display = "inline-block";
    wordEl.style.whiteSpace = "nowrap";
    wordEl.setAttribute("aria-hidden", "true");
    for (const ch of word) {
      const mask = document.createElement("span");
      mask.className = "char-mask";
      const c = document.createElement("span");
      c.className = "char";
      c.style.setProperty("--i", String(i++));
      c.textContent = ch;
      mask.appendChild(c);
      wordEl.appendChild(mask);
    }
    el.appendChild(wordEl);
    if (w < words.length - 1) el.appendChild(document.createTextNode(" "));
  });
});

/* Split paragraphs into words for the scroll-highlight effect. */
const wordBlocks = Array.from(document.querySelectorAll<HTMLElement>("[data-words]"));
wordBlocks.forEach((el) => {
  const words = (el.textContent ?? "").trim().split(/\s+/);
  el.textContent = "";
  words.forEach((w, i) => {
    const s = document.createElement("span");
    s.className = "word";
    s.textContent = w;
    el.appendChild(s);
    if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
  });
});

/* Reveal on enter. */
const revealIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("is-in");
        revealIO.unobserve(e.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
);
document
  .querySelectorAll("[data-split], [data-reveal], [data-line]")
  .forEach((el) => revealIO.observe(el));

/* Rotating words. */
document.querySelectorAll<HTMLElement>("[data-rotate]").forEach((el) => {
  const items = Array.from(el.children) as HTMLElement[];
  if (items.length < 2) return;
  let idx = 0;
  const fit = () => (el.style.width = `${items[idx].offsetWidth}px`);
  items[0].classList.add("on");
  fit();
  addEventListener("resize", fit);
  document.fonts?.ready.then(fit);
  if (reduced) return;
  setInterval(() => {
    const cur = items[idx];
    idx = (idx + 1) % items.length;
    const next = items[idx];
    cur.classList.remove("on");
    cur.classList.add("out");
    next.classList.remove("out");
    // Force the next item to start from below before sliding in.
    next.style.transition = "none";
    next.style.transform = "translateY(105%)";
    void next.offsetWidth;
    next.style.transition = "";
    next.style.transform = "";
    next.classList.add("on");
    fit();
  }, 2200);
});

/* Local time in Armenia, Colombia. */
const clocks = document.querySelectorAll<HTMLElement>("[data-clock]");
const tick = () => {
  const t = new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date());
  clocks.forEach((c) => (c.textContent = t));
};
tick();
setInterval(tick, 15000);

/* Scroll-driven: progress bar + word highlight + parallax. */
const root = document.documentElement;
const parallax = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
const onScroll = () => {
  const max = root.scrollHeight - innerHeight;
  root.style.setProperty("--p", String(max > 0 ? scrollY / max : 0));
  if (reduced) return;

  wordBlocks.forEach((el) => {
    const r = el.getBoundingClientRect();
    const start = innerHeight * 0.85;
    const end = innerHeight * 0.35;
    const p = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height * 0.6)));
    const words = el.querySelectorAll<HTMLElement>(".word");
    const lit = p * words.length;
    words.forEach((w, i) => {
      w.style.opacity = String(Math.min(1, Math.max(0.15, lit - i + 0.15)));
    });
  });

  parallax.forEach((el) => {
    const speed = Number(el.dataset.parallax) || 0.2;
    el.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`;
  });
};
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll);
onScroll();

/* Active nav link. */
const navLinks = document.querySelectorAll<HTMLAnchorElement>("[data-nav] a[href^='#']");
const navIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((l) =>
        l.classList.toggle("active", l.getAttribute("href") === `#${e.target.id}`),
      );
    });
  },
  { rootMargin: "-45% 0px -50% 0px" },
);
document.querySelectorAll("section[id]").forEach((s) => navIO.observe(s));

/* Pointer effects: cursor follower, magnetic buttons, project preview. */
if (finePointer && !reduced) {
  const cursor = document.querySelector<HTMLElement>(".cursor");
  const preview = document.querySelector<HTMLElement>("[data-preview]");
  const previewImgs = preview
    ? Array.from(preview.querySelectorAll<HTMLElement>("[data-preview-img]"))
    : [];
  let mx = innerWidth / 2,
    my = innerHeight / 2,
    cx = mx,
    cy = my,
    px = mx,
    py = my;

  addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    cursor?.classList.add("on");
  });
  document.addEventListener("pointerleave", () => cursor?.classList.remove("on"));

  document.querySelectorAll<HTMLElement>("a, button, [data-hover]").forEach((el) => {
    el.addEventListener("pointerenter", () => cursor?.classList.add("big"));
    el.addEventListener("pointerleave", () => cursor?.classList.remove("big"));
  });

  document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 0.3;
    el.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * strength;
      const y = (e.clientY - r.top - r.height / 2) * strength;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });

  document.querySelectorAll<HTMLElement>("[data-project]").forEach((row) => {
    const idx = Number(row.dataset.project);
    row.addEventListener("pointerenter", () => {
      preview?.classList.add("on");
      cursor?.classList.add("hide");
      previewImgs.forEach((img, i) => {
        img.classList.toggle("on", i === idx);
        if (img instanceof HTMLVideoElement) {
          if (i === idx) img.play().catch(() => {});
          else img.pause();
        }
      });
    });
    row.addEventListener("pointerleave", () => {
      preview?.classList.remove("on");
      cursor?.classList.remove("hide");
      previewImgs.forEach((img) => img instanceof HTMLVideoElement && img.pause());
    });
  });

  const loop = () => {
    cx = lerp(cx, mx, 0.25);
    cy = lerp(cy, my, 0.25);
    px = lerp(px, mx, 0.1);
    py = lerp(py, my, 0.1);
    if (cursor) cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    if (preview) {
      const rot = (mx - px) * 0.04;
      preview.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%) rotate(${rot}deg)`;
    }
    requestAnimationFrame(loop);
  };
  loop();
}
