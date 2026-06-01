# Zero Engine (SLA Industries) — System State Reference

**Last updated:** 2026-06-01  
**System version:** 1.3.0-dev  
**Foundry compatibility:** v13 minimum, verified v14.361  
**World:** SLA_Industries (last played 2026-06-01, ~110 hours playtime)  
**Single source file:** `zero-engine.mjs` (~6500+ lines)

---

## File Map

| Path | Role |
|------|------|
| `system.json` | Manifest — id: `zero-engine`, entry: `zero-engine.mjs` |
| `zero-engine.mjs` | Everything: classes, hooks, data tables, PC/NPC creators |
| `styles/zero-engine.css` | All CSS (~4600+ lines, SLA Borg font family) |
| `blade-runner.css` / `.js` | Legacy Blade Runner skin (not SLA-active) |
| `template.json` | Actor & Item data schemas |
| `lang/en.json` | English localisation strings |
| `templates/actor/character-sheet.hbs` | Primary PC sheet (Mk1) |
| `templates/actor/character-sheet-mk2.hbs` | Mk2 dark sheet variant |
| `templates/actor/npc-sheet.hbs` | NPC sheet |
| `templates/actor/vehicle/vehicle-sheet.hbs` | Vehicle sheet |
| `templates/actor/loot/loot-sheet.hbs` | Loot container sheet |
| `templates/actor/character/` | Modular tab partials (stats, combat, inventory, mods, bio) |
| `templates/components/roll/roll-chatcard.hbs` | Roll result chat card |
| `templates/item/item-sheet.hbs` | Item sheet |
| `packs/armors.json` | 6 armors |
| `packs/drugs.json` | 7 drugs |
| `packs/ebb-formulae.json` | 30 Ebb formulae |
| `packs/specialties.json` | 16 specialties |
| `packs/tables-data.json` | 5 rollable tables (panic, phys crit, mental crit, ranged fail, melee fail) |
| `fonts/SLABorg-*.woff2` | Custom SLA Borg font family (Book, Tech, Title, UI) |
| `assets/icons/ebb/` | 10 Ebb discipline SVG icons |
| `assets/racial/` | 8 racial ability SVG icons |
| `assets/textures/` | Chat card, character sheet, journal background webps |

---

## Actor Types

### `character` (PC)

**Attributes** (base 2 each, rolled as Nd6):
- Strength, Agility, Wits, Empathy

**Skills** (add to attribute for dice pool):
| Skill | Attribute |
|-------|-----------|
| Force, Melee, Stamina | Strength |
| Marksmanship, Mobility, Stealth | Agility |
| Crafting, Observation, Survival | Wits |
| Healing, Insight, Persuasion, Ebb | Empathy |

**Derived Stats:**
- `health` (value/max) — base 3, modified by race/training/armor/drugs/specialties
- `resolve` (value/max) — base 3, modified by race/training/drugs/specialties
- `stress` — scalar 0–10; adds stress dice to all rolls (1s on stress dice = Banes)
- `carryLimit` — base 4
- `broken` — boolean; triggers Broken condition

**Other Fields:**
- `details` — age, height, weight, scl (default 10), credits (default 500)
- `race` — string key (see Races below)
- `training` — array, first entry used as archetype label
- `archetype` — string
- `flux` (value/max) — Ebb resource; max = Ebb skill + 1
- `criticalInjuries` — physical\[\] and mental\[\] arrays
- `panic` — directive string, active boolean
- `vevaphon` — instability (0–12), instabilityMax (12), activeMorphForm
- `finances` — income (salary, bpnReward, other), expenses (accommodation, drugs, subscriptions, other, bulletTax), debt, ammoSpentSession, creditLog\[\]
- `bpn` — code, type (blue/green/red/silver/gold/black), status, reward, description, objectives, notes
- `specialties` / `equipment` / `weapons` — legacy text fields (items are embedded)

**Health/Resolve calculation** (`calculateHealthResolve`):
```
healthMax = 2 + (STR-2) + raceMod + trainingMod + equipmentMod + specialtyMod + drugMod
resolveMax = 2 + (EMP-2) + raceMod + trainingMod + equipmentMod + specialtyMod + drugMod
```
Recalculates on: attribute changes, race change, item add/remove/update, active effect changes.

