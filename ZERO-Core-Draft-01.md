# ZERO ENGINE
## SLA Industries — Complete Rules, Draft One (v0.1)

*A d6 dice-pool RPG of corporate horror, urban warfare, and televised violence in the World of Progress. You are an Operative of SLA Industries: contracted, sponsored, filmed, and expendable. This draft is written from the working Foundry VTT implementation (system v1.7.6) — every rule here is the rule as the dice engine actually enforces it.*

> **What's in Draft 1**
> - The full engine as implemented: dice pools, Stress dice, Pushing, Panic, Conditions, critical injuries.
> - All 8 playable races with their auto-granted racial abilities and natural weapons.
> - 8 training packages, 16 specialties, the complete 30-formula Ebb grimoire.
> - Combat in full: two-mode initiative, fire modes, multi-shot, ammunition calibers, the Bullet Tax, and the armor check.
> - The Vevaphon: three morph forms, Instability, and the full 7–36+ Instability table.
> - Life on Mort: credits, SCL, the LAD account, drugs (19 of them), housing shifts, and Showing Off for the cameras.
> - GM tools: 10 NPC archetypes, the Group NPC Generator with its 1–10 threat slider, and the module suite.
>
> *Source of truth: `zero-engine.mjs` v1.7.6, `template.json`, and the seven compendium packs. Where the Foundry system automates a rule, this document states the rule the automation enforces.*

---

## 0. ZERO ENGINE in five minutes ⟐ *(start here)*

1. **Roll a pool of six-sided dice** — Attribute + Skill + gear and situation. **Only a 6 is a Success.** One Success = done; more = done better.
2. **Your Stress adds dice too** — one Stress die per point of Stress, rolled alongside. Stress dice can score Successes like any other… but every **1 on a Stress die is a Bane**, and Banes on a pushed roll trigger a **Panic check**.
3. Not good enough? **Push** — reroll everything that isn't a 6 (Stress 1s stay locked), and take **+1 Stress** for your trouble. Pride costs. Push a ranged attack into a Stress bane and your gun **runs dry** on top of it.
4. **No abstract hit points.** **Health = Strength + Agility. Resolve = Wits + Empathy.** Hit 0 in either and you are **Broken** — and you roll a d66 critical injury, physical or mental, right now.
5. **Everything is billed.** Every round you fire is deducted from your account at double book price (the **Bullet Tax**). Your armour, your drugs, your rent, your resurrection insurance — SLA Industries provides, and SLA Industries invoices.
6. The cameras are always on. **Show off** — throw dice away from your own pool to do it with style — and the audience remembers. So does the GM.

That's the engine. Pick a race (§9), take a training package (§10), sign the BPN, and try to die photogenically.

---

# PART ONE · THE ENGINE

## 1. The core roll

Everything is a **pool of d6**.

- **6 = a Success.**
- **1–5 = nothing** — on a normal die.
- On a **Stress die**, a **1 is a Bane** (§4).

Your pool = **Attribute + Skill + Gear Bonus + situational modifiers**. **One Success = you succeed.** Extra Successes buy extra effect — more damage, cleaner work, faster result. **Zero Successes = failure.**

The roll dialog offers the standard levers, all of which stack:

| Modifier | Dice |
|---|---|
| Situational (GM ruling, quick −3/−1/+1/+3 buttons) | ±X |
| Point blank range | +1 |
| Extreme range | −2 |
| Scope (at Long or Extreme range only) | +2 |
| AI assist | +2 |
| Burst fire | +1 (and +1 damage) |
| Full auto | +2 (and +2 damage) |
| AP ammunition | +1 |
| Conditions (§8) | penalties, always |
| Showing Off (§26) | **−1 per point, your choice** |

The pool never drops below **1d6** — the universe always gives you one die to hang yourself with.

### Rough odds (so you feel the dice)
Only 6s count, so pools run leaner than they look: 1 die ≈ 17% · 2 ≈ 31% · 3 ≈ 42% · 4 ≈ 52% · 5 ≈ 60% · 6 ≈ 67%. A trained Operative (attribute 3 + skill 2) succeeds a little over half the time. Gear, drugs, and fire modes exist because you will want them.

---

## 2. The four Attributes

Rated **1–5** (racial caps vary, §9). Base 2 for an unremarkable human.

| Attribute | Governs |
|---|---|
| **STRENGTH (STR)** | Muscle, endurance, melee power |
| **AGILITY (AGI)** | Speed, aim, stealth, reflexes |
| **WITS (WIT)** | Intellect, perception, craft, survival |
| **EMPATHY (EMP)** | Insight, persuasion, healing — and the **Ebb** |

---

## 3. The thirteen Skills

Each skill keys off one attribute; the pool is simply **Attribute + Skill**.

| Skill | Attribute | | Skill | Attribute |
|---|---|---|---|---|
| Force | STR | | Crafting | WIT |
| Melee | STR | | Observation | WIT |
| Stamina | STR | | Survival | WIT |
| Marksmanship | AGI | | Healing | EMP |
| Mobility | AGI | | Insight | EMP |
| Stealth | AGI | | Persuasion | EMP |
| | | | **Ebb** | EMP |

Skills cap at **3** at creation (§10); racial ability bonuses (§9a) add dice on top of the skill, not to it.

---

## 4. Stress — the dice that watch you back

**Stress** is a scalar from **0 to 10**. Every point adds **one Stress die** to every skill roll you make. Stress dice are rolled with your pool, in their own colour, and they cut both ways:

- A **6 on a Stress die is a full Success.** Fear sharpens.
- A **1 on a Stress die is a Bane.** Banes are tracked on the roll card. On a **pushed** roll, any Bane triggers consequences immediately (§5).

