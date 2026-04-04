import { useEffect } from 'react';

/**
 * Makes `targetRef` draggable when the user grabs `handleSelector`.
 * Elements matching `ignoreSelector` inside the handle will NOT start a drag.
 */
export function useDraggable(targetRef, handleSelector, ignoreSelector = null) {
  useEffect(() => {
    const win    = targetRef.current;
    const handle = document.querySelector(handleSelector);
    if (!win || !handle) return;

    let dragging = false;
    let ox = 0, oy = 0;

    const onDown = (e) => {
      if (ignoreSelector && e.target.closest(ignoreSelector)) return;
      dragging = true;
      const r = win.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!dragging) return;
      win.style.left = `${Math.max(0, Math.min(window.innerWidth  - win.offsetWidth,  e.clientX - ox))}px`;
      win.style.top  = `${Math.max(0, Math.min(window.innerHeight - win.offsetHeight - 52, e.clientY - oy))}px`;
    };

    const onUp = () => { dragging = false; };

    handle.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);

    return () => {
      handle.removeEventListener('mousedown', onDown);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
  }, [targetRef, handleSelector, ignoreSelector]);
}