---

### `npc` (NPC)

Simplified schema: biography, threat (1–5), flat attributes (str/agi/wits/emp), health (value/max), armor (flat number), damage.

---

## Item Types

| Type | Key Fields |
|------|-----------|
| `weapon` | weaponType, category (ranged/melee), damage, range, rof, gearBonus, ap, magazine, ammo, fireModes, autoAmmoUse, ammoType, caliber, roundType, initiativeMod, equipped, ammoEmpty |
| `armor` | armorRating, armorDice, armorAuto, statMod, skillMod, statModTarget, skillModTarget, healthMod, resolveMod, initiativeMod, equipped |
| `equipment` | quantity, cost, weight, isDrug, active, activeDuration, healthMod, resolveMod, statPhysicalMod, skillAllMod, panicReduction, injuryPenaltyIgnore, stressRecoveryBonus, postUseStaminaDamage, withdrawal variants of all mods, per-skill mods, initiativeMod, equipped |
| `ammo` | caliber, roundType, quantity, costPerRound, apBonus, damageMod, blastRadius, weight |
| `specialty` | category, effects, prerequisites, package, healthMod, resolveMod, racialBonuses\[\], isActive |
| `ebb` | discipline, fluxCost, successes, effect, catastrophe, duration, range |

---

## Races

8 playable races, defined in `SLA_RACES`:

| Race | Key | Base Attrs | Attr Points | Skill Points | Health Mod | Resolve Mod | Notes |
|------|-----|------------|-------------|--------------|-----------|------------|-------|
| Human | `human` | 2/2/2/2 | 6 | 10 | 0 | 0 | Caps 5/5/5/5 |
| Ebon | `ebon` | 2/2/3/3 | 4 | 10 | 0 | +1 | Ebb user. Caps 4/4/5/5 |
| Brain Waster | `brainwaster` | 2/2/4/3 | 3 | 10 | 0 | 0 | Ebb user, push risk catastrophe. Caps 3/4/5/5 |
| Stormer 313-S | `stormer` | 4/3/2/2 | 3 | 8 | +2 | 0 | Caps 5/5/3/3 |
| Shaktar | `shaktar` | 3/3/2/2 | 4 | 9 | +1 | 0 | Caps 5/5/4/4 |
| Wraith Raider | `wraithraider` | 2/4/2/2 | 4 | 10 | 0 | +1 | Caps 4/5/5/4 |
| Frother | `frother` | 4/2/2/2 | 4 | 8 | +1 | -1 | Drug Dependency: -1 all rolls when no drug active. Caps 5/4/4/3 |
| Stormer Vevaphon | `vevaphon` | 3/3/2/2 | 5 | 8 | +2 | -1 | Morph forms + Instability. Caps 5/5/4/3 |

**Race-derived derived stats** are applied in `RACE_DERIVED_MODS` and `calculateHealthResolve`. Race change auto-adds racial specialty items via `_ensureRacialAbilities`.

---

## Racial Abilities (auto-embedded on race set)

Each race gets specialty items automatically added to the actor:

| Race | Specialties Added |
|------|------------------|
| Human | Social Versatility (+1 Persuasion, +1 Insight) |
| Ebon | Ebb Sensitive, natural Ebb formulae |
| Brain Waster | Ebb Fury (push = catastrophe risk), natural Ebb formulae |
| Stormer | Regeneration (regen HP on rest) |
| Shaktar | Warrior Caste (+1 Force, +1 Melee), Code of Honor |
| Wraith Raider | Shaper Senses (+2 Stealth, +1 Observation), Cold Adapted |
| Frother | Drug Dependency, Combat Drug User (+2 Force/Melee while drugged), Blade Proficiency |
| Vevaphon | Brute Form, Stalker Form, Raptor Form, Morphic Strike |

---

## Vevaphon Morph Forms

Switching form costs 1 Instability and triggers an automatic instability check roll (1d6 + current instability). Forms are stored as specialty items. `activeMorphForm` key: `none` / `brute` / `stalker` / `raptor`.

