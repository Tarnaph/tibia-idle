# Tibia 8.60 visual spike

This package is a deliberately small, read-only importer for the sibling
`tibia-860-client` and `styller-master` folders. It parses the complete legacy
DAT structure to prove alignment, decodes only the referenced SPR records, and
writes generated PNG/JSON files only inside `mmorpg-web`.

The binary layout follows the legacy OTClient model: a DAT signature and four
appearance counts, attribute streams terminated by `0xff`, dimensions
(`width`, `height`, `layers`, `patternX/Y/Z`, `frames`) and 16-bit sprite IDs.
SPR uses a signature, 16-bit sprite count, 32-bit offset table and transparent /
colored RLE runs for 32×32 RGB sprites.

For creatures, the sprite index order is frame → patternZ → patternY →
patternX → layer → tile height → tile width. The spike exports patternX 0–3
as south, east, north and west. Scenery uses explicit STYLLER server-id → OTB
client-id → DAT appearance mappings and never reads or rewrites the OTBM map.

The inventory slice resolves only the currently selected equipment and Rotworm
loot through server-id → `items.otb` client-id → DAT item appearance → SPR. It
exports layer 0, pattern 0/0/0 and frame 0 as a static pixel-art icon, retaining
the complete appearance metadata and explicit warnings for deferred stack,
subtype, layer, or animation variants.