**Gaining Stress:** +1 every time you Push (§5); +1 on any failed Health or Resolve save (§6); panic results and Vevaphon instability inflict more; some drugs bill Stress in withdrawal.

**Shedding Stress:** rest (§27), the Ebb formula *Calm* (−1, §21), sedative-class drugs, and GM fiat for genuine downtime. Stress never drops below 0.

*(Design note: Stress is a throttle, not a death spiral — more dice now, worse failure modes later. A veteran at Stress 4 rolls a bigger pool than a rookie at Stress 0 and is one pushed 1 from a Panic check. That is the SLA Industries employee experience.)*

---

## 5. Pushing

After any skill roll you may **Push it once**: pick up every die that isn't a 6 and reroll it. Two exceptions lock in place:

- **6s stay** (obviously).
- **1s on Stress dice stay.** A Bane, once shown, is shown.

Pushing costs **+1 Stress, immediately** — and that new Stress point joins the reroll as an extra Stress die. The pushed result replaces the old one; successes from the first roll carry forward on the card.

**If the pushed roll shows any Stress Bane** (including locked ones):
- On an **attack that ended with 0 total Successes** → **Critical Failure**: roll 2d6 on the Ranged or Melee Critical Fail table (§18).
- Otherwise → **Panic check** (§7), right now.
- **Ranged weapons additionally run dry**: a Bane on a pushed ranged attack flags the weapon **OUT OF AMMO** until you rest (§27). The mag was lighter than you thought. It always is.

**Brain Wasters** (§9) push the Ebb the same way they push everything — recklessly. A Brain Waster pushing an Ebb roll risks the formula's **catastrophe** rider on a Bane.

---

## 6. Health & Resolve — the two ways down

No hit points. Two tracks, both derived, both rollable:

```
HEALTH  max = STR + AGI  + race/training + equipped gear + specialties + active drugs
RESOLVE max = WIT + EMP  + race/training + equipped gear + specialties + active drugs
```

The system recalculates both automatically whenever an attribute, item, drug state, or active effect changes. Damage reduces the current value; drugs and healing restore it (never above max).

### Saves
Click the stat to roll it: a **Health save** or **Resolve save** rolls your **current value** in plain d6 — no Stress dice, no dialog, conditions still penalise the pool. One 6 = you hold. **Zero Successes = failure and +1 Stress.** A pool reduced to 0 by conditions is an automatic failure (+1 Stress). Use them for feats of endurance and nerve: staying conscious, staying put, staying sane.

### Broken
At **0 Health or 0 Resolve** you are **Broken** (−2 dice to everything; must pass a Stamina roll to act) and you immediately roll a **d66 Critical Injury** — Physical if Health broke you, Mental if Resolve did (§18). The Broken condition clears automatically once you're healed above 0.

---

## 7. Panic