| Form | Bonuses | Restriction |
|------|---------|-------------|
| Base (`none`) | Normal stats | — |
| Brute | +2 Health max, knockdown immune, +1 Force, +1 Melee | Cannot be disguised |
| Stalker | +2 Stealth, +1 Agility dice | Cannot wear armour |
| Raptor | +2 Melee, +1 Marksmanship (close range), crits +1 dmg | — |
| Morphic Strike | Natural weapon DMG 2 AP 1 | Always available, all forms |

**Instability table** (roll: 1d6 + instability value, triggers at result ≥ 7):

| Range | Name | Severity |
|-------|------|----------|
| 7 | Flicker | minor |
| 8 | Skin Crawl | minor |
| 9 | Drift | minor |
| 10 | Identity Slip | minor |
| 11 | Voice Shift | minor |
| 12 | Pain Spike (+1 Stress) | moderate |
| 13 | Limb Fault (-2 phys) | moderate |
| 14 | Form Bleed | moderate |
| 15 | Sensory Overload | moderate |
| 16 | Tissue Rejection (1 dmg, no armour) | moderate |
| 17 | Threat Lock | serious |
| 18 | Form Panic (+1 Stress) | serious |
| 19 | Memory Fracture | serious |
| 20 | Partial Collapse (1d3 dmg) | serious |
| 21 | Identity Bleed | serious |
| 22 | Uncontrolled Shift (+1 Instability) | serious |
| 23 | Trauma Response (Shaken) | serious |
| 24 | Permanent Scar | critical |
| 25 | Full Reversion (-1 Instability, revert) | critical |
| 26 | Psychic Scream | critical |
| 27 | Body Horror | critical |
| 28 | Cascade Shift (1d3 dmg, +1 Instab) | critical |
| 29 | Dissolution Risk | critical |
| 30 | Identity Death | catastrophic |
| 31 | Organ Shift (2 dmg/round) | catastrophic |
| 32 | Full System Failure | catastrophic |
| 33 | Catastrophic Cascade (1d6 dmg/round) | catastrophic |
| 34 | Biogenetic Detonation (2d6 self, 1d6 AoE) | catastrophic |
| 35 | Terminal Dissolution | lethal |
| 36+ | Total Collapse (instant death) | lethal |

Auto-effects are applied programmatically (`autoStress`, `autoDamage`, `autoDamageRoll`, `autoInstability`, `revertForm`, `applyCondition`).

---

## Training Packages

8 packages in `SLA_TRAINING`, selected at PC creation:

| Package | Key | Starting Skills | Specialty | Armour |
|---------|-----|-----------------|-----------|--------|
| Soldier | `soldier` | Melee 2, Marksmanship 2, Stamina 1 | Hard Hitter | CAF Armor |
| Scout | `scout` | Stealth 2, Mobility 2, Observation 1 | Fast Reflexes | Scout Armor |
| Combat Medic | `medic` | Healing 2, Insight 1, Observation 2 | Field Surgeon | Downtown Jacket |
| Technical Operative | `tech` | Crafting 3, Observation 1, Survival 1 | Inquisitive | Downtown Jacket |
| Negotiator | `negotiator` | Persuasion 2, Insight 2, Observation 1 | Gut Feeling | Downtown Jacket |
| Hunter | `hunter` | Marksmanship 2, Stealth 2, Observation 1 | Sniper | Scout Armor |
| Brawler | `brawler` | Force 2, Melee 2, Stamina 1 | True Grit | CAF Armor |
| Ebb Channeller | `ebb_user` | Ebb 3, Insight 1, Persuasion 1 | Ebb Sensitive | Downtown Jacket |

Ebb Channeller gives race-differentiated starting formulae:
- **Ebon:** Empathic Pulse, Danger Sense, Mind-Link, Calm, Ebb Shield, Ebb Sight, Surge
- **Brain Waster:** Ebb Bolt, Heat Touch, Surge, Push, Empathic Pulse, Ebb Shield, Iron Flesh

---

## NPC Archetypes

10 archetypes in `SLA_NPC_TYPES` (used by `SLANPCCreator`):

