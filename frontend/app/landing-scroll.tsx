"use client";

import { useEffect } from "react";

export function LandingScroll() {
  useEffect(() => {
    const site = document.querySelector<HTMLElement>(".site");
    const topbar = site?.querySelector<HTMLElement>(".topbar");
    if (!site || !topbar) return;

    const sections = Array.from(
      site.querySelectorAll<HTMLElement>(":scope > .hero, :scope > .journey, :scope > .showcase-section, :scope > .site-footer"),
    );
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastWheelAt = -Infinity;
    let lockedUntil = 0;

    const onWheel = (event: WheelEvent) => {
      if (!finePointer.matches || window.innerWidth <= 900 || event.ctrlKey || event.shiftKey || Math.abs(event.deltaY) < 4) return;

      const now = performance.now();
      if (now < lockedUntil || now - lastWheelAt < 180) {
        event.preventDefault();
        lastWheelAt = now;
        return;
      }

      const navHeight = topbar.getBoundingClientRect().height;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const targets = sections.map((section) =>
        Math.max(0, Math.min(maxScroll, window.scrollY + section.getBoundingClientRect().top - navHeight)),
      );
      const current = Math.max(0, targets.findLastIndex((top) => top <= window.scrollY + 40));
      const direction = Math.sign(event.deltaY);
      const bounds = sections[current].getBoundingClientRect();
      const next = direction > 0
        ? Math.min(current + 1, sections.length - 1)
        : window.scrollY - targets[current] > 60 ? current : Math.max(current - 1, 0);
      const remaining = bounds.bottom - window.innerHeight;
      const target = direction > 0 && current > 0 && current < sections.length - 1 && remaining > 32
        ? Math.min(maxScroll, window.scrollY + Math.min(remaining, window.innerHeight - navHeight - 80))
        : targets[next];
      if (Math.abs(target - window.scrollY) < 1) return;

      event.preventDefault();
      lastWheelAt = now;
      lockedUntil = now + 650;
      window.scrollTo({ top: target, behavior: reducedMotion.matches ? "auto" : "smooth" });
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  return null;
}
