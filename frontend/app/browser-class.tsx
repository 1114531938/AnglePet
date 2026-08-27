"use client";

import { useEffect } from "react";

export default function BrowserClass() {
  useEffect(() => {
    const root = document.documentElement;
    const isEdge = /\bEdg\//.test(navigator.userAgent);
    root.classList.toggle("edge-browser", isEdge);
    return () => root.classList.remove("edge-browser");
  }, []);

  return null;
}