| Archetype | Threat | HP | Armor |
|-----------|--------|----|-------|
| Civilian | 1 | 4 | 0 |
| Gang Grunt | 1 | 5 | 1 |
| Shiver (Patrol) | 2 | 6 | 2 |
| SLA Operative (Green) | 2 | 5 | 2 |
| Carrien | 2 | 7 | 1 |
| SLA Operative (Veteran) | 3 | 8 | 3 |
| Ebb Operative (Ebon) | 3 | 6 | 1 |
| Dept. of Propaganda Agent | 3 | 6 | 2 |
| Dark Finder | 4 | 10 | 4 |
| *(10th not captured in this read)* | — | — | — |

---

## Core Roll Mechanics

### Dice Pool

- Roll **Attribute + Skill** d6s (plus Gear Bonus for weapons)
- **Success** = 6 on any die
- Count total successes (each 6 = 1 success)
- 0 successes = failure

### Stress Dice

- `stress` value adds that many d6s to every roll
- 1s on stress dice = **Banes** (tracked, can trigger panic)
- Stress increases on push; some drugs/drugs-withdrawal affect stress

### Push

- After a failed roll, player may push (re-roll non-6, non-1 dice)
- **Cost:** +1 Stress
- **Brain Wasters:** pushing risks catastrophe result
- Results formatted with `_formatYZEResult` and displayed in chat card

### Armor Check

- Triggered when character takes damage
- Roll **armorDice** d6s, subtract **AP** from dice pool first
- Successes reduce damage 1:1
- `armorAuto` = automatic damage reduction (no roll needed)
- Called via `_promptAndRollArmorCheck` → `_rollArmorCheck`

### Weapon Rolls

- **Ranged:** AGI + Marksmanship + Gear Bonus
- **Melee:** STR + Melee + Gear Bonus
- Fire modes: single, burst, full-auto (different ammo costs)
- `autoAmmoUse`: ammo consumed on full-auto (default 8)
- Bullet Tax auto-applied after session (tracked in `finances.bulletTax`)

### Ebb Rolls

- Roll **EMP + Ebb Skill** d6s
- Need `successes` threshold from formula item
- Flux cost deducted from `flux.value`
- Catastrophe text displayed on roll if applicable
- Disciplines: awareness, blast, communicate, enhance, heal, protect, realityFold, senses, telekinesis, thermal

---

## Conditions (SLA_CONDITIONS)

14 registered status effects, auto-applied via `applyCondition` or Token HUD:

| ID | Label | Penalty |
|----|-------|---------|
| `sla-bleeding` | Bleeding | -1 HP/turn |
| `sla-stunned` | Stunned | -3 all dice, clears end of turn |
| `sla-pinned` | Pinned | -2 melee/marksmanship/mobility |
| `sla-suppressed` | Suppressed | -2 all dice |
| `sla-on-fire` | On Fire | -2+ HP/turn (escalating), -1 all dice |
| `sla-blinded` | Blinded | -3 ranged/observation, -2 melee |
| `sla-deafened` | Deafened | -1 observation |
| `sla-broken` | Broken | -2 all dice, must roll Stamina to act |
| `sla-winded` | Winded | -1 all dice, clears end of round |
| `sla-broken-arm` | Broken Arm | -2 Melee, -1 Marksmanship, -1 Force |
| `sla-broken-leg` | Broken Leg | -2 Mobility, -1 Stealth |
| `sla-concussed` | Concussed | -1 all, extra -1 Observation/Wits |
| `sla-gut-wound` | Gut Wound | -2 all dice |
| `sla-panicking` | Panicking | -2 all dice, cannot act normally |
| `sla-shaken` | Shaken | -1 all dice |

Condition dice penalties are applied via `_getConditionModifiers(actor, {skill, attribute})` and reflected in every roll.

---

## Tables (tables-data.json)

| Table | Formula |
|-------|---------|
| Panic | 1d6 + Stress |
| Physical Critical | 1d66 |
| Mental Critical | 1d66 |
| Ranged Critical Fail | 1d6 |
| Melee Critical Fail | 1d6 |

---

## Equipment Packs

### Armors (6)

