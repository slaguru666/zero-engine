/**
 * build-packs.mjs
 * Converts JSON source files in /packs/ into Foundry v14 LevelDB compendium packs.
 *
 * Usage:  node build-packs.mjs
 *
 * To add new items: edit the relevant JSON file in /packs/, then re-run this script
 * and push to GitHub. Foundry will pick up the new items on next install/update.
 */

import { ClassicLevel } from 'classic-level';
import { readFileSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __dir = dirname(fileURLToPath(import.meta.url));

/** Generate a Foundry-style 16-char alphanumeric ID */
function makeId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const bytes = randomBytes(16);
  for (const b of bytes) id += chars[b % chars.length];
  return id;
}

/**
 * Write an array of item objects into a Foundry LevelDB pack directory.
 * @param {string} packDir   - absolute path to the pack folder (will be wiped & recreated)
 * @param {object[]} items   - array of Foundry item documents (name, type, img, system)
 */
async function buildPack(packDir, items) {
  // Wipe existing pack so we get a clean rebuild
  if (existsSync(packDir)) {
    rmSync(packDir, { recursive: true, force: true });
  }

  const db = new ClassicLevel(packDir, { keyEncoding: 'utf8', valueEncoding: 'utf8' });

  for (const item of items) {
    const id = makeId();
    const doc = {
      _id: id,
      name: item.name,
      type: item.type,
      img:  item.img  ?? 'icons/svg/item-bag.svg',
      system: item.system ?? {},
      effects: [],
      flags: {},
      folder: null,
      sort: 0,
      ownership: { default: 0 },
      _stats: {
        systemId: 'zero-engine',
        systemVersion: '1.3.0-dev',
        coreVersion: '14.359',
        createdTime: Date.now(),
        modifiedTime: Date.now(),
        lastModifiedBy: 'builder'
      }
    };
    await db.put(`!items!${id}`, JSON.stringify(doc));
  }

  // Force compaction: flushes WAL (.log) into proper SST (.ldb) files
  // Foundry requires .ldb format — without this the packs appear empty
  await db.compactRange('\x00', '\xff');
  await db.close();
  console.log(`  ✓  ${items.length} items → ${packDir.replace(__dir, '.')}`);
}

// ── Pack definitions ─────────────────────────────────────────────────────────
// Each entry: { id, label, source JSON file }
// To add a new pack: add an entry here and create the matching JSON source file.

const PACKS = [
  {
    id:     'sla-armors',
    label:  'SLA Armors',
    source: 'packs/armors.json',
  },
  {
    id:     'sla-drugs',
    label:  'SLA Drugs & Consumables',
    source: 'packs/drugs.json',
  },
  {
    id:     'sla-ebb-formulae',
    label:  'SLA Ebb Formulae',
    source: 'packs/ebb-formulae.json',
  },
  {
    id:     'sla-specialties',
    label:  'SLA Specialties',
    source: 'packs/specialties.json',
  },
];

// ── Run ──────────────────────────────────────────────────────────────────────
console.log('Building SLA Zero Engine compendium packs…\n');

for (const pack of PACKS) {
  const sourcePath = join(__dir, pack.source);
  const destDir    = join(__dir, 'packs', pack.id);
  const items      = JSON.parse(readFileSync(sourcePath, 'utf8'));
  console.log(`Building: ${pack.label} (${items.length} items)`);
  await buildPack(destDir, items);
}

console.log('\nDone. Re-run this script any time you update a source JSON file.');
