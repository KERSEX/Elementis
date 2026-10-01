// Die 10 Elemente. status = Wirkung, die ein Treffer dieses Elements mitbringt.
export const ELEMENTS = {
  feuer:  { id: 'feuer',  name: 'Feuer',      glyph: '🔥', color: 0xff6a2a, css: '#ff6a2a', status: 'burn',  statusText: 'Brennt: Schaden über Zeit' },
  wasser: { id: 'wasser', name: 'Wasser',     glyph: '💧', color: 0x3aa0ff, css: '#3aa0ff', status: 'wet',   statusText: 'Nass: langsamer, Strom wirkt stärker' },
  erde:   { id: 'erde',   name: 'Erde',       glyph: '🪨', color: 0xb08a50, css: '#b08a50', status: 'stagger', statusText: 'Betäubt kurz' },
  luft:   { id: 'luft',   name: 'Luft',       glyph: '🌪️', color: 0xb8ecff, css: '#b8ecff', status: 'knock', statusText: 'Starker Rückstoß' },
  magie:  { id: 'magie',  name: 'Magie',      glyph: '🔮', color: 0xb05cff, css: '#b05cff', status: 'arcane', statusText: 'Mehr Krit-Chance' },
  tech:   { id: 'tech',   name: 'Tech',       glyph: '⚙️', color: 0xd0d8e4, css: '#d0d8e4', status: 'shock', statusText: 'Kettenblitz auf Nachbarn' },
  leben:  { id: 'leben',  name: 'Leben',      glyph: '🌿', color: 0x5ad05a, css: '#5ad05a', status: 'leech', statusText: 'Heilt den Helden' },
  untot:  { id: 'untot',  name: 'Untot',      glyph: '💀', color: 0x9fd0a0, css: '#9fd0a0', status: 'drain', statusText: 'Lebensraub' },
  licht:  { id: 'licht',  name: 'Licht',      glyph: '☀️', color: 0xffe27a, css: '#ffe27a', status: 'blind', statusText: 'Blendet: Gegner treffen schlechter' },
  dunkel: { id: 'dunkel', name: 'Dunkelheit', glyph: '🌑', color: 0x7a54b8, css: '#7a54b8', status: 'curse', statusText: 'Verflucht: nimmt mehr Schaden' },
};
export const EL_IDS = Object.keys(ELEMENTS);
export const elOf = (id) => ELEMENTS[id] || ELEMENTS.magie;