| Name | AR | Dice | Auto |
|------|----|------|------|
| Downtown Jacket | 1 | 1 | 0 |
| CAF Armor | 2 | 2 | 1 |
| Scout Armor | 3 | 3 | 1 |
| HARD Armor | 4 | 4 | 2 |
| Exo-Rig Armor | 5 | 5 | 2 |
| Squad Shielded Power Armor | 6 | 6 | 3 |

### Drugs (7)

| Name | HP | Resolve | Str | Panic Red |
|------|----|---------|----|-----------|
| Painkillers | 0 | +1 | 0 | 0 |
| Stimulant | 0 | +1 | +1 | 0 |
| Sedative | 0 | +2 | 0 | 0 |
| Redline | +1 | -2 | +2 | 0 |
| Calm-Line | 0 | +2 | 0 | +2 |
| Rush | +1 | -1 | +1 | 0 |
| UV (Ultra-Violence) | +2 | -3 | +2 | 0 |

All drugs track active/withdrawal states with separate modifier sets.

### Specialties (16 in system pack)

Categories: combat, investigation, social, medical, ebb, racial, survival

| Name | Category | Package |
|------|----------|---------|
| Sniper | combat | Scout |
| Fast Reflexes | combat | Scout |
| Inquisitive | investigation | Investigator |
| Gut Feeling | investigation | Investigator |
| Hard Hitter | combat | Frother |
| True Grit | survival | Frother |
| Menacing | social | Corporate |
| Compassion | social | Corporate |
| Field Surgeon | medical | Medic |
| Healer | medical | Medic |
| Ebb Sensitive | ebb | Ebon - Any |
| Ebb Fury | ebb | Brain Waster - Operative |
| Code of Honor | racial | Shaktar |
| Cold Adapted | racial | Wraith Raider |
| Regeneration | racial | Stormer |
| Combat Drug User | racial | Frother |

### Ebb Formulae (30)

| Discipline | Formulae |
|-----------|---------|
| Awareness | Empathic Pulse (1), Precognition (2), Danger Sense (2) |
| Blast | Ebb Bolt (1), Hellfire (2), Ebb Storm (3) |
| Communicate | Mind-Link (1), Broadcast (2), Compel (2) |
| Enhance | Surge (1), Iron Flesh (2), Heightened State (3) |
| Heal | Mend (1), Restore (2), Calm (1) |
| Protect | Ebb Shield (1), Ward (2), Phase Shell (3) |
| RealityFold | Blink (2), Fold Space (3), Phase Through (3) |
| Senses | Ebb Sight (1), Mind's Eye (1), Remote View (2) |
| Telekinesis | Push (1), Grip (2), Levitate (2) |
| Thermal | Heat Touch (1), Flame Burst (2), Freeze (2) |

*(Numbers in parentheses = Flux cost)*

---

## Sheets

### Registered Sheets

| Class | Type | Label | Default |
|-------|------|-------|---------|
| `ZeroEngineActorSheet` | character + npc | Zero Engine Character Sheet | Yes |
| `ZeroEngineActorSheetMk2` | character only | Zero Engine — Mk2 (Dark) | No |
| `ZeroEngineItemSheet` | all items | Zero Engine Item Sheet | Yes |

### Mk1 Sheet Tabs (character-sheet.hbs)

Stats, Combat, Inventory, Mods, Bio — via `templates/actor/character/sheet-tabs/`

### Mk2 Sheet (ZeroEngineActorSheetMk2)

Dark-themed variant extending `ZeroEngineActorSheet`. Uses `character-sheet-mk2.hbs`. Full SLA Borg font/dark palette.

---

## PC Creator Wizard (`SLAPCCreator`)

Multi-step Application launched from Actor Directory. Steps:
1. Choose race (8 options with flavor text)
2. Allocate attribute points (race-specific pool and caps)
3. Choose training package (some race-restricted, e.g. Ebb Channeller = Ebon/Brain Waster only)
4. Allocate skill points (race-specific pool, cap 3)
5. Random name generation (race-keyed name tables)
6. Confirm & create actor with all embedded items

Racial abilities auto-embedded via `_ensureRacialAbilities` on actor creation when race is set.

---

## NPC Creator (`SLANPCCreator`)

