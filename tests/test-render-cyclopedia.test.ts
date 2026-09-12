import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { CyclopediaModal } from '../apps/web/components/CyclopediaModal';
import { CANONICAL_CYCLOPEDIA_ITEMS, CANONICAL_BESTIARY_MONSTERS } from '../apps/web/lib/cyclopediaData';

describe('Test Render CyclopediaModal', () => {
  it('renders CyclopediaModal with items tab', () => {
    console.log('Items count:', CANONICAL_CYCLOPEDIA_ITEMS.length);
    console.log('Monsters count:', CANONICAL_BESTIARY_MONSTERS.length);
    const html = ReactDOMServer.renderToString(
      React.createElement(CyclopediaModal, {
        open: true,
        onClose: () => {},
        initialTab: 'items',
        characterName: 'Hero',
        characterVocation: 'Knight',
      })
    );
    expect(html).toContain('cyclopedia-modal-overlay');
    expect(html).toContain('Abyss hammer');
  });

  it('renders CyclopediaModal with bestiary tab', () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(CyclopediaModal, {
        open: true,
        onClose: () => {},
        initialTab: 'bestiary',
        characterName: 'Hero',
        characterVocation: 'Knight',
      })
    );
    expect(html).toContain('cyclopedia-modal-overlay');
  });

  it('renders CyclopediaModal with bosstiary tab', () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(CyclopediaModal, {
        open: true,
        onClose: () => {},
        initialTab: 'bosstiary',
        characterName: 'Hero',
        characterVocation: 'Knight',
      })
    );
    expect(html).toContain('cyclopedia-modal-overlay');
  });

  it('renders CyclopediaModal with boss-points tab', () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(CyclopediaModal, {
        open: true,
        onClose: () => {},
        initialTab: 'boss-points',
        characterName: 'Hero',
        characterVocation: 'Knight',
      })
    );
    expect(html).toContain('cyclopedia-modal-overlay');
  });

  it('renders CyclopediaModal with character tab', () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(CyclopediaModal, {
        open: true,
        onClose: () => {},
        initialTab: 'character',
        characterName: 'Hero',
        characterVocation: 'Knight',
      })
    );
    expect(html).toContain('cyclopedia-modal-overlay');
  });
});