When a Panic check triggers (pushed Stress Bane, morph panic, GM call, or the sheet's Panic button), roll:

```
1d6 + current Stress
```

Drugs with panic reduction (Calm-Line −2, Bozerker −3, etc.) subtract from the total — but can never reduce a triggering roll below 7. **Total 6 or less: you hold it together.** Otherwise:

| Total | Result | Effect |
|---|---|---|
| 7 | **Nervous Twitch** | +1 Stress — and every ally in Short range gains +1 Stress as your tension spikes the squad |
| 8 | **Tremble** | Until end of scene: −2 dice to all AGI rolls (Marksmanship, Mobility, Stealth) |
| 9 | **Fumble/Jam** | GM picks one: drop a held item · weapon jams (1 Fast action to clear) · comms/camera mishandled (next related roll −2) |
| 10 | **Freeze** | Lose your next action. You may defend, but cannot Push again until you act |
| 11 | **Seek Cover** | Next action must move you to cover. Refuse: +1 Stress per round |
| 12 | **Outburst on Camera** | Scream on the feed. Lose next action; position revealed (enemies +2 dice to locate you) |
| 13 | **Flight Response** | Retreat at least 1 round or one zone. No Slow actions while retreating |
| 14 | **Operative Breakdown** | Choose: **BERSERK** (attack the nearest creature, friend or foe) or **CATATONIC** (incapacitated D6 rounds). Witnesses gain +1 Stress |
| 15+ | **Mind Fracture** | Roll a **Mental Critical Injury** immediately (§18) |

At total **10+** the **Panicking** condition is applied (−2 all dice); at **7–9**, **Shaken** (−1 all dice). Stat costs in the result (Stress, Health, Resolve) apply automatically.

---

## 8. Conditions — in one table

Conditions are status effects; their dice penalties apply to **every** roll path — skills, attacks, saves, initiative. Toggle them from the token HUD; several tick automatically each combat turn (and, since v1.7.6, outside combat too when time advances).

| Condition | Penalty | Notes |
|---|---|---|
| **Bleeding** | −1 HP per turn | cleared by any healing |
| **Stunned** | −3 all dice | clears end of turn |
| **Pinned** | −2 Melee/Marksmanship/Mobility | clear with a cover action |
| **Suppressed** | −2 all dice | clear by passing a Stamina roll |
| **On Fire** | 2+ HP per turn (escalates) · −1 all dice | action to extinguish |
| **Blinded** | −3 Marksmanship/Observation · −2 Melee | |
| **Deafened** | −1 Observation | no audio cues |
| **Broken** | −2 all dice | must roll Stamina to act; clears when healed above 0 |
| **Winded** | −1 all dice | clears end of round |
| **Broken Arm** | −2 Melee · −1 Marksmanship · −1 Force | arm unusable |
| **Broken Leg** | −2 Mobility · −1 Stealth | cannot run |
| **Concussed** | −1 all dice, extra −1 Observation/WIT rolls | |
| **Gut Wound** | −2 all dice | |
| **Panicking** | −2 all dice | cannot act normally |
| **Shaken** | −1 all dice | |

---

# PART TWO · OPERATIVES

## 9. The eight races

Attributes start at the racial base; spend **attribute points** (1:1, up to the racial cap), then **skill points** (1:1, cap 3). Every race auto-receives its racial abilities (§9a) the moment it's chosen.

| Race | Base STR/AGI/WIT/EMP | Attr pts | Caps | Skill pts | HP mod | RES mod | Notes |
|---|---|---|---|---|---|---|---|
| **Human** | 2/2/2/2 | 6 | 5/5/5/5 | 10 | — | — | the expendable backbone |
| **Ebon** | 2/2/3/3 | 4 | 4/4/5/5 | 10 | — | +1 | Ebb user |
| **Brain Waster** | 2/2/4/3 | 3 | 3/4/5/5 | 10 | — | — | Ebb user; catastrophic Pushes |
| **Stormer 313-S Malice** | 4/3/2/2 | 3 | 5/5/3/3 | 8 | +2 | — | vatgrown warform |
| **Shaktar** | 3/3/2/2 | 4 | 5/5/4/4 | 9 | +1 | — | honour-bound alien warrior |
| **Wraith Raider** | 2/4/2/2 | 4 | 4/5/5/4 | 10 | — | +1 | cold-world stalker |
| **Frother** | 4/2/2/2 | 4 | 5/4/4/3 | 8 | +1 | −1 | chemically dependent berserker |
| **Stormer Vevaphon** | 3/3/2/2 | 5 | 5/5/4/3 | 8 | +2 | −1 | polymorphic chassis (§12) |

### 9a. Racial abilities (auto-embedded)

| Race | Ability | Effect |
|---|---|---|
| Human | **Social Versatility** | +1 Persuasion, +1 Insight |
| Ebon | **Ebb Sensitive** + natural formulae | sense Ebons within ~10 m; Ebb access |
| Brain Waster | **Ebb Fury** + natural formulae | spend 1 Flux: +2 dice to a combat roll; pushing the Ebb risks catastrophe |
| Stormer | **Natural Weapons (Claws & Teeth)** | +1 die on all melee attacks; always counts as armed |
| Stormer | **Stormer Regeneration** | regain **1 HP per hour** of rest, automatically (not at 0 HP) |
| Shaktar | **Battle Claws** | +1 die on melee; always armed |
| Shaktar | **Warrior Caste Training** | +1 more die on melee **with a weapon** (stacks: +2 with claws out) |
| Wraith Raider | **Shaper Senses** | +2 Observation, +1 Stealth |
| Wraith Raider | **Wraith Teeth & Claw** | natural weapon: **DMG 2, AP 1, ROF 2**, always armed |
| Frother | **Blade Proficiency** | +2 dice on melee with bladed weapons |
| Frother | **Drug Dependency** | **−1 die to all rolls when no drug is active** |
| Vevaphon | **Brute / Stalker / Raptor Form + Morphic Strike** | see §12 |

Natural weapons roll like melee weapons (STR + Melee) with their listed DMG/AP/ROF, and never run dry.

---

## 10. Training packages

Pick one at creation. It sets your starting skills, one specialty, armour, and sidearms. (Skill points from §9 are spent after this baseline.)

| Package | Starting skills | Specialty | Armour · weapons |
|---|---|---|---|
| **Soldier** | Melee 2, Marksmanship 2, Stamina 1 | Hard Hitter | CAF Armor · pistol, rifle |
| **Scout** | Stealth 2, Mobility 2, Observation 1 | Fast Reflexes | Scout Armor · pistol, SMG |
| **Combat Medic** | Healing 2, Observation 2, Insight 1 | Field Surgeon | Downtown Jacket · pistol, Medical Kit |
| **Technical Operative** | Crafting 3, Observation 1, Survival 1 | Inquisitive | Downtown Jacket · pistol, Tool Kit |
| **Negotiator** | Persuasion 2, Insight 2, Observation 1 | Gut Feeling | Downtown Jacket · pistol, Encrypted Comms |
| **Hunter** | Marksmanship 2, Stealth 2, Observation 1 | Sniper | Scout Armor · rifle, pistol |
| **Brawler** | Force 2, Melee 2, Stamina 1 | True Grit | CAF Armor · power blade, pistol |
| **Ebb Channeller** *(Ebon / Brain Waster only)* | Ebb 3, Insight 1, Persuasion 1 | Ebb Sensitive | Downtown Jacket · pistol |

**Ebb Channeller starting formulae** are race-differentiated:
- **Ebon:** Empathic Pulse, Danger Sense, Mind-Link, Calm, Ebb Shield, Ebb Sight, Surge — the watcher's kit.
- **Brain Waster:** Ebb Bolt, Heat Touch, Surge, Push, Empathic Pulse, Ebb Shield, Iron Flesh — the arsonist's.

The **PC Creator** wizard in Foundry walks all of this: race → attribute points (racial pool and caps) → training (race-gated) → skill points → a race-keyed random name → confirm. Starting **SCL 10**, **500 credits**.

---

## 11. Specialties

The sixteen in the system pack (racial ones are granted, not bought):

| Specialty | Category | Effect |
|---|---|---|
| Sniper | combat | +2 Marksmanship at Long+ range from concealment |
| Fast Reflexes | combat | +2 Initiative |
| Hard Hitter | combat | +1 Melee damage (sacrifice your fast action) |
| Inquisitive | investigation | may Push WIT rolls twice |
| Gut Feeling | investigation | use EMP for Observation (threat detection) |
| Menacing | social | use STR for Persuasion (intimidation) |
| Compassion | social | may Push EMP rolls twice |
| Field Surgeon | medical | +1 Healing on critical injuries |
| Healer | medical | critical injuries heal in half the time |
| True Grit | survival | +1 maximum Health |
| Ebb Sensitive | ebb | sense Ebons within ~10 m |
| Ebb Fury | ebb | spend 1 Flux: +2 dice to a combat roll |
| Code of Honor | racial (Shaktar) | reroll all dice when upholding honour, 1/session |
| Cold Adapted | racial (Wraith) | ignore cold penalties; +1 Stealth in dim/dark |
| Regeneration | racial (Stormer) | heal 1 HP/hour automatically |
| Combat Drug User | racial (Frother) | Rush: +2 combat, −2 mental (addiction risk) |

---

## 12. The Vevaphon — morph forms & Instability

A Vevaphon carries an **Instability** track (0–12). **Every form shift costs 1 Instability** and triggers an immediate **instability check: 1d6 + current Instability** — at **7+**, consult the table below. Instability clears on rest (§27).

| Form | Bonuses | Restriction |
|---|---|---|
| **Base** | normal stats | — |
| **Brute** | +2 Health max, +1 Force, +1 Melee, knockdown immune | cannot be disguised |
| **Stalker** | +2 Stealth, +1 Mobility/Agility dice | cannot wear armour |
| **Raptor** | +2 Melee, +1 Marksmanship (close), crits +1 damage | — |
| **Morphic Strike** | natural weapon **DMG 2, AP 1, ROF 2** | always available, every form |

### The Instability table (1d6 + Instability, effects auto-applied)

| Roll | Result | Severity |
|---|---|---|
| 7 | Flicker | minor |
| 8 | Skin Crawl | minor |
| 9 | Drift | minor |
| 10 | Identity Slip | minor |
| 11 | Voice Shift | minor |
| 12 | Pain Spike (+1 Stress) | moderate |
| 13 | Limb Fault (−2 physical) | moderate |
| 14 | Form Bleed | moderate |
| 15 | Sensory Overload | moderate |
| 16 | Tissue Rejection (1 dmg, ignores armour) | moderate |
| 17 | Threat Lock | serious |
| 18 | Form Panic (morph bonuses collapse 1 round, +1 Stress) | serious |
| 19 | Memory Fracture | serious |
| 20 | Partial Collapse (1d3 dmg) | serious |
| 21 | Identity Bleed | serious |
| 22 | Uncontrolled Shift (+1 Instability) | serious |
| 23 | Trauma Response (Shaken) | serious |
| 24 | Permanent Scar | critical |
| 25 | Full Reversion (−1 Instability, revert to base) | critical |
| 26 | Psychic Scream | critical |
| 27 | Body Horror | critical |
| 28 | Cascade Shift (1d3 dmg, +1 Instability) | critical |
| 29 | Dissolution Risk | critical |
| 30 | Identity Death | catastrophic |
| 31 | Organ Shift (2 dmg/round) | catastrophic |
| 32 | Full System Failure | catastrophic |
| 33 | Catastrophic Cascade (1d6 dmg/round) | catastrophic |
| 34 | Biogenetic Detonation (2d6 self, 1d6 AoE) | catastrophic |
| 35 | Terminal Dissolution | lethal |
| **36+** | **Total Collapse — instant death** | lethal |

A separate **Morph Panic check** (1d6 + Instability, at high Instability) draws from a six-entry panic ladder on the sheet — the chassis, not the mind, deciding it has had enough.

*(Design note: 12 Instability + 1d6 tops out at 18 in ordinary play — the 20s and 30s exist for stacked penalties, Uncontrolled Shift chains, and GMs with a grudge. The table is a countdown, not a slot machine.)*

---

# PART THREE · COMBAT IN FULL

## 13. Initiative

Initiative is a **score**, not a raw roll:

```
Initiative = (Attribute + Skill) + Successes rolled on that pool + bonuses
```

Choose your mode when you roll:
- **AGI + Mobility** — move first, think later.
- **WIT + Observation** — see it coming.

Roll the pool (no Stress dice); each 6 adds +1. Then add: **Fast Reflexes +2**, any specialty with an initiative bonus, equipped gear (some armour is slow: Heavy Thresher −1, PP10 HARD −1), active effects, and drugs. Conditions penalise the pool. A silent d6 breaks ties. Highest acts first; the score persists on the actor and syncs to the combat tracker.

**NPC initiative** (one button on the NPC sheet): roll **max(5, AGI) + threat level** dice, count 6s — every mook gets at least 6d6, so nobody's ambush stalls the scene.

Per-turn condition ticks (Bleeding, On Fire escalation) fire automatically at turn change.

## 14. Attacks

- **Ranged: AGI + Marksmanship + Gear Bonus**
- **Melee: STR + Melee + Gear Bonus** (natural weapons included)

The attack dialog stacks its options into the pool (§1): range band, scope, AI assist, fire mode, ammo type, multi-shot, Showing Off. Damage on a hit = **weapon DMG + extra Successes spent on damage + mode/ammo damage bonuses**.

### Fire modes

| Mode | Dice | Damage | Rounds fired |
|---|---|---|---|
| Single | — | — | 1 (or shots chosen) |
| Burst | +1 | +1 | 3 minimum |
| Full auto | +2 | +2 | 8 (weapon's auto-use rating) |

Weapons list their capable modes; anything with *auto* can also fire burst and single. Multi-shot options (weapon ROF permitting) trade extra ammo for extra dice, each round billed.

### Ammo types

| Round | Effect | Price |
|---|---|---|
| Standard | — | book |
| **AP** | +1 die (drills armour — see also caliber AP bonuses) | ×3–4 |
| **HE** | +1 damage | steep |

## 15. Ammunition & the Bullet Tax

Every weapon has a **caliber**; every caliber has round types with a **cost per round** (10mm std 2c → 7.62 AP 12c → 40mm HE 80c/round). When you fire, the system deducts:

```
Bullet Tax = rounds fired × cost per round × 2
```

— double book price, because SLA logistics marks up everything it airdrops. The tax posts to chat and to your finance ledger (§25) as you shoot. Full auto at 8 rounds of 7.62 AP is **192c per trigger pull**. Budget accordingly, or carry a knife.

Running dry: pushing a ranged attack into a Stress Bane empties the weapon (§5) until you rest.

## 16. Armour & the armor check

When you take damage, your equipped armour rolls for you:

```
1. Effective armour dice = Armor Dice − attacker's AP  (min 0)
2. Damage after auto     = incoming − Auto Armor       (min 0)
3. Roll effective dice: each 6 cancels 1 damage
4. What remains comes off Health
```

| Armour | Rating | Dice | Auto | Init | Cost |
|---|---|---|---|---|---|
| Street Clothes | 0 | 0 | 0 | — | 20 |
| Downtown Jacket | 1 | 1 | 0 | — | 150 |
| Body Blocker | 1 | 1 | 0 | — | 120 |
| Shiver Flak Vest | 1 | 1 | 0 | — | 200 |
| CAF Armor | 2 | 2 | 1 | — | 400 |
| Full Shiver Armour | 2 | 2 | 0 | — | 450 |
| Crackshot Armour | 2 | 2 | 0 | — | 600 |
| Stealth Suit | 2 | 2 | 0 | — | 2,500 |
| Scout Armor | 3 | 3 | 1 | — | 700 |
| Shock Armour | 3 | 3 | 1 | — | 900 |
| HARD Armor | 4 | 4 | 2 | — | 1,200 |
| Ebb Deathsuit | 4 | 4 | 1 | — | 5,000 |
| Light Thresher Suit | 4 | 4 | 2 | — | 3,500 |
| PP10 HARD Armour | 5 | 4 | 2 | −1 | 2,800 |
| Exo-Rig Armor | 5 | 5 | 2 | — | 3,000 |
| DN Power Armour | 5 | 5 | 2 | — | 7,500 |
| Heavy Thresher Suit | 5 | 5 | 3 | −1 | 6,000 |
| Squad Shielded Power Armor | 6 | 6 | 3 | — | 8,000 |

## 17. Weapons

The armoury (compendium pack, 36 entries). DMG · AP · Range · ROF · Gear bonus · modes · cost. Highlights:

| Weapon | Type | DMG | AP | Range | ROF | Gear | Modes | Cost |
|---|---|---|---|---|---|---|---|---|
| FEN 401 Shiver Pistol | Pistol | 2 | 0 | Short | 2 | — | single | 280 |
| FEN 603 Auto Pistol | Pistol | 2 | 0 | Short | 3 | — | single/auto | 420 |
| FEN 204 Heavy Pistol | Pistol | 3 | 1 | Short | 2 | +1 | single | 650 |
| GA 50 Finisher | Pistol | 3 | 1 | Short | 1 | +1 | single | 700 |
| BLA 046M Blitzer | Revolver | 3 | 0 | Short | 1 | — | single | 350 |
| FEN 209 Machine Pistol | MP | 2 | 0 | Short | 4 | — | single/auto | 380 |
| CAF SMG | SMG | 2 | 0 | Short | 3 | — | single/auto | 500 |
| FEN AR Assault Rifle | Rifle | 3 | 1 | Long | 3 | — | s/b/a | 700 |
| FEN 701 Urban Carbine | Carbine | 3 | 1 | Long | 2 | — | single/burst | 850 |
| GA 9443 Mini-Browbeater | Rifle | 3 | 1 | Long | 2 | +1 | single/burst | 950 |
| GA 9442 Browbeater | Rifle | 4 | 2 | Extreme | 2 | +2 | single/burst | 1,400 |
| FEN 981 Sniper Rifle | Sniper | 5 | 2 | Extreme | 1 | +2 | single | 2,000 |
| KPS Combat Shotgun | Shotgun | 4 | 0 | Short | 1 | — | single | 550 |
| FEN 10 Street Sweeper | Shotgun | 4 | 0 | Short | 2 | — | single/burst | 900 |
| FEN Reaper LMG | LMG | 4 | 1 | Long | 4 | — | auto | 2,200 |
| FEN 706 Power Reaper | HW | 5 | 2 | Long | 3 | — | auto | 6,000 |
| FEN 30-30 Rail Cannon | Rail | 5 | 4 | Extreme | 1 | +2 | single | 4,000 |
| MILA Grenade Launcher | Launcher | 5 | 1 | Long | 1 | — | single | 1,800 |
| Frag Grenade | Grenade | 3 | 0 | Short | 1 | — | single | 80 |
| Stun Grenade | Grenade | 0 | 0 | Short | 1 | — | single | 60 |
| MAC Knife | Knife | 2 | 1 | Engaged | 2 | — | — | 120 |
| Pacifier Baton | Baton | 2 | 0 | Engaged | 2 | — | — | 90 |
| SLA Blade | Blade | 3 | 1 | Engaged | 2 | — | — | 280 |
| Vibro Sabre | Blade | 3 | 3 | Engaged | 2 | — | — | 900 |
| Ebb Sword | Blade | 3 | 2 | Engaged | 2 | +1 | — | 1,200 |
| ITB Mutilator Sword | Blade | 4 | 2 | Engaged | 1 | +1 | — | 850 |
| Power Claymore | Blade | 4 | 2 | Engaged | 1 | — | — | 700 |
| Chainaxe | Axe | 3 | 1 | Engaged | 2 | — | — | 460 |
| Chainsaw (improvised) | — | 4 | 0 | Engaged | 1 | — | — | 120 |
| Gash Fist | Natural | 3 | 1 | Engaged | 2 | — | — | 180 |
| Riot Shield | Shield | 2 | 0 | Engaged | 1 | — | — | 300 |
| Stormer Claws / Teeth / Chuckleduster | Natural | 3–4 | 0–1 | Engaged | 1–2 | — | — | 0–200 |
| Shaktar / Vevaphon Claws | Natural | 2 | 1 | Engaged | 2 | — | — | — |

## 18. Critical injuries & critical failures

**When Health breaks you:** roll **d66** on the Physical Critical table. **When Resolve breaks you** (or Mind Fracture, §7): **d66** on the Mental Critical table. The injury is logged on your sheet with effects, healing time, and — for lethal entries — a **time limit** (make your Stamina rolls or die; *Instant* means exactly that, e.g. mental 66, "Heart stops").

Rolling a crit also auto-applies its matching condition — the tables trend from **Winded/Shaken** in the 1x rows through **Bleeding, Broken Arm/Leg, Concussed, Gut Wound** in the middle rows to **Stunned** and the unconditioned lethal 6x rows. Representative entries:

| Roll | Physical | Mental |
|---|---|---|
| 11 | Winded (+1 round of −1 dice) | Shaken (+1 Stress, −1 dice 1 round) |
| 21 | Winded | Anxiety spiral (+1 Stress/shift until safe rest) |
| 31 | Broken Leg | Rage trigger (Resolve check or retaliate) |
| 41 | Bleeding + Suppressed | Major breakdown (Broken D6 rounds) |
| 51 | Bleeding | Permanent phobia (therapy only) |
| 61+ | **lethal territory** | **Heart seizure → Heart stops (66: instant death)** |

**Critical failures** (pushed attack, 0 Successes, Stress Bane — §5): draw 2d6 on the **Ranged** or **Melee Weapon Critical Fail** rolltable. Jams, drops, friendly fire — the camera loves it.

---

# PART FOUR · THE EBB

## 19. Flux

Ebb users (Ebon, Brain Waster) power formulae with **Flux**: **max = Ebb skill + 1**. Casting spends the formula's Flux cost. Recover **1 Flux on a stretch rest**, **all Flux on a shift rest** (§27).

## 20. Casting

Roll **EMP + Ebb** (Stress dice apply — the Ebb *feeds* on nerves). You need the formula's **Success threshold**; extra successes scale effects that say so. Fail and nothing happens — the Flux is still spent. Push it and you're gambling with the thing behind reality: any Stress Bane on a pushed Ebb roll triggers Panic as usual, and **Brain Wasters** additionally suffer the formula's **catastrophe** rider.

## 21. The thirty formulae

By discipline — *(Flux cost · successes needed · range · duration)*:

**AWARENESS**
- **Empathic Pulse** (1 · 1 · Short · instant) — sense the dominant emotion of every living being in range; 2+ successes identifies individuals.
- **Danger Sense** (2 · 1 · self · 1 shift) — cannot be surprised; +2 dice to Initiative.
- **Precognition** (2 · 2 · self · instant) — ask the GM one yes/no question about the next stretch.

**BLAST**
- **Ebb Bolt** (1 · 1 · Short · instant) — one target takes successes damage; armour applies; counts as a ranged attack.
- **Hellfire** (2 · 2 · Medium · instant) — successes + 2 damage; 3+ successes knocks the target down.
- **Ebb Storm** (3 · 2 · Short · instant) — detonation: all targets in range take successes damage.

**COMMUNICATE**
- **Mind-Link** (1 · 1 · Short · 1 scene) — silent two-way channel with a willing mind.
- **Broadcast** (2 · 1 · Long · instant) — push one message/image/emotion to everything alive in range.
- **Compel** (2 · 3 · Short · 1 round) — force one simple action (flee, drop, kneel); WIT resists.

**ENHANCE**
- **Surge** (1 · 1 · self · 1 stretch) — +2 dice to all rolls with one chosen attribute.
- **Iron Flesh** (2 · 2 · self · 1 stretch) — 2 automatic armour, stacking with worn plate.
- **Heightened State** (3 · 2 · self · 1 stretch) — +1 die to everything; all incoming damage −1.

**HEAL**
- **Mend** (1 · 1 · engaged · instant) — restore successes Health (max 2).
- **Restore** (2 · 2 · engaged · instant) — restore successes + 1; 3+ successes also clears a critical injury.
- **Calm** (1 · 1 · Short · instant) — target sheds 1 Stress; lifts Stress-Broken.

**PROTECT**
- **Ebb Shield** (1 · 1 · self · 1 round) — roll 2d6 vs the next attack; each 6 stops 1 damage.
- **Ward** (2 · 2 · Short · 1 stretch) — grant a target 1 automatic armour.
- **Phase Shell** (3 · 3 · self · 1 round) — all physical damage −3; Ebb attacks ignore it.

**REALITY FOLD**
- **Blink** (2 · 2 · Short · instant) — teleport to any visible point in range.
- **Fold Space** (3 · 3 · Long · 1 round) — two points become adjacent for a round.
- **Phase Through** (3 · 2 · engaged · instant) — pass through one non-living barrier.

**SENSES**
- **Ebb Sight** (1 · 1 · Long · 1 stretch) — see Ebb energy, active formulae, Ebb users.
- **Mind's Eye** (1 · 1 · self · 1 stretch) — +3 Observation; cannot be ambushed.
- **Remote View** (2 · 2 · Long · 1 stretch) — project senses to any visited place in range.

**TELEKINESIS**
- **Push** (1 · 1 · Short · instant) — hurl a target 3 m per success; counts as a ranged attack.
- **Grip** (2 · 2 · Short · 1 round) — hold a target immobile; they may act but not move.
- **Levitate** (2 · 1 · self · 1 stretch) — float freely at normal speed.

**THERMAL**
- **Heat Touch** (1 · 1 · engaged · instant) — successes + 1 damage; 3+ sets the target On Fire.
- **Flame Burst** (2 · 1 · Short · instant) — successes + 2 damage; 3+ ignites.
- **Freeze** (2 · 2 · Short · 1 round) — 1 damage and −2 dice on all AGI rolls.

---

# PART FIVE · DRUGS & GEAR

## 22. Drugs

Drugs are equipment items with an **active** phase and a **withdrawal** phase; activating one bills your account and (v1.7.5+) applies any instant **heal** immediately. Modifiers apply while active; when the duration lapses, the withdrawal set takes over until you clear it with rest. **Frothers must keep one active or take −1 to everything** (§9a).

| Drug | Active | Withdrawal | Duration | Cost |
|---|---|---|---|---|
| Painkillers | +1 RES | −1 RES | 1 shift | 30 |
| Stimulant | +1 RES, +1 STR | −1 RES | 1 shift | 40 |
| Sedative | +2 RES, −1 all skills | −1 RES | stretch–shift | 35 |
| Calm-Line | +2 RES, panic −2 | −1 RES | 1 shift | 65 |
| Flip | +1 RES, panic −1 | — | 1 shift | 25 |
| Bubbles | +1 RES, panic −1 | — | 1 shift | 18 |
| Slosh | +2 RES, −1 all skills, panic −2 | — | 1 shift | 15 |
| Honesty | −1 RES, panic −1 | — | 1 scene | 70 |
| Rush | +1 HP, −1 RES, +1 STR | −1 RES | 1 scene | 85 |
| Drum | +1 HP, −1 RES, +1 STR | — | 1 scene | 90 |
| Redline | +1 HP, −2 RES, +2 STR | −1 HP | 1 scene | 110 |
| Shatter | −2 RES, +2 STR | — | 1 scene | 120 |
| Push | +2 HP | — | 1 scene | 140 |
| Blaze UV | +2 HP, −4 RES, +3 STR | −2 RES | 1 scene | 180 |
| UV (Ultra-Violence) | +2 HP, −3 RES, +2 STR | −1 HP, −2 RES | 1 scene | 200 |
| Bozerker | +3 HP, −3 RES, +3 STR, panic −3 | −2 HP, −3 RES | 1 scene | 220 |
| **KickStart** | **heals 2 HP instantly** | — | immediate | 25 |
| **KickStart Solo** | heals 2 HP (auto-injector, one hand) | — | immediate | 40 |
| **KickStart Plus** | heals 3 HP, −1 RES | — | 1 scene | 50 |

*(HP/RES modifiers move your maximum and current together; drug-boosted Health evaporates when the dose does. Drug dice modifiers also feed initiative and skill rolls while active.)*

## 23. Equipment

BOOPA Medical Kit (80) · Stim Patch (35) · Bandage Pack (15, stops Bleeding) · Cutting Charge (120) · Klippo Multi-Band Communicator (200) · Disposable Camera Drone (180) · Field Tool Kit (150) · Encrypted Comms Unit (80) · UV/Multi-Spectrum Torch (60) · Oyster Card — ITB access (50) · Heavy-Duty Duct Tape (5, fixes most things, briefly).

---

# PART SIX · LIFE ON MORT

## 24. Credits, SCL & the ledger

You start with **500 credits** and **SCL 10** (Security Clearance Level — lower is better; you'll be at 10 a while). The sheet keeps a full **finance ledger**: income (salary, BPN rewards, other), expenses (accommodation, drugs, subscriptions, the Bullet Tax, other), debt, and a running credit log. Squad payouts arrive via the GM's **Credit Distribution** tool; every trigger pull leaves via §15.

## 25. The LAD account

**50 credits a week** buys Life After Death cover — SLA's clone-and-resurrection insurance line. It appears in your weekly expenses like rent, because on Mort, death is a subscription tier. No LAD, no respawn: negotiate your next character with the GM.

## 26. Showing Off

The cameras pay for all of this, and the cameras are bored of competence. On any roll, before you throw, hit **SHOWING OFF** — each press removes **one die from your own pool** (never below 1d6) and adds one to your **career Showing Off tally**, announced to the whole table with an ascending fanfare. It buys nothing mechanical. It buys *audience*.

At **20 career points** the system posts a public warning: *GM — time to make them pay for it.* Sponsorships, stalkers, imitators, a rival with a grudge and a film crew. Fame on Mort is a loaded gun and you have been posing with it.

*(Design note: this is the VANITY impulse wearing SLA's brand — but here ego spends your dice up front, publicly, and the payoff is fictional positioning. The tally exists so the GM never has to remember who's been playing to the cameras. The system remembers.)*

## 27. Rest & recovery

The sheet's **REST** button is downtime, mechanised:
- clears all **OUT OF AMMO** weapon lockouts (§5);
- clears a stale **Broken** flag once you're above 0 HP;
- zeroes Vevaphon **Instability** (§12).

By clock: **stretch rest** = 1 Flux; **shift rest** = full Flux; **Stormer Regeneration** returns 1 HP per hour of world-time automatically. Stress recovery is a GM call plus drugs/Calm; drug withdrawal ends with proper rest. The **Shift Ledger** (§29) advances the campaign day in shifts and bills your housing tier weekly — recovery costs rent.

## 28. BPNs

Work arrives as a **Blueprint News** file: code, colour, reward, objectives. Colours set the flavour of the trouble: **Blue** (civic/security), **Green** (investigation), **Red** (hostile suppression), **Silver** (corporate/escort), **Gold** (high-value, high-oversight), **Black** (deniable). The sheet tracks your active BPN — code, type, status, reward, objectives — and the GM's **BPN Tracker** window and the **Blueprint News** module (§30) generate and manage the paperwork. Finish the job, file the debrief, collect the reward, pay the Bullet Tax out of it. Welcome to employment.

---

# PART SEVEN · RUNNING THE GAME

## 29. NPCs

NPCs run on a flat statline: attributes, a few skills, HP, flat armour, threat 1–5. The ten archetypes:

| Archetype | Threat | HP | Armor | Signature |
|---|---|---|---|---|
| Civilian | 1 | 4 | 0 | Observation 1 |
| Gang Grunt | 1 | 5 | 1 | Melee 2, pistol & knife |
| Shiver (Patrol) | 2 | 6 | 2 | Marksmanship 2, baton |
| SLA Operative (Green) | 2 | 5 | 2 | Marksmanship 2 |
| Carrien | 2 | 7 | 1 | Melee 3, claws, fast |
| SLA Operative (Veteran) | 3 | 8 | 3 | Marks 3 / Melee 2 / Stealth 2 |
| Ebb Operative (Ebon) | 3 | 6 | 1 | Ebb 3, Flux 4 |
| Dept. of Propaganda Agent | 3 | 6 | 2 | Persuasion 3, Insight 3 |
| Dark Finder | 4 | 10 | 4 | Marks 4 / Melee 3 / Stealth 3 |
| Manchine | 5 | 14 | 5 | Melee 4, heavy weapon |

**NPC Creator:** Quick mode (pick an archetype, done) or Full mode (manual). **NPC initiative:** max(5, AGI) + threat dice, count 6s (§13).

**Group NPC Generator:** stamps whole opposition groups — **Street Gang, Carrion, Serial Killer, Monstaret, Machine** — with randomised names, stats, weapons, armour and abilities embedded on each actor, filed into folders with SLA art. The **threat slider (1–10)** scales the whole batch: each step adds AGI/STR/WIT, HP percentage, armour and damage from a per-level bonus table, from *baseline* mooks to elite murder. Set the slider to the fight you want to run, not the fight you want to prep.

## 30. GM tools & the module suite

Built into the system (GM scene controls):
- **PC Status Board** — draggable live window of every PC's HP, Resolve, Stress and conditions; also whispered to the GM hourly.
- **Credit Distribution** — pay the squad, evenly or itemised, straight to their ledgers.
- **Shift Ledger** — campaign clock in day/shifts; duty schedules; housing tiers with weekly living costs auto-billed.
- **NPC Threat Board** — track morale, suppression, stance and intent per combatant.
- **BPN Tracker** — the active mission board.
- **Condition Applicator** — bulk-apply/clear §8 conditions across tokens.
- **GM Finance Ledger** — the whole party's money in one audited view.

Companion modules (all installed alongside the system):

| Module | What it does |
|---|---|
| **sla-blueprint-news-zero** | BPN briefing packages (player Brief + GM Dossier journals, procedural art) that also **spawn statted Zero Engine NPCs** — weapons, HP, armour, initiative included |
| **sla-bpn-dispatch** | quick random BPNs with mission-colour logic and GM debrief journals |
| **sla-briefing-desk** | compose bespoke mission briefings and handouts |
| **sla-gear-cache** | generate ammo caches, med packs, breach kits, requisition bundles onto an actor |
| **sla-npc-director** | NPC morale/suppression/stance tracking from the combat tracker |
| **sla-ops-clock** | mission tempo: operation clock, heat, collateral, pressure — with player-facing updates |
| **sla-shift-ledger** | the campaign time/housing/living-cost tracker, standalone |
| **npc-portrait-pack** | 490 species-matched NPC portraits, auto-assigned |

## 31. Your first session, in order ⟐ *(GM checklist)*

1. Create a world on the **Zero Engine (SLA Industries)** system; enable the modules above (plus Dice So Nice for the SLA Borg dice skin).
2. Players: **New SLA Operative** button in the Actor Directory → the creation wizard (§10). One Ebb user maximum per squad is a good habit.
3. Set each PC's **Player Character** flag so the status board and hourly reports see them.
4. GM: open **Blueprint News** or **BPN Dispatch**, generate a Blue or Green BPN, hand out the Brief, keep the Dossier.
5. Build the opposition with the **Group NPC Generator** — threat slider 2–3 for a first fight.
6. Run it: initiative from the sheets, attacks from the weapons, armour checks on damage, the system does the arithmetic — Bullet Tax included.
7. Afterward: **Credit Distribution** for the reward, **Shift Ledger** to advance time and bill rent, REST buttons all round, and whatever the Showing Off tallies now demand.

---

*Draft One. Written from the code, for the table. Where play disagrees with this document, check the dice engine — then fix whichever one is wrong.*