Two modes: **Quick** (pick archetype, auto-fill stats) and **Full** (manual stat entry). Generates NPC actor with appropriate weapons, armor, and attributes.

---

## Hooks Registered

| Hook | Purpose |
|------|---------|
| `init` | Register sheets, Handlebars helpers, SLA conditions setup trigger |
| `setup` | Register `SLA_CONDITIONS` as Foundry status effects |
| `ready` (×3) | DiceSoNice skin, PC creator button in Actor Directory, world clock |
| `createCombatant` | Auto-initiative handling |
| `renderCombatTracker` | Custom combat UI additions |
| `diceSoNiceReady` | Register custom SLA Borg d6 dice skin |
| `renderChatMessageHTML` | Post-roll push buttons, apply damage buttons |
| `preUpdateActor` | Guard recalc triggers |
| `createActor` | Auto-derive stats + racial abilities |
| `updateActor` (×2) | Recalc derived stats; handle race change → racial abilities |
| `createItem` / `updateItem` / `deleteItem` | Recalc derived stats (armor/drug/specialty mods) |
| `createActiveEffect` / `updateActiveEffect` / `deleteActiveEffect` | Recalc derived stats |
| `renderActorDirectory` | Inject "New SLA Operative" PC creator button |
| `updateWorldTime` | Shift Ledger world clock integration |
| `combatTurnChange` | Per-turn condition ticks (bleeding, on fire, etc.) |
| `renderTokenHUD` | Condition toggle buttons in token HUD |
| `pauseGame` | Custom SLA pause animation |

---

## Modules

All modules are standalone FormApplication/Application classes targeting the `zero-engine` system.

### sla-bpn-dispatch (v0.3.0)

Generates random BPN briefings using SLA mission colour logic (blue/green/red/silver/gold/black). Builds contact name, objectives, scenario frame, reward package. Creates GM debrief journal entry. Integrated into Actor Directory.

### sla-briefing-desk (v0.1.0)

Mission briefing composer. Draft saved to world settings. Renders HTML briefing and creates journal entry. Adds button to Journal Directory.

### sla-gear-cache (v0.1.0)

Generates ammo caches, med packs, breach kits, requisition bundles. Adds generated items directly to selected actor. Adds button to Actor Directory.

### sla-npc-director (v0.1.0)

Tracks NPC morale, suppression, stance, and intent. Reads from current combatants or selected tokens. Saves state to world settings. Accessible from Combat Tracker, Actor Directory, and Settings.

### sla-ops-clock (v0.1.0)

Tracks mission tempo: operation clock, heat, collateral, pressure. Posts player-facing updates to chat. State saved to world settings. Adds button to Scene Directory.

### sla-shift-ledger (v0.2.0)

Full campaign time tracker. Manages: day/week/shift progression, actor duty schedules, housing tiers (with weekly cost calculation), living cost ledger. `SlaCampaignClockApp` application. Integrates with `updateWorldTime` hook.

---

## World Compendium Packs (SLA_Industries world)

| Pack Name | Type | Contents |
|-----------|------|----------|
| `specialities` | Item | World-level specialty items (LevelDB) |
| `sla-specialties` | Item | SLA specialty items (LevelDB) |
| `sla-weapons` | Item | SLA weapon items (LevelDB) |

---

## Known Issues / Notes for Development

- `template.json` still lists `vehicle` as an actor type in world notes but is not in the schema `types` array — vehicle sheet exists as a template but is not formally registered as an actor type.
- Ebb `flux.max` is computed dynamically (Ebb skill + 1) rather than stored; `flux.value` is stored.
- `race` field is typed as `Array` in `template.json` but consumed as a string throughout the code (`race[0]` with fallback). This is a legacy inconsistency.
- Bullet Tax tracks `ammoSpentSession` on the actor and applies costs at rest.
- `blade-runner.css` / `blade-runner.js` are present but not loaded — legacy files from the base YZE system.
- `lang/` contains de, en, es, fr, ko, pl — only en is actively maintained for SLA content.
- DiceSoNice skin registered as `sla-borg-d6` using custom SFX config at `assets/plugins/dice-so-nice/`.
