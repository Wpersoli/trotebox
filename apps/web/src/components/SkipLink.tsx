'use client';

import type { MouseEvent } from 'react';

type SkipLinkProps = {
  targetId: string;
  children: React.ReactNode;
};

export function SkipLink({ targetId, children }: SkipLinkProps) {
  function moveFocus(event: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById(targetId);
    if (!target) return;

    event.preventDefault();
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  }

  return (
    <a className="skip-link" href={`#${targetId}`} onClick={moveFocus}>
      {children}
    </a>
  );
}
