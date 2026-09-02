'use client';

import { useState, type ReactNode } from 'react';

interface ClientPanelProps {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export function ClientPanel({
  title,
  meta,
  children,
  className = '',
  defaultOpen = true,
}: ClientPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`client-panel ${open ? 'is-open' : 'is-collapsed'} ${className}`}>
      <button type="button" className="client-panel-heading" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <strong>{title}</strong>
        <span>{meta}<i aria-hidden="true">{open ? '−' : '+'}</i></span>
      </button>
      {open && <div className="client-panel-content">{children}</div>}
    </section>
  );
}
