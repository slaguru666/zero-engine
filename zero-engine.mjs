// Zero Engine System
console.log('Zero Engine | Loading System');

const ZERO_ENGINE_CORE_COMBAT = {
  combatClass: CONFIG?.Combat?.documentClass ?? null,
  combatantClass: CONFIG?.Combatant?.documentClass ?? null,
  combatTrackerClass: CONFIG?.ui?.combat ?? null,
  captured: false
};

function restoreZeroEngineCoreCombatConfig() {
  const { combatClass, combatantClass, combatTrackerClass } = ZERO_ENGINE_CORE_COMBAT;
  if (combatClass) CONFIG.Combat.documentClass = combatClass;
  if (combatantClass) CONFIG.Combatant.documentClass = combatantClass;
  if (combatTrackerClass) CONFIG.ui.combat = combatTrackerClass;
}

function ensureCombatantCompatibilityMethods() {
  const applyCompat = (proto) => {
    if (!proto) return;
    if (typeof proto.getSpeedFromActor !== "function") {
      proto.getSpeedFromActor = function() { return 1; };
    }
    if (typeof proto.getColor !== "function") {
      proto.getColor = function() { return "#efefef"; };
    }
  };

  applyCompat(CONFIG?.Combatant?.documentClass?.prototype);
  applyCompat(globalThis.Combatant?.prototype);
  applyCompat(foundry?.documents?.Combatant?.prototype);
}

/**
 * Year Zero Engine Dice Dialog
 * Allows modifying dice pool before rolling
 */
class YZEDiceDialog extends Dialog {
  constructor(baseDice, label, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.baseDice = baseDice;
    this.label = label;
  }

  static async show(baseDice, label, formula = '', options = {}) {
    return new Promise((resolve) => {
      const normalizedFireModes = Array.isArray(options.fireModes)
        ? options.fireModes
        : (typeof options.fireModes === "string"
          ? options.fireModes.split(",").map(s => s.trim()).filter(Boolean)
          : []);
      const showFireMode = normalizedFireModes.length > 0;
      const showAmmoType = Array.isArray(options.ammoTypes) && options.ammoTypes.length > 0;
      const defaultFireMode = options.defaultFireMode || (showFireMode ? normalizedFireModes[0] : "single");
      const defaultAmmoType = options.defaultAmmoType || (showAmmoType ? options.ammoTypes[0] : "standard");
      const modeBonusMap = options.modeBonusMap || {};
      const ammoBonusMap = options.ammoBonusMap || {};
      const showAttackMods = !!options.showAttackMods;
      // Multi-shot options (passed from _onWeaponRoll)
      const shotOptions = Array.isArray(options.shotOptions) ? options.shotOptions : [];
      const showShotSelector = shotOptions.length > 1;
      const dialog = new Dialog({
        title: `Roll ${label}`,
        content: `
          <div class="yze-roll-dialog">
            ${formula ? `<div class="form-group">
              <label>Formula:</label>
              <div style="font-size: 16px; text-align: center; color: #ccc; margin: 5px 0; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
                ${formula}
              </div>
            </div>` : ''}
            <div class="form-group">
              <label>Base Dice Pool:</label>
              <div style="font-size: 24px; font-weight: bold; color: #ff6600; text-align: center; margin: 10px 0;">
                ${baseDice}d6
              </div>
            </div>
            <div class="form-group">
              <label>Modify Dice Pool:</label>
              <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <button type="button" class="modify-dice" data-modifier="-3" style="width: 40px;">-3</button>
                <button type="button" class="modify-dice" data-modifier="-1" style="width: 40px;">-1</button>
                <input type="number" name="modifier" value="0" style="width: 60px; text-align: center;" />
                <button type="button" class="modify-dice" data-modifier="1" style="width: 40px;">+1</button>
                <button type="button" class="modify-dice" data-modifier="3" style="width: 40px;">+3</button>
              </div>
            </div>
            <div class="form-group">
              <label>Total Dice:</label>
              <div id="total-dice" style="font-size: 32px; font-weight: bold; text-align: center; color: #00d4ff; margin: 10px 0;">
                ${baseDice}d6
              </div>
            </div>
            ${showShotSelector ? `
            <div class="form-group" style="background:rgba(204,17,17,0.08);border:1px solid rgba(204,17,17,0.25);border-radius:4px;padding:6px 8px;">
              <label style="color:#cc6655;font-weight:bold;">⚡ Shots Fired:</label>
              <select name="shotCount" style="width:100%;">
                ${shotOptions.map((opt, i) => `<option value="${i}">${opt.label} — ${opt.shots > 1 ? opt.shots + '× ammo + ' + opt.shots + '× bullet tax' : '1× ammo'}</option>`).join('')}
              </select>
            </div>
            ` : ''}
            ${showFireMode ? `
            <div class="form-group">
              <label>Fire Mode:</label>
              <select name="fireMode">
                ${normalizedFireModes.map(mode => `<option value="${mode}" ${mode === defaultFireMode ? "selected" : ""}>${mode}</option>`).join('')}
              </select>
            </div>
            ` : ''}
            ${showAmmoType ? `
            <div class="form-group">
              <label>Ammo Type:</label>
              <select name="ammoType">
                ${options.ammoTypes.map(type => `<option value="${type}" ${type === defaultAmmoType ? "selected" : ""}>${type}</option>`).join('')}
              </select>
            </div>
            ` : ''}
            ${showAttackMods ? `
            <div class="form-group">
              <label>Range:</label>
              <select name="rangeBand">
                <option value="point_blank">Point Blank (+1)</option>
                <option value="normal" selected>Normal (0)</option>
                <option value="long">Long (0)</option>
                <option value="extreme">Extreme (-2)</option>
              </select>
            </div>
            <div class="form-group">
              <label><input type="checkbox" name="useScope"/> Scope (+2 at Long/Extreme)</label>
            </div>
            <div class="form-group">
              <label><input type="checkbox" name="useAI"/> AI Assist (+2)</label>
            </div>
            ` : ''}
          </div>
        `,
        buttons: {
          roll: {
            icon: '<i class="fas fa-dice-d6"></i>',
            label: "Roll",
            callback: (html) => {
              const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
              const fireMode = html.find('[name="fireMode"]').val() || defaultFireMode;
              const ammoType = html.find('[name="ammoType"]').val() || defaultAmmoType;
              const rangeBand = html.find('[name="rangeBand"]').val() || "normal";
              const useScope = html.find('[name="useScope"]').is(':checked');
              const useAI = html.find('[name="useAI"]').is(':checked');
              const modeBonus = parseInt(modeBonusMap[fireMode]) || 0;
              const ammoBonus = parseInt(ammoBonusMap[ammoType]) || 0;
              const rangeBonus = rangeBand === "point_blank" ? 1 : (rangeBand === "extreme" ? -2 : 0);
              const scopeBonus = (useScope && (rangeBand === "long" || rangeBand === "extreme")) ? 2 : 0;
              const aiBonus = useAI ? 2 : 0;
              // Multi-shot bonus from shot selector
              const shotIdx = parseInt(html.find('[name="shotCount"]').val()) || 0;
              const chosenShot = shotOptions[shotIdx] || shotOptions[0] || { shots: 1, diceBonus: 0 };
              const shotDiceBonus = chosenShot.diceBonus || 0;
              const shotsChosen  = chosenShot.shots || 1;
              const totalDice = Math.max(0, baseDice + modifier + modeBonus + ammoBonus + rangeBonus + scopeBonus + aiBonus + shotDiceBonus);
              if (options.returnDetails) {
                resolve({ totalDice, fireMode, ammoType, modifier, rangeBand, useScope, useAI, rangeBonus, scopeBonus, aiBonus, shotsChosen, shotDiceBonus });
              } else {
                resolve(totalDice);
              }
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "roll",
        render: (html) => {
          const modifierInput = html.find('[name="modifier"]');
          const totalDisplay = html.find('#total-dice');

          // Update total when input changes
          const updateTotal = () => {
            const modifier = parseInt(modifierInput.val()) || 0;
            const fireMode = html.find('[name="fireMode"]').val() || defaultFireMode;
            const ammoType = html.find('[name="ammoType"]').val() || defaultAmmoType;
            const rangeBand = html.find('[name="rangeBand"]').val() || "normal";
            const useScope = html.find('[name="useScope"]').is(':checked');
            const useAI = html.find('[name="useAI"]').is(':checked');
            const modeBonus = parseInt(modeBonusMap[fireMode]) || 0;
            const ammoBonus = parseInt(ammoBonusMap[ammoType]) || 0;
            const rangeBonus = rangeBand === "point_blank" ? 1 : (rangeBand === "extreme" ? -2 : 0);
            const scopeBonus = (useScope && (rangeBand === "long" || rangeBand === "extreme")) ? 2 : 0;
            const aiBonus = useAI ? 2 : 0;
            const total = Math.max(0, baseDice + modifier + modeBonus + ammoBonus + rangeBonus + scopeBonus + aiBonus);
            totalDisplay.text(`${total}d6`);
          };

          modifierInput.on('input', updateTotal);
          html.find('[name="fireMode"]').on('change', updateTotal);
          html.find('[name="ammoType"]').on('change', updateTotal);
          html.find('[name="rangeBand"]').on('change', updateTotal);
          html.find('[name="useScope"]').on('change', updateTotal);
          html.find('[name="useAI"]').on('change', updateTotal);

          // Handle modifier buttons
          html.find('.modify-dice').on('click', (event) => {
            const modifier = parseInt(event.currentTarget.dataset.modifier);
            const currentValue = parseInt(modifierInput.val()) || 0;
            modifierInput.val(currentValue + modifier);
            updateTotal();
          });
        }
      }, {
        width: 400,
        classes: ["zero-engine", "dialog"]
      });

      dialog.render(true);
    });
  }
}

/**
 * Zero Engine Item Sheet
 */
class ZeroEngineItemSheet extends foundry.appv1.sheets.ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["zero-engine", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: []
    });
  }

  /** @override */
  get template() {
    return `systems/zero-engine/templates/item/item-sheet.hbs`;
  }

  /** @override */
  getData() {
    const context = super.getData();
    const itemData = this.item.toObject(false);
    context.system = itemData.system;
    context.flags = itemData.flags;
    context.editable = this.isEditable;
    return context;
  }
}

/**
 * Zero Engine Actor Sheet
 */
class ZeroEngineActorSheet extends foundry.appv1.sheets.ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["zero-engine", "sheet", "actor"],
      width: 1020,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }]
    });
  }

  /** @override */
  get template() {
    if (this.actor.type === "character") {
      return `systems/zero-engine/templates/actor/character-sheet.hbs`;
    }
    return `systems/zero-engine/templates/actor/${this.actor.type}-sheet.hbs`;
  }

  /** @override */
  getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);
    // Use the live prepared system data so that programmatic updates (e.g. stress
    // increments from a push roll) are reflected immediately on re-render.
    // toObject(false) returns persisted source data which can lag behind actor.system
    // in Foundry v14's optimistic-update model.
    context.system = this.actor.system;
    context.flags = actorData.flags;

    // Add rollData for convenience
    context.rollData = context.actor.getRollData();

    // Gather owned specialty items for drag-and-drop display
    context.specialties = this.actor.items.filter(i => i.type === "specialty").map(i => i.toObject(false));

    // Gather owned weapon items, split by category
    // A weapon is melee if: category === "melee" OR range is "Engaged" (YZE melee range indicator)
    const weapons = this.actor.items.filter(i => i.type === "weapon").map(i => i.toObject(false));
    const isMeleeWeapon = w => w.system.category === "melee" ||
      String(w.system.range ?? "").toLowerCase() === "engaged";
    context.meleeWeapons = weapons.filter(w => isMeleeWeapon(w));
    context.rangedWeapons = weapons.filter(w => !isMeleeWeapon(w));
    context.armors = this.actor.items.filter(i => i.type === "armor").map(i => i.toObject(false));
    // Expose equipped armor name for header display
    context.equippedArmorName = context.armors[0]?.name || null;

    // Finances summary (used by both Mk1 and Mk2 sheets)
    if (!this.actor.system.finances) {
      context.weeklyIncome = 0; context.weeklyExpenses = 0; context.weeklyNet = 0;
      context.weeklyNetSign = '+'; context.weeklyNetColor = '#44cc66';
    } else {
      const _inc = this.actor.system.finances?.income  || {};
      const _exp = this.actor.system.finances?.expenses || {};
      context.weeklyIncome   = (_inc.salary||0) + (_inc.bpnReward||0) + (_inc.other||0);
      context.weeklyExpenses = (_exp.accommodation||0) + (_exp.drugs||0) + (_exp.subscriptions||0) + (_exp.other||0);
      context.weeklyNet      = context.weeklyIncome - context.weeklyExpenses;
      context.weeklyNetSign  = context.weeklyNet >= 0 ? '+' : '';
      context.weeklyNetColor = context.weeklyNet >= 0 ? '#44cc66' : '#cc1111';
    }
    context.gearItems = this.actor.items
      .filter(i => i.type === "equipment" && i.system?.isDrug !== true)
      .map(i => i.toObject(false));
    context.drugs = this.actor.items
      .filter(i => i.type === "equipment" && i.system?.isDrug === true)
      .map(i => i.toObject(false));
    context.drugAlerts = this._buildDrugAlerts(this.actor);

    // EBB user detection — Ebon and Brain Waster are ebb users
    const raceRaw = this.actor.system.race;
    const race = String(Array.isArray(raceRaw) ? (raceRaw[0] || "") : (raceRaw || "")).toLowerCase();
    // Flat string versions for dropdown selected-state matching in templates
    context.raceStr = race;
    const trainingRaw = this.actor.system.training;
    context.trainingStr = String(Array.isArray(trainingRaw) ? (trainingRaw[0] || "") : (trainingRaw || "")).toLowerCase();
    context.isEbbUser = (race === "ebon" || race === "brainwaster");
    context.isBrainWaster = (race === "brainwaster");
    context.isVevaphon = (race === "vevaphon");
    if (context.isVevaphon) {
      const instab = Number(context.system.vevaphon?.instability ?? 0);
      context.instabilityPips = Array.from({ length: 12 }, (_, i) => ({
        filled: i < instab,
        danger: i >= 9
      }));
    }
    context.ebbFormulae = this.actor.items.filter(i => i.type === "ebb").map(i => i.toObject(false));
    // Expose archetype label for Mk2 sheet header
    context.archetype = this.actor.system.archetype || (this.actor.system.training?.[0] ?? "");
    // Flux max = Empathy attribute value (core YZE rule: ebb pool scales with Empathy)
    // Flux max = Ebb skill + 1 for Ebb users. Fall back to stored flux.max, then Empathy.
    const _ebbSkillForFlux = parseInt(this.actor.system.skills?.ebb?.value) || 0;
    const _storedFluxMax   = parseInt(this.actor.system.flux?.max) || 0;
    context.computedFluxMax = _ebbSkillForFlux > 0
      ? _ebbSkillForFlux + 1
      : (_storedFluxMax > 0 ? _storedFluxMax : (parseInt(this.actor.system.attributes?.empathy?.value) || 2));

    // Add config object for template
    context.config = {
      natures: {
        "human": "Human",
        "replicant": "Replicant"
      },
      archetypes: {
        "operative": "Operative",
        "investigator": "Investigator",
        "scout": "Scout",
        "medic": "Medic",
        "tech": "Tech"
      },
      Icons: {
        tabs: {
          stats: '<i class="fas fa-chart-bar"></i>',
          mods: '<i class="fas fa-cog"></i>',
          combat: '<i class="fas fa-fist-raised"></i>',
          inventory: '<i class="fas fa-briefcase"></i>',
          bio: '<i class="fas fa-user"></i>'
        }
      }
    };

    context.stressMax = 10;

    // Active SLA conditions for display on sheet
    const SLA_COND_LABELS = {
      'sla-bleeding':  { label: 'Bleeding',    description: 'Lose 1 HP per round', icon: 'fas fa-tint' },
      'sla-stunned':   { label: 'Stunned',     description: '-3 dice all rolls', icon: 'fas fa-dizzy' },
      'sla-pinned':    { label: 'Pinned',      description: '-2 dice attacks/mobility', icon: 'fas fa-anchor' },
      'sla-suppressed':{ label: 'Suppressed',  description: '-2 dice all actions', icon: 'fas fa-shield-alt' },
      'sla-on-fire':   { label: 'On Fire',     description: 'HP drain per turn, escalating', icon: 'fas fa-fire' },
      'sla-exhausted': { label: 'Exhausted',   description: '-2 dice all actions', icon: 'fas fa-bed' },
      'sla-broken':    { label: 'Broken',      description: 'HP at 0 — critical state', icon: 'fas fa-heart-broken' },
      'sla-winded':    { label: 'Winded',      description: '-1 die all rolls this round', icon: 'fas fa-wind' },
      'sla-broken-arm':{ label: 'Broken Arm',  description: '-2 Melee, -1 Marks/Force', icon: 'fas fa-bone' },
      'sla-broken-leg':{ label: 'Broken Leg',  description: '-2 Mobility, -1 Stealth', icon: 'fas fa-bone' },
      'sla-concussed': { label: 'Concussed',   description: '-1 all, extra -1 WIT rolls', icon: 'fas fa-brain' },
      'sla-gut-wound': { label: 'Gut Wound',   description: '-2 dice all rolls', icon: 'fas fa-user-injured' },
      'sla-panicking': { label: 'Panicking',   description: '-2 dice all rolls', icon: 'fas fa-skull' },
      'sla-shaken':    { label: 'Shaken',      description: '-1 die all rolls', icon: 'fas fa-ghost' },
    };
    const statuses = this.actor.statuses ?? new Set();
    context.activeConditions = [...statuses]
      .filter(id => SLA_COND_LABELS[id])
      .map(id => ({ id, ...SLA_COND_LABELS[id] }));

    // Drug withdrawal flag for sheet display
    const hasDrugDep = this.actor.items.some(
      i => i.type === 'specialty' && (i.name === 'Drug Dependency' || i.system?.drugDependent === true)
    );
    const anyDrugActive = this.actor.items.some(
      i => (i.system?.isDrug || i.type === 'drug' || i.system?.drugDependent === false) && i.system?.active === true
    );
    context.drugWithdrawal = hasDrugDep && !anyDrugActive;

    return context;
  }

  /** @override */
  activateListeners(html) {
    html.find(".init-agi").click(ev => {
      ev.preventDefault();
      this._rollInitiative(true);
    });
    html.find(".init-wit").click(ev => {
      ev.preventDefault();
      this._rollInitiative(false);
    });

    super.activateListeners(html);

    // Mirror inputs: inputs with data-mirrors="field" proxy their value to the canonical
    // hidden input (which has the name attr) so only one binding ever reaches the form.
    html.find('[data-mirrors]').on('input change', function() {
      const target = $(this).data('mirrors');
      const canonical = html.find(`[name="${target}"]`);
      if (canonical.length) {
        canonical.val(this.value);
        canonical.trigger('change');
      }
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add click handlers for rollable items
    html.find('.rollable').click(this._onRoll.bind(this));

    // Attribute increment/decrement buttons (new template)
    html.find('.attr-btn').click(this._onAttributeChange.bind(this));

    // Attribute roll buttons — both the header button and the die badge
    html.find('.attr-roll-btn, .ze-attr-roll-btn').click(this._onAttributeRoll.bind(this));

    // Skill increment/decrement buttons (new template)
    html.find('.skill-increment, .skill-decrement').click(this._onSkillChange.bind(this));

    // Skill roll — clicking the name link OR the existing .skill-roll elements
    html.find('.skill-roll, .ze-skill-name').click(this._onSkillRoll.bind(this));

    // Critical Injury roll buttons
    html.find('.roll-physical-crit-btn').click(this._onRollPhysicalCrit.bind(this));
    html.find('.roll-mental-crit-btn').click(this._onRollMentalCrit.bind(this));

    // Manual Panic button
    html.find('.manual-panic-button').click(this._onManualPanic.bind(this));
    html.find('.manual-armor-button').click(this._onManualArmorCheck.bind(this));

    // Delete injury buttons
    html.find('.delete-injury-btn').click(this._onDeleteInjury.bind(this));

    // Specialty item interactions - click name to open sheet
    html.find('.specialty-item .specialty-name').click(ev => {
      const itemId = ev.currentTarget.closest('.specialty-item').dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) item.sheet.render(true);
    });

    // Delete specialty from actor
    html.find('.delete-specialty-btn').click(async ev => {
      ev.stopPropagation();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) {
        await item.delete();
        ui.notifications.info(`${item.name} removed.`);
      }
    });

    // Weapon name click → trigger the roll (same as the ATTACK button)
    html.find('.weapon-item .weapon-name').click(this._onWeaponRoll.bind(this));

    // Roll weapon attack
    html.find('.weapon-roll-btn').click(this._onWeaponRoll.bind(this));

    // REST button — clears weapon ammo lockouts
    html.find('.rest-btn').click(this._onRestClick.bind(this));

    // Delete weapon from actor
    html.find('.delete-weapon-btn').click(async ev => {
      ev.stopPropagation();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) {
        await item.delete();
        ui.notifications.info(`${item.name} removed.`);
      }
    });

    // Armor interactions - click name to open sheet
    html.find('.armor-item .armor-name').click(ev => {
      const itemId = ev.currentTarget.closest('.armor-item').dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) item.sheet.render(true);
    });

    // Roll armor check from specific armor row
    html.find('.armor-roll-btn').click(async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const itemId = ev.currentTarget.dataset.itemId;
      await this._promptAndRollArmorCheck(this.actor, itemId);
    });

    // Delete armor from actor
    html.find('.delete-armor-btn').click(async ev => {
      ev.stopPropagation();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) {
        await item.delete();
        ui.notifications.info(`${item.name} removed.`);
      }
    });

    // Gear interactions - click name to open sheet
    html.find('.gear-item .gear-name').click(ev => {
      const itemId = ev.currentTarget.closest('.gear-item').dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) item.sheet.render(true);
    });

    // Drug interactions - click name to open sheet
    html.find('.drug-item .drug-name').click(ev => {
      const itemId = ev.currentTarget.closest('.drug-item').dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) item.sheet.render(true);
    });

    // Delete gear from actor
    html.find('.delete-gear-btn').click(async ev => {
      ev.stopPropagation();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) {
        await item.delete();
        ui.notifications.info(`${item.name} removed.`);
      }
    });

    // Activate drug (consumes one dose)
    html.find('.drug-activate-btn').click(async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (!item) return;
      await this._activateDrug(item);
    });

    // Stop active drug (triggers withdrawal if configured)
    html.find('.drug-off-btn').click(async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (!item) return;
      // Two-stage OFF flow:
      // 1) Active drug -> enter withdrawal
      // 2) Withdrawal active -> clear withdrawal (fully off)
      if (item.system?.active) {
        await this._deactivateDrug(item);
      } else if (item.system?.withdrawalActive) {
        await this._clearDrugWithdrawal(item);
      }
    });

    // Clear withdrawal state
    html.find('.drug-clear-withdrawal-btn').click(async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (!item) return;
      await this._clearDrugWithdrawal(item);
    });

    // Delete drug
    html.find('.delete-drug-btn').click(async ev => {
      ev.stopPropagation();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) {
        await item.delete();
        ui.notifications.info(`${item.name} removed.`);
      }
    });

    // Equip/unequip toggle
    html.find('.toggle-equip-btn').click(async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (!item) return;

      const equipped = item.system?.equipped === true;
      await item.update({ "system.equipped": !equipped });
    });

    // ── EBB FORMULA LISTENERS ─────────────────────────────────────
    // Roll an ebb formula (costs flux)
    html.find('.ebb-formula-roll-btn').click(this._onRollEbbFormula.bind(this));

    // Open ebb formula item sheet
    html.find('.ebb-formula-edit-btn').click(ev => {
      ev.stopPropagation();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) item.sheet.render(true);
    });

    // Delete ebb formula from actor
    html.find('.ebb-formula-delete-btn').click(async ev => {
      ev.stopPropagation();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) {
        await item.delete();
        ui.notifications.info(`${item.name} removed.`);
      }
    });

    // Recover 1 Flux (stretch rest)
    html.find('.ebb-flux-recover-btn').click(async ev => {
      ev.preventDefault();
      const fluxMax = (parseInt(this.actor.system.skills?.ebb?.value) || 0) > 0 ? (parseInt(this.actor.system.skills.ebb.value) + 1) : (parseInt(this.actor.system.flux?.max) || parseInt(this.actor.system.attributes?.empathy?.value) || 2);
      const current = this.actor.system.flux?.value ?? 0;
      const next = Math.min(fluxMax, current + 1);
      if (next === current) {
        ui.notifications.info(`${this.actor.name}'s Flux is already full (${current}/${fluxMax}).`);
        return;
      }
      await this.actor.update({ "system.flux.value": next });
      ui.notifications.info(`${this.actor.name} recovers 1 Flux (${next}/${fluxMax}).`);
    });

    // Full Flux recovery (shift rest)
    html.find('.ebb-flux-full-btn').click(async ev => {
      ev.preventDefault();
      const fluxMax = (parseInt(this.actor.system.skills?.ebb?.value) || 0) > 0 ? (parseInt(this.actor.system.skills.ebb.value) + 1) : (parseInt(this.actor.system.flux?.max) || parseInt(this.actor.system.attributes?.empathy?.value) || 2);
      await this.actor.update({ "system.flux.value": fluxMax });
      ui.notifications.info(`${this.actor.name} fully restores Flux (${fluxMax}/${fluxMax}).`);
    });

    // Clear condition button
    html.find('.condition-clear-btn').click(async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const condId = ev.currentTarget.dataset.conditionId;
      if (!condId) return;
      try {
        await this.actor.toggleStatusEffect(condId, { active: false });
        ui.notifications.info(`Condition cleared: ${condId.replace('sla-','')} on ${this.actor.name}`);
      } catch(e) {
        console.warn('Zero Engine | Could not clear condition:', e);
      }
    });

    // Vevaphon morph form switching — both the Equipment tab panel AND the Specialties SHIFT buttons
    const _onMorphShift = async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const form = ev.currentTarget.dataset.form;
      // Ensure vevaphon data exists before updating
      if (!this.actor.system.vevaphon) {
        await this.actor.update({ 'system.vevaphon': { instability: 0, instabilityMax: 12, activeMorphForm: 'none' } });
      }
      const instab = Number(this.actor.system.vevaphon?.instability ?? 0);
      if (form && form !== 'none') {
        const newInstab = Math.min(12, instab + 1);
        await this.actor.update({
          'system.vevaphon.activeMorphForm': form,
          'system.vevaphon.instability': newInstab
        });
        const formLabel = form.charAt(0).toUpperCase() + form.slice(1);
        ui.notifications.info(`${this.actor.name} shifts to ${formLabel} Form. Instability: ${newInstab}/12`);
        // Auto-roll instability check after every shift
        await this._rollVevaphonInstabilityCheck(newInstab);
      } else {
        await this.actor.update({ 'system.vevaphon.activeMorphForm': 'none' });
        ui.notifications.info(`${this.actor.name} returns to base form.`);
      }
    };
    html.find('.morph-shift-btn').click(_onMorphShift);

    html.find('.morph-form-btn').click(_onMorphShift);

    // Vevaphon instability roll
    html.find('.instability-roll-btn').click(async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      await this._onRollVevaphonInstability();
    });
  }

  /**
   * Build top-of-sheet alerts for active drugs and withdrawal states
   * @param {Actor} actor
   * @returns {Array<{itemId:string,name:string,duration:string,state:string,summary:string}>}
   * @private
   */
  _buildDrugAlerts(actor) {
    const alerts = [];
    for (const item of actor.items || []) {
      if (!(item.type === "equipment" && item.system?.isDrug === true)) continue;
      const state = item.system?.active ? "active" : (item.system?.withdrawalActive ? "withdrawal" : "");
      if (!state) continue;
      const duration = state === "active"
        ? String(item.system?.activeDuration || "Duration n/a")
        : String(item.system?.withdrawalDuration || "Withdrawal duration n/a");
      const summary = this._formatDrugStateSummary(item, state);
      alerts.push({
        itemId: item.id,
        name: item.name,
        duration: duration,
        state: state,
        summary: summary || (state === "active" ? "Drug effect active." : "Withdrawal penalties active.")
      });
    }
    return alerts;
  }

  /**
   * Read a skill modifier value from drug data object
   * @param {object} obj
   * @param {string} key
   * @returns {number}
   * @private
   */
  _getDrugSkillModValue(obj, key) {
    const value = Number(obj?.[key] ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  /**
   * Build a compact summary string for active/withdrawal drug state
   * @param {Item} drugItem
   * @param {"active"|"withdrawal"} state
   * @returns {string}
   * @private
   */
  _formatDrugStateSummary(drugItem, state = "active") {
    const s = drugItem?.system || {};
    const isWithdrawal = state === "withdrawal";
    const health = Number(isWithdrawal ? s.wdHealthMod : s.healthMod) || 0;
    const resolve = Number(isWithdrawal ? s.wdResolveMod : s.resolveMod) || 0;
    const stat = Number(isWithdrawal ? s.wdStatPhysicalMod : s.statPhysicalMod) || 0;
    const skillAll = Number(isWithdrawal ? s.wdSkillAllMod : s.skillAllMod) || 0;
    const panicReduction = Number(isWithdrawal ? s.wdPanicReduction : s.panicReduction) || 0;
    const injuryIgnore = Number(isWithdrawal ? s.wdInjuryPenaltyIgnore : s.injuryPenaltyIgnore) || 0;

    const parts = [];
    if (health !== 0) parts.push(`Health ${health > 0 ? "+" : ""}${health}`);
    if (resolve !== 0) parts.push(`Resolve ${resolve > 0 ? "+" : ""}${resolve}`);
    if (stat !== 0) parts.push(`Physical ${stat > 0 ? "+" : ""}${stat}`);
    if (skillAll !== 0) parts.push(`All Skills ${skillAll > 0 ? "+" : ""}${skillAll}`);
    if (panicReduction > 0) parts.push(`Panic -${panicReduction}`);
    if (injuryIgnore > 0) parts.push(`Ignore injury penalties up to ${injuryIgnore}`);

    const skillObj = isWithdrawal ? s.wdSkillMods : s.skillMods;
    const namedSkills = [];
    for (const key of ["force", "melee", "stamina", "marksmanship", "mobility", "stealth", "crafting", "observation", "survival", "healing", "insight", "persuasion"]) {
      const value = this._getDrugSkillModValue(skillObj, key);
      if (value !== 0) namedSkills.push(`${key} ${value > 0 ? "+" : ""}${value}`);
    }
    if (namedSkills.length > 0) parts.push(namedSkills.join(", "));

    return parts.join(" | ");
  }

  /**
   * Notify GM and table when drug state changes
   * @param {Item} item
   * @param {string} stateLabel
   * @param {string} duration
   * @private
   */
  async _notifyDrugState(item, stateLabel, duration = "") {
    const actorName = this.actor?.name || "Unknown Actor";
    const itemName = item?.name || "Drug";
    const message = `${actorName}: ${itemName} ${stateLabel}${duration ? ` (${duration})` : ""}`;

    ui.notifications.info(message);
    if (game.user?.isGM) {
      ui.notifications.warn(`Drug alert - ${message}`);
    }

    const gmIds = game.users
      .filter(u => u.isGM)
      .map(u => u.id);
    if (gmIds.length > 0) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        whisper: gmIds,
        content: `<div class="drug-gm-alert"><strong>Drug Alert</strong>: ${message}</div>`
      });
    }
  }

  /**
   * Activate a drug item and consume one dose
   * @param {Item} item
   * @returns {Promise<void>}
   * @private
   */
  async _activateDrug(item) {
    if (!item || !(item.type === "equipment" && item.system?.isDrug === true)) return;
    const qty = Math.max(0, Number(item.system?.quantity) || 0);
    if (qty <= 0) {
      ui.notifications.warn(`${item.name} has no remaining doses.`);
      return;
    }

    await item.update({
      "system.quantity": qty - 1,
      "system.active": true,
      "system.withdrawalActive": false
    });

    const stressBonus = Math.max(0, Number(item.system?.stressRecoveryBonus) || 0);
    if (stressBonus > 0) {
      const currentStress = this._getStressValue(this.actor);
      const nextStress = Math.max(0, currentStress - stressBonus);
      if (nextStress !== currentStress) {
        await this.actor.update(this._buildStressUpdate(this.actor, nextStress));
      }
    }

    await this._notifyDrugState(item, "is ACTIVE", String(item.system?.activeDuration || ""));
  }

  /**
   * Deactivate an active drug and start withdrawal state when defined
   * @param {Item} item
   * @returns {Promise<void>}
   * @private
   */
  async _deactivateDrug(item) {
    if (!item || !(item.type === "equipment" && item.system?.isDrug === true)) return;

    const s = item.system || {};
    const hasWithdrawal = Boolean(s.withdrawalDuration) ||
      Number(s.wdHealthMod || 0) !== 0 ||
      Number(s.wdResolveMod || 0) !== 0 ||
      Number(s.wdStatPhysicalMod || 0) !== 0 ||
      Number(s.wdSkillAllMod || 0) !== 0 ||
      Number(s.wdPanicReduction || 0) !== 0 ||
      Object.values(s.wdSkillMods || {}).some(v => Number(v || 0) !== 0);

    await item.update({
      "system.active": false,
      "system.withdrawalActive": hasWithdrawal
    });

    if (hasWithdrawal) {
      await this._notifyDrugState(item, "entered WITHDRAWAL", String(item.system?.withdrawalDuration || ""));
      const strainDamage = Math.max(0, Number(item.system?.wdPostUseStaminaDamage) || 0);
      if (strainDamage > 0) {
        await this._runDrugStaminaStrainCheck(item, strainDamage);
      }
    } else {
      await this._notifyDrugState(item, "is OFF", "");
    }
  }

  /**
   * Clear a drug withdrawal state manually
   * @param {Item} item
   * @returns {Promise<void>}
   * @private
   */
  async _clearDrugWithdrawal(item) {
    if (!item || !(item.type === "equipment" && item.system?.isDrug === true)) return;
    await item.update({ "system.withdrawalActive": false });
    await this._notifyDrugState(item, "withdrawal cleared", "");
  }

  /**
   * Run post-drug stamina check and apply strain damage on failure
   * @param {Item} item
   * @param {number} failDamage
   * @returns {Promise<void>}
   * @private
   */
  async _runDrugStaminaStrainCheck(item, failDamage) {
    const str = Number(this.actor.system?.attributes?.strength?.value || 0);
    const stamina = Number(this.actor.system?.skills?.stamina?.value || 0);
    const pool = Math.max(0, str + stamina);
    if (pool <= 0) return;

    const roll = await (new Roll(`${pool}d6`)).evaluate();
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }
    const successes = (roll.dice?.[0]?.results || []).filter(r => r.result === 6).length;
    const failed = successes <= 0;

    let healthLine = "";
    if (failed) {
      const currentHealth = this._getDerivedStatValue(this.actor, "health");
      const nextHealth = Math.max(0, currentHealth - failDamage);
      const updates = this._buildDerivedStatUpdate(this.actor, "health", nextHealth);
      if (nextHealth <= 0) updates["system.derivedStats.broken"] = true;
      await this.actor.update(updates);
      healthLine = `<div><strong>Failure:</strong> ${this.actor.name} takes ${failDamage} damage ignoring armor (${currentHealth} -> ${nextHealth} Health).</div>`;
    } else {
      healthLine = `<div><strong>Success:</strong> No strain damage.</div>`;
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="drug-gm-alert"><strong>${item.name} - Stamina Strain Check</strong><div>Pool: ${pool}d6 | Successes: ${successes}</div>${healthLine}</div>`
    });
  }

  /**
   * Handle attribute increment/decrement
   * @param {Event} event
   * @private
   */
  async _onAttributeChange(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const action = button.dataset.action;
    const attribute = button.dataset.attribute;
    const currentValue = parseInt(this.actor.system.attributes[attribute].value) || 2;

    let newValue = currentValue;
    if (action === 'increment') {
      newValue = Math.min(5, currentValue + 1);
    } else if (action === 'decrement') {
      newValue = Math.max(2, currentValue - 1);
    }

    if (newValue !== currentValue) {
      await this.actor.update({
        [`system.attributes.${attribute}.value`]: newValue
      });
    }
  }

  /**
   * Handle skill increment/decrement
   * @param {Event} event
   * @private
   */
  async _onSkillChange(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const isIncrement = button.classList.contains('skill-increment');
    const skill = button.dataset.skill;
    const currentValue = parseInt(this.actor.system.skills[skill].value) || 0;

    let newValue = currentValue;
    if (isIncrement) {
      newValue = Math.min(5, currentValue + 1);
    } else {
      newValue = Math.max(0, currentValue - 1);
    }

    if (newValue !== currentValue) {
      await this.actor.update({
        [`system.skills.${skill}.value`]: newValue
      });
    }
  }

  /**
   * Handle skill roll button clicks
   * @param {Event} event
   * @private
   */
  async _onSkillRoll(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const skill = button.dataset.skill;
    const attribute = button.dataset.attribute;

    const skillValue = parseInt(this.actor.system.skills[skill]?.value) || 0;
    const attributeValue = parseInt(this.actor.system.attributes[attribute]?.value) || 2;
    const armorMods  = this._getArmorRollModifiers(this.actor, { attribute, skill });
    const drugMods   = this._getDrugRollModifiers(this.actor, { attribute, skill });
    const racialMods = this._getRacialDiceBonus(this.actor, { skill, attribute });
    const condMods   = _getConditionModifiers(this.actor, { skill, attribute });
    const totalDice = Math.max(0, attributeValue + skillValue + armorMods.total + drugMods.total + racialMods.bonus + condMods.bonus);

    const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1);
    const label = `${skillLabel} (${attribute})`;
    const formula = `${skillLabel} (${attribute} ${attributeValue} + Skill ${skillValue}` +
      `${armorMods.statMod !== 0 ? ` + Armor Stat ${armorMods.statMod}` : ''}` +
      `${armorMods.skillMod !== 0 ? ` + Armor Skill ${armorMods.skillMod}` : ''}` +
      `${drugMods.statMod !== 0 ? ` + Drug Stat ${drugMods.statMod}` : ''}` +
      `${drugMods.skillMod !== 0 ? ` + Drug Skill ${drugMods.skillMod}` : ''}` +
      `${racialMods.bonus !== 0 ? ` + Racial/Drug ${racialMods.bonus > 0 ? '+' : ''}${racialMods.bonus}` : ''}` +
      `${condMods.bonus !== 0 ? ` + Conditions ${condMods.bonus}` : ''}` +
      ` = ${totalDice}d6)`;

    return this._rollYZEDice(totalDice, label, formula, skill);
  }

  /**
   * Handle attribute roll button clicks
   * @param {Event} event
   * @private
   */
  async _onAttributeRoll(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const attribute = button.dataset.attribute;

    const attributeValue = parseInt(this.actor.system.attributes[attribute]?.value) || 2;
    const armorMods  = this._getArmorRollModifiers(this.actor, { attribute });
    const drugMods   = this._getDrugRollModifiers(this.actor, { attribute });
    const racialMods = this._getRacialDiceBonus(this.actor, { attribute });
    const condMods   = _getConditionModifiers(this.actor, { attribute });
    const totalDice = Math.max(0, attributeValue + armorMods.total + drugMods.total + racialMods.bonus + condMods.bonus);
    const label = attribute.charAt(0).toUpperCase() + attribute.slice(1);
    const formula = `${label} ${attributeValue}` +
      `${armorMods.statMod !== 0 ? ` + Armor Stat ${armorMods.statMod}` : ''}` +
      `${drugMods.statMod !== 0 ? ` + Drug Stat ${drugMods.statMod}` : ''}` +
      `${racialMods.bonus !== 0 ? ` + Racial/Drug ${racialMods.bonus > 0 ? '+' : ''}${racialMods.bonus}` : ''}` +
      `${condMods.bonus !== 0 ? ` + Conditions ${condMods.bonus}` : ''}` +
      ` = ${totalDice}d6`;

    return this._rollYZEDice(totalDice, label, formula, attribute);
  }

  /**
   * Handle Physical Critical Injury button click
   * @param {Event} event
   * @private
   */
  async _onRollPhysicalCrit(event) {
    event.preventDefault();
    event.stopPropagation();

    // Guard: if auto-crit already fired recently, confirm before rolling again
    if (_critCooldownActive(this.actor.id, "physical")) {
      const roll = await Dialog.confirm({
        title: "Critical Already Rolled",
        content: "<p>A Physical Critical was already rolled for this character recently (auto-triggered when HP hit 0). Roll <strong>another</strong> one?</p>",
        yes: () => true, no: () => false, defaultYes: false
      });
      if (!roll) return;
    }

    _critRecordFired(this.actor.id, "physical");
    await this.actor.update({ 'system.derivedStats.broken': true });
    await this._rollPhysicalCritical(this.actor);
    ui.notifications.warn(`${this.actor.name} is BROKEN and suffers a Physical Critical Injury!`);
  }

  /**
   * Handle Mental Critical Injury button click
   * @param {Event} event
   * @private
   */
  async _onRollMentalCrit(event) {
    event.preventDefault();
    event.stopPropagation();

    // Guard: if auto-crit already fired recently, confirm before rolling again
    if (_critCooldownActive(this.actor.id, "mental")) {
      const roll = await Dialog.confirm({
        title: "Critical Already Rolled",
        content: "<p>A Mental Critical was already rolled for this character recently (auto-triggered when Resolve hit 0). Roll <strong>another</strong> one?</p>",
        yes: () => true, no: () => false, defaultYes: false
      });
      if (!roll) return;
    }

    _critRecordFired(this.actor.id, "mental");
    await this.actor.update({ 'system.derivedStats.broken': true });
    await this._rollMentalCritical(this.actor);
    ui.notifications.warn(`${this.actor.name} is BROKEN and suffers a Mental Critical Injury!`);
  }

  /**
   * Roll an Ebb formula — spend flux, roll Empathy + Ebb skill, post result
   * YZE EBB rules:
   *  - Roll Empathy dice + Ebb skill dice (6s = successes)
   *  - Need formula.successes successes to fully activate
   *  - Flux is spent on activation regardless of success
   *  - Can push the roll (gains stress; Brain Wasters risk catastrophe)
   * @param {Event} event
   * @private
   */
  async _onRollEbbFormula(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const formula = item.system;
    const fluxCost = Number(formula.fluxCost ?? 1);
    const currentFlux = this.actor.system.flux?.value ?? 0;
    const fluxMax = (parseInt(this.actor.system.skills?.ebb?.value) || 0) > 0 ? (parseInt(this.actor.system.skills.ebb.value) + 1) : (parseInt(this.actor.system.flux?.max) || parseInt(this.actor.system.attributes?.empathy?.value) || 2);

    // Check sufficient flux
    if (currentFlux < fluxCost) {
      ui.notifications.warn(
        `Not enough Flux to use ${item.name}! ` +
        `Needs ${fluxCost}, have ${currentFlux}/${fluxMax}.`
      );
      return;
    }

    // Deduct flux before rolling
    const newFlux = Math.max(0, currentFlux - fluxCost);
    await this.actor.update({ "system.flux.value": newFlux });

    // Build dice pool: Empathy attribute + Ebb skill
    // Use parseInt() || 0 — robust against corrupt stored values ("3,3", "NaN", etc.)
    const empathy = parseInt(this.actor.system.attributes?.empathy?.value) || 2;
    const ebbSkill = parseInt(this.actor.system.skills?.ebb?.value) || 0;
    const totalDice = (empathy + ebbSkill) || 1; // fallback to 1 die minimum
    const requiredSuccesses = Number(formula.successes ?? 1);
    const disciplineLabel = formula.discipline
      ? formula.discipline.charAt(0).toUpperCase() + formula.discipline.slice(1)
      : "Ebb";

    const label = `${item.name} [${disciplineLabel}]`;
    const formulaStr = `Empathy ${empathy} + Ebb ${ebbSkill} = ${totalDice}d6 | ` +
      `Flux: ${currentFlux} → ${newFlux} (cost ${fluxCost}) | Need ${requiredSuccesses} suc`;

    const ebbInfo = {
      itemId: item.id,
      itemName: item.name,
      effect: formula.effect || "",
      catastrophe: formula.catastrophe || "",
      requiredSuccesses,
      discipline: formula.discipline || "ebb",
      range: formula.range || "",
      duration: formula.duration || ""
    };

    return this._rollYZEDice(totalDice, label, formulaStr, "empathy", null, { ebbInfo });
  }

  /**
   * Auto-apply deterministic EBB effects to the actor
   * @param {object} ebbInfo - The ebb formula metadata
   * @param {number} successes - Number of successes rolled
   * @private
   */
  async _applyEbbEffect(ebbInfo, successes) {
    if (!ebbInfo || successes < ebbInfo.requiredSuccesses) return;
    const actor = this.actor;
    const itemName = (ebbInfo.itemName || "").toLowerCase();
    const discipline = (ebbInfo.discipline || "").toLowerCase();

    if (discipline === "heal") {
      const hpMax = actor.system.health?.max ?? actor.system.attributes?.health?.max ?? 10;
      const hpCurrent = actor.system.health?.value ?? actor.system.attributes?.health?.value ?? hpMax;
      const stress = this._getStressValue(actor);

      if (itemName.includes("mend")) {
        // Mend: restore min(2, successes) HP
        const healAmt = Math.min(2, successes);
        const newHp = Math.min(hpMax, hpCurrent + healAmt);
        if (newHp > hpCurrent) {
          await actor.update({ "system.health.value": newHp });
          ui.notifications.info(`${actor.name} | Mend: +${newHp - hpCurrent} HP restored.`);
        }
      } else if (itemName.includes("restore")) {
        // Restore: heal successes + 1 HP
        const healAmt = successes + 1;
        const newHp = Math.min(hpMax, hpCurrent + healAmt);
        if (newHp > hpCurrent) {
          await actor.update({ "system.health.value": newHp });
          ui.notifications.info(`${actor.name} | Restore: +${newHp - hpCurrent} HP restored.`);
        }
      } else if (itemName.includes("calm")) {
        // Calm: reduce stress by 1
        const newStress = Math.max(0, stress - 1);
        if (newStress < stress) {
          await actor.update(this._buildStressUpdate(actor, newStress));
          ui.notifications.info(`${actor.name} | Calm: stress reduced to ${newStress}.`);
        }
      }
    }
  }

  /**
   * Handle Manual Panic button click
   * @param {Event} event
   * @private
   */
  async _onManualPanic(event) {
    event.preventDefault();
    event.stopPropagation();

    // Roll Panic check
    await this._rollPanic(this.actor);
  }

  /**
   * Handle Manual Armor Check button click
   * @param {Event} event
   * @private
   */
  async _onManualArmorCheck(event) {
    event.preventDefault();
    event.stopPropagation();
    await this._promptAndRollArmorCheck(this.actor);
  }

  /**
   * Handle delete injury button click
   * @param {Event} event
   * @private
   */
  async _onDeleteInjury(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const injuryType = button.dataset.injuryType; // 'physical' or 'mental'
    const injuryIndex = parseInt(button.dataset.injuryIndex);

    // Get current injuries array
    const injuries = [...this.actor.system.criticalInjuries[injuryType]];

    // Remove the injury at the specified index
    injuries.splice(injuryIndex, 1);

    // Update actor
    await this.actor.update({
      [`system.criticalInjuries.${injuryType}`]: injuries
    });

    ui.notifications.info(`Critical injury removed from ${this.actor.name}`);
  }

  /**
   * Handle double-click to edit attributes
   * @param {Event} event
   * @private
   */
  _onEditAttribute(event) {
    event.stopPropagation();
    const box = $(event.currentTarget);
    const input = box.find('input');
    const valueDiv = box.find('.attr-value');

    valueDiv.hide();
    input.show().focus().select();

    input.one('blur', () => {
      input.hide();
      valueDiv.show();
    });
  }

  /**
   * Handle double-click to edit skills
   * @param {Event} event
   * @private
   */
  _onEditSkill(event) {
    event.stopPropagation();
    const row = $(event.currentTarget);
    const input = row.find('input');
    const valueDiv = row.find('.skill-value');

    valueDiv.hide();
    input.show().focus().select();

    input.one('blur', () => {
      input.hide();
      valueDiv.show();
    });
  }

  /**
   * Handle clickable rolls
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle attribute rolls
    if (dataset.rollType === 'attribute') {
      const attribute = dataset.attribute;

      // Check if attribute exists and has a value
      if (!this.actor.system.attributes || !this.actor.system.attributes[attribute]) {
        ui.notifications.error(`Attribute ${attribute} not found. Please recreate this character with the updated system.`);
        return;
      }

      const attributeValue = this.actor.system.attributes[attribute].value || 2;
      const armorMods = this._getArmorRollModifiers(this.actor, { attribute });
      const drugMods = this._getDrugRollModifiers(this.actor, { attribute });
      const totalDice = Math.max(0, attributeValue + armorMods.total + drugMods.total);
      const label = attribute.charAt(0).toUpperCase() + attribute.slice(1);
      const formula = `${label} ${attributeValue}` +
        `${armorMods.statMod !== 0 ? ` + Armor Stat ${armorMods.statMod}` : ''}` +
        `${drugMods.statMod !== 0 ? ` + Drug Stat ${drugMods.statMod}` : ''}` +
        ` = ${totalDice}d6`;

      return this._rollYZEDice(totalDice, label, formula, attribute);
    }

    // Handle skill rolls
    if (dataset.rollType === 'skill') {
      const skill = dataset.skill;
      const attribute = dataset.attribute;

      // Check if skill and attribute exist
      if (!this.actor.system.skills || !this.actor.system.skills[skill]) {
        ui.notifications.error(`Skill ${skill} not found. Please recreate this character with the updated system.`);
        return;
      }
      if (!this.actor.system.attributes || !this.actor.system.attributes[attribute]) {
        ui.notifications.error(`Attribute ${attribute} not found. Please recreate this character with the updated system.`);
        return;
      }

      const skillValue = this.actor.system.skills[skill].value || 0;
      const attributeValue = this.actor.system.attributes[attribute].value || 2;
      const armorMods = this._getArmorRollModifiers(this.actor, { attribute, skill });
      const drugMods = this._getDrugRollModifiers(this.actor, { attribute, skill });
      const totalDice = Math.max(0, attributeValue + skillValue + armorMods.total + drugMods.total);
      const attrLabel = attribute.charAt(0).toUpperCase() + attribute.slice(1);
      const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1);
      const label = `${skillLabel} (${attribute.substring(0, 3).toUpperCase()})`;
      const formula = `${attrLabel} ${attributeValue} + ${skillLabel} ${skillValue}` +
        `${armorMods.statMod !== 0 ? ` + Armor Stat ${armorMods.statMod}` : ''}` +
        `${armorMods.skillMod !== 0 ? ` + Armor Skill ${armorMods.skillMod}` : ''}` +
        `${drugMods.statMod !== 0 ? ` + Drug Stat ${drugMods.statMod}` : ''}` +
        `${drugMods.skillMod !== 0 ? ` + Drug Skill ${drugMods.skillMod}` : ''}` +
        ` = ${totalDice}d6`;

      return this._rollYZEDice(totalDice, label, formula, attribute);
    }
  }

  /**
   * Handle weapon attack roll
   * Ranged weapons use AGI + Marksmanship + Gear Bonus
   * Melee weapons use STR + Melee + Gear Bonus
   * @param {Event} event
   * @private
   */
  async _onWeaponRoll(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    // Roll button has data-item-id directly; weapon name span does not — walk up to .weapon-item
    const itemId = button.dataset.itemId ?? button.closest('.weapon-item')?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const weaponData = item.system;
    const isMelee = (weaponData.category === "melee") ||
      String(weaponData.range ?? "").toLowerCase() === "engaged";

    // If ranged weapon is out of ammo (locked by a failed push), block firing
    if (!isMelee && weaponData.ammoEmpty) {
      ui.notifications.warn(`${item.name} is out of ammo — rest to restore ammunition.`);
      return;
    }

    // Determine attribute + skill
    const attribute = isMelee ? "strength" : "agility";
    const skill = isMelee ? "melee" : "marksmanship";

    const attrValue = parseInt(this.actor.system.attributes[attribute]?.value) || 2;
    const skillValue = parseInt(this.actor.system.skills[skill]?.value) || 0;
    const attrLabel = attribute.charAt(0).toUpperCase() + attribute.slice(1);
    const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1);
    const gearBonus = parseInt(weaponData.gearBonus) || 0;
    const armorMods  = this._getArmorRollModifiers(this.actor, { attribute, skill });
    const drugMods   = this._getDrugRollModifiers(this.actor, { attribute, skill });
    // Pass weaponType for Frother blade proficiency and similar weapon-gated racial bonuses
    const racialMods = this._getRacialDiceBonus(this.actor, { skill, attribute, weaponType: weaponData.weaponType || "" });
    const condMods   = _getConditionModifiers(this.actor, { skill, attribute });
    let baseDice = attrValue + skillValue + gearBonus + armorMods.total + drugMods.total + racialMods.bonus + condMods.bonus;

    // Multi-shot vars — set from dialog result below (inside !isMelee block)
    let shotBonus   = 0;
    let shotsChosen = 1;

    // Fire mode / ammo type (ranged only)
    let fireMode = "single";
    let ammoType = "standard";
    let modeBonusDice = 0;
    let ammoBonusDice = 0;
    let modeDamageBonus = 0;
    let ammoDamageBonus = 0;
    let ammoSpent = 0;
    let rangeBonus = 0;
    let scopeBonus = 0;
    let aiBonus = 0;

    if (!isMelee) {
      const rawFireModes = Array.isArray(weaponData.fireModes)
        ? weaponData.fireModes
        : (typeof weaponData.fireModes === "string"
          ? weaponData.fireModes.split(",").map(s => s.trim()).filter(Boolean)
          : (weaponData.fireModes ? [weaponData.fireModes] : ["single"]));

      // Derive allowed modes by capability:
      // auto -> single + burst + auto
      // burst -> single + burst
      // single -> single only (no selector)
      let fireModes = ["single"];
      if (rawFireModes.includes("auto")) {
        fireModes = ["single", "burst", "auto"];
      } else if (rawFireModes.includes("burst")) {
        fireModes = ["single", "burst"];
      }

      const defaultFireMode = fireModes[0] || "single";
      const allFireModes = Array.isArray(weaponData.fireModes) ? weaponData.fireModes : ["single"];
      const dialogShotOptions = _getShotOptions(allFireModes);

      const dialogResult = await YZEDiceDialog.show(
        baseDice,
        `${item.name} Attack`,
        `${attrLabel} ${attrValue} + ${skillLabel} ${skillValue} + Gear ${gearBonus}`,
        {
          returnDetails: true,
          fireModes: fireModes.length > 1 ? fireModes : [],
          ammoTypes: ["standard", "ap", "he"],
          defaultFireMode: defaultFireMode,
          defaultAmmoType: weaponData.roundType || weaponData.ammoType || "standard",
          modeBonusMap: { single: 0, burst: 1, auto: 2 },
          ammoBonusMap: { standard: 0, ap: 1, he: 0 },
          showAttackMods: true,
          shotOptions: dialogShotOptions   // ← multi-shot selector
        }
      );

      if (!dialogResult) return;
      // Apply multi-shot results from dialog
      if (dialogResult.shotsChosen && dialogResult.shotsChosen > 1) {
        shotsChosen = dialogResult.shotsChosen;
        shotBonus   = dialogResult.shotDiceBonus || 0;
        baseDice   += shotBonus;
      }
      fireMode = dialogResult.fireMode || "single";
      ammoType = dialogResult.ammoType || "standard";
      const modifier = parseInt(dialogResult.modifier) || 0;
      const rangeBonus = parseInt(dialogResult.rangeBonus) || 0;
      const scopeBonus = parseInt(dialogResult.scopeBonus) || 0;
      const aiBonus = parseInt(dialogResult.aiBonus) || 0;
      baseDice = Math.max(0, baseDice + modifier);
      baseDice = Math.max(0, baseDice + rangeBonus + scopeBonus + aiBonus);
    }

    if (fireMode === "burst") {
      modeBonusDice = 1;
      modeDamageBonus = 1;
      ammoSpent = Math.max(3, shotsChosen);
    } else if (fireMode === "auto") {
      modeBonusDice = 2;
      modeDamageBonus = 2;
      ammoSpent = shotsChosen > 1 ? shotsChosen : (parseInt(weaponData.autoAmmoUse) || 8);
    } else {
      // Single/semi: ammo = shotsChosen (multi-shot dialog already set this)
      ammoSpent = shotsChosen;
    }

    if (ammoType === "ap") {
      ammoBonusDice = 1;
    } else if (ammoType === "he") {
      ammoDamageBonus = 1;
    }

    const totalDice = baseDice + modeBonusDice + ammoBonusDice;

    const label = `${item.name} Attack`;
    const formula = `${attrLabel} ${attrValue} + ${skillLabel} ${skillValue} + Gear ${gearBonus}` +
      `${armorMods.statMod !== 0 ? ` + Armor Stat ${armorMods.statMod}` : ''}` +
      `${armorMods.skillMod !== 0 ? ` + Armor Skill ${armorMods.skillMod}` : ''}` +
      `${drugMods.statMod !== 0 ? ` + Drug Stat ${drugMods.statMod}` : ''}` +
      `${drugMods.skillMod !== 0 ? ` + Drug Skill ${drugMods.skillMod}` : ''}` +
      `${racialMods.bonus !== 0 ? ` + Racial/Drug ${racialMods.bonus > 0 ? '+' : ''}${racialMods.bonus}` : ''}` +
      `${condMods.bonus !== 0 ? ` + Conditions ${condMods.bonus}` : ''}` +
      `${shotBonus > 0 ? ` + Multi-shot ×${shotsChosen} +${shotBonus}` : ''}` +
      `${modeBonusDice > 0 ? ` + Mode ${modeBonusDice}` : ''}` +
      `${ammoBonusDice > 0 ? ` + Ammo ${ammoBonusDice}` : ''}` +
      `${rangeBonus !== 0 ? ` + Range ${rangeBonus}` : ''}` +
      `${scopeBonus > 0 ? ` + Scope ${scopeBonus}` : ''}` +
      `${aiBonus > 0 ? ` + AI ${aiBonus}` : ''}` +
      ` = ${totalDice}d6`;

    // ── BULLET TAX: deduct credits for rounds fired (no ammo count tracking) ─
    if (!isMelee) {
      const taxPaid = await _applyBulletTax(this.actor, weaponData, ammoSpent);
      if (taxPaid > 0) {
        const cpr = _getAmmoCostForWeapon(weaponData);
        ui.notifications.warn(
          `💸 Bullet Tax: ${ammoSpent} round${ammoSpent !== 1 ? 's' : ''} × ${cpr}c = −${taxPaid}c`
        );
      }
    }

    // Weapon info to embed in the roll
    const apBase = parseInt(weaponData.ap) || 0;
    // Apply round-type AP bonus from ammo catalog
    const ammoMods = _getAmmoModifiers(weaponData);
    const apEffective = apBase + ammoMods.apBonus + (ammoType === "ap" ? 1 : 0);
    const weaponInfo = {
      itemId: item.id,
      name: item.name,
      damage: (parseInt(weaponData.damage) || 0) + ammoMods.damageMod,
      ap: apBase,
      apEffective: apEffective,
      range: weaponData.range || "—",
      rof: weaponData.rof || "—",
      category: isMelee ? "Melee" : "Ranged",
      weaponType: weaponData.weaponType || "",
      caliber: weaponData.caliber || SLA_WEAPON_DEFAULT_CALIBER[weaponData.weaponType] || "",
      roundType: weaponData.roundType || "standard",
      fireMode: fireMode,
      ammoType: ammoType,
      ammoSpent: isMelee ? 0 : ammoSpent,
      bulletTaxPaid: isMelee ? 0 : (ammoSpent * _getAmmoCostForWeapon(weaponData)),
      modeBonusDice: modeBonusDice,
      ammoBonusDice: ammoBonusDice,
      modeDamageBonus: modeDamageBonus,
      ammoDamageBonus: ammoDamageBonus,
      rangeBonus: rangeBonus,
      scopeBonus: scopeBonus,
      aiBonus: aiBonus
    };

    return this._rollYZEDice(totalDice, label, formula, attribute, weaponInfo, { skipDialog: !isMelee, preModifiedDice: totalDice });
  }

  /**
   * Handle weapon reload button
   * Restores ammo to magazine capacity
   * @param {Event} event
   * @private
   */
  async _onWeaponReload(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const magazine = parseInt(item.system.magazine) || 0;
    const currentAmmo = parseInt(item.system.ammo) || 0;

    if (currentAmmo >= magazine) {
      ui.notifications.info(`${item.name} is already fully loaded.`);
      return;
    }

    await item.update({ 'system.ammo': magazine });
    ui.notifications.info(`${item.name} reloaded! (${magazine}/${magazine})`);

    // Post reload to chat
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="weapon-reload-chat"><i class="fas fa-redo-alt"></i> <strong>${this.actor.name}</strong> reloads <strong>${item.name}</strong> (${currentAmmo} → ${magazine})</div>`
    });
  }

  /**
   * Handle REST button click — clears all weapon ammoEmpty lockouts
   * @param {Event} event
   * @private
   */
  async _onRestClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const actor = this.actor;
    // Also clear any stale broken flag on rest
    if (actor.system?.derivedStats?.broken === true) {
      const currentHp = Number(
        typeof actor.system.derivedStats.health === "object"
          ? actor.system.derivedStats.health?.value
          : actor.system.derivedStats.health
      ) || 0;
      if (currentHp > 0) {
        await actor.update({ "system.derivedStats.broken": false }, { _zeDerivedRecalcInternal: true });
      }
    }

    // Clear Vevaphon instability on rest
    if (actor.system?.vevaphon?.instability > 0) {
      await actor.update({ 'system.vevaphon.instability': 0 });
      ui.notifications.info(`${actor.name}'s Instability cleared on rest.`);
    }

    const rangedWeapons = actor.items.filter(i => i.type === "weapon" &&
      i.system.category !== "melee" &&
      String(i.system.range ?? "").toLowerCase() !== "engaged");

    const lockedWeapons = rangedWeapons.filter(i => i.system.ammoEmpty);

    if (lockedWeapons.length === 0) {
      ui.notifications.info(`${actor.name} rests — all weapons are already loaded.`);
    } else {
      for (const w of lockedWeapons) {
        await w.update({ 'system.ammoEmpty': false });
      }
      const names = lockedWeapons.map(w => w.name).join(", ");
      ui.notifications.info(`${actor.name} rests — weapons restored: ${names}`);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div style="border:2px solid #00a860;border-radius:6px;padding:8px 12px;background:rgba(0,60,30,0.3);margin:4px 0;">
          <strong style="color:#55ffaa;font-size:14px;">🛏 ${actor.name} — RESTING</strong><br>
          <span style="color:#ccc;font-size:12px;">Weapons restored: <strong>${names}</strong></span>
        </div>`
      });
    }
  }

  // ── VEVAPHON INSTABILITY TABLE ───────────────────────────────────────────────
  // Roll: 1d6 + current instability value.
  // Results below 7 mean the Vevaphon held together — no effect.
  // Table escalates from cosmetic glitches (7) to instant death (36).
  static VEVAPHON_INSTABILITY_TABLE = [
    { min:  7, max:  7, name: "FLICKER",           severity: "minor",        effect: "Surface ripple. No mechanical effect. The form blurs for a moment." },
    { min:  8, max:  8, name: "SKIN CRAWL",         severity: "minor",        effect: "-1 die to Persuasion and Insight until end of scene. Something is visibly wrong." },
    { min:  9, max:  9, name: "DRIFT",              severity: "minor",        effect: "Proportions shift. -1 die to Stealth until rest." },
    { min: 10, max: 10, name: "IDENTITY SLIP",      severity: "minor",        effect: "Forgets one personal detail. Make Wits roll (1 suc) or -1 die to all social rolls this scene." },
    { min: 11, max: 11, name: "VOICE SHIFT",        severity: "minor",        effect: "Voice changes register and accent. Communications are misidentified as a different person." },
    { min: 12, max: 12, name: "PAIN SPIKE",         severity: "moderate",     effect: "Realignment burns. +1 Stress immediately.", autoStress: 1 },
    { min: 13, max: 13, name: "LIMB FAULT",         severity: "moderate",     effect: "One limb locks in wrong form. -2 dice to all physical rolls using that limb until end of scene." },
    { min: 14, max: 14, name: "FORM BLEED",         severity: "moderate",     effect: "Active form partially degrades. Lose 1 bonus die from current form until next shift." },
    { min: 15, max: 15, name: "SENSORY OVERLOAD",   severity: "moderate",     effect: "-2 dice to Observation and all Wits rolls for 1 round as input doubles." },
    { min: 16, max: 16, name: "TISSUE REJECTION",   severity: "moderate",     effect: "Body fights the morph. Take 1 damage — armour does not apply.", autoDamage: 1 },
    { min: 17, max: 17, name: "THREAT LOCK",        severity: "serious",      effect: "Fixated on nearest visible threat. Must make Wits (2 suc) to take any other action this round." },
    { min: 18, max: 18, name: "FORM PANIC",         severity: "serious",      effect: "All morph bonuses collapse for 1 round as the body resets. +1 Stress.", autoStress: 1 },
    { min: 19, max: 19, name: "MEMORY FRACTURE",    severity: "serious",      effect: "Mission brief lost from memory. Must be told again. -1 die to all rolls until re-briefed." },
    { min: 20, max: 20, name: "PARTIAL COLLAPSE",   severity: "serious",      effect: "Torso and limbs lose cohesion briefly. Take 1d3 damage, -2 dice to all rolls for 1 stretch.", autoDamageRoll: "1d3" },
    { min: 21, max: 21, name: "IDENTITY BLEED",     severity: "serious",      effect: "No longer recognises own callsign or squad. -2 dice to all social and coordination rolls until rest." },
    { min: 22, max: 22, name: "UNCONTROLLED SHIFT", severity: "serious",      effect: "Involuntary morph to a random form (GM rolls 1d3). +1 Instability immediately.", autoInstability: 1 },
    { min: 23, max: 23, name: "TRAUMA RESPONSE",    severity: "serious",      effect: "Gain the Shaken condition (-1 die to all rolls).", applyCondition: "sla-shaken" },
    { min: 24, max: 24, name: "PERMANENT SCAR",     severity: "critical",     effect: "Morph process leaves a permanent deformity. One GM-chosen attribute reduced by 1 until medically treated." },
    { min: 25, max: 25, name: "FULL REVERSION",     severity: "critical",     effect: "Collapses to base form, all morph bonuses lost. Stunned for 1 round. Instability -1.", autoInstability: -1, revertForm: true },
    { min: 26, max: 26, name: "PSYCHIC SCREAM",     severity: "critical",     effect: "Burst of biogenetic energy. All within Short range must make Wits (1 suc) save or +1 Stress." },
    { min: 27, max: 27, name: "BODY HORROR",        severity: "critical",     effect: "The morph becomes grotesquely visible. Allies within Short range must make Resolve save or -1 die for 1 stretch." },
    { min: 28, max: 28, name: "CASCADE SHIFT",      severity: "critical",     effect: "Rapid involuntary cycling through all forms. 1d3 damage, +1 Instability, -3 dice to all rolls for 1 round.", autoDamageRoll: "1d3", autoInstability: 1 },
    { min: 29, max: 29, name: "DISSOLUTION RISK",   severity: "critical",     effect: "Body begins to lose coherence. At end of next scene, make Strength (2 suc) or take 1d6 damage." },
    { min: 30, max: 30, name: "IDENTITY DEATH",     severity: "catastrophic", effect: "All personal identity lost. Character acts on instinct only — GM controls for 1 full scene." },
    { min: 31, max: 31, name: "ORGAN SHIFT",        severity: "catastrophic", effect: "Internal organs begin migrating. 2 damage per round for 1d3 rounds. Only stopped by Healing (3 suc).", autoDamage: 2 },
    { min: 32, max: 32, name: "FULL SYSTEM FAILURE",severity: "catastrophic", effect: "Incapacitated for 1 stretch. All form stat bonuses removed permanently until surgery." },
    { min: 33, max: 33, name: "CATASTROPHIC CASCADE",severity:"catastrophic", effect: "Continuous involuntary form cycling. 1d6 damage per round, unable to act. Requires Healing (3 suc) to stabilise.", autoDamageRoll: "1d6" },
    { min: 34, max: 34, name: "BIOGENETIC DETONATION",severity:"catastrophic",effect: "Explosive biogenetic discharge. 2d6 damage to self, 1d6 to everyone at Engaged range. Armour does not apply.", autoDamageRoll: "2d6" },
    { min: 35, max: 35, name: "TERMINAL DISSOLUTION",severity:"lethal",       effect: "Biogenetic matrix cannot maintain coherence. Incapacitated. Death in 1d6 rounds unless Healing (4 suc) succeeds." },
    { min: 36, max: 99, name: "TOTAL COLLAPSE",     severity: "lethal",       effect: "The Vevaphon's biogenetic matrix fails completely. Instant death. The body dissolves into unstructured tissue." },
  ];

  /**
   * Auto-roll 1d6 + instability and apply instability table result.
   * Called automatically after every morph shift.
   * @param {number} currentInstability
   */
  async _rollVevaphonInstabilityCheck(currentInstability) {
    const actor = this.actor;
    const roll = new Roll('1d6', {});
    await roll.evaluate();
    const dieVal = roll.dice[0].results[0].result;
    const total  = dieVal + currentInstability;

    // Apply alien dice skin — force zero-engine system via appearance (bypasses user's saved DSN setting)
    for (const term of (roll.dice || [])) {
      term.options = term.options || {};
      term.options.appearance = { system: 'zero-engine' };
    }

    if (total < 7) {
      // No effect — silent unless instability is high enough to be notable
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: `<strong>🔀 ${actor.name} — Instability Check</strong>`,
        content: `<div class="instability-result"><p>Rolled <strong>${dieVal}</strong> + Instability <strong>${currentInstability}</strong> = <strong>${total}</strong></p><p style="color:#44cc88;">✓ Held together. No effect.</p></div>`,
        rolls: [roll]
      });
      return;
    }

    // Find table entry
    const INST = ZeroEngineActorSheet.VEVAPHON_INSTABILITY_TABLE;
    const entry = INST.find(e => total >= e.min && total <= e.max) || INST[INST.length - 1];

    const severityColour = {
      minor: '#88aaff', moderate: '#ffcc44', serious: '#ff8844',
      critical: '#ff4422', catastrophic: '#cc1111', lethal: '#ff0000'
    }[entry.severity] || '#aaa';

    let content = `<div class="instability-result">`;
    content += `<p>Rolled <strong>${dieVal}</strong> + Instability <strong>${currentInstability}</strong> = <strong>${total}</strong></p>`;
    content += `<p style="color:${severityColour};font-size:14px;font-weight:bold;">${entry.name}</p>`;
    content += `<p style="color:#333;">${entry.effect}</p>`;

    // Auto-apply immediate mechanical effects
    const updates = {};
    let notes = [];

    if (entry.autoStress) {
      const cur = Number(actor.system.derivedStats?.stress ?? 0);
      const upd = this._buildStressUpdate(actor, cur + entry.autoStress);
      Object.assign(updates, upd);
      notes.push(`+${entry.autoStress} Stress auto-applied`);
    }
    if (entry.autoDamage) {
      const hp = Number(actor.system.derivedStats?.health?.value ?? 0);
      const newHp = Math.max(0, hp - entry.autoDamage);
      updates['system.derivedStats.health.value'] = newHp;
      notes.push(`${entry.autoDamage} damage auto-applied`);
    }
    if (entry.autoDamageRoll) {
      const dmgRoll = new Roll(entry.autoDamageRoll, {});
      await dmgRoll.evaluate();
      const hp = Number(actor.system.derivedStats?.health?.value ?? 0);
      const newHp = Math.max(0, hp - dmgRoll.total);
      updates['system.derivedStats.health.value'] = newHp;
      notes.push(`${dmgRoll.total} damage auto-applied`);
    }
    if (entry.autoInstability) {
      const curInst = Number(actor.system.vevaphon?.instability ?? 0);
      const newInst = Math.max(0, Math.min(12, curInst + entry.autoInstability));
      updates['system.vevaphon.instability'] = newInst;
      notes.push(`Instability ${entry.autoInstability > 0 ? '+' : ''}${entry.autoInstability} → ${newInst}`);
    }
    if (entry.revertForm) {
      updates['system.vevaphon.activeMorphForm'] = 'none';
      notes.push('Reverted to base form');
    }
    if (entry.applyCondition) {
      try {
        await actor.toggleStatusEffect(entry.applyCondition, { active: true });
        notes.push(`Condition applied: ${entry.applyCondition.replace('sla-','')}`);
      } catch(_) {}
    }

    if (Object.keys(updates).length > 0) {
      await actor.update(updates);
    }
    if (notes.length > 0) {
      content += `<p style="color:#ffcc44;font-size:11px;font-style:italic;">Auto-applied: ${notes.join(' | ')}</p>`;
    }
    content += '</div>';

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `<strong>🔀 ${actor.name} — Instability Check [${entry.severity.toUpperCase()}]</strong>`,
      content,
      rolls: [roll]
    });
  }

  async _onRollVevaphonInstability() {
    const instab = Number(this.actor.system.vevaphon?.instability ?? 0);
    const actor = this.actor;

    if (instab < 6) {
      ui.notifications.info(`${actor.name}'s Instability is below 6 — no effects trigger yet.`);
      return;
    }

    const MINOR_EFFECTS = [
      "Involuntary surface texturing — skin shifts mid-conversation. Social rolls at -1 die.",
      "Limb proportions drift. Fine motor tasks at -1 die until end of scene.",
      "Voice shifts register unexpectedly. Communications may be misidentified.",
      "Brief facial blurring. Anyone describing the Vevaphon gives contradictory reports.",
      "Pain from realignment. Gain +1 Stress.",
      "Form flickers. One random skill loses 1 die until the Vevaphon rests."
    ];

    const PANIC_TABLE = [
      { result: "Cascade Shift", effect: "Immediately shifts to a random morph form. Costs 1 additional Instability." },
      { result: "Identity Bleed", effect: "Forgets assigned name and call sign until end of scene. Acts on instinct." },
      { result: "Partial Lock", effect: "One limb freezes in wrong form. -2 dice to all physical rolls using that limb." },
      { result: "Tissue Rejection", effect: "Takes 1d3 damage as the body fights itself. Armour does not apply." },
      { result: "Threat Imprint", effect: "Locks on nearest visible target. Must roll Wits to perform any other action." },
      { result: "Full Reversion", effect: "Collapses to base form, losing all morph bonuses. Recover 1 Instability." }
    ];

    const roll = new Roll('1d6', {});
    await roll.evaluate();
    const result = roll.total;

    let content = '<div class="instability-result">';

    if (instab >= 10) {
      // Check for Morph Panic (roll vs Resolve)
      const panicEntry = PANIC_TABLE[Math.min(result - 1, 5)];
      content += `<p><strong>⚠ MORPH PANIC CHECK</strong> (Instability ${instab}/12)</p>`;
      content += `<p>Rolled: <strong>${result}</strong></p>`;
      content += `<p class="panic-effect"><strong>${panicEntry.result}:</strong> ${panicEntry.effect}</p>`;
      if (panicEntry.result === "Tissue Rejection") {
        const dmgRoll = new Roll('1d3', {});
        await dmgRoll.evaluate();
        const newHp = Math.max(0, Number(actor.system.derivedStats?.health?.value ?? 0) - dmgRoll.total);
        await actor.update({ 'system.derivedStats.health.value': newHp });
        content += `<p>Auto-applied: ${dmgRoll.total} unarmoured damage.</p>`;
      } else if (panicEntry.result === "Full Reversion") {
        const newInstab = Math.max(0, instab - 1);
        await actor.update({ 'system.vevaphon.activeMorphForm': 'none', 'system.vevaphon.instability': newInstab });
        content += `<p>Auto-applied: Reverted to base form. Instability reduced to ${newInstab}.</p>`;
      } else if (panicEntry.result === "Cascade Shift") {
        const forms = ['brute', 'stalker', 'raptor'];
        const randomForm = forms[Math.floor(Math.random() * forms.length)];
        const newInstab = Math.min(12, instab + 1);
        await actor.update({ 'system.vevaphon.activeMorphForm': randomForm, 'system.vevaphon.instability': newInstab });
        content += `<p>Auto-applied: Randomly shifted to <strong>${randomForm}</strong> form. Instability: ${newInstab}/12.</p>`;
      }
    } else {
      // Minor instability effect
      const effect = MINOR_EFFECTS[(result - 1) % MINOR_EFFECTS.length];
      content += `<p><strong>Minor Instability Effect</strong> (Instability ${instab}/12)</p>`;
      content += `<p>Rolled: <strong>${result}</strong></p>`;
      content += `<p>${effect}</p>`;
      if (effect.includes('+1 Stress')) {
        const curStress = Number(actor.system.derivedStats?.stress ?? 0);
        await actor.update(this._buildStressUpdate(actor, curStress + 1));
      }
    }

    content += '</div>';

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `<strong>🔀 ${actor.name} — Vevaphon Instability</strong>`,
      content,
      rolls: [roll]
    });
  }

  /**
   * Read a derived stat while supporting scalar and legacy object shapes
   * @param {Actor} actor
   * @param {string} key
   * @returns {number}
   * @private
   */
  _getDerivedStatValue(actor, key) {
    const raw = actor?.system?.derivedStats?.[key];
    const value = Number((typeof raw === "object" ? raw?.value : raw) ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  /**
   * Read derived stat max for object-shaped values
   * @param {Actor} actor
   * @param {string} key
   * @returns {number|null}
   * @private
   */
  _getDerivedStatMax(actor, key) {
    const raw = actor?.system?.derivedStats?.[key];
    if (!raw || typeof raw !== "object") return null;
    const max = Number(raw?.max);
    return Number.isFinite(max) ? max : null;
  }

  /**
   * Build derived stat update payload while preserving existing data shape
   * @param {Actor} actor
   * @param {string} key
   * @param {number} value
   * @returns {object}
   * @private
   */
  _buildDerivedStatUpdate(actor, key, value) {
    const nextValue = Number(value) || 0;
    const current = actor?.system?.derivedStats?.[key];
    if (current && typeof current === "object") {
      return { [`system.derivedStats.${key}.value`]: nextValue };
    }
    return { [`system.derivedStats.${key}`]: nextValue };
  }

  /**
   * Clamp initiative modifier to allowed range
   * @param {number} value
   * @returns {number}
   * @private
   */
  _clampInitiativeMod(value) {
    const mod = Number(value) || 0;
    return Math.max(-5, Math.min(5, mod));
  }

  /**
   * Return active armor items; equipped armor is preferred if present
   * @param {Actor} actor
   * @returns {Item[]}
   * @private
   */
  _getActiveArmorItems(actor) {
    const armors = (actor?.items || []).filter(i => i.type === "armor");
    return armors.filter(i => i?.system?.equipped === true || i?.system?.isEquipped === true);
  }

  /**
   * Return drug items currently affecting the actor
   * @param {Actor} actor
   * @returns {Array<{item: Item, state: "active"|"withdrawal"}>}
   * @private
   */
  _getCurrentDrugStates(actor) {
    const states = [];
    for (const item of actor?.items || []) {
      if (!(item.type === "equipment" && item.system?.isDrug === true)) continue;
      if (item.system?.active) {
        states.push({ item, state: "active" });
        continue;
      }
      if (item.system?.withdrawalActive) {
        states.push({ item, state: "withdrawal" });
      }
    }
    return states;
  }

  /**
   * Get aggregate drug modifiers for rolls
   * @param {Actor} actor
   * @param {object} opts
   * @param {string} [opts.attribute]
   * @param {string} [opts.skill]
   * @returns {{statMod:number, skillMod:number, total:number, injuryPenaltyIgnore:number}}
   * @private
   */
  _getDrugRollModifiers(actor, { attribute = "", skill = "" } = {}) {
    const attrKey = String(attribute || "").toLowerCase();
    const skillKey = String(skill || "").toLowerCase();
    const isPhysicalAttribute = attrKey === "strength" || attrKey === "agility";

    let statMod = 0;
    let skillMod = 0;
    let injuryPenaltyIgnore = 0;

    for (const state of this._getCurrentDrugStates(actor)) {
      const data = state.item.system || {};
      const isWithdrawal = state.state === "withdrawal";
      const statPhysical = Number(isWithdrawal ? data.wdStatPhysicalMod : data.statPhysicalMod) || 0;
      const skillAll = Number(isWithdrawal ? data.wdSkillAllMod : data.skillAllMod) || 0;
      const skillObj = isWithdrawal ? (data.wdSkillMods || {}) : (data.skillMods || {});
      const specificSkill = Number(skillObj?.[skillKey] || 0);
      const injuryIgnore = Number(isWithdrawal ? data.wdInjuryPenaltyIgnore : data.injuryPenaltyIgnore) || 0;

      if (isPhysicalAttribute) statMod += statPhysical;
      if (skillKey) {
        skillMod += skillAll;
        skillMod += specificSkill;
      }
      injuryPenaltyIgnore += injuryIgnore;
    }

    return { statMod, skillMod, total: statMod + skillMod, injuryPenaltyIgnore };
  }

  /**
   * Get panic reduction from active drugs
   * @param {Actor} actor
   * @returns {number}
   * @private
   */
  _getDrugPanicReduction(actor) {
    let reduction = 0;
    for (const state of this._getCurrentDrugStates(actor)) {
      if (state.state !== "active") continue;
      reduction += Number(state.item.system?.panicReduction || 0);
    }
    return Math.max(0, reduction);
  }

  /**
   * Get racial dice-pool bonuses for a roll.
   * Reads `system.racialBonuses` array from specialty items of category "racial".
   * Also applies Frother Drug Dependency penalty (-1 all rolls when no drug active).
   *
   * @param {Actor} actor
   * @param {object} opts
   * @param {string} [opts.skill]      - skill key being rolled (e.g. "melee")
   * @param {string} [opts.attribute]  - attribute key being rolled
   * @param {string} [opts.weaponType] - weapon type string for weapon-gated bonuses (e.g. "Blade")
   * @returns {{ bonus: number, breakdown: string[] }}
   */
  _getRacialDiceBonus(actor, { skill = "", attribute = "", weaponType = "" } = {}) {
    let bonus = 0;
    const breakdown = [];
    const sk  = String(skill      || "").toLowerCase();
    const wt  = String(weaponType || "").toLowerCase();

    for (const item of actor.items) {
      if (item.type !== "specialty") continue;
      if (item.system?.category !== "racial") continue;
      const entries = item.system?.racialBonuses;
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        const entrySkill = String(entry.skill || "").toLowerCase();
        if (entrySkill && sk && entrySkill !== sk) continue;     // skill mismatch
        const tag = String(entry.weaponTag || "").toLowerCase();
        if (tag) {
          if (!wt) continue;                                      // need weapon context
          if (!wt.includes(tag) && !tag.includes(wt)) continue;  // weapon type mismatch
        }
        const b = Number(entry.bonus) || 0;
        if (b === 0) continue;
        bonus += b;
        breakdown.push(`${item.name} ${b > 0 ? '+' : ''}${b}`);
      }
    }

    // Frother Drug Dependency: -1 to ALL rolls when no drug is active
    const hasDrugDep = actor.items.some(
      i => i.type === "specialty" && i.name === "Drug Dependency"
    );
    if (hasDrugDep) {
      const drugActive = actor.items.some(
        i => (i.system?.isDrug || i.type === "drug") && i.system?.active === true
      );
      if (!drugActive) {
        bonus -= 1;
        breakdown.push("Drug Withdrawal −1");
      }
    }

    return { bonus, breakdown };
  }

  /**
   * Get aggregate armor roll modifiers for physical rolls
   * @param {Actor} actor
   * @param {object} opts
   * @param {string} [opts.attribute]
   * @param {string} [opts.skill]
   * @returns {{statMod:number, skillMod:number, total:number}}
   * @private
   */
  _getArmorRollModifiers(actor, { attribute = "", skill = "" } = {}) {
    const attrKey = String(attribute || "").toLowerCase();
    const skillKey = String(skill || "").toLowerCase();

    let statMod = 0;
    let skillMod = 0;
    for (const armor of this._getActiveArmorItems(actor)) {
      const statTarget = String(armor?.system?.statModTarget || "").toLowerCase();
      const skillTarget = String(armor?.system?.skillModTarget || "").toLowerCase();

      if (statTarget && statTarget === attrKey) {
        statMod += Number(armor?.system?.statMod || 0);
      }
      if (skillTarget && skillTarget === skillKey) {
        skillMod += Number(armor?.system?.skillMod || 0);
      }
    }

    return { statMod, skillMod, total: statMod + skillMod };
  }

  /**
   * Get armor dice/auto values from item, with legacy fallback support
   * @param {Item} armorItem
   * @returns {{armorDice:number, autoArmor:number}}
   * @private
   */
  _getArmorProtectionValues(armorItem) {
    const system = armorItem?.system || {};
    const legacyArmor = Number(system.armorRating || system.armor || 0);
    const armorDice = Math.max(0, Number(system.armorDice ?? legacyArmor) || 0);
    const autoArmor = Math.max(0, Number(system.armorAuto ?? 0) || 0);
    return { armorDice, autoArmor };
  }

  /**
   * Prompt for incoming damage/AP and roll armor check
   * @param {Actor} actor
   * @returns {Promise<void>}
   * @private
   */
  async _promptAndRollArmorCheck(actor, preselectedArmorId = null) {
    const allArmors = this._getActiveArmorItems(actor);
    const preselectedArmor = preselectedArmorId
      ? actor.items.get(preselectedArmorId)
      : null;
    if (preselectedArmor && !(preselectedArmor?.system?.equipped === true || preselectedArmor?.system?.isEquipped === true)) {
      ui.notifications.warn(`${preselectedArmor.name} is not equipped.`);
      return;
    }
    const armors = preselectedArmor ? [preselectedArmor] : allArmors;
    if (armors.length === 0) {
      ui.notifications.warn(`${actor.name} has no armor items.`);
      return;
    }

    const options = armors.map((a, idx) => {
      const prot = this._getArmorProtectionValues(a);
      return `<option value="${idx}">${a.name} (${prot.armorDice}(${prot.autoArmor}))</option>`;
    }).join("");

    const config = await new Promise(resolve => {
      new Dialog({
        title: `${actor.name} - Armor Check`,
        content: `
          <form>
            <div class="form-group">
              <label>Incoming Damage</label>
              <input type="number" name="incomingDamage" value="1" min="0" step="1"/>
            </div>
            <div class="form-group">
              <label>Armor Penetration (AP)</label>
              <input type="number" name="ap" value="0" min="0" step="1"/>
            </div>
            ${preselectedArmor ? `<div class="form-group"><label>Armor</label><div>${preselectedArmor.name} (${this._getArmorProtectionValues(preselectedArmor).armorDice}(${this._getArmorProtectionValues(preselectedArmor).autoArmor}))</div></div>` : `<div class="form-group"><label>Armor</label><select name="armorIndex">${options}</select></div>`}
          </form>
        `,
        buttons: {
          roll: {
            label: "Roll Armor",
            callback: html => {
              const incomingDamage = Math.max(0, Number(html.find('[name="incomingDamage"]').val()) || 0);
              const ap = Math.max(0, Number(html.find('[name="ap"]').val()) || 0);
              const armorIndex = preselectedArmor ? 0 : Math.max(0, Number(html.find('[name="armorIndex"]').val()) || 0);
              resolve({ incomingDamage, ap, armorItem: armors[armorIndex] });
            }
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "roll",
        close: () => resolve(null)
      }).render(true);
    });

    if (!config) return;
    await this._rollArmorCheck(actor, config);
  }

  /**
   * Roll armor check and apply resulting health damage
   * @param {Actor} actor
   * @param {{incomingDamage:number, ap:number, armorItem:Item}} config
   * @returns {Promise<void>}
   * @private
   */
  async _rollArmorCheck(actor, { incomingDamage = 0, ap = 0, armorItem = null } = {}) {
    if (!armorItem) return;

    const { armorDice, autoArmor } = this._getArmorProtectionValues(armorItem);
    const incoming = Math.max(0, Number(incomingDamage) || 0);
    const apValue = Math.max(0, Number(ap) || 0);
    const effectiveDice = Math.max(0, armorDice - apValue);
    const afterAuto = Math.max(0, incoming - autoArmor);

    let armorSuccesses = 0;
    let armorRoll = null;
    if (effectiveDice > 0) {
      armorRoll = await (new Roll(`${effectiveDice}d6`)).evaluate();
      if (game.dice3d) {
        await game.dice3d.showForRoll(armorRoll, game.user, true);
      }
      armorSuccesses = (armorRoll.dice?.[0]?.results || []).filter(r => r.result === 6).length;
    }

    const finalDamage = Math.max(0, afterAuto - armorSuccesses);
    const currentHealth = this._getDerivedStatValue(actor, "health");
    const nextHealth = Math.max(0, currentHealth - finalDamage);
    const updates = this._buildDerivedStatUpdate(actor, "health", nextHealth);
    if (nextHealth <= 0) updates["system.derivedStats.broken"] = true;
    if (finalDamage > 0 || nextHealth <= 0) {
      await actor.update(updates);
    }

    const armorDieFaces = armorRoll
      ? (armorRoll.dice?.[0]?.results || []).map(r =>
          `<span class="inline-die-face${r.result === 6 ? ' inline-die-success' : ''}">${r.result}</span>`
        ).join('')
      : '';
    const armorRollLine = effectiveDice > 0
      ? `Armor roll: ${effectiveDice}d6 ${armorDieFaces} → ${armorSuccesses} success${armorSuccesses !== 1 ? "es" : ""}`
      : "Armor roll: 0d6 (no armor dice after AP)";

    const content = `
      <div class="yze-initiative-card">
        <div class="yze-initiative-title">Armor Check - ${armorItem.name}</div>
        <div class="yze-initiative-breakdown">
          <div>Incoming damage: <strong>${incoming}</strong></div>
          <div>Armor value: <strong>${armorDice}(${autoArmor})</strong></div>
          <div>AP: <strong>${apValue}</strong> (dice reduced to <strong>${effectiveDice}</strong>)</div>
          <div>Auto armor: <strong>${autoArmor}</strong> (damage after auto: <strong>${afterAuto}</strong>)</div>
          <div>${armorRollLine}</div>
          <div>Final damage: <strong>${finalDamage}</strong></div>
          <div>Health: <strong>${currentHealth} -> ${nextHealth}</strong></div>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `${actor.name} - Armor Check`,
      content: content,
      rolls: armorRoll ? [armorRoll] : []
    });
  }

  /**
   * Read stress from actor data while supporting scalar and legacy object shapes
   * @param {Actor} actor
   * @returns {number}
   * @private
   */
  _getStressValue(actor) {
    return Math.max(0, this._getDerivedStatValue(actor, "stress"));
  }

  /**
   * Build stress update payload while preserving existing data shape
   * @param {Actor} actor
   * @param {number} value
   * @returns {object}
   * @private
   */
  _buildStressUpdate(actor, value) {
    return this._buildDerivedStatUpdate(actor, "stress", Math.max(0, Number(value) || 0));
  }

  /**
   * Roll Year Zero Engine dice with dialog
   * @param {number} baseDice - Base number of dice to roll
   * @param {string} label - Label for the roll
   * @param {string} formula - Formula string to display
   * @param {string} attribute - Which attribute (for push cost)
   * @param {object|null} weaponInfo - Optional weapon data {name, damage, ap, range, rof, category, weaponType}
   * @private
   */
  async _rollYZEDice(baseDice, label, formula = '', attribute = '', weaponInfo = null, rollOptions = {}) {
    let modifiedDice = baseDice;
    if (!rollOptions.skipDialog) {
      // Show dialog to modify dice pool
      modifiedDice = await YZEDiceDialog.show(baseDice, label, formula);
      if (modifiedDice === null) return; // Dialog was cancelled
    } else if (typeof rollOptions.preModifiedDice === "number") {
      modifiedDice = rollOptions.preModifiedDice;
    }

    const normalDice = Math.max(0, parseInt(modifiedDice) || 0);
    const stressDice = this._getStressValue(this.actor);

    // Roll normal + stress dice together (stress dice are always the last term)
    const stressTerm = stressDice > 0 ? ` + ${stressDice}d6` : '';
    const roll = new Roll(`${normalDice}d6${stressTerm}`, {});
    await roll.evaluate();

    // Show Dice So Nice animation if available
    if (game.dice3d) {
      this._applyDiceSoNiceColors(roll, normalDice, stressDice);
      await game.dice3d.showForRoll(roll, game.user, true);
    }

    const ebbInfo = rollOptions.ebbInfo || null;

    const { normalResults, stressResults } = this._splitRollResultsByType(roll, {
      normalDice,
      stressDice
    });
    const dice = this._buildDiceArray(normalResults, stressResults);
    const successes = dice.filter(d => d.result === 6).length;
    const stressBanes = dice.filter(d => d.type === 'stress' && d.result === 1).length;

    // Auto-apply ebb mechanical effects where possible
    if (ebbInfo) {
      await this._applyEbbEffect(ebbInfo, successes);
    }

    // Create custom chat message with YZE formatting
    const stressLabel = stressDice > 0 ? ` + Stress ${stressDice}` : '';
    const stressTag = stressDice > 0 ? ` <span class="yze-stress-tag">Stress: ${stressDice}</span>` : '';
    const formulaDisplay = formula ? `${formula}${stressLabel}${stressTag}` : `Rolling ${normalDice}d6${stressLabel}${stressTag}`;

    const _speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const chatData = {
      speaker: _speaker,
      flavor: `<strong>${label}</strong><br><small>${formulaDisplay}</small>`,
      content: await this._formatYZEResult(dice, successes, stressBanes, false, weaponInfo, ebbInfo),
      style: CONST.CHAT_MESSAGE_STYLES?.ROLL,
      type: CONST.CHAT_MESSAGE_TYPES?.ROLL,
      roll: roll,
      rollMode: game.settings.get('core', 'rollMode'),
      flags: {
        'zero-engine': {
          canPush: dice.some(d => d.result !== 6),
          pushed: false,
          normalResults: normalResults,
          stressResults: stressResults,
          normalDiceCount: normalDice,
          stressDiceCount: stressDice,
          originalSuccesses: successes,
          isAttack: !!weaponInfo,
          attackCategory: weaponInfo?.category || null,
          attribute: attribute,
          actorId: this.actor.id,
          tokenId: _speaker.token ?? null,
          sceneId: _speaker.scene ?? null,
          weaponInfo: weaponInfo,
          ebbInfo: ebbInfo
        }
      }
    };

    return ChatMessage.create(chatData);
  }

  /**
   * Format YZE roll result for chat
   * @param {Array} dice - Array of dice results
   * @param {number} successes - Number of successes (6s)
   * @param {number} stressBanes - Number of stress banes (1s on stress dice)
   * @param {boolean} pushed - Whether this is a pushed result
   * @param {object|null} weaponInfo - Optional weapon data {name, damage, ap, range, rof, category, weaponType}
   * @private
   */
  async _formatYZEResult(dice, successes, stressBanes, pushed = false, weaponInfo = null, ebbInfo = null) {
    let html = '<div class="yze-roll-result">';

    if (pushed) {
      html += '<div class="yze-pushed-label">⚡ PUSHED RESULT</div>';
    }
    if (pushed && stressBanes > 0) {
      html += '<div class="yze-panic-badge">PANIC CHECK!</div>';
    }

    // Show individual dice
    const stressDiceCount = dice.filter(d => d.type === 'stress').length;
    const normalDice = dice.filter(d => d.type !== 'stress');
    const stressDice = dice.filter(d => d.type === 'stress');

    html += `<div class="yze-dice-display${stressBanes > 0 ? ' yze-stress-bane' : ''}">`;
    normalDice.forEach(d => {
      const value = d.result;
      const dieType = d.type || 'normal';
      let diceClass = 'yze-die';
      if (dieType === 'stress') diceClass += ' yze-stress';
      if (d.locked) diceClass += ' yze-locked';
      if (value === 6) diceClass += ' yze-success';
      html += `<div class="${diceClass}">${value}</div>`;
    });

    if (stressDiceCount > 0) {
      html += '<div class="yze-dice-divider"></div>';
      html += '<div class="yze-stress-label">STRESS DICE</div>';
      stressDice.forEach(d => {
        const value = d.result;
        const dieType = d.type || 'stress';
        let diceClass = 'yze-die';
        if (dieType === 'stress') diceClass += ' yze-stress';
        if (d.locked) diceClass += ' yze-locked';
        if (value === 6) diceClass += ' yze-success';
        else if (value === 1) diceClass += ' yze-bane';
        html += `<div class="${diceClass}">${value}</div>`;
      });
    }
    html += '</div>';

    // Summary - always show full breakdown on pushed results
    html += '<div class="yze-summary">';
    html += `<strong>${successes}</strong> <span class="yze-success-label">Success${successes !== 1 ? 'es' : ''}</span>`;
    if (pushed || stressBanes > 0) {
      html += ` | <span class="yze-stress-banes">${stressBanes} Stress Bane${stressBanes !== 1 ? 's' : ''}</span>`;
      if (!pushed && stressBanes > 0) {
        html += ` <span class="yze-stress-note">(no effect unless pushed or GM calls Panic)</span>`;
      }
    }
    html += '</div>';

    // Weapon damage section (shown when this is a weapon attack roll)
    if (weaponInfo) {
      const extraSuccesses = Math.max(0, successes - 1); // 1 success is spent to hit
      const modeDamageBonus = weaponInfo.modeDamageBonus || 0;
      const ammoDamageBonus = weaponInfo.ammoDamageBonus || 0;
      const totalDamage = weaponInfo.damage + extraSuccesses + modeDamageBonus + ammoDamageBonus;
      html += '<div class="yze-weapon-damage">';
      html += `<div class="weapon-damage-header"><i class="fas fa-${weaponInfo.category === 'Melee' ? 'fist-raised' : 'crosshairs'}"></i> ${weaponInfo.name}</div>`;
      html += '<div class="weapon-damage-stats">';
      if (successes > 0) {
        html += `<div class="weapon-damage-total"><span class="damage-label">Total Damage</span><span class="damage-value">${totalDamage}</span></div>`;
        html += `<div class="weapon-damage-breakdown">(Base ${weaponInfo.damage}` +
          `${extraSuccesses > 0 ? ` + ${extraSuccesses} extra success${extraSuccesses !== 1 ? 'es' : ''}` : ''}` +
          `${modeDamageBonus > 0 ? ` + ${modeDamageBonus} mode` : ''}` +
          `${ammoDamageBonus > 0 ? ` + ${ammoDamageBonus} ammo` : ''}` +
          `)</div>`;
      } else {
        html += `<div class="weapon-damage-miss"><span>MISS</span></div>`;
      }
      if (weaponInfo.fireMode || weaponInfo.ammoType) {
        html += `<div class="weapon-damage-breakdown">Mode: ${weaponInfo.fireMode || 'single'} | Ammo: ${weaponInfo.ammoType || 'standard'}</div>`;
      }
      if (weaponInfo.ammoSpent) {
        const cpr = weaponInfo.bulletTaxPaid > 0
          ? ` · <span class="bullet-tax-line">💸 Tax: <strong>−${weaponInfo.bulletTaxPaid}c</strong></span>`
          : '';
        const calLabel = weaponInfo.caliber ? ` [${weaponInfo.caliber} ${weaponInfo.roundType || 'std'}]` : '';
        html += `<div class="weapon-damage-breakdown">Ammo Spent: ${weaponInfo.ammoSpent}${calLabel} (Remaining ${weaponInfo.ammo}/${weaponInfo.magazine})${cpr}</div>`;
      }
      html += `<div class="weapon-damage-info">`;
      html += `<span class="wdi"><strong>AP</strong> ${weaponInfo.apEffective ?? weaponInfo.ap}</span>`;
      html += `<span class="wdi"><strong>Range</strong> ${weaponInfo.range}</span>`;
      html += `<span class="wdi"><strong>ROF</strong> ${weaponInfo.rof}</span>`;
      html += `<span class="wdi"><strong>Type</strong> ${weaponInfo.category}</span>`;
      if (weaponInfo.category === 'Ranged' && weaponInfo.magazine > 0) {
        html += `<span class="wdi"><strong>Ammo</strong> <span class="${weaponInfo.ammo <= 0 ? 'ammo-chat-empty' : ''}">${weaponInfo.ammo}/${weaponInfo.magazine}</span></span>`;
      }
      html += `</div>`;
      html += '</div>';
      html += '</div>';
    }

    // EBB formula outcome block
    if (ebbInfo) {
      const ebbSucceeded = successes >= ebbInfo.requiredSuccesses;
      const discLabel = ebbInfo.discipline
        ? ebbInfo.discipline.charAt(0).toUpperCase() + ebbInfo.discipline.slice(1)
        : "Ebb";
      html += `<div class="yze-ebb-outcome ${ebbSucceeded ? 'ebb-outcome-success' : 'ebb-outcome-failed'}">`;
      html += `<div class="ebb-outcome-header">`;
      html += `<span class="ebb-outcome-disc">${discLabel}</span>`;
      if (ebbSucceeded) {
        html += `<span class="ebb-outcome-status success">✓ ACTIVATED</span>`;
      } else {
        html += `<span class="ebb-outcome-status failed">✗ FAILED — need ${ebbInfo.requiredSuccesses} success${ebbInfo.requiredSuccesses !== 1 ? 'es' : ''}</span>`;
      }
      html += `</div>`;
      if (ebbSucceeded && ebbInfo.effect) {
        html += `<div class="ebb-outcome-effect">${ebbInfo.effect}</div>`;
        if (ebbInfo.range || ebbInfo.duration) {
          html += `<div class="ebb-outcome-meta">`;
          if (ebbInfo.range) html += `<span><strong>Range</strong> ${ebbInfo.range}</span> `;
          if (ebbInfo.duration) html += `<span><strong>Duration</strong> ${ebbInfo.duration}</span>`;
          html += `</div>`;
        }
      } else if (!ebbSucceeded) {
        html += `<div class="ebb-outcome-effect ebb-failed-note">Formula failed to activate. Flux was spent.</div>`;
      }
      if (pushed && stressBanes > 0 && ebbInfo.catastrophe) {
        html += `<div class="ebb-outcome-catastrophe">⚠ CATASTROPHE: ${ebbInfo.catastrophe}</div>`;
      }
      html += `</div>`;
    }

    // Push button (only shown if not pushed yet and not all 6s)
    if (!pushed && dice.some(d => d.result !== 6)) {
      html += '<div class="yze-push-section">';
      html += '<button class="yze-push-button" data-action="push">';
      html += '<span class="yze-push-title">⚡ PUSH (RE-ROLL)</span>';
      html += '</button>';
      html += '<div class="yze-push-note">Keep 6s. Re-roll others. Stress 1s are locked. +1 Stress die on push.</div>';
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Handle Push button clicks from chat
   * @param {ChatMessage} message - The chat message containing the roll
   * @private
   */
  async _onPushRoll(message) {
    const flags = message.flags['zero-engine'];
    if (!flags || flags.pushed) {
      ui.notifications.warn("This roll has already been pushed!");
      return;
    }

    if (!flags.canPush) {
      ui.notifications.warn("This roll cannot be pushed!");
      return;
    }

    // Resolve the correct actor — prefer the token actor (unlinked tokens have
    // separate data from the base world actor and must be updated via the token doc).
    let actor = null;
    if (flags.tokenId && flags.sceneId) {
      const scene = game.scenes?.get(flags.sceneId);
      const tokenDoc = scene?.tokens?.get(flags.tokenId);
      if (tokenDoc) actor = tokenDoc.actor;
    }
    if (!actor) actor = game.actors.get(flags.actorId);
    if (!actor) {
      ui.notifications.error("Actor not found!");
      return;
    }

    const currentStress = this._getStressValue(actor);
    const updatedStress = currentStress + 1;

    // Get original dice results by type (fallback to legacy diceResults as normal dice)
    const originalNormal = Array.isArray(flags.normalResults) ? flags.normalResults : (Array.isArray(flags.diceResults) ? flags.diceResults : []);
    const originalStress = Array.isArray(flags.stressResults) ? flags.stressResults : [];

    // Lock 6s for all dice. Lock 1s for stress dice.
    const lockedNormalSixes = originalNormal.filter(d => d === 6);
    const lockedStressSixes = originalStress.filter(d => d === 6);
    const lockedStressOnes = originalStress.filter(d => d === 1);
    const normalRerollCount = originalNormal.filter(d => d !== 6).length;
    const stressRerollCount = originalStress.filter(d => d !== 6 && d !== 1).length;
    const addedStressDice = 1; // pushing adds +1 Stress die

    if ((normalRerollCount + stressRerollCount + addedStressDice) === 0) {
      ui.notifications.warn("All dice are 6s - nothing to re-roll!");
      return;
    }

    // Roll new dice for non-locked results (normal + stress)
    const normalTerm = normalRerollCount > 0 ? `${normalRerollCount}d6` : '';
    const stressTerm = (stressRerollCount + addedStressDice) > 0 ? `${stressRerollCount + addedStressDice}d6` : '';
    const rerollFormula = [normalTerm, stressTerm].filter(Boolean).join(' + ');
    const reroll = new Roll(rerollFormula, {});
    await reroll.evaluate();

    // Show Dice So Nice animation if available
    if (game.dice3d) {
      this._applyDiceSoNiceColors(reroll, normalRerollCount, stressRerollCount + addedStressDice);
      await game.dice3d.showForRoll(reroll, game.user, true);
    }

    // Combine locked dice with new results
    const rerollResults = this._splitRollResultsByType(reroll, {
      normalDice: normalRerollCount,
      stressDice: stressRerollCount + addedStressDice
    });
    const newNormalResults = [...lockedNormalSixes, ...rerollResults.normalResults];
    const newStressResults = [...lockedStressSixes, ...lockedStressOnes, ...rerollResults.stressResults];
    const newDice = [
      ...newNormalResults.map(result => ({ result, type: 'normal' })),
      ...lockedStressOnes.map(result => ({ result, type: 'stress', locked: true })),
      ...lockedStressSixes.map(result => ({ result, type: 'stress' })),
      ...rerollResults.stressResults.map(result => ({ result, type: 'stress' }))
    ];
    const successes = newDice.filter(d => d.result === 6).length;
    const stressBanes = newDice.filter(d => d.type === 'stress' && d.result === 1).length;
    const hasStressBane = stressBanes > 0;

    // Carry forward weaponInfo and ebbInfo if present
    const weaponInfo = flags.weaponInfo || null;
    const ebbInfo = flags.ebbInfo || null;

    // ── AMMO LOCKOUT: if a ranged weapon was pushed and a stress die shows 1, lock the weapon ─
    if (weaponInfo && weaponInfo.category === "Ranged" && weaponInfo.itemId && stressBanes > 0) {
      const weaponItem = actor.items.get(weaponInfo.itemId);
      if (weaponItem) {
        await weaponItem.update({ 'system.ammoEmpty': true });
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `<div style="border:2px solid #cc4400;border-radius:6px;padding:8px 12px;background:rgba(80,20,0,0.3);margin:4px 0;">
            <strong style="color:#ff6633;font-size:14px;">🔒 ${weaponInfo.name} — OUT OF AMMO</strong><br>
            <span style="color:#ccc;font-size:12px;">A stress die came up 1 on the push — the weapon has run dry. Rest to restore ammunition.</span>
          </div>`
        });
      }
    }

    // Pushing adds +1 Stress immediately
    await actor.update(this._buildStressUpdate(actor, updatedStress));
    const stressFlavor = `Stress increased: ${currentStress} → ${updatedStress} | +1 Stress die added`;

    const originalSuccesses = parseInt(flags.originalSuccesses) || 0;
    const totalSuccesses = originalSuccesses + successes;

    // Create pushed result chat card
    const chatData = {
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `<strong>⚡ PUSHED ROLL</strong><br><small>${stressFlavor}</small>`,
      content: await this._formatYZEResult(newDice, successes, stressBanes, true, weaponInfo, ebbInfo),
      flags: {
        'zero-engine': {
          pushed: true,
          canPush: false,
          normalResults: newNormalResults,
          stressResults: newStressResults,
          actorId: actor.id,
          hasStressBanes: hasStressBane,
          originalSuccesses: originalSuccesses,
          totalSuccesses: totalSuccesses,
          weaponInfo: weaponInfo,
          ebbInfo: ebbInfo
        }
      }
    };

    await ChatMessage.create(chatData);

    // Trigger Panic or Critical Failure if stress bane present (including locked 1s from initial roll)
    if (hasStressBane) {
      const isAttack = !!flags.isAttack;
      const attackCategory = (flags.attackCategory || weaponInfo?.category || '').toLowerCase();
      const isRanged = attackCategory === 'ranged';

      if (isAttack && totalSuccesses === 0) {
        ui.notifications.warn(`${actor.name} suffers a CRITICAL FAILURE!`);
        await this._rollWeaponCriticalFail(actor, isRanged);
      } else {
        ui.notifications.info(`${actor.name} rolled a Stress bane - Panic check triggered!`);
        await this._rollPanic(actor);
      }
    }
  }

  /**
   * Apply self-only panic consequences to actor resources
   * @param {Actor} actor
   * @param {object} panicEffect
   * @returns {Promise<string[]>}
   * @private
   */
  async _applyPanicConsequences(actor, panicEffect) {
    const changes = panicEffect?.selfChanges || {};
    const labels = {
      health: "Health",
      resolve: "Resolve",
      stress: "Stress"
    };

    const updates = {};
    const applied = [];

    for (const key of ["health", "resolve", "stress"]) {
      const delta = Number(changes[key] || 0);
      if (!Number.isFinite(delta) || delta === 0) continue;

      const current = key === "stress"
        ? this._getStressValue(actor)
        : this._getDerivedStatValue(actor, key);

      let next = current + delta;
      if (key === "stress") {
        next = Math.max(0, next);
      } else {
        const max = this._getDerivedStatMax(actor, key);
        next = Math.max(0, next);
        if (max !== null) next = Math.min(next, max);
      }

      if (next === current) continue;

      Object.assign(updates, this._buildDerivedStatUpdate(actor, key, next));
      applied.push(`${labels[key]} ${current} -> ${next} (${delta > 0 ? "+" : ""}${delta})`);
    }

    if (Object.keys(updates).length > 0) {
      await actor.update(updates);
    }

    return applied;
  }

  /**
   * Roll Panic check (1d6 + Stress)
   * @param {Actor} actor - The actor making the panic roll
   * @private
   */
  async _rollPanic(actor) {
    const stress = this._getStressValue(actor);

    // Roll 1d6 + Stress
    const roll = new Roll(`1d6 + ${stress}`, {});
    await roll.evaluate();

    // Apply alien dice skin — force zero-engine system via appearance
    for (const term of (roll.dice || [])) {
      term.options = term.options || {};
      term.options.appearance = { system: "zero-engine" };
    }

    const rawTotal = roll.total;
    const dieVal = roll.dice[0].results[0].result;
    const panicReduction = this._getDrugPanicReduction(actor);
    const total = panicReduction > 0 ? Math.max(7, rawTotal - panicReduction) : rawTotal;

    // Create panic result chat card
    let content = '<div class="panic-result">';
    content += `<p class="panic-formula">Rolled: <span class="inline-die-face">${dieVal}</span> + ${stress} Stress = <strong class="panic-total">${rawTotal}</strong></p>`;
    if (panicReduction > 0) {
      content += `<p class="panic-formula">Drug Panic Reduction: -${panicReduction} => <strong class="panic-total">${total}</strong></p>`;
    }

    if (total <= 6) {
      content += '<div class="panic-success">✓ Held it together! (No panic effect)</div>';
    } else {
      const panicEffect = this._getPanicEffect(total);
      const appliedChanges = await this._applyPanicConsequences(actor, panicEffect);

      content += `<div class="panic-effect"><strong>${panicEffect.name}</strong>: ${panicEffect.text}</div>`;
      if (appliedChanges.length > 0) {
        content += `<div class="panic-auto"><strong>Auto-applied:</strong> ${appliedChanges.join(' | ')}</div>`;
      }

      if (panicEffect?.autoMentalCritical) {
        content += '<div class="panic-auto"><strong>Auto:</strong> Rolling Mental Critical Injury.</div>';
      }
    }

    content += '</div>';

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: content,
      rolls: [roll]
    });

    // Apply condition based on panic severity
    try {
      const panicLevel = total || 0;
      if (panicLevel >= 10) {
        await actor.toggleStatusEffect('sla-panicking', { active: true });
        ui.notifications.warn(`${actor.name} is PANICKING! (-2 dice to all rolls)`);
      } else if (panicLevel >= 7) {
        await actor.toggleStatusEffect('sla-shaken', { active: true });
        ui.notifications.warn(`${actor.name} is SHAKEN! (-1 die to all rolls)`);
      }
    } catch(_) {}

    if (total > 6) {
      const panicEffect = this._getPanicEffect(total);
      if (panicEffect?.autoMentalCritical) {
        await this._rollMentalCritical(actor);
      }
    }

  }
  async _rollInitiative(useMobility = true, preferredCombatantId = null, preferredCombatId = null) {
    // ── Guard: prevent double-calls within 2 seconds (DSN/tracker re-render race) ─
    const lockKey = `_initLock_${this.actor?.id}`;
    if (window[lockKey]) return;
    window[lockKey] = true;
    setTimeout(() => { delete window[lockKey]; }, 2000);

    const actor = this.actor;
    const system = actor.system;

    // ── Mode: AGI + Mobility  OR  WIT + Observation ──────────────────────────
    const attrKey  = useMobility ? "agility"     : "wits";
    const skillKey = useMobility ? "mobility"    : "observation";
    const modeLabel = useMobility ? "AGI + Mobility" : "WIT + Observation";

    const attrVal  = parseInt(system.attributes?.[attrKey]?.value)  || 0;
    const skillVal = parseInt(system.skills?.[skillKey]?.value)     || 0;

    // Base score is fixed — attribute + skill value
    const baseScore = attrVal + skillVal;

    // ── Roll the same pool for the bonus successes (no stress dice) ──────────
    const pool = Math.max(1, baseScore);
    const roll = new Roll(`${pool}d6`);
    await roll.evaluate();

    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }

    const rollSuccesses = roll.dice[0].results.filter(r => r.result === 6).length;

    // ── Specialty bonuses ────────────────────────────────────────────────────
    let specialtyBonus = 0;
    const specialtyBreakdown = [];

    for (const item of actor.items) {
      if (item.type !== "specialty") continue;
      // Fast Reflexes: +2 to initiative
      if (item.name === "Fast Reflexes") {
        specialtyBonus += 2;
        specialtyBreakdown.push("Fast Reflexes +2");
        continue;
      }
      // Any specialty with an explicit initiativeBonus field
      const bonus = parseInt(item.system?.initiativeBonus) || 0;
      if (bonus !== 0) {
        specialtyBonus += bonus;
        specialtyBreakdown.push(`${item.name} ${bonus > 0 ? '+' : ''}${bonus}`);
      }
    }

    // ── Gear modifiers (equipped items with initiativeMod) ───────────────────
    let gearBonus = 0;
    const gearBreakdown = [];
    for (const item of actor.items) {
      const mod = this._clampInitiativeMod(item?.system?.initiativeMod);
      if (mod === 0) continue;
      const isEquipped = item?.system?.equipped === true || item?.system?.isEquipped === true;
      if (!isEquipped) continue;
      gearBonus += mod;
      gearBreakdown.push(`${item.name} ${mod > 0 ? '+' : ''}${mod}`);
    }

    // ── Active effect modifiers ──────────────────────────────────────────────
    for (const e of (actor.effects || [])) {
      const effMod = e.getFlag('zero-engine', 'initiativeMod');
      if (effMod) {
        const em = Number(effMod) || 0;
        if (em !== 0) {
          gearBonus += em;
          gearBreakdown.push(`${e.name} ${em > 0 ? '+' : ''}${em}`);
        }
      }
    }

    // ── Drug modifiers ───────────────────────────────────────────────────────
    const drugMods = this._getDrugRollModifiers(actor, { attribute: attrKey, skill: skillKey });
    if (drugMods.total !== 0) {
      gearBonus += drugMods.total;
      gearBreakdown.push(`Drugs ${drugMods.total > 0 ? '+' : ''}${drugMods.total}`);
    }

    // ── Final initiative = base + roll successes + bonuses ───────────────────
    const finalInit = baseScore + rollSuccesses + specialtyBonus + gearBonus;

    // ── Tie-breaker d6 (silent — no Roll object so Dice So Nice doesn't animate it) ─
    const tieVal = Math.floor(Math.random() * 6) + 1;

    // ── Store on actor + push to combat tracker (single write, no yze flags) ─
    await actor.update({ "system.combat.initiative": finalInit });

    let combat = (preferredCombatId ? game.combats?.get(preferredCombatId) : null) || game.combat || null;
    let combatant = null;

    if (preferredCombatantId && combat) {
      combatant = combat.combatants.get(preferredCombatantId) || null;
    }
    if (!combatant) {
      const ctx = await this._ensureActorInEncounter(actor, preferredCombatId);
      combat   = ctx?.combat   || combat;
      combatant = ctx?.combatant || (combat?.getCombatantByActor(actor.id) ?? null);
    }
    if (combatant) {
      // Single update: set initiative + sync yze-combat display value in one write
      await combatant.update({
        initiative: finalInit,
        "flags.yze-combat.cardValue": finalInit
      });
    }
    if (combat) {
      if (typeof combat.setupTurns === "function") combat.setupTurns();
      ui.combat?.render(false);
    }

    // ── Chat card ────────────────────────────────────────────────────────────
    const diceHTML = roll.dice[0].results.map(r =>
      `<span class="inline-die-face${r.result === 6 ? ' inline-die-success' : ''}">${r.result}</span>`
    ).join('');

    const attrLabel  = attrKey.slice(0, 3).toUpperCase();
    const skillLabel = skillKey.charAt(0).toUpperCase() + skillKey.slice(1);

    const totalBonus = specialtyBonus + gearBonus;
    const bonusLine  = [...specialtyBreakdown, ...gearBreakdown].join(' · ') || '—';

    const content = `
      <div class="yze-initiative-card">
        <div class="yze-initiative-title">⚡ Initiative — ${modeLabel}</div>
        <div class="yze-initiative-formula">
          Base: <strong>${attrLabel} ${attrVal}</strong> + <strong>${skillLabel} ${skillVal}</strong> = <strong class="init-base">${baseScore}</strong>
        </div>
        <div class="yze-initiative-dice">Roll (${pool}d6): ${diceHTML}</div>
        <div class="yze-initiative-successes">Successes: <strong class="init-suc">+${rollSuccesses}</strong></div>
        ${totalBonus !== 0 ? `<div class="yze-initiative-bonus">Bonuses: <strong class="init-bon">${totalBonus > 0 ? '+' : ''}${totalBonus}</strong> <span class="init-breakdown">(${bonusLine})</span></div>` : ''}
        <div class="yze-initiative-total">Final Initiative: <strong class="init-final">${finalInit}</strong></div>
        <div class="yze-initiative-tiebreak">Tie-breaker d6: <span class="inline-die-face">${tieVal}</span></div>
      </div>`;

    // No rolls:[roll] here — the card already shows individual die faces,
    // and omitting it prevents DSN from showing the dice a second time via
    // the chat message creation hook.
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `${actor.name} — Initiative`,
      content
    });

    return { roll, finalInit, tieVal };
  }

  /**
   * Ensure actor is present in the current scene encounter if a token is available.
   * If there is no encounter on scene, create one.
   * @param {Actor} actor
   * @returns {Promise<{combat: Combat|null, combatant: Combatant|null}>}
   * @private
   */
  async _ensureActorInEncounter(actor, preferredCombatId = null) {
    const scene = game.scenes?.current || canvas?.scene;
    if (!scene) return { combat: game.combat || null, combatant: game.combat?.getCombatantByActor(actor.id) || null };

    let tokenDoc = null;
    const controlled = canvas?.tokens?.controlled?.find(t => t.actor?.id === actor.id);
    if (controlled?.document) {
      tokenDoc = controlled.document;
    } else {
      const placeable = canvas?.tokens?.placeables?.find(t => t.actor?.id === actor.id);
      tokenDoc = placeable?.document || null;
    }
    if (!tokenDoc) {
      return { combat: game.combat || null, combatant: game.combat?.getCombatantByActor(actor.id) || null };
    }

    let combat = preferredCombatId ? (game.combats?.get(preferredCombatId) || null) : null;
    if (!combat) combat = game.combat;
    if (!combat || combat.scene?.id !== scene.id) {
      combat = game.combats?.find(c => c.scene?.id === scene.id && c.active)
        || game.combats?.find(c => c.scene?.id === scene.id)
        || null;
    }
    if (!combat) {
      combat = await Combat.create({ scene: scene.id, active: true });
    }

    let combatant = combat.getCombatantByToken(tokenDoc.id) || combat.getCombatantByActor(actor.id);
    if (!combatant) {
      const actorInit = Number(actor.system?.combat?.initiative ?? 0) || 0;
      const created = await combat.createEmbeddedDocuments("Combatant", [{
        tokenId: tokenDoc.id,
        actorId: actor.id,
        hidden: tokenDoc.hidden === true,
        initiative: actorInit,
        flags: {
          "yze-combat": {
            cardValue: actorInit,
            cardName: "INIT"
          }
        }
      }]);
      combatant = created?.[0] || combat.getCombatantByToken(tokenDoc.id) || null;
    }

    return { combat, combatant };
  }


  /**
   * Roll critical failure table for weapon attacks
   * @param {Actor} actor
   * @param {boolean} isRanged
   * @private
   */
  async _rollWeaponCriticalFail(actor, isRanged = true) {
    const tableName = isRanged
      ? "Ranged Weapon Critical Fail (2-12)"
      : "Melee Weapon Critical Fail (2-12)";

    const table = game.tables.getName(tableName);
    if (!table) {
      ui.notifications.warn(`Critical fail table not found: ${tableName}`);
      return;
    }

    const roll = await (new Roll("2d6")).evaluate();
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }
    await table.draw({ roll, displayChat: true });
  }

  /**
   * Split roll results by normal vs stress dice counts
   * @param {Roll} roll
   * @param {object} counts
   * @param {number} counts.normalDice
   * @param {number} counts.stressDice
   * @returns {{normalResults: number[], stressResults: number[]}}
   * @private
   */
  _splitRollResultsByType(roll, { normalDice = 0, stressDice = 0 }) {
    const diceTerms = roll.dice || [];
    let normalResults = [];
    let stressResults = [];

    if (normalDice > 0 && stressDice > 0) {
      normalResults = (diceTerms[0]?.results || []).map(r => r.result);
      stressResults = (diceTerms[1]?.results || []).map(r => r.result);
    } else if (normalDice > 0) {
      normalResults = (diceTerms[0]?.results || []).map(r => r.result);
    } else if (stressDice > 0) {
      stressResults = (diceTerms[0]?.results || []).map(r => r.result);
    }

    return { normalResults, stressResults };
  }

  /**
   * Build a unified dice array with type annotations for chat rendering
   * @param {number[]} normalResults
   * @param {number[]} stressResults
   * @returns {{result:number, type:string}[]}
   * @private
   */
  _buildDiceArray(normalResults = [], stressResults = []) {
    return [
      ...normalResults.map(result => ({ result, type: 'normal' })),
      ...stressResults.map(result => ({ result, type: 'stress' }))
    ];
  }

  /**
   * Build Dice So Nice options to color stress dice
   * @param {Roll} roll
   * @param {number} normalDice
   * @param {number} stressDice
   * @returns {object}
   * @private
   */
  _applyDiceSoNiceColors(roll, normalDice = 0, stressDice = 0) {
    const diceTerms = roll.dice || [];
    if (diceTerms.length === 0) return;

    let normalIndex = null;
    let stressIndex = null;
    if (normalDice > 0 && stressDice > 0) {
      normalIndex = 0;
      stressIndex = 1;
    } else if (normalDice > 0) {
      normalIndex = 0;
    } else if (stressDice > 0) {
      stressIndex = 0;
    }

    // Normal dice → yellow Alien RPG d6 (skull on 1, blank 2-5, success on 6)
    if (normalIndex !== null && diceTerms[normalIndex]) {
      diceTerms[normalIndex].options = diceTerms[normalIndex].options || {};
      diceTerms[normalIndex].options.appearance = { system: "zero-engine" };
    }

    // Stress dice → black Alien RPG d6 (blank 1-5, success on 6)
    if (stressIndex !== null && diceTerms[stressIndex]) {
      diceTerms[stressIndex].options = diceTerms[stressIndex].options || {};
      diceTerms[stressIndex].options.appearance = { system: "ze-stress-dice" };
    }
  }

  /**
   * Derive immediate self-only stat changes from panic effect text
   * @param {string} text
   * @returns {object|null}
   * @private
   */
  _derivePanicSelfChangesFromText(text = "") {
    const changes = {};
    const sentences = String(text)
      .split(".")
      .map(s => s.trim())
      .filter(Boolean);

    for (const sentence of sentences) {
      // Skip non-immediate or non-self effects.
      if (/(allies|ally|if you refuse|per round|until end of scene|gm chooses|choose:)/i.test(sentence)) {
        continue;
      }

      let match = sentence.match(/\bGain\s*\+?(\d+)\s*(Stress|Resolve|Health)\b/i);
      if (match) {
        const value = Number(match[1]) || 0;
        const stat = String(match[2] || "").toLowerCase();
        if (value > 0 && stat) changes[stat] = (changes[stat] || 0) + value;
        continue;
      }

      match = sentence.match(/\b(Lose|Suffer)\s+(\d+)\s*(Stress|Resolve|Health)\b/i);
      if (match) {
        const value = Number(match[2]) || 0;
        const stat = String(match[3] || "").toLowerCase();
        if (value > 0 && stat) changes[stat] = (changes[stat] || 0) - value;
      }
    }

    return Object.keys(changes).length ? changes : null;
  }

  /**
   * Get panic effect for a given total
   * @param {number} total - The panic roll total
   * @returns {Object} Panic effect details
   * @private
   */
  _getPanicEffect(total) {
    const effects = {
      7: { name: "Nervous Twitch", text: "Gain +1 Stress. All allies in Short range gain +1 Stress as your tension spikes the squad.", directive: "" },
      8: { name: "Tremble", text: "Until end of scene: -2 dice to all AGI-based rolls (Marksmanship, Mobility, Stealth).", directive: "tremble" },
      9: { name: "Fumble/Jam", text: "GM chooses one: drop held item; weapon jams (1 Fast action to clear); comms/camera mishandled (next related roll -2 dice).", directive: "" },
      10: { name: "Freeze", text: "Lose your next action. You may defend normally but cannot Push again until you act.", directive: "freeze" },
      11: { name: "Seek Cover", text: "Use next action moving to cover/safer position. If you refuse, take +1 Stress per round.", directive: "seekCover" },
      12: { name: "Outburst on Camera", text: "You shout/scream/swear. Lose next action; position revealed (enemies +2 dice to locate).", directive: "" },
      13: { name: "Flight Response", text: "Must retreat from threat for at least 1 round or one zone away. Cannot take Slow actions during retreat.", directive: "flight" },
      14: { name: "Operative Breakdown", text: "Choose: BERSERK (attack nearest creature next action, friend/foe) OR CATATONIC (incapacitated D6 rounds). Allies who witness gain +1 Stress.", directive: "breakdown" },
      15: { name: "Mind Fracture", text: "Immediately suffer a Mental Critical Injury (rolling on Mental Critical Table now).", directive: "", autoMentalCritical: true }
    };

    const effectTotal = Math.min(total, 15);
    const effect = effects[effectTotal] || effects[15];
    const derivedChanges = this._derivePanicSelfChangesFromText(effect?.text || "");
    if (derivedChanges) {
      return { ...effect, selfChanges: { ...(effect.selfChanges || {}), ...derivedChanges } };
    }
    return effect;
  }

  /**
   * Roll Mental Critical Injury (D66)
   * @param {Actor} actor - The actor suffering the critical
   * @private
   */
  async _rollMentalCritical(actor) {
    // Roll D66 as single Roll so Dice So Nice animates both dice together
    const d66Roll = new Roll('1d6 + 1d6', {});
    await d66Roll.evaluate();

    // Apply alien dice skin — force zero-engine system via appearance
    for (const term of (d66Roll.dice || [])) {
      term.options = term.options || {};
      term.options.appearance = { system: "zero-engine" };
    }

    const tens = d66Roll.dice[0].results[0].result;
    const ones = d66Roll.dice[1].results[0].result;
    const key = `${tens}.${ones}`;

    // Get critical from lookup
    const critical = this._getMentalCritical(key);

    // Add to actor's critical injuries
    const injuries = actor.system.criticalInjuries.mental || [];
    injuries.push({
      key: key,
      name: critical.name,
      lethal: critical.lethal,
      timeLimit: critical.timeLimit || "",
      effects: critical.effects,
      recovery: critical.recovery,
      timestamp: Date.now()
    });

    await actor.update({ 'system.criticalInjuries.mental': injuries });

    // Create chat card
    let content = '<div class="critical-injury mental-critical">';
    content += `<p class="crit-roll">Rolled: <span class="inline-die-face">${tens}</span><span class="inline-die-face">${ones}</span> → <strong>${tens}.${ones}</strong></p>`;
    content += `<h3 class="crit-name">${critical.name}`;
    if (critical.lethal) {
      content += ' <span class="lethal">☠️ LETHAL</span>';
    }
    content += '</h3>';

    if (critical.timeLimit) {
      content += `<p class="time-limit"><strong>Time Limit:</strong> ${critical.timeLimit}</p>`;
    }

    content += `<p class="crit-effects"><strong>Effects:</strong> ${critical.effects}</p>`;
    content += `<p class="crit-recovery"><strong>Recovery:</strong> ${critical.recovery}</p>`;
    content += '</div>';

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `<strong>💔 MENTAL CRITICAL INJURY</strong>`,
      content: content,
      rolls: [d66Roll]
    });

    // Auto-apply condition from this mental crit result
    const MENTAL_CRIT_CONDITIONS = {
      '1.1': ['sla-shaken'],     '1.2': ['sla-shaken'],     '1.3': ['sla-shaken'],
      '1.4': ['sla-shaken'],     '1.5': ['sla-panicking'],  '1.6': ['sla-panicking'],
      '2.1': ['sla-shaken'],     '2.2': ['sla-panicking'],  '2.3': ['sla-panicking'],
      '2.4': ['sla-shaken'],     '2.5': ['sla-panicking'],  '2.6': ['sla-panicking'],
      '3.1': ['sla-panicking'],  '3.2': ['sla-panicking'],  '3.3': ['sla-shaken'],
      '3.4': ['sla-panicking'],  '3.5': ['sla-panicking'],  '3.6': ['sla-panicking'],
      '4.1': ['sla-panicking'],  '4.2': ['sla-panicking'],  '4.3': ['sla-panicking'],
      '4.4': ['sla-panicking'],  '4.5': ['sla-panicking'],  '4.6': ['sla-panicking'],
      '5.1': ['sla-panicking'],  '5.2': ['sla-panicking'],  '5.3': ['sla-panicking'],
      '5.4': ['sla-panicking'],  '5.5': ['sla-panicking'],  '5.6': ['sla-panicking'],
      '6.1': [],                 '6.2': [],  '6.3': [], '6.4': [], '6.5': [], '6.6': []
    };
    const mCondIds = MENTAL_CRIT_CONDITIONS[key] || [];
    for (const condId of mCondIds) {
      try {
        const already = actor.statuses?.has(condId);
        if (!already) await actor.toggleStatusEffect(condId, { active: true });
      } catch(_) {}
    }

    // If instant death
    if (critical.timeLimit === 'Instant') {
      ui.notifications.error(`${actor.name} has died from ${critical.name}!`);
    }
  }

  /**
   * Get mental critical injury details
   * @param {string} key - The D66 key (e.g., "3.4")
   * @returns {Object} Critical injury details
   * @private
   */
  _getMentalCritical(key) {
    // Simplified lookup - in production, load from tables-data.json
    const criticals = {
      "1.1": { name: "Shaken", lethal: false, effects: "+1 Stress; -1 die to all rolls for 1 round.", recovery: "1 stretch" },
      "1.2": { name: "Tunnel vision", lethal: false, effects: "-2 dice to Observation; you miss side details.", recovery: "1 shift" },
      "2.1": { name: "Anxiety spiral", lethal: false, effects: "+1 Stress each shift until safe rest stretch.", recovery: "D6 shifts" },
      "3.1": { name: "Rage trigger", lethal: false, effects: "When harmed/insulted: pass Resolve check or retaliate next action.", recovery: "2D6 days" },
      "4.1": { name: "Major breakdown", lethal: false, effects: "Broken for D6 rounds; afterward -2 dice to mental rolls for 1 day.", recovery: "D6 days" },
      "5.1": { name: "Permanent phobia", lethal: false, effects: "As Phobia but only therapy/arc resolution removes it.", recovery: "Permanent until treated" },
      "6.1": { name: "Heart seizure", lethal: true, timeLimit: "1 shift", effects: "Each shift make Stamina; fail = death.", recovery: "—" },
      "6.6": { name: "Heart stops", lethal: true, timeLimit: "Instant", effects: "You die immediately.", recovery: "—" }
    };

    return criticals[key] || { name: "Shaken", lethal: false, effects: "+1 Stress; -1 die to all rolls for 1 round.", recovery: "1 stretch" };
  }

  /**
   * Roll Physical Critical Injury (D66)
   * @param {Actor} actor - The actor suffering the critical
   * @private
   */
  async _rollPhysicalCritical(actor) {
    // Roll D66 as single Roll so Dice So Nice animates both dice together
    const d66Roll = new Roll('1d6 + 1d6', {});
    await d66Roll.evaluate();

    // Apply alien dice skin — force zero-engine system via appearance
    for (const term of (d66Roll.dice || [])) {
      term.options = term.options || {};
      term.options.appearance = { system: "zero-engine" };
    }

    const tens = d66Roll.dice[0].results[0].result;
    const ones = d66Roll.dice[1].results[0].result;
    const key = `${tens}.${ones}`;

    // Get critical from lookup
    const critical = this._getPhysicalCritical(key);

    // Add to actor's critical injuries
    const injuries = actor.system.criticalInjuries.physical || [];
    injuries.push({
      key: key,
      name: critical.name,
      lethal: critical.lethal,
      timeLimit: critical.timeLimit || "",
      effects: critical.effects,
      healing: critical.healing,
      timestamp: Date.now()
    });

    await actor.update({ 'system.criticalInjuries.physical': injuries });

    // Create chat card
    let content = '<div class="critical-injury physical-critical">';
    content += `<p class="crit-roll">Rolled: <span class="inline-die-face">${tens}</span><span class="inline-die-face">${ones}</span> → <strong>${tens}.${ones}</strong></p>`;
    content += `<h3 class="crit-name">${critical.name}`;
    if (critical.lethal) {
      content += ' <span class="lethal">☠️ LETHAL</span>';
    }
    content += '</h3>';

    if (critical.timeLimit) {
      content += `<p class="time-limit"><strong>Time Limit:</strong> ${critical.timeLimit}</p>`;
    }

    content += `<p class="crit-effects"><strong>Effects:</strong> ${critical.effects}</p>`;
    content += `<p class="crit-healing"><strong>Healing:</strong> ${critical.healing}</p>`;
    content += '</div>';

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `<strong>🩸 PHYSICAL CRITICAL INJURY</strong>`,
      content: content,
      rolls: [d66Roll]
    });

    // Auto-apply condition from this crit result
    const PHYS_CRIT_CONDITIONS = {
      '1.1': ['sla-winded'],     '1.2': ['sla-winded'],     '1.3': ['sla-winded'],
      '1.4': ['sla-winded'],     '1.5': ['sla-bleeding'],   '1.6': ['sla-bleeding'],
      '2.1': ['sla-winded'],     '2.2': ['sla-broken-arm'], '2.3': ['sla-bleeding'],
      '2.4': ['sla-broken-arm'], '2.5': ['sla-bleeding'],   '2.6': ['sla-bleeding'],
      '3.1': ['sla-broken-leg'], '3.2': ['sla-broken-leg'], '3.3': ['sla-concussed'],
      '3.4': ['sla-broken-arm'], '3.5': ['sla-bleeding', 'sla-gut-wound'], '3.6': ['sla-gut-wound'],
      '4.1': ['sla-bleeding', 'sla-suppressed'],  '4.2': ['sla-broken-arm'],
      '4.3': ['sla-bleeding'],   '4.4': ['sla-gut-wound'],
      '4.5': ['sla-bleeding'],   '4.6': ['sla-bleeding'],
      '5.1': ['sla-bleeding'],   '5.2': ['sla-bleeding'],
      '5.3': ['sla-bleeding'],   '5.4': ['sla-bleeding'],
      '5.5': ['sla-stunned'],    '5.6': ['sla-stunned'],
      '6.1': [],                 '6.2': [],  '6.3': [], '6.4': [], '6.5': [], '6.6': []
    };
    const condIds = PHYS_CRIT_CONDITIONS[key] || [];
    for (const condId of condIds) {
      try {
        const already = actor.statuses?.has(condId);
        if (!already) await actor.toggleStatusEffect(condId, { active: true });
      } catch(_) {}
    }

    // If instant death
    if (critical.timeLimit === 'Instant') {
      ui.notifications.error(`${actor.name} has died from ${critical.name}!`);
    }
  }

  /**
   * Get physical critical injury details
   * @param {string} key - The D66 key (e.g., "3.4")
   * @returns {Object} Critical injury details
   * @private
   */
  _getPhysicalCritical(key) {
    // Simplified lookup - in production, load from tables-data.json
    const criticals = {
      "1.1": { name: "Winded", lethal: false, effects: "Lose next Fast action; -1 die to physical rolls for 1 round.", healing: "1 stretch" },
      "1.2": { name: "Sprained wrist", lethal: false, effects: "-2 dice to one-handed actions with that hand.", healing: "D6 shifts" },
      "2.1": { name: "Twisted ankle", lethal: false, effects: "-2 dice to Mobility; half movement speed.", healing: "D6 shifts" },
      "2.2": { name: "Concussion", lethal: false, effects: "-2 dice to Observation & Wits rolls; cannot Push.", healing: "D6 days" },
      "3.1": { name: "Broken ribs", lethal: false, effects: "-2 dice to Stamina; Slow actions cause 1 damage.", healing: "2D6 days" },
      "3.2": { name: "Deep laceration", lethal: false, effects: "-1 die to all physical rolls; 1 damage per shift unhealed.", healing: "D6 days" },
      "4.1": { name: "Punctured lung", lethal: true, timeLimit: "1 shift", effects: "-2 dice to Stamina & Mobility; each round exert = 1 damage.", healing: "D6 days" },
      "4.2": { name: "Broken arm", lethal: false, effects: "Cannot use that arm for any action.", healing: "2D6 days" },
      "5.1": { name: "Ruptured jugular", lethal: true, timeLimit: "1 round", effects: "Broken; -1 Health per round until stabilized.", healing: "D6 days after stabilized" },
      "5.2": { name: "Internal bleeding", lethal: true, timeLimit: "1 shift", effects: "-1 Health per shift until stabilized.", healing: "2D6 days" },
      "6.1": { name: "Crushed skull", lethal: true, timeLimit: "Instant", effects: "You die immediately.", healing: "—" },
      "6.6": { name: "Catastrophic destruction", lethal: true, timeLimit: "Instant", effects: "You die immediately.", healing: "—" }
    };

    return criticals[key] || { name: "Winded", lethal: false, effects: "Lose next Fast action; -1 die to physical rolls for 1 round.", healing: "1 stretch" };
  }
}

/**
 * Initialize the system
 */
Hooks.once('init', function() {
  console.log('Zero Engine | Initializing');

  if (!ZERO_ENGINE_CORE_COMBAT.captured) {
    ZERO_ENGINE_CORE_COMBAT.combatClass = CONFIG.Combat?.documentClass ?? null;
    ZERO_ENGINE_CORE_COMBAT.combatantClass = CONFIG.Combatant?.documentClass ?? null;
    ZERO_ENGINE_CORE_COMBAT.combatTrackerClass = CONFIG.ui?.combat ?? null;
    ZERO_ENGINE_CORE_COMBAT.captured = true;
  }

  // Register Handlebars helpers for SLA Industries templates
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper('gt', function(a, b) {
    return a > b;
  });

  Handlebars.registerHelper('lt', function(a, b) {
    return a < b;
  });

  Handlebars.registerHelper('lte', function(a, b) {
    return a <= b;
  });

  Handlebars.registerHelper('contains', function(array, value) {
    if (!Array.isArray(array)) return false;
    return array.includes(value);
  });

  Handlebars.registerHelper('concat', function(...args) {
    args.pop(); // Remove Handlebars options object
    return args.join('');
  });

  Handlebars.registerHelper('toUpperCase', function(str) {
    return String(str).toUpperCase();
  });

  Handlebars.registerHelper('capitalize', function(str) {
    if (!str) return '';
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
  });

  // Mk2 template helpers
  Handlebars.registerHelper('add', function(...args) {
    // last arg is Handlebars options hash — drop it
    const nums = args.slice(0, -1);
    return nums.reduce((sum, n) => sum + (Number(n) || 0), 0);
  });
  Handlebars.registerHelper('minus', function(a, b) { return (Number(a) || 0) - (Number(b) || 0); });
  Handlebars.registerHelper('times', function(n, options) {
    let out = '';
    for (let i = 0; i < Number(n); i++) out += options.fn({ index: i });
    return out;
  });
  Handlebars.registerHelper('or', function(...args) {
    const opts = args[args.length - 1];
    const vals = args.slice(0, -1);
    const result = vals.some(Boolean);
    // Block helper usage: {{#or a b}}...{{/or}}
    if (opts && typeof opts.fn === 'function') {
      return result ? opts.fn(this) : (typeof opts.inverse === 'function' ? opts.inverse(this) : '');
    }
    // Inline helper usage: {{or a b}}
    return result;
  });
  Handlebars.registerHelper('gte', function(a, b) { return Number(a) >= Number(b); });
  Handlebars.registerHelper('not', function(val) { return !val; });

  console.log('Zero Engine | Handlebars helpers registered');

  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("zero-engine", ZeroEngineActorSheet, {
    makeDefault: true,
    label: "Zero Engine Character Sheet"
  });

  // Register item sheet
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("zero-engine", ZeroEngineItemSheet, {
    makeDefault: true,
    label: "Zero Engine Item Sheet"
  });

  // Register Mk2 dark sheet as an alternative (ZeroEngineActorSheetMk2 defined later in file;
  // Foundry calls this callback after the full script evaluates, so the class exists by then)
  foundry.documents.collections.Actors.registerSheet("zero-engine", ZeroEngineActorSheetMk2, {
    types: ["character"],
    makeDefault: false,
    label: "Zero Engine — Mk2 (Dark)"
  });

  console.log('Zero Engine | Actor and Item sheets registered');

  // Register SLA combat conditions as Foundry status effects (token HUD icons)
  // SLA_CONDITIONS is defined later in the file but the module executes fully
  // before any Hook callbacks run, so the constant exists by the time this fires.
  Hooks.once("setup", () => {
    for (const cond of SLA_CONDITIONS) {
      const existing = CONFIG.statusEffects.find(e => e.id === cond.id);
      if (!existing) {
        CONFIG.statusEffects.push({
          id:    cond.id,
          name:  cond.label,
          icon:  cond.icon,
          label: cond.label
        });
      }
    }
    console.log("Zero Engine | SLA combat conditions registered");
  });
});

Hooks.once("setup", () => {
  // Apply after all module init hooks so card-based module overrides are reverted.
  restoreZeroEngineCoreCombatConfig();
  ensureCombatantCompatibilityMethods();
});

/**
 * Ready hook
 */
Hooks.once('ready', function() {
  console.log('Zero Engine | Ready');

  // ── ONE-TIME DATA SANITIZATION ────────────────────────────────────────
  // Fix actors whose skill/flux values were corrupted by duplicate form inputs
  // (stored as "X,X" string).  Safe to run every boot — skips clean actors.
  if (game.user?.isGM) {
    (async () => {
      for (const actor of game.actors ?? []) {
        const updates = {};
        const skills = actor.system.skills ?? {};
        for (const [key, skill] of Object.entries(skills)) {
          const raw = skill?.value;
          const isCorrupt = (typeof raw === 'string' && (raw.includes(',') || raw === 'NaN' || isNaN(Number(raw))))
            || (typeof raw === 'number' && isNaN(raw));
          if (isCorrupt) {
            updates[`system.skills.${key}.value`] = parseInt(raw) || 0;
            console.warn(`Zero Engine | Sanitizing corrupt skill ${key} on actor "${actor.name}": "${raw}" → ${updates[`system.skills.${key}.value`]}`);
          }
        }
        const rawFlux = actor.system.flux?.value;
        const fluxCorrupt = (typeof rawFlux === 'string' && (rawFlux.includes(',') || rawFlux === 'NaN' || isNaN(Number(rawFlux))))
          || (typeof rawFlux === 'number' && isNaN(rawFlux));
        if (fluxCorrupt) {
          updates['system.flux.value'] = parseInt(rawFlux) || 0;
          console.warn(`Zero Engine | Sanitizing corrupt flux on actor "${actor.name}": "${rawFlux}" → ${updates['system.flux.value']}`);
        }
        if (Object.keys(updates).length > 0) {
          await actor.update(updates);
        }
      }
    })();
  }

  // Ensure ranged weapons have ammo/magazine/ammoType defaults
  (async () => {
    const disableYzeCardMode = async () => {
      if (!game.user?.isGM || !game.modules?.get("yze-combat")?.active) return;
      const safeSet = async (key, value) => {
        try { await game.settings.set("yze-combat", key, value); } catch (_err) {}
      };
      await safeSet("initAutoDraw", false);
      await safeSet("initMessaging", false);
      await safeSet("initResetDeckOnCombatStart", false);
      await safeSet("resetEachRound", false);
      // Higher initiative should act first.
      await safeSet("initSortOrder", -1);
    };
    await disableYzeCardMode();

    const restoreStandardInitiative = async () => {
      const yzeCombatActive = game.modules?.get("yze-combat")?.active;
      if (!yzeCombatActive) return;
      restoreZeroEngineCoreCombatConfig();
      ensureCombatantCompatibilityMethods();

      for (const combat of game.combats ?? []) {
        const updates = [];
        for (const combatant of combat.combatants) {
          // Sync combatant initiative and yze-combat display to whatever is stored
          // on the actor (0 if never rolled). Use value-setting not key-deletion
          // to avoid deprecated "-=" Foundry v14 syntax.
          const actorInit = Number(combatant.actor?.system?.combat?.initiative ?? 0) || 0;
          updates.push({
            _id: combatant.id,
            initiative: actorInit,
            "flags.yze-combat.cardValue": actorInit,
            "flags.yze-combat.cardName": "ZE INIT"
          });
        }
        if (updates.length > 0) {
          await combat.updateEmbeddedDocuments("Combatant", updates);
        }
      }
    };

    await restoreStandardInitiative();
    // Force tracker to repaint so stale yze-combat values are replaced
    if (ui.combat) setTimeout(() => ui.combat.render(false), 500);

    const defaultMagazine = 10;
    const clampInitiativeMod = (value) => {
      const mod = Number(value) || 0;
      return Math.max(-5, Math.min(5, mod));
    };
    const clampDerivedMod = (value) => {
      const mod = Number(value) || 0;
      return Math.max(-10, Math.min(10, mod));
    };
    const updateWeapon = async (item) => {
      const data = item.system || {};
      const isRanged = data.category === "ranged";
      if (!isRanged) return;

      const updates = {};
      if (!data.magazine || data.magazine <= 0) updates["system.magazine"] = defaultMagazine;
      const magValue = updates["system.magazine"] ?? data.magazine ?? 0;
      if (!data.ammo || data.ammo <= 0) updates["system.ammo"] = magValue;
      if (!data.ammoType) updates["system.ammoType"] = "standard";
      if (!Array.isArray(data.fireModes) || data.fireModes.length === 0) updates["system.fireModes"] = ["single"];
      if (data.autoAmmoUse === undefined || data.autoAmmoUse === null) updates["system.autoAmmoUse"] = 8;
      if (data.equipped === undefined || data.equipped === null) updates["system.equipped"] = false;

      if (Object.keys(updates).length > 0) {
        await item.update(updates);
      }
    };
    const updateInitiativeMod = async (item) => {
      if (!["weapon", "armor", "equipment"].includes(item.type)) return;

      const data = item.system || {};
      const current = data.initiativeMod;
      const next = clampInitiativeMod(current);
      if (current === undefined || current === null || Number(current) !== next) {
        await item.update({ "system.initiativeMod": next });
      }
      if (item.system?.equipped === undefined || item.system?.equipped === null) {
        await item.update({ "system.equipped": false });
      }
    };
    const updateDerivedModFields = async (item) => {
      if (!["armor", "equipment", "specialty"].includes(item.type)) return;

      const data = item.system || {};
      const currentHealth = data.healthMod;
      const currentResolve = data.resolveMod;
      const nextHealth = clampDerivedMod(currentHealth);
      const nextResolve = clampDerivedMod(currentResolve);
      const updates = {};

      if (currentHealth === undefined || currentHealth === null || Number(currentHealth) !== nextHealth) {
        updates["system.healthMod"] = nextHealth;
      }
      if (currentResolve === undefined || currentResolve === null || Number(currentResolve) !== nextResolve) {
        updates["system.resolveMod"] = nextResolve;
      }

      if (Object.keys(updates).length > 0) {
        await item.update(updates);
      }
    };
    const updateDrugModel = async (item) => {
      if (!(item.type === "equipment" && item.system?.isDrug === true)) return;

      const data = item.system || {};
      const clampSmall = (value) => Math.max(-10, Math.min(10, Number(value) || 0));
      const clampQty = (value) => Math.max(0, Number(value) || 0);
      const updates = {};

      if (data.quantity === undefined || data.quantity === null || Number(data.quantity) < 0) updates["system.quantity"] = clampQty(data.quantity ?? 1);
      if (data.active === undefined || data.active === null) updates["system.active"] = false;
      if (data.withdrawalActive === undefined || data.withdrawalActive === null) updates["system.withdrawalActive"] = false;
      if (data.activeDuration === undefined || data.activeDuration === null) updates["system.activeDuration"] = "1 shift";
      if (data.withdrawalDuration === undefined || data.withdrawalDuration === null) updates["system.withdrawalDuration"] = "";

      const numericPaths = [
        "healthMod", "resolveMod", "statPhysicalMod", "skillAllMod", "panicReduction",
        "injuryPenaltyIgnore", "stressRecoveryBonus", "postUseStaminaDamage",
        "wdHealthMod", "wdResolveMod", "wdStatPhysicalMod", "wdSkillAllMod", "wdPanicReduction",
        "wdInjuryPenaltyIgnore", "wdStressRecoveryBonus", "wdPostUseStaminaDamage"
      ];
      for (const key of numericPaths) {
        const next = clampSmall(data[key]);
        if (data[key] === undefined || data[key] === null || Number(data[key]) !== next) {
          updates[`system.${key}`] = next;
        }
      }

      const skillKeys = ["force", "melee", "stamina", "marksmanship", "mobility", "stealth", "crafting", "observation", "survival", "healing", "insight", "persuasion"];
      for (const key of skillKeys) {
        const current = Number(data.skillMods?.[key] ?? 0);
        const next = clampSmall(current);
        if (data.skillMods?.[key] === undefined || current !== next) {
          updates[`system.skillMods.${key}`] = next;
        }
        const wdCurrent = Number(data.wdSkillMods?.[key] ?? 0);
        const wdNext = clampSmall(wdCurrent);
        if (data.wdSkillMods?.[key] === undefined || wdCurrent !== wdNext) {
          updates[`system.wdSkillMods.${key}`] = wdNext;
        }
      }

      if (Object.keys(updates).length > 0) {
        await item.update(updates);
      }
    };
    const updateArmorModel = async (item) => {
      if (item.type !== "armor") return;

      const data = item.system || {};
      const updates = {};
      const legacyArmor = Number(data.armorRating || data.armor || 0);
      const normalizeStatTarget = (value, statMod) => {
        const raw = String(value || "").trim().toLowerCase();
        if (raw === "strength" || raw === "agility" || raw === "") return raw;
        if (raw.includes("str")) return "strength";
        if (raw.includes("agi")) return "agility";
        // Legacy broad "physical" text: map to agility by default for mobility-heavy usage.
        if (raw.includes("physical")) return Number(statMod || 0) === 0 ? "" : "agility";
        return "";
      };
      const normalizeSkillTarget = (value, skillMod) => {
        const raw = String(value || "").trim().toLowerCase();
        if (raw === "force" || raw === "mobility" || raw === "stealth" || raw === "") return raw;
        if (raw.includes("force")) return "force";
        if (raw.includes("mobility")) return "mobility";
        if (raw.includes("stealth")) return "stealth";
        return Number(skillMod || 0) === 0 ? "" : "";
      };

      if (data.armorDice === undefined || data.armorDice === null) updates["system.armorDice"] = Math.max(0, legacyArmor);
      if (data.armorAuto === undefined || data.armorAuto === null) updates["system.armorAuto"] = 0;
      if (data.statMod === undefined || data.statMod === null) updates["system.statMod"] = 0;
      if (data.skillMod === undefined || data.skillMod === null) updates["system.skillMod"] = 0;
      if (data.statModTarget === undefined || data.statModTarget === null) updates["system.statModTarget"] = "";
      if (data.skillModTarget === undefined || data.skillModTarget === null) updates["system.skillModTarget"] = "";
      if (data.healthMod === undefined || data.healthMod === null) updates["system.healthMod"] = 0;
      if (data.resolveMod === undefined || data.resolveMod === null) updates["system.resolveMod"] = 0;
      if (data.equipped === undefined || data.equipped === null) updates["system.equipped"] = false;

      const nextDice = Math.max(0, Number((updates["system.armorDice"] ?? data.armorDice ?? legacyArmor)) || 0);
      const nextAuto = Math.max(0, Number((updates["system.armorAuto"] ?? data.armorAuto ?? 0)) || 0);
      const nextStat = Math.max(-5, Math.min(5, Number((updates["system.statMod"] ?? data.statMod ?? 0)) || 0));
      const nextSkill = Math.max(-5, Math.min(5, Number((updates["system.skillMod"] ?? data.skillMod ?? 0)) || 0));
      const nextStatTarget = normalizeStatTarget((updates["system.statModTarget"] ?? data.statModTarget), nextStat);
      const nextSkillTarget = normalizeSkillTarget((updates["system.skillModTarget"] ?? data.skillModTarget), nextSkill);

      if (Number(data.armorDice ?? legacyArmor) !== nextDice) updates["system.armorDice"] = nextDice;
      if (Number(data.armorAuto ?? 0) !== nextAuto) updates["system.armorAuto"] = nextAuto;
      if (Number(data.statMod ?? 0) !== nextStat) updates["system.statMod"] = nextStat;
      if (Number(data.skillMod ?? 0) !== nextSkill) updates["system.skillMod"] = nextSkill;
      if (String(data.statModTarget ?? "") !== nextStatTarget) updates["system.statModTarget"] = nextStatTarget;
      if (String(data.skillModTarget ?? "") !== nextSkillTarget) updates["system.skillModTarget"] = nextSkillTarget;
      if (Number(data.armorRating ?? legacyArmor) !== nextDice) updates["system.armorRating"] = nextDice;

      if (Object.keys(updates).length > 0) {
        await item.update(updates);
      }
    };

    for (const item of game.items) {
      await updateWeapon(item);
      await updateArmorModel(item);
      await updateInitiativeMod(item);
      await updateDerivedModFields(item);
      await updateDrugModel(item);
    }
    for (const actor of game.actors) {
      for (const item of actor.items) {
        await updateWeapon(item);
        await updateArmorModel(item);
        await updateInitiativeMod(item);
        await updateDerivedModFields(item);
        await updateDrugModel(item);
      }
      if (actor.type === "character") {
        await recalcDerivedStats(actor, { _zeAutoCriticalInternal: true });
      }
    }

    // Ensure default armor templates exist as world items
    try {
      if (game.user?.isGM) {
        const armorResponse = await fetch("systems/zero-engine/packs/armors.json");
        if (armorResponse.ok) {
          const armorTemplates = await armorResponse.json();
          for (const armorData of armorTemplates) {
            if (!armorData || armorData.type !== "armor" || !armorData.name) continue;
            const exists = game.items.some(i => i.type === "armor" && i.name === armorData.name);
            if (exists) continue;
            await Item.create(armorData);
          }
        }
      }
    } catch (err) {
      console.warn("Zero Engine | Failed to ensure default armor items", err);
    }

    // Ensure default drug templates exist as world items
    try {
      if (game.user?.isGM) {
        const drugResponse = await fetch("systems/zero-engine/packs/drugs.json");
        if (drugResponse.ok) {
          const drugTemplates = await drugResponse.json();
          for (const drugData of drugTemplates) {
            if (!drugData || drugData.type !== "equipment" || !drugData.name) continue;
            const exists = game.items.some(i => i.type === "equipment" && i.system?.isDrug === true && i.name === drugData.name);
            if (exists) continue;
            await Item.create(drugData);
          }
        }
      }
    } catch (err) {
      console.warn("Zero Engine | Failed to ensure default drug items", err);
    }

    // Ensure default ebb formula items exist as world items (also patches img on existing items)
    try {
      if (game.user?.isGM) {
        const ebbResponse = await fetch("systems/zero-engine/packs/ebb-formulae.json");
        if (ebbResponse.ok) {
          const ebbFormulae = await ebbResponse.json();
          for (const ebbData of ebbFormulae) {
            if (!ebbData || ebbData.type !== "ebb" || !ebbData.name) continue;
            const existing = game.items.find(i => i.type === "ebb" && i.name === ebbData.name);
            if (existing) {
              // Patch img if it doesn't match the pack (handles icon migrations)
              if (existing.img !== ebbData.img) {
                await existing.update({ img: ebbData.img });
              }
              continue;
            }
            await Item.create(ebbData);
          }
        }
      }
    } catch (err) {
      console.warn("Zero Engine | Failed to ensure default ebb formula items", err);
    }

    // Ensure critical failure roll tables exist
    try {
      const response = await fetch("systems/zero-engine/packs/tables-data.json");
      if (response.ok) {
        const tablesData = await response.json();
        const ensureTable = async (tableData) => {
          if (!tableData || !tableData.name || !Array.isArray(tableData.results)) return;
          if (game.tables.getName(tableData.name)) return;
          const results = tableData.results.map((r) => ({
            type: CONST.TABLE_RESULT_TYPES.TEXT,
            text: r.text,
            range: r.range,
            weight: 1,
            drawn: false
          }));
          await RollTable.create({
            name: tableData.name,
            formula: tableData.formula || "2d6",
            results: results
          });
        };

        await ensureTable(tablesData.rangedCriticalFail);
        await ensureTable(tablesData.meleeCriticalFail);
      }
    } catch (err) {
      console.warn("Zero Engine | Failed to ensure critical fail tables", err);
    }
  })();
});

Hooks.on("createCombatant", async (combatant, _data, _options, userId) => {
  if (game.user?.id !== userId) return;
  const actorInit = Number(combatant.actor?.system?.combat?.initiative ?? 0) || 0;
  const updates = {
    "flags.yze-combat.cardValue": actorInit
  };
  if (Number(combatant.initiative ?? 0) !== actorInit) {
    updates.initiative = actorInit;
  }
  await combatant.update(updates);
});

Hooks.on("renderCombatTracker", (app, html) => {
  const jq = html instanceof jQuery ? html : $(html);
  const viewedCombat = app?.viewed || game.combat;
  if (!viewedCombat) return;

  jq.find(".token-initiative .roll").each((_i, el) => {
    const btn = $(el);
    btn.off("click.zeroEngineNoCardInit");
    btn.on("click.zeroEngineNoCardInit", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      ui.notifications.info("Use AGI or WIT button for initiative.");
      return false;
    });
  });

  const rollForCombatant = async (combatant, useMobility) => {
    const actor = combatant?.actor;
    if (!actor) return;
    if (!game.user?.isGM && !actor.isOwner) return;
    const sheet = actor.sheet instanceof ZeroEngineActorSheet
      ? actor.sheet
      : new ZeroEngineActorSheet(actor);
    await sheet._rollInitiative(useMobility, combatant.id, viewedCombat.id);
  };

  jq.find("li.combatant").each((_idx, li) => {
    const row = $(li);
    if (row.find(".ze-combatant-init-controls").length) return;
    const combatantId = String(row.data("combatant-id") || "");
    if (!combatantId) return;

    const controls = $(`
      <div class="ze-combatant-init-controls" data-combatant-id="${combatantId}">
        <span class="ze-init-score">${Number.isFinite(Number(viewedCombat.combatants.get(combatantId)?.initiative)) ? Number(viewedCombat.combatants.get(combatantId)?.initiative) : "-"}</span>
        <button type="button" class="ze-row-init-btn" data-mode="agi" title="AGI + Mobility base + successes">AGI+MOB</button>
        <button type="button" class="ze-row-init-btn" data-mode="wit" title="WIT + Observation base + successes">WIT+OBS</button>
      </div>
    `);

    const nameNode = row.find(".token-name").first();
    if (nameNode.length) nameNode.append(controls);
    else row.append(controls);

    controls.find(".ze-row-init-btn").on("click", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const mode = String($(ev.currentTarget).data("mode") || "agi");
      const combatant = viewedCombat.combatants.get(combatantId);
      if (!combatant) return;
      await rollForCombatant(combatant, mode === "agi");
      const refreshed = viewedCombat.combatants.get(combatantId);
      const nextVal = Number(refreshed?.initiative);
      controls.find(".ze-init-score").text(Number.isFinite(nextVal) ? String(nextVal) : "-");
      app.render(false);
    });
  });
});

// ══ Zero Engine — Dice So Nice: Alien RPG dice skin ══════════════════════════
// Normal pool dice: Alien yellow d6 (skull on 1, blank 2-5, success on 6).
// Stress pool dice: Alien black d6 (blank 1-5, success on 6).
// Two separate DSN systems so the presets don't overwrite each other.
// Roll code forces the correct system via term.options.appearance — this
// completely bypasses the user's saved DSN system preference.
Hooks.once("diceSoNiceReady", (dice3d) => {
  // ── Colorsets ───────────────────────────────────────────────────────────────
  dice3d.addColorset({
    name: "ze-normal",
    description: "ZE Normal Dice — Yellow (Alien)",
    category: "Zero Engine",
    foreground: ["#e3e300"],
    background: ["#e3e300"],
    outline: "#000000",
    texture: "none",
    material: "plastic",
    visibility: "visible"
  });

  dice3d.addColorset({
    name: "ze-stress",
    description: "ZE Stress Dice — Black (Alien)",
    category: "Zero Engine",
    foreground: ["#ffffff"],
    background: ["#111111"],
    outline: "#333333",
    texture: "none",
    material: "plastic",
    visibility: "visible"
  });

  // ── Two systems — one per die type so presets don't overwrite each other ────
  dice3d.addSystem({ id: "zero-engine",       name: "Zero Engine — Normal Dice" }, "preferred");
  dice3d.addSystem({ id: "ze-stress-dice",    name: "Zero Engine — Stress Dice" });

  // ── Normal d6: Alien yellow dice (system: zero-engine) ──────────────────────
  // Face 1 = skull (bane), 2-5 = blank, 6 = alien success symbol
  dice3d.addDicePreset({
    type: "d6",
    labels: [
      "systems/zero-engine/assets/dice/alien/alien-dice-y1.png",
      "systems/zero-engine/assets/dice/alien/alien-dice-y0.png",
      "systems/zero-engine/assets/dice/alien/alien-dice-y0.png",
      "systems/zero-engine/assets/dice/alien/alien-dice-y0.png",
      "systems/zero-engine/assets/dice/alien/alien-dice-y0.png",
      "systems/zero-engine/assets/dice/alien/alien-dice-y6.png",
    ],
    colorset: "ze-normal",
    system: "zero-engine",
  });

  // ── Stress d6: Alien black dice (system: ze-stress-dice) ────────────────────
  // Face 1-5 = blank, 6 = success symbol
  dice3d.addDicePreset({
    type: "d6",
    labels: [
      "systems/zero-engine/assets/dice/alien/alien-dice-b0.png",
      "systems/zero-engine/assets/dice/alien/alien-dice-b0.png",
      "systems/zero-engine/assets/dice/alien/alien-dice-b0.png",
      "systems/zero-engine/assets/dice/alien/alien-dice-b0.png",
      "systems/zero-engine/assets/dice/alien/alien-dice-b0.png",
      "systems/zero-engine/assets/dice/alien/alien-dice-b6.png",
    ],
    colorset: "ze-stress",
    system: "ze-stress-dice",
  });
});

/**
 * Handle Push button clicks in chat
 * Uses new automatic Push mechanics: re-roll all non-6s, Stress + Panic only if stress bane appears
 */
Hooks.on('renderChatMessageHTML', (message, html) => {
  // html is an HTMLElement in Foundry v14 — use native DOM, not jQuery
  html.querySelectorAll('.yze-push-button').forEach(btn => {
    btn.addEventListener('click', async (event) => {
      event.preventDefault();

      const flags = message.flags?.['zero-engine'];
      if (!flags || !flags.canPush || flags.pushed) {
        ui.notifications.warn('This roll cannot be pushed!');
        return;
      }

      // Resolve actor via token (handles unlinked tokens correctly)
      let actor = null;
      if (flags.tokenId && flags.sceneId) {
        const scene = game.scenes?.get(flags.sceneId);
        const tokenDoc = scene?.tokens?.get(flags.tokenId);
        if (tokenDoc) actor = tokenDoc.actor;
      }
      if (!actor) actor = game.actors.get(flags.actorId);

      if (!actor || !actor.sheet) {
        ui.notifications.error('Actor not found!');
        return;
      }

      await actor.sheet._onPushRoll(message);
    });
  });
});

/**
 * Helper: read derived stat value from actor data (scalar or object shape)
 * @param {Actor} actor
 * @param {string} key
 * @returns {number}
 */
function getDerivedValue(actor, key) {
  const raw = actor?.system?.derivedStats?.[key];
  const value = Number((typeof raw === "object" ? raw?.value : raw) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Helper: trigger critical injury rolls without requiring rendered sheet state
 * @param {Actor} actor
 * @param {"physical"|"mental"} kind
 * @returns {Promise<void>}
 */
// ── Crit dedup guard ──────────────────────────────────────────────────────────
// Tracks when a crit was last fired per actor so auto-crit and manual button
// can't both fire in quick succession for the same event.
const _critLastFired = new Map(); // actorId → { physical?: ms, mental?: ms }

function _critCooldownActive(actorId, kind, windowMs = 8000) {
  const entry = _critLastFired.get(actorId) || {};
  const last = entry[kind] || 0;
  return (Date.now() - last) < windowMs;
}

function _critRecordFired(actorId, kind) {
  const entry = _critLastFired.get(actorId) || {};
  entry[kind] = Date.now();
  _critLastFired.set(actorId, entry);
}

async function runAutoCritical(actor, kind) {
  // Skip if a crit of this kind was already rolled very recently for this actor
  if (_critCooldownActive(actor.id, kind)) {
    console.warn(`Zero Engine | Auto-crit (${kind}) skipped for ${actor.name} — already fired within cooldown window.`);
    return;
  }
  _critRecordFired(actor.id, kind);

  const sheet = actor?.sheet;
  if (kind === "physical") {
    if (sheet && typeof sheet._rollPhysicalCritical === "function") {
      await sheet._rollPhysicalCritical(actor);
      return;
    }
    await ZeroEngineActorSheet.prototype._rollPhysicalCritical.call({
      _getPhysicalCritical: ZeroEngineActorSheet.prototype._getPhysicalCritical
    }, actor);
    return;
  }

  if (sheet && typeof sheet._rollMentalCritical === "function") {
    await sheet._rollMentalCritical(actor);
    return;
  }
  await ZeroEngineActorSheet.prototype._rollMentalCritical.call({
    _getMentalCritical: ZeroEngineActorSheet.prototype._getMentalCritical
  }, actor);
}

const RACE_DERIVED_MODS = {
  human: { health: 0, resolve: 0 },
  ebon: { health: 0, resolve: 0 },
  brainwaster: { health: 0, resolve: 0 },
  stormer: { health: 0, resolve: 0 },
  shaktar: { health: 0, resolve: 0 },
  wraith: { health: 0, resolve: 0 },
  frother: { health: 0, resolve: 0 }
};

const TRAINING_DERIVED_MODS = {
  scout: { health: 0, resolve: 0 },
  investigator: { health: 0, resolve: 0 },
  corporate: { health: 0, resolve: 0 },
  medic: { health: 0, resolve: 0 },
  "ebon-investigator": { health: 0, resolve: 0 },
  "brainwaster-operative": { health: 0, resolve: 0 }
};

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, toNumber(value, min)));
}

function getEffectDerivedMod(effect, stat) {
  if (!effect) return 0;
  const direct = toNumber(effect.getFlag("zero-engine", `${stat}Mod`), 0);
  const drug = toNumber(effect.getFlag("zero-engine", `drug${stat === "health" ? "Health" : "Resolve"}Mod`), 0);
  const legacy = toNumber(effect.getFlag("sla-yze", `${stat}Mod`), 0);
  return direct + drug + legacy;
}

function getSpecialtyDerivedMod(item, stat) {
  if (!item || item.type !== "specialty") return 0;
  if (item.system?.isActive === false) return 0;

  const explicit = toNumber(item.system?.[`${stat}Mod`], 0);
  if (explicit !== 0) return explicit;

  // Back-compat: existing True Grit entries may not have explicit numeric fields yet.
  if (stat === "health") {
    const name = String(item.name || "").trim().toLowerCase();
    if (name === "true grit") return 1;
    const summary = String(item.system?.effects || "").toLowerCase();
    if (summary.includes("maximum health")) return 1;
  }

  return 0;
}

function calculateHealthResolve(actor) {
  const attrs = actor?.system?.attributes || {};
  const raceKey = String(actor?.system?.race || "").trim().toLowerCase();
  const trainingKey = String(actor?.system?.training || "").trim().toLowerCase();

  const baseHealth = toNumber(attrs?.strength?.value, 0) + toNumber(attrs?.agility?.value, 0);
  const baseResolve = toNumber(attrs?.wits?.value, 0) + toNumber(attrs?.empathy?.value, 0);

  const raceMods = RACE_DERIVED_MODS[raceKey] || { health: 0, resolve: 0 };
  const trainingMods = TRAINING_DERIVED_MODS[trainingKey] || { health: 0, resolve: 0 };

  let equipmentHealth = 0;
  let equipmentResolve = 0;
  let specialtyHealth = 0;
  let specialtyResolve = 0;

  for (const item of actor.items || []) {
    if (item.type === "armor" || item.type === "equipment") {
      const equipped = item.system?.equipped === true || item.system?.isEquipped === true;
      if (!equipped) continue;
      equipmentHealth += toNumber(item.system?.healthMod, 0);
      equipmentResolve += toNumber(item.system?.resolveMod, 0);
      continue;
    }

    if (item.type === "specialty") {
      specialtyHealth += getSpecialtyDerivedMod(item, "health");
      specialtyResolve += getSpecialtyDerivedMod(item, "resolve");
    }

  }

  let drugHealth = 0;
  let drugResolve = 0;
  for (const item of actor.items || []) {
    if (!(item.type === "equipment" && item.system?.isDrug === true)) continue;
    if (item.system?.active) {
      drugHealth += toNumber(item.system?.healthMod, 0);
      drugResolve += toNumber(item.system?.resolveMod, 0);
    } else if (item.system?.withdrawalActive) {
      drugHealth += toNumber(item.system?.wdHealthMod, 0);
      drugResolve += toNumber(item.system?.wdResolveMod, 0);
    }
  }

  // Back-compat path: allow Active Effects to still contribute temporary modifiers.
  for (const effect of actor.effects || []) {
    drugHealth += getEffectDerivedMod(effect, "health");
    drugResolve += getEffectDerivedMod(effect, "resolve");
  }

  const healthMax = Math.max(0, baseHealth + raceMods.health + trainingMods.health + equipmentHealth + specialtyHealth + drugHealth);
  const resolveMax = Math.max(0, baseResolve + raceMods.resolve + trainingMods.resolve + equipmentResolve + specialtyResolve + drugResolve);

  return {
    healthMax,
    resolveMax,
    breakdown: {
      health: {
        base: baseHealth,
        race: raceMods.health,
        training: trainingMods.health,
        equipment: equipmentHealth,
        specialty: specialtyHealth,
        drug: drugHealth
      },
      resolve: {
        base: baseResolve,
        race: raceMods.resolve,
        training: trainingMods.resolve,
        equipment: equipmentResolve,
        specialty: specialtyResolve,
        drug: drugResolve
      }
    }
  };
}

function buildDerivedRecalcUpdate(actor) {
  if (!actor || actor.type !== "character") return null;

  const calc = calculateHealthResolve(actor);
  const currentHealth = getDerivedValue(actor, "health");
  const currentResolve = getDerivedValue(actor, "resolve");
  const currentHealthMax = toNumber(actor?.system?.derivedStats?.health?.max, currentHealth);
  const currentResolveMax = toNumber(actor?.system?.derivedStats?.resolve?.max, currentResolve);

  const nextHealthMax = Math.max(0, calc.healthMax);
  const nextResolveMax = Math.max(0, calc.resolveMax);
  const nextHealth = clampNumber(currentHealth, 0, nextHealthMax);
  const nextResolve = clampNumber(currentResolve, 0, nextResolveMax);

  const updates = {};
  if (currentHealthMax !== nextHealthMax) updates["system.derivedStats.health.max"] = nextHealthMax;
  if (currentResolveMax !== nextResolveMax) updates["system.derivedStats.resolve.max"] = nextResolveMax;
  if (currentHealth !== nextHealth) updates["system.derivedStats.health.value"] = nextHealth;
  if (currentResolve !== nextResolve) updates["system.derivedStats.resolve.value"] = nextResolve;

  // Clear stale broken flag — if current HP is above 0, broken is no longer valid.
  // This prevents the legacy -2 dice penalty persisting on healed characters.
  if (actor.system?.derivedStats?.broken === true && nextHealth > 0) {
    updates["system.derivedStats.broken"] = false;
  }

  // NOTE: breakdown is NOT in template.json — do not persist it or Foundry v14
  // schema validation will reset the entire derivedStats object (nuking stress, etc.)
  // Compute breakdown in getData() for display purposes only.

  return Object.keys(updates).length > 0 ? updates : null;
}

async function recalcDerivedStats(actor, updateOptions = {}) {
  const updates = buildDerivedRecalcUpdate(actor);
  if (!updates) return;
  await actor.update(updates, { _zeDerivedRecalcInternal: true, ...updateOptions });
}

function shouldRecalcForActorUpdate(change) {
  if (!change || !change.system) return false;
  return [
    "system.attributes.strength.value",
    "system.attributes.agility.value",
    "system.attributes.wits.value",
    "system.attributes.empathy.value",
    "system.race",
    "system.training"
  ].some(path => foundry.utils.hasProperty(change, path));
}

Hooks.on("preUpdateActor", (actor, change, options) => {
  if (options?._zeDerivedRecalcInternal) return;
  options._zePrevHealth = getDerivedValue(actor, "health");
  options._zePrevResolve = getDerivedValue(actor, "resolve");
});

Hooks.on("createActor", async (actor, options) => {
  if (actor?.type !== "character") return;
  if (options?._zeDerivedRecalcInternal) return;
  await recalcDerivedStats(actor);
});

Hooks.on("updateActor", async (actor, change, options) => {
  if (actor?.type !== "character") return;
  if (options?._zeDerivedRecalcInternal) return;

  // Also clear stale broken flag whenever HP is updated to > 0
  const hpChanged = foundry.utils.hasProperty(change, "system.derivedStats.health.value") ||
                    foundry.utils.hasProperty(change, "system.derivedStats.health");
  if (hpChanged && actor.system?.derivedStats?.broken === true) {
    const currentHp = Number(
      typeof actor.system.derivedStats.health === "object"
        ? actor.system.derivedStats.health?.value
        : actor.system.derivedStats.health
    ) || 0;
    if (currentHp > 0) {
      await actor.update({ "system.derivedStats.broken": false }, { _zeDerivedRecalcInternal: true });
    }
  }

  if (!shouldRecalcForActorUpdate(change)) return;
  await recalcDerivedStats(actor);

  // When race changes, auto-add any missing racial specialties for the new race
  if (foundry.utils.hasProperty(change, "system.race") && game.user?.isGM) {
    try { await _ensureRacialAbilities(actor); } catch(_) {}
  }
});

Hooks.on("createItem", async (item, options) => {
  const actor = item?.actor;
  if (actor?.type !== "character") return;
  if (options?._zeDerivedRecalcInternal) return;
  if (!["armor", "equipment", "specialty"].includes(item.type)) return;
  await recalcDerivedStats(actor);
});

Hooks.on("updateItem", async (item, change, options) => {
  const actor = item?.actor;
  if (actor?.type !== "character") return;
  if (options?._zeDerivedRecalcInternal) return;
  if (!["armor", "equipment", "specialty"].includes(item.type)) return;
  await recalcDerivedStats(actor);
});

Hooks.on("deleteItem", async (item, options) => {
  const actor = item?.actor;
  if (actor?.type !== "character") return;
  if (options?._zeDerivedRecalcInternal) return;
  if (!["armor", "equipment", "specialty"].includes(item.type)) return;
  await recalcDerivedStats(actor);
});

Hooks.on("createActiveEffect", async (effect, options) => {
  const actor = effect?.parent;
  if (actor?.documentName !== "Actor" || actor.type !== "character") return;
  if (options?._zeDerivedRecalcInternal) return;
  await recalcDerivedStats(actor);
});

Hooks.on("updateActiveEffect", async (effect, change, options) => {
  const actor = effect?.parent;
  if (actor?.documentName !== "Actor" || actor.type !== "character") return;
  if (options?._zeDerivedRecalcInternal) return;
  await recalcDerivedStats(actor);
});

Hooks.on("deleteActiveEffect", async (effect, options) => {
  const actor = effect?.parent;
  if (actor?.documentName !== "Actor" || actor.type !== "character") return;
  if (options?._zeDerivedRecalcInternal) return;
  await recalcDerivedStats(actor);
});

Hooks.on("updateActor", async (actor, change, options) => {
  if (actor?.type !== "character") return;
  if (options?._zeDerivedRecalcInternal) return;
  if (options?._zeAutoCriticalInternal) return;

  const prevHealth = Number(options?._zePrevHealth);
  const prevResolve = Number(options?._zePrevResolve);
  if (!Number.isFinite(prevHealth) && !Number.isFinite(prevResolve)) return;

  const nextHealth = getDerivedValue(actor, "health");
  const nextResolve = getDerivedValue(actor, "resolve");

  const healthBroke = Number.isFinite(prevHealth) && prevHealth > 0 && nextHealth <= 0;
  const resolveBroke = Number.isFinite(prevResolve) && prevResolve > 0 && nextResolve <= 0;
  if (!healthBroke && !resolveBroke) return;

  const updateOptions = { _zeAutoCriticalInternal: true };
  if (actor.system?.derivedStats?.broken !== true) {
    await actor.update({ "system.derivedStats.broken": true }, updateOptions);
  }

  if (healthBroke) {
    ui.notifications.warn(`${actor.name} is BROKEN and suffers a Physical Critical Injury!`);
    await runAutoCritical(actor, "physical");
  }
  if (resolveBroke) {
    ui.notifications.warn(`${actor.name} is BROKEN and suffers a Mental Critical Injury!`);
    await runAutoCritical(actor, "mental");
  }
});

// Old showPushDialog function removed - now using automatic Push mechanics


// ══════════════════════════════════════════════════════════════════════════════
//   SLA INDUSTRIES — CHARACTER GENERATORS  (appended to zero-engine.mjs)
//   PC Creator (multi-step wizard, 7 races, 8 training packages)
//   NPC Creator (quick + full modes, 10 archetypes)
// ══════════════════════════════════════════════════════════════════════════════

// ─── RACE DATA ───────────────────────────────────────────────────────────────
const SLA_RACES = {
  human: {
    label: 'Human', icon: '👤',
    flavor: 'The backbone of SLA Industries. Born, raised, and usually died on Mort. Adaptable, expendable, and everywhere.',
    baseAttrs: { strength: 2, agility: 2, wits: 2, empathy: 2 },
    attrPoints: 6,
    attrCaps: { strength: 5, agility: 5, wits: 5, empathy: 5 },
    skillPoints: 10, skillCap: 3,
    isEbbUser: false, healthMod: 0, resolveMod: 0
  },
  ebon: {
    label: 'Ebon', icon: '🔮',
    flavor: 'Born from the Ebb itself. Their minds reach where others cannot. SLA prizes them — and fears what they might become.',
    baseAttrs: { strength: 2, agility: 2, wits: 3, empathy: 3 },
    attrPoints: 4,
    attrCaps: { strength: 4, agility: 4, wits: 5, empathy: 5 },
    skillPoints: 10, skillCap: 3,
    isEbbUser: true, healthMod: 0, resolveMod: 1
  },
  brainwaster: {
    label: 'Brain Waster', icon: '🧠',
    flavor: 'Ebon mutation gone raw. The Ebb tears through them and takes pieces every time. Brilliantly, terrifyingly unstable.',
    baseAttrs: { strength: 2, agility: 2, wits: 4, empathy: 3 },
    attrPoints: 3,
    attrCaps: { strength: 3, agility: 4, wits: 5, empathy: 5 },
    skillPoints: 10, skillCap: 3,
    isEbbUser: true, healthMod: 0, resolveMod: 0
  },
  stormer: {
    label: 'Stormer (313-S Malice)', icon: '⚡',
    flavor: 'Vatgrown for war. A Stormer does not stop until the objective is complete — or it is dead. Usually the objective.',
    baseAttrs: { strength: 4, agility: 3, wits: 2, empathy: 2 },
    attrPoints: 3,
    attrCaps: { strength: 5, agility: 5, wits: 3, empathy: 3 },
    skillPoints: 8, skillCap: 3,
    isEbbUser: false, healthMod: 2, resolveMod: 0
  },
  shaktar: {
    label: 'Shaktar', icon: '🦂',
    flavor: 'Alien warrior caste. Honour is their law; violence is their art. Each kill is recorded. Each debt is paid.',
    baseAttrs: { strength: 3, agility: 3, wits: 2, empathy: 2 },
    attrPoints: 4,
    attrCaps: { strength: 5, agility: 5, wits: 4, empathy: 4 },
    skillPoints: 9, skillCap: 3,
    isEbbUser: false, healthMod: 1, resolveMod: 0
  },
  wraithraider: {
    label: 'Wraith Raider', icon: '👁️',
    flavor: 'They move through walls of shadow and kill without a sound. You never see them first. If you see them at all.',
    baseAttrs: { strength: 2, agility: 4, wits: 2, empathy: 2 },
    attrPoints: 4,
    attrCaps: { strength: 4, agility: 5, wits: 5, empathy: 4 },
    skillPoints: 10, skillCap: 3,
    isEbbUser: false, healthMod: 0, resolveMod: 1
  },
  frother: {
    label: 'Frother', icon: '💊',
    flavor: 'The battle chemicals make them something else entirely. Pain is irrelevant. Fear is gone. Only the job remains.',
    baseAttrs: { strength: 4, agility: 2, wits: 2, empathy: 2 },
    attrPoints: 4,
    attrCaps: { strength: 5, agility: 4, wits: 4, empathy: 3 },
    skillPoints: 8, skillCap: 3,
    isEbbUser: false, healthMod: 1, resolveMod: -1
  },
  vevaphon: {
    label: 'Stormer Vevaphon',
    icon: '🔀',
    flavor: "Sleight Industries' cancelled polymorphic bioweapon line. Shape-shifting combat chassis with three selectable morph forms. Every shift costs Instability — and enough shifts will shatter whoever they were.",
    baseAttrs: { strength: 3, agility: 3, wits: 2, empathy: 2 },
    attrPoints: 5,
    attrCaps: { strength: 5, agility: 5, wits: 4, empathy: 3 },
    skillPoints: 8, skillCap: 3,
    isEbbUser: false, healthMod: 2, resolveMod: -1
  }
};

// ─── TRAINING PACKAGES ───────────────────────────────────────────────────────
const SLA_TRAINING = {
  soldier: {
    label: 'Soldier', icon: '🎖️',
    flavor: 'Front-line combat. Point, shoot, advance.',
    skills: { melee: 2, marksmanship: 2, stamina: 1 },
    specialty: 'Hard Hitter',
    armor: 'CAF Armor', weapons: ['pistol', 'rifle']
  },
  scout: {
    label: 'Scout', icon: '🎯',
    flavor: 'Reconnaissance and rapid infiltration.',
    skills: { stealth: 2, mobility: 2, observation: 1 },
    specialty: 'Fast Reflexes',
    armor: 'Scout Armor', weapons: ['pistol', 'smg']
  },
  medic: {
    label: 'Combat Medic', icon: '🩺',
    flavor: 'Keeping the squad alive under fire.',
    skills: { healing: 2, insight: 1, observation: 2 },
    specialty: 'Field Surgeon',
    armor: 'Downtown Jacket', weapons: ['pistol'], gear: ['Medical Kit']
  },
  tech: {
    label: 'Technical Operative', icon: '🔧',
    flavor: 'Field engineering, hacking, and repairs.',
    skills: { crafting: 3, observation: 1, survival: 1 },
    specialty: 'Inquisitive',
    armor: 'Downtown Jacket', weapons: ['pistol'], gear: ['Tool Kit']
  },
  negotiator: {
    label: 'Negotiator', icon: '🗣️',
    flavor: 'Information, leverage, and social control.',
    skills: { persuasion: 2, insight: 2, observation: 1 },
    specialty: 'Gut Feeling',
    armor: 'Downtown Jacket', weapons: ['pistol'], gear: ['Encrypted Comms']
  },
  hunter: {
    label: 'Hunter', icon: '🏹',
    flavor: 'Track, observe, eliminate. Quietly.',
    skills: { marksmanship: 2, stealth: 2, observation: 1 },
    specialty: 'Sniper',
    armor: 'Scout Armor', weapons: ['rifle', 'pistol']
  },
  brawler: {
    label: 'Brawler', icon: '👊',
    flavor: 'Close quarters. No hesitation. Often Frother or Stormer.',
    skills: { force: 2, melee: 2, stamina: 1 },
    specialty: 'True Grit',
    armor: 'CAF Armor', weapons: ['heavy_melee', 'pistol']
  },
  ebb_user: {
    label: 'Ebb Channeller', icon: '✨',
    flavor: 'The Ebb flows through and burns bright. Ebon and Brain Waster only.',
    skills: { ebb: 3, insight: 1, persuasion: 1 },
    specialty: 'Ebb Sensitive',
    armor: 'Downtown Jacket', weapons: ['pistol'],
    // Race-differentiated starting formulae (selected at creation time)
    ebbEbon: [
      'Empathic Pulse',  // awareness — sense emotions
      'Danger Sense',    // awareness — can't be surprised
      'Mind-Link',       // communicate — silent mental comms
      'Calm',            // heal — reduce stress
      'Ebb Shield',      // protect — defensive reaction
      'Ebb Sight',       // senses — detect Ebb users
      'Surge',           // enhance — attribute boost
    ],
    ebbBrainwaster: [
      'Ebb Bolt',        // blast — direct damage
      'Heat Touch',      // thermal — melee Ebb damage
      'Surge',           // enhance — combat boost
      'Push',            // telekinesis — hurl targets
      'Empathic Pulse',  // awareness — sense surroundings
      'Ebb Shield',      // protect — defensive
      'Iron Flesh',      // enhance — automatic armour
    ],
    // Legacy fallback if race not detected
    ebb: ['Empathic Pulse', 'Ebb Bolt', 'Ebb Shield', 'Calm', 'Surge', 'Ebb Sight'],
    ebbOnly: true
  }
};

// ─── NPC ARCHETYPES ──────────────────────────────────────────────────────────
const SLA_NPC_TYPES = {
  civilian:           { label: 'Civilian',                 threat: 1, attrs: {strength:2,agility:2,wits:2,empathy:2},  skills: {observation:1},                                  hp: 4,  armor: 0, weapons: [] },
  gang_grunt:         { label: 'Gang Grunt',               threat: 1, attrs: {strength:3,agility:2,wits:2,empathy:2},  skills: {melee:2,force:1},                                hp: 5,  armor: 1, weapons: ['pistol','knife'] },
  shiver:             { label: 'Shiver (Patrol)',          threat: 2, attrs: {strength:3,agility:3,wits:2,empathy:2},  skills: {marksmanship:2,melee:1,observation:1},            hp: 6,  armor: 2, weapons: ['pistol','baton'] },
  operative_green:    { label: 'SLA Operative (Green)',    threat: 2, attrs: {strength:2,agility:3,wits:2,empathy:2},  skills: {marksmanship:2,mobility:1,observation:1},         hp: 5,  armor: 2, weapons: ['pistol','knife'] },
  carrien:            { label: 'Carrien',                  threat: 2, attrs: {strength:3,agility:4,wits:1,empathy:1},  skills: {melee:3,mobility:2},                             hp: 7,  armor: 1, weapons: ['claws'] },
  operative_veteran:  { label: 'SLA Operative (Veteran)', threat: 3, attrs: {strength:3,agility:3,wits:3,empathy:2},  skills: {marksmanship:3,melee:2,stealth:2,observation:2},  hp: 8,  armor: 3, weapons: ['rifle','pistol','knife'] },
  ebb_operative:      { label: 'Ebb Operative (Ebon)',     threat: 3, attrs: {strength:2,agility:2,wits:4,empathy:4},  skills: {ebb:3,insight:3,observation:2},                  hp: 6,  armor: 1, weapons: ['pistol'], flux: 4, isEbb: true },
  dept_agent:         { label: 'Dept. of Propaganda Agent', threat:3, attrs: {strength:2,agility:3,wits:4,empathy:3}, skills: {persuasion:3,insight:3,stealth:2},                hp: 6,  armor: 2, weapons: ['pistol'] },
  dark_finder:        { label: 'Dark Finder',              threat: 4, attrs: {strength:4,agility:3,wits:3,empathy:2},  skills: {marksmanship:4,melee:3,stealth:3,observation:3},  hp: 10, armor: 4, weapons: ['rifle','pistol','blade'] },
  manchine:           { label: 'Manchine',                 threat: 5, attrs: {strength:5,agility:4,wits:3,empathy:1},  skills: {melee:4,marksmanship:3,force:4,stamina:4},        hp: 14, armor: 5, weapons: ['heavy_weapon','claws'] }
};

// ─── NAME TABLES ─────────────────────────────────────────────────────────────
const SLA_NAMES = {
  human: {
    first: ['Mace','Nadia','Cole','Petra','Sloane','Vex','Mira','Dax','Sable','Reece','Lyra','Jet','Kade','Dani','Rex','Aura','Finn','Zara','Grim','Nova'],
    last:  ['Falke','Dredd','Voss','Caine','Rourke','Mace','Cross','Kane','Stern','Vane','Frost','Ryker','Blane','Dusk','Shard','Hex','Vayne','Crowe','Ash','Lorne']
  },
  ebon: {
    first: ['Aelith','Cassia','Vehn','Sorai','Talen','Myren','Eshara','Quelith','Davan','Silae'],
    last:  ['Vel Auris','Sol Keth','Mir Daan','Thas Elen','Quor Veth','Sil Arren','Tel Mora','Van Eres']
  },
  brainwaster: {
    first: ['Flux','Scorch','Null','Vex','Wraith','Bleed','Crux','Static','Glitch','Spike'],
    last:  ['Mindless','the Hollow','No-Name','Unbound','Fracture','Sparks','the Lost','Deadwire']
  },
  stormer: {
    first: ['Slab','Iron','Breach','Razr','Blunt','Crush','Vance','Gouge','Wreck','Spike'],
    last:  ['313','7-Niner','Alpha-4','Echo-3','Prime','Null-Six','Striker','Unit-9','Kilo','Zero']
  },
  shaktar: {
    first: ["Kah'tak","Drex'ahl","Va'shari","Mul'keth","Kar'vaan","Esh'tara","Zek'hal","Quin'dar"],
    last:  ["ek Valkor","ek Shath","ek Duran","ek Morvath","ek Shal","ek Tyran"]
  },
  wraithraider: {
    first: ['Shade','Whisper','Veil','Null','Shroud','Dusk','Mist','Ash','Fade','Echo'],
    last:  ['of the Void','of the Dark','the Unseen','of the Pale','the Silent','of Shadows']
  },
  frother: {
    first: ['Bloody','Mad','Frenzy','Bersk','Rage','Bonehead','Wrecking','Rampant','Feral','Savage'],
    last:  ['McRage','O\'Kill','McGore','Killmore','Deathmarch','McCrash','Bloodstock','Warface']
  },
  generic: {
    first: ['Operator','Agent','Unit','Ghost','Vector','Cipher','Reaper','Echo','Phantom','Sigma'],
    last:  ['Null','Seven','Prime','Alpha','Zero','Delta','Omega','Kilo','Bravo','Echo']
  }
};

function _slaRandomName(raceKey) {
  const table = SLA_NAMES[raceKey] || SLA_NAMES.generic;
  const first = table.first[Math.floor(Math.random() * table.first.length)];
  const last  = table.last[Math.floor(Math.random() * table.last.length)];
  return `${first} ${last}`;
}

// ─── GEAR BUILDERS ───────────────────────────────────────────────────────────
// ── Inline Ebb formula data ───────────────────────────────────────────────────
// Used when the compendium pack is unavailable (JSON packs not compiled to LDB).
// Keyed by display name — must match names used in training.ebbEbon / ebbBrainwaster.
const EBB_FORMULA_INLINE = {
  // ── AWARENESS ───────────────────────────────────────────────────────────────
  'Empathic Pulse':  { discipline:'awareness',   fluxCost:1, successes:1, range:'Short',   duration:'Instant', effect:'Sense the dominant emotion of every living being within Short range. On 2+ successes, identify specific individuals.',     img:'systems/zero-engine/assets/icons/ebb/ebb-awareness.svg' },
  'Danger Sense':    { discipline:'awareness',   fluxCost:2, successes:1, range:'Self',    duration:'1 shift',  effect:'Cannot be surprised for 1 shift. Gain +2 dice to Initiative rolls.',                                                      img:'systems/zero-engine/assets/icons/ebb/ebb-awareness.svg' },
  'Precognition':    { discipline:'awareness',   fluxCost:2, successes:2, range:'Self',    duration:'Instant', effect:'Ask the GM one yes/no question about what will happen in the next stretch.',                                              img:'systems/zero-engine/assets/icons/ebb/ebb-awareness.svg' },
  // ── BLAST ────────────────────────────────────────────────────────────────────
  'Ebb Bolt':        { discipline:'blast',        fluxCost:1, successes:1, range:'Short',   duration:'Instant', effect:'Strike one target for damage equal to successes. Armour applies. Counts as ranged attack.',                               img:'systems/zero-engine/assets/icons/ebb/ebb-blast.svg' },
  'Hellfire':        { discipline:'blast',        fluxCost:2, successes:2, range:'Medium',  duration:'Instant', effect:'Blast one target for successes + 2 damage. On 3+ successes, target is knocked down.',                                     img:'systems/zero-engine/assets/icons/ebb/ebb-blast.svg' },
  'Ebb Storm':       { discipline:'blast',        fluxCost:3, successes:2, range:'Short',   duration:'Instant', effect:'Ebb detonates at Short range. All targets take successes damage. Armour applies.',                                        img:'systems/zero-engine/assets/icons/ebb/ebb-blast.svg' },
  // ── COMMUNICATE ──────────────────────────────────────────────────────────────
  'Mind-Link':       { discipline:'communicate',  fluxCost:1, successes:1, range:'Short',   duration:'1 scene', effect:'Establish silent two-way mental communication with one willing target.',                                                   img:'systems/zero-engine/assets/icons/ebb/ebb-communicate.svg' },
  'Broadcast':       { discipline:'communicate',  fluxCost:2, successes:1, range:'Long',    duration:'Instant', effect:'Project one simple message, image, or emotion to all living beings within Long range.',                                   img:'systems/zero-engine/assets/icons/ebb/ebb-communicate.svg' },
  'Compel':          { discipline:'communicate',  fluxCost:2, successes:3, range:'Short',   duration:'1 round', effect:'Force one target to perform a simple action (flee, drop weapon, kneel). Target resists with Wits.',                       img:'systems/zero-engine/assets/icons/ebb/ebb-communicate.svg' },
  // ── ENHANCE ──────────────────────────────────────────────────────────────────
  'Surge':           { discipline:'enhance',      fluxCost:1, successes:1, range:'Self',    duration:'1 stretch', effect:'Add +2 dice to all rolls using one chosen attribute for 1 stretch.',                                                    img:'systems/zero-engine/assets/icons/ebb/ebb-enhance.svg' },
  'Iron Flesh':      { discipline:'enhance',      fluxCost:2, successes:2, range:'Self',    duration:'1 stretch', effect:'Gain 2 automatic armour (stacks with worn armour) for 1 stretch.',                                                     img:'systems/zero-engine/assets/icons/ebb/ebb-enhance.svg' },
  'Heightened State':{ discipline:'enhance',      fluxCost:3, successes:2, range:'Self',    duration:'1 stretch', effect:'+1 die to all rolls, reduce all incoming damage by 1 for 1 stretch.',                                                  img:'systems/zero-engine/assets/icons/ebb/ebb-enhance.svg' },
  // ── HEAL ─────────────────────────────────────────────────────────────────────
  'Mend':            { discipline:'heal',         fluxCost:1, successes:1, range:'Engaged', duration:'Instant', effect:'Restore Health equal to successes (max 2) to self or a touched target.',                                                 img:'systems/zero-engine/assets/icons/ebb/ebb-heal.svg' },
  'Restore':         { discipline:'heal',         fluxCost:2, successes:2, range:'Engaged', duration:'Instant', effect:'Restore Health equal to successes + 1. On 3+ successes, also clear one critical injury.',                                img:'systems/zero-engine/assets/icons/ebb/ebb-heal.svg' },
  'Calm':            { discipline:'heal',         fluxCost:1, successes:1, range:'Short',   duration:'Instant', effect:"Reduce one target's Stress by 1. If they are Broken from Stress, remove the Broken state.",                             img:'systems/zero-engine/assets/icons/ebb/ebb-heal.svg' },
  // ── PROTECT ──────────────────────────────────────────────────────────────────
  'Ebb Shield':      { discipline:'protect',      fluxCost:1, successes:1, range:'Self',    duration:'1 round', effect:'Roll 2d6 against the next incoming attack this round; each 6 reduces damage by 1.',                                      img:'systems/zero-engine/assets/icons/ebb/ebb-protect.svg' },
  'Ward':            { discipline:'protect',      fluxCost:2, successes:2, range:'Short',   duration:'1 stretch', effect:'One target within Short range gains 1 automatic armour for 1 stretch.',                                               img:'systems/zero-engine/assets/icons/ebb/ebb-protect.svg' },
  'Phase Shell':     { discipline:'protect',      fluxCost:3, successes:3, range:'Self',    duration:'1 round', effect:'All physical damage is reduced by 3 this round. Ebb attacks bypass this.',                                               img:'systems/zero-engine/assets/icons/ebb/ebb-protect.svg' },
  // ── REALITY FOLD ─────────────────────────────────────────────────────────────
  'Blink':           { discipline:'realityFold',  fluxCost:2, successes:2, range:'Short',   duration:'Instant', effect:'Instantly teleport to any visible point within Short range.',                                                             img:'systems/zero-engine/assets/icons/ebb/ebb-realityfold.svg' },
  'Fold Space':      { discipline:'realityFold',  fluxCost:3, successes:3, range:'Long',    duration:'1 round', effect:'Two chosen points within range become adjacent for 1 round.',                                                             img:'systems/zero-engine/assets/icons/ebb/ebb-realityfold.svg' },
  'Phase Through':   { discipline:'realityFold',  fluxCost:3, successes:2, range:'Engaged', duration:'Instant', effect:'Pass through one non-living solid object (wall, door, hull).',                                                           img:'systems/zero-engine/assets/icons/ebb/ebb-realityfold.svg' },
  // ── SENSES ───────────────────────────────────────────────────────────────────
  'Ebb Sight':       { discipline:'senses',       fluxCost:1, successes:1, range:'Long',    duration:'1 stretch', effect:'Perceive Ebb energy, active formulae, and Ebb users within Long range.',                                              img:'systems/zero-engine/assets/icons/ebb/ebb-senses.svg' },
  "Mind's Eye":      { discipline:'senses',       fluxCost:1, successes:1, range:'Self',    duration:'1 stretch', effect:'+3 dice to all Observation rolls. Cannot be ambushed.',                                                                img:'systems/zero-engine/assets/icons/ebb/ebb-senses.svg' },
  'Remote View':     { discipline:'senses',       fluxCost:2, successes:2, range:'Long',    duration:'1 stretch', effect:'Project senses to any location within Long range that you have visited before.',                                       img:'systems/zero-engine/assets/icons/ebb/ebb-senses.svg' },
  // ── TELEKINESIS ──────────────────────────────────────────────────────────────
  'Push':            { discipline:'telekinesis',  fluxCost:1, successes:1, range:'Short',   duration:'Instant', effect:'Hurl one target or object with mental force, moving them up to 3m per success. Counts as ranged attack.',                img:'systems/zero-engine/assets/icons/ebb/ebb-telekinesis.svg' },
  'Grip':            { discipline:'telekinesis',  fluxCost:2, successes:2, range:'Short',   duration:'1 round', effect:'Hold one target immobile for 1 round. They can still act but cannot move.',                                              img:'systems/zero-engine/assets/icons/ebb/ebb-telekinesis.svg' },
  'Levitate':        { discipline:'telekinesis',  fluxCost:2, successes:1, range:'Self',    duration:'1 stretch', effect:'Float at any height, moving in any direction at normal speed.',                                                        img:'systems/zero-engine/assets/icons/ebb/ebb-telekinesis.svg' },
  // ── THERMAL ──────────────────────────────────────────────────────────────────
  'Heat Touch':      { discipline:'thermal',      fluxCost:1, successes:1, range:'Engaged', duration:'Instant', effect:'Deal damage equal to successes + 1 to a touched target. On 3+ successes, target catches fire.',                          img:'systems/zero-engine/assets/icons/ebb/ebb-thermal.svg' },
  'Flame Burst':     { discipline:'thermal',      fluxCost:2, successes:1, range:'Short',   duration:'Instant', effect:'Deal successes + 2 damage to one target. On 3+ successes, target catches fire.',                                         img:'systems/zero-engine/assets/icons/ebb/ebb-thermal.svg' },
  'Freeze':          { discipline:'thermal',      fluxCost:2, successes:2, range:'Short',   duration:'1 round', effect:'Target takes 1 damage and suffers -2 dice to all Agility rolls for 1 round.',                                            img:'systems/zero-engine/assets/icons/ebb/ebb-thermal.svg' },
};

/** Build an embedded Ebb item document from the inline table */
function _slaEbbFormulaData(name) {
  const f = EBB_FORMULA_INLINE[name];
  if (!f) return null;
  return {
    name,
    type: 'ebb',
    img: f.img || 'systems/zero-engine/assets/icons/ebb/ebb-blast.svg',
    system: {
      description: f.effect || '',
      discipline:  f.discipline,
      fluxCost:    f.fluxCost,
      successes:   f.successes,
      effect:      f.effect || '',
      catastrophe: '',
      duration:    f.duration || '',
      range:       f.range || 'Short',
    }
  };
}

function _slaWeaponData(type) {
  const weapons = {
    pistol:       { name: 'Blitzer 10mm Pistol',      weaponType:'Pistol',  category:'ranged', damage:2, range:'Short',    rof:2, ap:0, magazine:15, ammo:15, fireModes:['single'], cost:300,
                    img: 'icons/weapons/guns/gun-pistol-flintlock-metal.webp' },
    rifle:        { name: 'M300 Assault Rifle',        weaponType:'Rifle',   category:'ranged', damage:3, range:'Long',     rof:3, ap:1, magazine:30, ammo:30, fireModes:['single','burst','auto'], cost:600,
                    img: 'icons/weapons/guns/rifle-bayonet.webp' },
    smg:          { name: 'Blitzer SMG',               weaponType:'SMG',     category:'ranged', damage:2, range:'Short',    rof:3, ap:0, magazine:30, ammo:30, fireModes:['single','auto'], cost:450,
                    img: 'icons/weapons/guns/gun-pistol-flintlock-metal.webp' },
    heavy_melee:  { name: 'Power Blade',               weaponType:'Blade',   category:'melee',  damage:3, range:'Engaged',  rof:1, ap:2, magazine:0,  ammo:0,  fireModes:[], cost:400,
                    img: 'icons/weapons/swords/greatsword.webp' },
    knife:        { name: 'Combat Knife',              weaponType:'Knife',   category:'melee',  damage:2, range:'Engaged',  rof:2, ap:0, magazine:0,  ammo:0,  fireModes:[], cost:80,
                    img: 'icons/weapons/daggers/dagger-straight-sharp.webp' },
    baton:        { name: 'Shiver Baton',              weaponType:'Baton',   category:'melee',  damage:2, range:'Engaged',  rof:2, ap:0, magazine:0,  ammo:0,  fireModes:[], cost:50,
                    img: 'icons/weapons/clubs/club-simple-black.webp' },
    claws:        { name: 'Claws',                     weaponType:'Natural', category:'melee',  damage:3, range:'Engaged',  rof:2, ap:0, magazine:0,  ammo:0,  fireModes:[], cost:0,
                    img: 'icons/skills/melee/unarmed-punch-fist.webp' },
    blade:        { name: 'Mono-Edge Blade',           weaponType:'Blade',   category:'melee',  damage:3, range:'Engaged',  rof:2, ap:2, magazine:0,  ammo:0,  fireModes:[], cost:350,
                    img: 'icons/weapons/swords/sword-katana-gleaming.webp' },
    heavy_weapon: { name: 'Heavy Autocannon',          weaponType:'HW',      category:'ranged', damage:5, range:'Long',     rof:2, ap:3, magazine:20, ammo:20, fireModes:['burst','auto'], cost:2500,
                    img: 'icons/weapons/guns/gun-blunderbuss.webp' },
  };
  const base = weapons[type] || weapons.pistol;
  const { img, ...sys } = base;
  return { name: base.name, type: 'weapon', img: img || 'icons/svg/item.svg',
           system: { ...sys, description: '', equipped: true, gearBonus:0, initiativeMod:0, ammoType:'standard', autoAmmoUse:8 } };
}

function _slaArmorData(name) {
  const armors = {
    'Downtown Jacket':             { armorDice:1, armorAuto:0, cost:150, img:'icons/equipment/chest/vest-simple-leather-brown.webp' },
    'CAF Armor':                   { armorDice:2, armorAuto:0, cost:400, img:'icons/equipment/chest/breastplate-banded-steel.webp' },
    'Scout Armor':                 { armorDice:3, armorAuto:0, cost:800, img:'icons/equipment/chest/breastplate-layered-steel-grey.webp' },
    'HARD Armor':                  { armorDice:4, armorAuto:0, cost:1500, img:'icons/equipment/chest/breastplate-scale-grey.webp' },
    'Exo-Rig Armor':               { armorDice:5, armorAuto:0, cost:3000, img:'icons/equipment/chest/breastplate-segmented-grey.webp' },
    'Squad Shielded Power Armor':  { armorDice:6, armorAuto:2, cost:8000, img:'icons/equipment/chest/breastplate-embossed-silver.webp' }
  };
  const base = armors[name] || armors['Downtown Jacket'];
  const { img, ...sys } = base;
  return { name, type: 'armor', img: img || 'icons/svg/shield.svg',
           system: { ...sys, description:'', armorRating: sys.armorDice, statMod:0, skillMod:0, statModTarget:'', skillModTarget:'', healthMod:0, resolveMod:0, initiativeMod:0, equipped:true } };
}

function _slaSpecialtyData(name) {
  const specialties = {
    'Hard Hitter':    { effects:'+1 Melee damage (sacrifice fast action)',             img:'icons/skills/melee/strike-slashing-yellow.webp' },
    'Fast Reflexes':  { effects:'Draw 2 initiative cards, choose the better one',      img:'icons/skills/movement/feet-winged-boots-glowing-yellow.webp' },
    'Field Surgeon':  { effects:'+1 Healing (critical injuries only)',                 img:'icons/tools/hand/pliers-pointed-red.webp' },
    'Inquisitive':    { effects:'Push WIT rolls twice per roll',                       img:'icons/skills/social/theft-pickpocket-eyes-green.webp' },
    'Gut Feeling':    { effects:'Use EMP for Observation (threat detection only)',     img:'icons/magic/perception/eye-ringed-glow-angry-small-red.webp' },
    'Sniper':         { effects:'+2 Marksmanship (Long+ range, concealment required)', img:'icons/skills/ranged/aim-reticle-dark.webp' },
    'True Grit':      { effects:'+1 maximum Health',                                   img:'icons/magic/life/heart-cross-strong-red.webp' },
    'Ebb Sensitive':  { effects:'Sense active Ebb users within ~10m radius',           img:'icons/magic/perception/orb-eye-scrying.webp' },
  };
  const base = specialties[name] || { effects: name, img: 'icons/svg/aura.svg' };
  const { img, ...rest } = base;
  return { name, type: 'specialty', img: img || 'icons/svg/aura.svg',
           system: { ...rest, description:'', category:'general', prerequisites:'', package:'', healthMod:0, resolveMod:0, isActive:true } };
}

function _slaGearData(name) {
  // Map common gear names to appropriate icons
  const gearIcons = {
    'Medikit':          'icons/tools/medical/syringe-drug-blue.webp',
    'Medkit':           'icons/tools/medical/syringe-drug-blue.webp',
    'Comms':            'icons/tools/navigation/compass-brass.webp',
    'Radio':            'icons/tools/navigation/compass-brass.webp',
    'Binoculars':       'icons/tools/exploration/binoculars.webp',
    'Handcuffs':        'icons/tools/misc/chain-grey.webp',
    'Grapple':          'icons/tools/misc/rope-black.webp',
    'Rope':             'icons/tools/misc/rope-black.webp',
    'Flashlight':       'icons/tools/navigation/torch-black.webp',
    'Scanner':          'icons/tools/scribal/spectacles.webp',
    'Toolkit':          'icons/tools/hand/wrench.webp',
  };
  const img = gearIcons[name] || 'systems/zero-engine/assets/icons/cardboard-box-closed.svg';
  return { name, type: 'equipment', img,
           system: { description:'', quantity:1, cost:0, weight:1, isDrug:false, active:false, activeDuration:'', activeLabel:'', activeNotes:'', equipped:true, initiativeMod:0 } };
}

// ══════════════════════════════════════════════════════════════════════════════
//   PC CREATOR APPLICATION
// ══════════════════════════════════════════════════════════════════════════════
class SLAPCCreator extends Application {
  constructor(options = {}) {
    super(options);
    this._step = 1;
    this._race = null;
    this._training = null;
    this._attrs = {};
    this._skills = {};
    this._attrFreePoints = 0;
    this._skillPoints = 0;
    this._name = '';
    this._scl = 10;
    this._credits = 500;
    this._bio = '';
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'sla-pc-creator',
      title: 'SLA Industries — Operative Generator',
      template: null,
      width: 680,
      height: 620,
      resizable: true,
      classes: ['zero-engine', 'sla-generator']
    });
  }

  async _renderInner() {
    // Build full HTML inline — no external template needed
    const el = document.createElement('div');
    el.innerHTML = this._buildHTML();
    return $(el);
  }

  activateListeners(html) {
    super.activateListeners(html);
    this._bindStep1(html);
  }

  _getEl(html, sel) {
    return (html instanceof jQuery ? html[0] : html).querySelector(sel);
  }
  _getEls(html, sel) {
    return [...(html instanceof jQuery ? html[0] : html).querySelectorAll(sel)];
  }

  // ── STEP 1: Race ────────────────────────────────────────────────────────────
  _bindStep1(html) {
    this._showStep(html, 1);
    this._getEls(html, '.race-card').forEach(card => {
      card.addEventListener('click', () => {
        this._getEls(html, '.race-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this._race = card.dataset.race;
        this._getEl(html, '#gen-next-1').disabled = false;
      });
    });
    this._getEl(html, '#gen-next-1').addEventListener('click', () => {
      if (!this._race) return;
      this._step = 2;
      this._bindStep2(html);
    });
  }

  // ── STEP 2: Training ────────────────────────────────────────────────────────
  _bindStep2(html) {
    this._showStep(html, 2);
    const raceData = SLA_RACES[this._race];
    this._getEls(html, '.training-card').forEach(card => {
      const pkg = SLA_TRAINING[card.dataset.training];
      if (pkg.ebbOnly && !raceData.isEbbUser) {
        card.classList.add('disabled');
        card.title = 'Requires Ebon or Brain Waster';
        return;
      }
      card.addEventListener('click', () => {
        this._getEls(html, '.training-card:not(.disabled)').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this._training = card.dataset.training;
        this._getEl(html, '#gen-next-2').disabled = false;
      });
    });
    this._getEl(html, '#gen-back-2').addEventListener('click', () => { this._step = 1; this._bindStep1(html); });
    this._getEl(html, '#gen-next-2').addEventListener('click', () => {
      if (!this._training) return;
      // Init attributes from race + apply training skill bonus (done at creation)
      const race = SLA_RACES[this._race];
      this._attrs = { ...race.baseAttrs };
      this._attrFreePoints = race.attrPoints;
      // Apply training skill bonuses to skill pools
      const trainSkills = { ...SLA_TRAINING[this._training].skills };
      this._skills = { force:0, melee:0, stamina:0, marksmanship:0, mobility:0, stealth:0, crafting:0, observation:0, survival:0, healing:0, insight:0, persuasion:0, ebb:0 };
      for (const [sk, val] of Object.entries(trainSkills)) {
        this._skills[sk] = (this._skills[sk] || 0) + val;
      }
      this._skillPoints = race.skillPoints;
      this._step = 3;
      this._bindStep3(html);
    });
  }

  // ── STEP 3: Attributes ──────────────────────────────────────────────────────
  _bindStep3(html) {
    this._showStep(html, 3);
    this._renderAttrTable(html);
    this._getEl(html, '#gen-back-3').addEventListener('click', () => { this._step = 2; this._bindStep2(html); });
    this._getEl(html, '#gen-next-3').addEventListener('click', () => { this._step = 4; this._bindStep4(html); });
  }

  _renderAttrTable(html) {
    const race = SLA_RACES[this._race];
    const container = this._getEl(html, '#attr-rows');
    container.innerHTML = '';
    let remaining = this._attrFreePoints - Object.entries(this._attrs).reduce((acc, [k,v]) => acc + (v - race.baseAttrs[k]), 0);

    const render = () => {
      remaining = this._attrFreePoints - Object.entries(this._attrs).reduce((acc, [k,v]) => acc + (v - race.baseAttrs[k]), 0);
      this._getEl(html, '#attr-points-left').textContent = remaining;
      this._getEl(html, '#gen-next-3').disabled = remaining < 0;
      const hp = this._attrs.strength + this._attrs.agility + race.healthMod;
      const rp = this._attrs.wits + this._attrs.empathy + race.resolveMod;
      this._getEl(html, '#attr-hp-preview').textContent = hp;
      this._getEl(html, '#attr-rp-preview').textContent = rp;
    };

    const ATTR_LABELS = { strength:'Strength (STR)', agility:'Agility (AGI)', wits:'Wits (WIT)', empathy:'Empathy (EMP)' };
    for (const [attr, baseVal] of Object.entries(race.baseAttrs)) {
      const cap = race.attrCaps[attr];
      const row = document.createElement('div');
      row.className = 'attr-row';
      row.innerHTML = `
        <span class="attr-label">${ATTR_LABELS[attr]}</span>
        <span class="attr-base">base ${baseVal}</span>
        <button class="attr-btn attr-minus" data-attr="${attr}">−</button>
        <span class="attr-val" id="av-${attr}">${this._attrs[attr]}</span>
        <button class="attr-btn attr-plus" data-attr="${attr}">+</button>
        <span class="attr-cap">/ ${cap}</span>`;
      container.appendChild(row);
      row.querySelector('.attr-minus').addEventListener('click', () => {
        if (this._attrs[attr] > baseVal) { this._attrs[attr]--; row.querySelector(`#av-${attr}`).textContent = this._attrs[attr]; render(); }
      });
      row.querySelector('.attr-plus').addEventListener('click', () => {
        const curRemaining = this._attrFreePoints - Object.entries(this._attrs).reduce((a,[k,v]) => a+(v-race.baseAttrs[k]),0);
        if (this._attrs[attr] < cap && curRemaining > 0) { this._attrs[attr]++; row.querySelector(`#av-${attr}`).textContent = this._attrs[attr]; render(); }
      });
    }
    render();
  }

  // ── STEP 4: Skills ──────────────────────────────────────────────────────────
  _bindStep4(html) {
    this._showStep(html, 4);
    this._renderSkillTable(html);
    this._getEl(html, '#gen-back-4').addEventListener('click', () => { this._step = 3; this._bindStep3(html); });
    this._getEl(html, '#gen-next-4').addEventListener('click', () => { this._step = 5; this._bindStep5(html); });
  }

  _renderSkillTable(html) {
    const race = SLA_RACES[this._race];
    const trainSkills = SLA_TRAINING[this._training].skills;
    const SKILL_GROUPS = [
      { label:'Strength', attr:'STR', skills:['force','melee','stamina'] },
      { label:'Agility',  attr:'AGI', skills:['marksmanship','mobility','stealth'] },
      { label:'Wits',     attr:'WIT', skills:['crafting','observation','survival'] },
      { label:'Empathy',  attr:'EMP', skills:['healing','insight','persuasion','ebb'] }
    ];
    const container = this._getEl(html, '#skill-rows');
    container.innerHTML = '';
    let spent = 0;

    const render = () => {
      spent = Object.entries(this._skills).reduce((a,[k,v]) => a + Math.max(0, v - (trainSkills[k]||0)), 0);
      this._getEl(html, '#skill-points-left').textContent = Math.max(0, this._skillPoints - spent);
      this._getEl(html, '#gen-next-4').disabled = spent > this._skillPoints;
    };

    for (const group of SKILL_GROUPS) {
      const groupEl = document.createElement('div');
      groupEl.className = 'skill-group';
      groupEl.innerHTML = `<div class="skill-group-header">${group.label} (${group.attr})</div>`;
      for (const sk of group.skills) {
        if (sk === 'ebb' && !race.isEbbUser) continue;
        const fromTraining = trainSkills[sk] || 0;
        const row = document.createElement('div');
        row.className = 'skill-gen-row';
        row.innerHTML = `
          <span class="sg-label">${sk.charAt(0).toUpperCase()+sk.slice(1)}</span>
          ${fromTraining ? `<span class="sg-training">+${fromTraining} training</span>` : '<span class="sg-training"></span>'}
          <button class="sg-btn sg-minus" data-skill="${sk}">−</button>
          <span class="sg-val" id="sv-${sk}">${this._skills[sk] || 0}</span>
          <button class="sg-btn sg-plus" data-skill="${sk}">+</button>
          <span class="sg-cap">/ ${race.skillCap + fromTraining}</span>`;
        groupEl.appendChild(row);
        row.querySelector('.sg-minus').addEventListener('click', () => {
          const minVal = fromTraining;
          if (this._skills[sk] > minVal) { this._skills[sk]--; row.querySelector(`#sv-${sk}`).textContent = this._skills[sk]; render(); }
        });
        row.querySelector('.sg-plus').addEventListener('click', () => {
          const curSpent = Object.entries(this._skills).reduce((a,[k,v]) => a + Math.max(0, v - (trainSkills[k]||0)), 0);
          const cap = race.skillCap + fromTraining;
          if (this._skills[sk] < cap && curSpent < this._skillPoints) { this._skills[sk]++; row.querySelector(`#sv-${sk}`).textContent = this._skills[sk]; render(); }
        });
      }
      container.appendChild(groupEl);
    }
    render();
  }

  // ── STEP 5: Details ─────────────────────────────────────────────────────────
  _bindStep5(html) {
    this._showStep(html, 5);
    const nameInput = this._getEl(html, '#char-name');
    const sclInput  = this._getEl(html, '#char-scl');
    const credInput = this._getEl(html, '#char-creds');
    const bioInput  = this._getEl(html, '#char-bio');
    nameInput.value = this._name || _slaRandomName(this._race);
    sclInput.value  = this._scl;
    credInput.value = this._credits;
    bioInput.value  = this._bio;
    this._getEl(html, '#random-name-btn').addEventListener('click', () => { nameInput.value = _slaRandomName(this._race); });
    this._getEl(html, '#gen-back-5').addEventListener('click', () => { this._step = 4; this._bindStep4(html); });
    this._getEl(html, '#gen-next-5').addEventListener('click', () => {
      this._name    = nameInput.value.trim() || _slaRandomName(this._race);
      this._scl     = parseInt(sclInput.value) || 10;
      this._credits = parseInt(credInput.value) || 500;
      this._bio     = bioInput.value;
      this._step = 6;
      this._bindStep6(html);
    });
  }

  // ── STEP 6: Summary & Create ────────────────────────────────────────────────
  _bindStep6(html) {
    this._showStep(html, 6);
    const race = SLA_RACES[this._race];
    const training = SLA_TRAINING[this._training];
    const summary = this._getEl(html, '#summary-content');
    const attrStr = Object.entries(this._attrs).map(([k,v])=>`${k.slice(0,3).toUpperCase()} ${v}`).join(' | ');
    const skillStr = Object.entries(this._skills).filter(([,v])=>v>0).map(([k,v])=>`${k.charAt(0).toUpperCase()+k.slice(1)} ${v}`).join(', ') || 'none';
    const hp = this._attrs.strength + this._attrs.agility + race.healthMod;
    const rp = this._attrs.wits + this._attrs.empathy + race.resolveMod;
    summary.innerHTML = `
      <div class="summary-section"><span class="sum-label">Name</span><span class="sum-val">${this._name}</span></div>
      <div class="summary-section"><span class="sum-label">Race</span><span class="sum-val">${race.label}</span></div>
      <div class="summary-section"><span class="sum-label">Training</span><span class="sum-val">${training.label}</span></div>
      <div class="summary-section"><span class="sum-label">SCL</span><span class="sum-val">${this._scl}</span></div>
      <div class="summary-section"><span class="sum-label">Credits</span><span class="sum-val">${this._credits}</span></div>
      <div class="summary-section"><span class="sum-label">Attributes</span><span class="sum-val">${attrStr}</span></div>
      <div class="summary-section"><span class="sum-label">HP / Resolve</span><span class="sum-val">${hp} / ${rp}</span></div>
      <div class="summary-section"><span class="sum-label">Skills</span><span class="sum-val">${skillStr}</span></div>
      <div class="summary-section"><span class="sum-label">Specialty</span><span class="sum-val">${training.specialty}</span></div>
      <div class="summary-section"><span class="sum-label">Armor</span><span class="sum-val">${training.armor}</span></div>
      <div class="summary-section"><span class="sum-label">Weapons</span><span class="sum-val">${(training.weapons||[]).join(', ') || '—'}</span></div>
      ${race.isEbbUser && (training.ebbEbon || training.ebb) ? (() => {
        const list = this._race === 'ebon' && training.ebbEbon ? training.ebbEbon
          : this._race === 'brainwaster' && training.ebbBrainwaster ? training.ebbBrainwaster
          : (training.ebb || []);
        const ebbVal = Number(this._skills.ebb) || 0;
        return `<div class="summary-section"><span class="sum-label">Starting Flux</span><span class="sum-val">${Math.max(1, ebbVal + 1)}</span></div>
                <div class="summary-section"><span class="sum-label">Ebb Formulae (${list.length})</span><span class="sum-val">${list.join(', ')}</span></div>`;
      })() : ''}`;
    this._getEl(html, '#gen-back-6').addEventListener('click', () => { this._step = 5; this._bindStep5(html); });
    this._getEl(html, '#gen-create-btn').addEventListener('click', () => this._createPC());
  }

  // ── CREATE ACTOR ─────────────────────────────────────────────────────────────
  async _createPC() {
    const race = SLA_RACES[this._race];
    const training = SLA_TRAINING[this._training];
    const hp = this._attrs.strength + this._attrs.agility + race.healthMod;
    const rp = this._attrs.wits + this._attrs.empathy + race.resolveMod;
    // Starting flux = Ebb skill + 1 (minimum 1 for Ebb users, 0 for non-Ebb)
    const ebbSkillVal = Number(this._skills.ebb) || 0;
    const flux = race.isEbbUser ? Math.max(1, ebbSkillVal + 1) : 0;

    // Build attributes in the nested object format the system expects
    const attributes = {};
    for (const [k, v] of Object.entries(this._attrs)) {
      attributes[k] = { value: v };
    }
    // Build skills
    const skills = {};
    for (const [k, v] of Object.entries(this._skills)) {
      const ATTR_MAP = { force:'strength',melee:'strength',stamina:'strength',marksmanship:'agility',mobility:'agility',stealth:'agility',crafting:'wits',observation:'wits',survival:'wits',healing:'empathy',insight:'empathy',persuasion:'empathy',ebb:'empathy' };
      skills[k] = { value: v, attribute: ATTR_MAP[k], label: k.charAt(0).toUpperCase()+k.slice(1) };
    }

    const actorData = {
      name: this._name,
      type: 'character',
      system: {
        race: this._race,
        archetype: this._training,
        training: this._training,
        details: { scl: this._scl, credits: this._credits, age: '', height: '', weight: '' },
        attributes,
        skills,
        derivedStats: {
          health:  { value: hp, max: hp },
          resolve: { value: rp, max: rp },
          broken: false
        },
        stress: 0,
        flux: { value: flux, max: flux },
        carryLimit: 4,
        biography: this._bio,
        specialties: training.specialty || ''
      }
    };

    let actor;
    try {
      actor = await Actor.create(actorData);
    } catch(err) {
      ui.notifications.error(`Failed to create actor: ${err.message}`);
      return;
    }

    // Embed items: armor, weapons, specialty, gear, ebb formulae
    const embeds = [];
    if (training.armor) embeds.push(_slaArmorData(training.armor));
    for (const w of (training.weapons || [])) embeds.push(_slaWeaponData(w));
    if (training.specialty) embeds.push(_slaSpecialtyData(training.specialty));
    for (const g of (training.gear || [])) embeds.push(_slaGearData(g));

    if (race.isEbbUser && (training.ebb || training.ebbEbon || training.ebbBrainwaster)) {
      // Pick the race-appropriate formula list
      let formulaList;
      if (this._race === 'ebon' && training.ebbEbon) {
        formulaList = training.ebbEbon;
      } else if (this._race === 'brainwaster' && training.ebbBrainwaster) {
        formulaList = training.ebbBrainwaster;
      } else {
        formulaList = training.ebb || [];
      }

      // Build formulae from inline data (JSON packs are not compiled to LDB in Foundry v12+)
      // Fall back to pack lookup only if the inline table is missing an entry.
      const ebbPack = game.packs?.get('zero-engine.ebb-formulae');
      let packIdx = null;
      try { if (ebbPack) packIdx = await ebbPack.getIndex(); } catch(_) {}

      for (const formulaName of formulaList) {
        const inline = _slaEbbFormulaData(formulaName);
        if (inline) {
          embeds.push(inline);
          continue;
        }
        // Try world items as second fallback
        const worldItem = game.items?.find(i => i.type === 'ebb' && i.name === formulaName);
        if (worldItem) { embeds.push(worldItem.toObject()); continue; }
        // Try compiled pack as last resort
        if (packIdx) {
          const entry = packIdx.find(e => e.name === formulaName);
          if (entry) {
            try {
              const doc = await ebbPack.getDocument(entry._id);
              embeds.push(doc.toObject());
            } catch(_) {}
          }
        }
      }
    }

    if (embeds.length) {
      try { await actor.createEmbeddedDocuments('Item', embeds); } catch(e) { console.warn('Zero Engine | Could not embed starter items:', e); }
    }

    ui.notifications.info(`✓ ${this._name} created as an Operative!`);
    actor.sheet?.render(true);
    this.close();
  }

  // ── UI UTILITIES ─────────────────────────────────────────────────────────────
  _showStep(html, n) {
    const root = html instanceof jQuery ? html[0] : html;
    root.querySelectorAll('.gen-step').forEach(s => s.style.display = 'none');
    const step = root.querySelector(`#gen-step-${n}`);
    if (step) step.style.display = 'flex';
    // Update progress bar
    root.querySelectorAll('.gen-progress-dot').forEach((d, i) => {
      d.classList.toggle('active', i < n);
      d.classList.toggle('current', i === n - 1);
    });
  }

  _buildHTML() {
    const raceCards = Object.entries(SLA_RACES).map(([key, r]) => `
      <div class="race-card" data-race="${key}">
        <div class="rc-icon">${r.icon}</div>
        <div class="rc-name">${r.label}</div>
        <div class="rc-stats">STR${r.baseAttrs.strength} AGI${r.baseAttrs.agility} WIT${r.baseAttrs.wits} EMP${r.baseAttrs.empathy}</div>
        <div class="rc-flavor">${r.flavor}</div>
        ${r.isEbbUser ? '<div class="rc-ebb">⚡ Ebb User</div>' : ''}
      </div>`).join('');

    const trainingCards = Object.entries(SLA_TRAINING).map(([key, t]) => `
      <div class="training-card" data-training="${key}">
        <div class="tc-icon">${t.icon}</div>
        <div class="tc-name">${t.label}</div>
        <div class="tc-flavor">${t.flavor}</div>
        <div class="tc-skills">${Object.entries(t.skills).map(([s,v])=>`${s} +${v}`).join(', ')}</div>
        ${t.ebbOnly ? '<div class="tc-ebb-only">Ebb users only</div>' : ''}
      </div>`).join('');

    return `
<div class="sla-gen-container">
  <div class="gen-header">
    <div class="gen-title">Operative Generation — SLA Industries</div>
    <div class="gen-progress">${[1,2,3,4,5,6].map(n=>`<div class="gen-progress-dot" title="Step ${n}"></div>`).join('')}</div>
  </div>

  <!-- STEP 1: Race -->
  <div class="gen-step" id="gen-step-1" style="display:flex">
    <div class="step-title">Step 1 — Select Race</div>
    <div class="race-grid">${raceCards}</div>
    <div class="gen-nav">
      <button id="gen-next-1" class="gen-btn-primary" disabled>Next →</button>
    </div>
  </div>

  <!-- STEP 2: Training -->
  <div class="gen-step" id="gen-step-2" style="display:none">
    <div class="step-title">Step 2 — Training Package</div>
    <div class="training-grid">${trainingCards}</div>
    <div class="gen-nav">
      <button id="gen-back-2" class="gen-btn-secondary">← Back</button>
      <button id="gen-next-2" class="gen-btn-primary" disabled>Next →</button>
    </div>
  </div>

  <!-- STEP 3: Attributes -->
  <div class="gen-step" id="gen-step-3" style="display:none">
    <div class="step-title">Step 3 — Distribute Attributes</div>
    <div class="gen-hint">Distribute free points within race caps. Min 2, Max 5.</div>
    <div class="points-banner">Free Points Remaining: <strong id="attr-points-left">?</strong></div>
    <div id="attr-rows" class="attr-table"></div>
    <div class="derived-preview">
      HP = STR+AGI = <strong id="attr-hp-preview">?</strong> &nbsp;|&nbsp;
      Resolve = WIT+EMP = <strong id="attr-rp-preview">?</strong>
    </div>
    <div class="gen-nav">
      <button id="gen-back-3" class="gen-btn-secondary">← Back</button>
      <button id="gen-next-3" class="gen-btn-primary">Next →</button>
    </div>
  </div>

  <!-- STEP 4: Skills -->
  <div class="gen-step" id="gen-step-4" style="display:none">
    <div class="step-title">Step 4 — Distribute Skills</div>
    <div class="gen-hint">Training bonuses are pre-applied. Spend remaining free points (max 3 per skill at creation).</div>
    <div class="points-banner">Skill Points Remaining: <strong id="skill-points-left">?</strong></div>
    <div id="skill-rows" class="skill-gen-table"></div>
    <div class="gen-nav">
      <button id="gen-back-4" class="gen-btn-secondary">← Back</button>
      <button id="gen-next-4" class="gen-btn-primary">Next →</button>
    </div>
  </div>

  <!-- STEP 5: Details -->
  <div class="gen-step" id="gen-step-5" style="display:none">
    <div class="step-title">Step 5 — Character Details</div>
    <div class="details-form">
      <div class="df-row">
        <label>Operative Name</label>
        <div class="df-name-row">
          <input id="char-name" type="text" placeholder="Enter name..." />
          <button id="random-name-btn" class="gen-btn-secondary" type="button">🎲 Random</button>
        </div>
      </div>
      <div class="df-row">
        <label>Security Clearance (SCL)</label>
        <input id="char-scl" type="number" value="10" min="1" max="10" style="width:80px" />
      </div>
      <div class="df-row">
        <label>Starting Credits (c)</label>
        <input id="char-creds" type="number" value="500" min="0" style="width:120px" />
      </div>
      <div class="df-row">
        <label>Biography / Background</label>
        <textarea id="char-bio" rows="5" placeholder="Operative dossier, backstory, motivations..."></textarea>
      </div>
    </div>
    <div class="gen-nav">
      <button id="gen-back-5" class="gen-btn-secondary">← Back</button>
      <button id="gen-next-5" class="gen-btn-primary">Review →</button>
    </div>
  </div>

  <!-- STEP 6: Review -->
  <div class="gen-step" id="gen-step-6" style="display:none">
    <div class="step-title">Step 6 — Review & Create</div>
    <div id="summary-content" class="summary-grid"></div>
    <div class="gen-nav">
      <button id="gen-back-6" class="gen-btn-secondary">← Back</button>
      <button id="gen-create-btn" class="gen-btn-create">⚡ Create Operative</button>
    </div>
  </div>
</div>`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//   NPC CREATOR APPLICATION
// ══════════════════════════════════════════════════════════════════════════════
const NPC_PERSONALITIES = ['Aggressive','Calculating','Paranoid','Loyal','Cynical','Idealistic','Greedy','Fearless','Broken','Ruthless','Haunted','Fanatic'];
const NPC_MOTIVATIONS   = ['Credits','Survival','Revenge','Ideology','Family','Fame','Fear of SLA','Promotion','Addiction','Love','Duty','Unknown'];
const NPC_ROLES         = ['Enforcer','Informant','Black Market Dealer','Sector Gang Leader','Investigator','Corporate Spy','Ebb Cult Member','Renegade Operative','Cannibal Sector Survivor','Shiver Sergeant'];

class SLANPCCreator extends Application {
  constructor(options = {}) {
    super(options);
    this._mode = 'quick';
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'sla-npc-creator',
      title: 'SLA Industries — NPC Generator',
      template: null,
      width: 560,
      height: 580,
      resizable: true,
      classes: ['zero-engine', 'sla-generator']
    });
  }

  async _renderInner() {
    const el = document.createElement('div');
    el.innerHTML = this._buildHTML();
    return $(el);
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = html instanceof jQuery ? html[0] : html;

    // Mode toggle
    root.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        root.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._mode = tab.dataset.mode;
        root.querySelector('#full-fields').style.display = this._mode === 'full' ? 'block' : 'none';
      });
    });

    // Random fill button
    root.querySelector('#npc-randomize').addEventListener('click', () => this._randomFill(root));

    // Create button
    root.querySelector('#npc-create-btn').addEventListener('click', () => this._createNPC(root));

    // Threat slider → update label
    const threatSlider = root.querySelector('#npc-threat');
    const threatLabel  = root.querySelector('#npc-threat-label');
    if (threatSlider) {
      threatSlider.addEventListener('input', () => { threatLabel.textContent = threatSlider.value; });
    }
  }

  _randomFill(root) {
    // Pick random archetype
    const types = Object.keys(SLA_NPC_TYPES);
    const key = types[Math.floor(Math.random() * types.length)];
    root.querySelector('#npc-archetype').value = key;

    const archetype = SLA_NPC_TYPES[key];
    root.querySelector('#npc-threat').value = archetype.threat;
    root.querySelector('#npc-threat-label').textContent = archetype.threat;

    // Random name
    const nameTable = archetype.isEbb ? 'ebon' : 'generic';
    root.querySelector('#npc-name').value = _slaRandomName(nameTable);

    if (this._mode === 'full') {
      root.querySelector('#npc-personality').value = NPC_PERSONALITIES[Math.floor(Math.random()*NPC_PERSONALITIES.length)];
      root.querySelector('#npc-motivation').value  = NPC_MOTIVATIONS[Math.floor(Math.random()*NPC_MOTIVATIONS.length)];
      root.querySelector('#npc-role').value        = NPC_ROLES[Math.floor(Math.random()*NPC_ROLES.length)];
      root.querySelector('#npc-notes').value = `${root.querySelector('#npc-name').value} is a ${root.querySelector('#npc-personality').value.toLowerCase()} ${archetype.label.toLowerCase()} driven by ${root.querySelector('#npc-motivation').value.toLowerCase()}.`;
    }
  }

  async _createNPC(root) {
    const archetypeKey = root.querySelector('#npc-archetype').value;
    const archetype    = SLA_NPC_TYPES[archetypeKey];
    const threat       = parseInt(root.querySelector('#npc-threat').value) || archetype.threat;
    let   npcName      = root.querySelector('#npc-name').value.trim();

    if (!npcName) npcName = `${archetype.label} #${Math.floor(Math.random()*900+100)}`;

    // Scale stats by threat delta
    const delta = threat - archetype.threat;
    const attrs = {};
    for (const [k, v] of Object.entries(archetype.attrs)) {
      attrs[k] = Math.max(2, Math.min(5, v + delta));
    }
    const hp = archetype.hp + delta * 2;
    const armorVal = Math.max(0, Math.min(6, archetype.armor + delta));

    // Build notes
    let notes = '';
    if (this._mode === 'full') {
      const personality = root.querySelector('#npc-personality')?.value || '';
      const motivation  = root.querySelector('#npc-motivation')?.value || '';
      const role        = root.querySelector('#npc-role')?.value || '';
      const extraNotes  = root.querySelector('#npc-notes')?.value || '';
      if (personality || motivation || role) {
        notes = `Personality: ${personality}\nMotivation: ${motivation}\nRole: ${role}\n\n${extraNotes}`;
      } else {
        notes = extraNotes;
      }
    }

    // NPC uses simplified system fields
    const actorData = {
      name: npcName,
      type: 'npc',
      system: {
        biography: notes,
        threat,
        attributes: { ...attrs },
        derivedStats: {
          health:  { value: hp, max: hp },
          resolve: { value: Math.max(2, attrs.wits + attrs.empathy), max: Math.max(2, attrs.wits + attrs.empathy) }
        },
        skills: { ...archetype.skills },
        armor: armorVal,
        damage: Math.max(2, attrs.strength),
        flux: archetype.flux ? { value: archetype.flux, max: archetype.flux } : { value: 0, max: 0 }
      }
    };

    let actor;
    try {
      actor = await Actor.create(actorData);
    } catch(err) {
      ui.notifications.error(`Failed to create NPC: ${err.message}`);
      return;
    }

    // Embed weapons
    const embeds = [];
    for (const w of (archetype.weapons || [])) {
      if (w !== 'claws') embeds.push(_slaWeaponData(w));
    }
    if (embeds.length) {
      try { await actor.createEmbeddedDocuments('Item', embeds); } catch(_) {}
    }

    // Threat descriptor
    const threatNames = {1:'Mook',2:'Standard',3:'Tough',4:'Elite',5:'Boss',6:'Apex'};
    ui.notifications.info(`✓ ${npcName} (${archetype.label} — Threat ${threat}: ${threatNames[threat] || 'Unknown'}) created.`);
    actor.sheet?.render(true);
    this.close();
  }

  _buildHTML() {
    const archetypeOptions = Object.entries(SLA_NPC_TYPES).map(([key, a]) =>
      `<option value="${key}">${a.label} (Threat ${a.threat})</option>`).join('');

    return `
<div class="sla-gen-container sla-npc-container">
  <div class="gen-header">
    <div class="gen-title">NPC Generator — SLA Industries</div>
    <div class="mode-tabs">
      <div class="mode-tab active" data-mode="quick">⚡ Quick</div>
      <div class="mode-tab" data-mode="full">📋 Full</div>
    </div>
  </div>

  <div class="npc-form">
    <div class="nf-row">
      <label>Archetype</label>
      <select id="npc-archetype">${archetypeOptions}</select>
    </div>
    <div class="nf-row">
      <label>Threat Level <span id="npc-threat-label" class="threat-label">2</span></label>
      <input id="npc-threat" type="range" min="1" max="6" value="2" class="threat-slider" />
      <span class="threat-desc">1=Mook · 3=Tough · 5=Boss · 6=Apex</span>
    </div>
    <div class="nf-row">
      <label>Name <small>(blank = auto)</small></label>
      <input id="npc-name" type="text" placeholder="Leave blank for random..." />
    </div>

    <!-- Full mode extras -->
    <div id="full-fields" style="display:none">
      <div class="nf-section-header">Full Mode — Character Details</div>
      <div class="nf-row">
        <label>Personality</label>
        <select id="npc-personality">
          ${NPC_PERSONALITIES.map(p=>`<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>
      <div class="nf-row">
        <label>Motivation</label>
        <select id="npc-motivation">
          ${NPC_MOTIVATIONS.map(m=>`<option value="${m}">${m}</option>`).join('')}
        </select>
      </div>
      <div class="nf-row">
        <label>Role / Position</label>
        <select id="npc-role">
          ${NPC_ROLES.map(r=>`<option value="${r}">${r}</option>`).join('')}
        </select>
      </div>
      <div class="nf-row nf-row-full">
        <label>GM Notes / Backstory</label>
        <textarea id="npc-notes" rows="4" placeholder="Additional notes, backstory, hooks..."></textarea>
      </div>
    </div>
  </div>

  <div class="gen-nav npc-nav">
    <button id="npc-randomize" class="gen-btn-secondary">🎲 Randomize</button>
    <button id="npc-create-btn" class="gen-btn-create">⚡ Create NPC</button>
  </div>
</div>`;
  }
}

// ── ACTOR DIRECTORY BUTTONS ──────────────────────────────────────────────────
Hooks.on('renderActorDirectory', (app, html) => {
  const root = html instanceof jQuery ? html[0] : html;
  const actions = root.querySelector('.header-actions') || root.querySelector('.directory-header');
  if (!actions) return;

  // Avoid duplicates on re-render
  if (actions.querySelector('.sla-gen-pc-btn')) return;

  const pcBtn = document.createElement('button');
  pcBtn.className = 'sla-gen-pc-btn';
  pcBtn.innerHTML = '<i class="fas fa-user-plus"></i> Generate PC';
  pcBtn.style.cssText = 'font-size:11px;padding:2px 7px;margin-left:4px;background:rgba(255,102,0,0.2);border:1px solid #ff6600;color:#ff6600;border-radius:3px;cursor:pointer;';
  pcBtn.addEventListener('click', () => new SLAPCCreator().render(true));

  const npcBtn = document.createElement('button');
  npcBtn.className = 'sla-gen-npc-btn';
  npcBtn.innerHTML = '<i class="fas fa-robot"></i> Generate NPC';
  npcBtn.style.cssText = 'font-size:11px;padding:2px 7px;margin-left:4px;background:rgba(0,200,200,0.1);border:1px solid #00aacc;color:#00aacc;border-radius:3px;cursor:pointer;';
  npcBtn.addEventListener('click', () => new SLANPCCreator().render(true));

  actions.append(pcBtn, npcBtn);
});


// ══════════════════════════════════════════════════════════════════════════════
//   SLA INDUSTRIES — RACIAL ABILITIES
//   Auto-embedded specialty items with `category: "racial"` and `racialBonuses`
//   array driving automatic dice-pool modifiers via _getRacialDiceBonus().
// ══════════════════════════════════════════════════════════════════════════════

const SLA_RACIAL_ABILITY_DATA = {

  stormer: [
    {
      name: "Natural Weapons (Claws & Teeth)",
      type: "specialty",
      img: "systems/zero-engine/assets/racial/natural-weapons.svg",
      system: {
        category: "racial",
        description: "Vatgrown bio-weapons. Always counts as armed. +1 die on all melee attack rolls.",
        effects: "+1 die on melee rolls. Always treated as armed in close combat.",
        racialBonuses: [{ skill: "melee", bonus: 1 }],
        prerequisites: "Stormer 313-S Malice",
        isActive: true, healthMod: 0, resolveMod: 0
      }
    },
    {
      name: "Stormer Regeneration",
      type: "specialty",
      img: "systems/zero-engine/assets/racial/regen.svg",
      system: {
        category: "racial",
        description: "Enhanced biology heals wound tissue rapidly. Recover 1 HP per hour of rest.",
        effects: "Recover 1 HP per hour of rest. Does not function at 0 HP.",
        racialBonuses: [],
        prerequisites: "Stormer 313-S Malice",
        isActive: true, healthMod: 0, resolveMod: 0,
        regenHpPerHour: 1
      }
    }
  ],

  shaktar: [
    {
      name: "Battle Claws",
      type: "specialty",
      img: "systems/zero-engine/assets/racial/battle-claws.svg",
      system: {
        category: "racial",
        description: "Retractable duranium-hard claws. Always armed. +1 die on melee rolls.",
        effects: "+1 die on all melee attack rolls. Always treated as armed.",
        racialBonuses: [{ skill: "melee", bonus: 1 }],
        prerequisites: "Shaktar",
        isActive: true, healthMod: 0, resolveMod: 0
      }
    },
    {
      name: "Warrior Caste Training",
      type: "specialty",
      img: "systems/zero-engine/assets/racial/warrior-caste.svg",
      system: {
        category: "racial",
        description: "Generations of ritual melee combat. +1 additional die on melee rolls when wielding any melee weapon.",
        effects: "+1 die on melee rolls when using a melee weapon (stacks with Battle Claws for +2 total).",
        racialBonuses: [{ skill: "melee", bonus: 1 }],
        prerequisites: "Shaktar",
        isActive: true, healthMod: 0, resolveMod: 0
      }
    }
  ],

  wraithraider: [
    {
      name: "Shaper Senses",
      type: "specialty",
      img: "systems/zero-engine/assets/racial/shaper-senses.svg",
      system: {
        category: "racial",
        description: "Heightened multi-spectrum perception. +2 dice on Observation rolls. +1 die on Stealth rolls.",
        effects: "+2 dice on Observation rolls. +1 die on Stealth rolls.",
        racialBonuses: [
          { skill: "observation", bonus: 2 },
          { skill: "stealth",     bonus: 1 }
        ],
        prerequisites: "Wraith Raider",
        isActive: true, healthMod: 0, resolveMod: 0
      }
    }
  ],

  frother: [
    {
      name: "Blade Proficiency",
      type: "specialty",
      img: "systems/zero-engine/assets/racial/blade-proficiency.svg",
      system: {
        category: "racial",
        description: "Frothers are culturally and chemically attuned to bladed combat. +2 dice on melee rolls with bladed or sword-type weapons.",
        effects: "+2 dice on melee rolls when using bladed weapons (swords, knives, power blades).",
        racialBonuses: [{ skill: "melee", bonus: 2, weaponTag: "blade" },
                        { skill: "melee", bonus: 2, weaponTag: "knife" }],
        prerequisites: "Frother",
        isActive: true, healthMod: 0, resolveMod: 0
      }
    },
    {
      name: "Drug Dependency",
      type: "specialty",
      img: "systems/zero-engine/assets/racial/drug-dependency.svg",
      system: {
        category: "racial",
        description: "A Frother's biochemistry depends on combat stimulants. Without an active drug: −1 die to all rolls (withdrawal).",
        effects: "−1 to all rolls when no drug is active (withdrawal). Drug bonuses apply normally when active.",
        racialBonuses: [],
        prerequisites: "Frother",
        isActive: true, healthMod: 0, resolveMod: 0,
        drugDependent: true
      }
    }
  ],

  human: [
    {
      name: "Social Versatility",
      type: "specialty",
      img: "systems/zero-engine/assets/racial/social-versatility.svg",
      system: {
        category: "racial",
        description: "Humans navigate SLA's corporate social structures with natural ease. +1 die on Persuasion and Insight rolls.",
        effects: "+1 die on Persuasion rolls. +1 die on Insight rolls.",
        racialBonuses: [
          { skill: "persuasion", bonus: 1 },
          { skill: "insight",    bonus: 1 }
        ],
        prerequisites: "Human",
        isActive: true, healthMod: 0, resolveMod: 0
      }
    }
  ],

  vevaphon: [
    {
      name: "Brute Form",
      type: "specialty", img: "systems/zero-engine/assets/racial/warrior-caste.svg",
      system: {
        category: "racial", description: "Dense armoured combat chassis. +2 STR, +2 BODY equivalent (+2 Health max, ignores knockdown). Cannot be disguised. Costs 1 Instability to activate.",
        effects: "+2 effective Strength dice, +2 Health max, Knockdown immune. Costs 1 Instability.",
        racialBonuses: [{ skill: "force", bonus: 1 }, { skill: "melee", bonus: 1 }],
        prerequisites: "Vevaphon", isActive: false, healthMod: 2, resolveMod: 0
      }
    },
    {
      name: "Stalker Form",
      type: "specialty", img: "systems/zero-engine/assets/racial/shaper-senses.svg",
      system: {
        category: "racial", description: "Lean predatory chassis for silence and ambush. +2 Stealth dice, +1 Agility effective. Cannot wear armour while active. Costs 1 Instability to activate.",
        effects: "+2 Stealth, +1 Agility dice. Cannot wear armour. Costs 1 Instability.",
        racialBonuses: [{ skill: "stealth", bonus: 2 }, { skill: "mobility", bonus: 1 }],
        prerequisites: "Vevaphon", isActive: false, healthMod: 0, resolveMod: 0
      }
    },
    {
      name: "Raptor Form",
      type: "specialty", img: "systems/zero-engine/assets/racial/battle-claws.svg",
      system: {
        category: "racial", description: "Strike-optimised chassis with natural weapons. +2 Melee dice, +1 Marksmanship (close range only). Critical hits deal +1 damage. Costs 1 Instability to activate.",
        effects: "+2 Melee, +1 Marksmanship (close range). Crits deal +1 damage. Costs 1 Instability.",
        racialBonuses: [{ skill: "melee", bonus: 2 }, { skill: "marksmanship", bonus: 1 }],
        prerequisites: "Vevaphon", isActive: false, healthMod: 0, resolveMod: 0
      }
    },
    {
      name: "Morphic Strike",
      type: "specialty", img: "systems/zero-engine/assets/racial/natural-weapons.svg",
      system: {
        category: "racial", description: "Natural biogenetic weapon formed from the Vevaphon's own mass. Damage 2, AP 1. Always available regardless of morph form. Counts as melee weapon for skill rolls.",
        effects: "Natural weapon: DMG 2, AP 1. Always available.",
        racialBonuses: [],
        prerequisites: "Vevaphon", isActive: true, healthMod: 0, resolveMod: 0
      }
    }
  ]
};

// ─── Auto-embed racial abilities ─────────────────────────────────────────────

async function _ensureRacialAbilities(actor) {
  if (!actor || actor.type !== "character") return;
  const raceRaw = actor.system?.race;
  const race = String(Array.isArray(raceRaw) ? (raceRaw[0] || "") : (raceRaw || ""))
    .toLowerCase()
    .replace(/[\s-]/g, "")
    .replace("313-s", "")
    .trim();

  const abilities = SLA_RACIAL_ABILITY_DATA[race];
  if (!abilities || !abilities.length) return;

  const toCreate = [];
  const toUpdateImg = [];
  for (const ability of abilities) {
    const existing = actor.items.find(
      i => i.type === "specialty" && i.name === ability.name
    );
    if (!existing) {
      toCreate.push(ability);
    } else if (ability.img && existing.img !== ability.img) {
      // Update stale icon on existing item
      toUpdateImg.push({ _id: existing.id, img: ability.img });
    }
  }
  if (toUpdateImg.length) {
    try { await actor.updateEmbeddedDocuments("Item", toUpdateImg); } catch(_) {}
  }
  if (!toCreate.length) return;

  try {
    await actor.createEmbeddedDocuments("Item", toCreate);
    ui.notifications.info(
      `${actor.name}: racial abilities embedded (${toCreate.map(a => a.name).join(", ")})`
    );
  } catch (err) {
    console.warn("Zero Engine | Failed to embed racial abilities:", err);
  }
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

// Auto-embed when a new actor is created
Hooks.on("createActor", async (actor) => {
  if (!game.user?.isGM) return;
  await _ensureRacialAbilities(actor);
});

// On boot, ensure all existing character actors have their racial abilities
Hooks.once("ready", function() {
  if (!game.user?.isGM) return;
  (async () => {
    let count = 0;
    for (const actor of game.actors ?? []) {
      if (actor.type !== "character") continue;
      const raceRaw = actor.system?.race;
      const race = String(Array.isArray(raceRaw) ? (raceRaw[0] || "") : (raceRaw || "")).toLowerCase();
      if (!race || race === "undefined") continue;
      const before = actor.items.filter(i => i.system?.category === "racial").length;
      await _ensureRacialAbilities(actor);
      const after = actor.items.filter(i => i.system?.category === "racial").length;
      if (after > before) count++;
    }
    if (count > 0) console.log(`Zero Engine | Embedded racial abilities on ${count} actor(s).`);
  })();
});

// Stormer Regeneration: heal 1 HP every real-time hour (GM only)
// Uses in-game time advancement via updateWorldTime hook
Hooks.on("updateWorldTime", async (worldTime, delta) => {
  if (!game.user?.isGM) return;
  // Only trigger on meaningful time advances (≥ 3600 seconds = 1 hour)
  if (Math.abs(delta) < 3600) return;
  const hoursElapsed = Math.floor(Math.abs(delta) / 3600);
  if (hoursElapsed < 1) return;

  for (const actor of game.actors ?? []) {
    if (actor.type !== "character") continue;
    if (!actor.items.some(i => i.name === "Stormer Regeneration" && i.type === "specialty")) continue;

    const hp    = Number(actor.system?.derivedStats?.health?.value ?? 0);
    const hpMax = Number(actor.system?.derivedStats?.health?.max   ?? 0);
    if (hp <= 0 || hp >= hpMax) continue;

    const heal   = Math.min(hoursElapsed, hpMax - hp);
    const newHp  = hp + heal;
    await actor.update({ "system.derivedStats.health.value": newHp });
    ChatMessage.create({
      speaker: { alias: actor.name },
      content: `<div class="yze-initiative-card"><strong>⚡ Stormer Regeneration</strong><br>
        ${actor.name} regenerates <strong>+${heal} HP</strong> (${hp} → ${newHp}/${hpMax}).</div>`
    });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
//   SLA INDUSTRIES — AMMO SYSTEM
//   Caliber-based ammunition with Standard / AP / HE rounds.
//   Bullet Tax: credits are deducted when rounds are fired.
// ══════════════════════════════════════════════════════════════════════════════

const SLA_AMMO_CATALOG = {
  // ── Pistol calibres ──────────────────────────────────────────────────────
  "10mm": {
    label: "10mm Pistol",
    fitWeaponTypes: ["pistol", "pistol smg"],
    magazineDefault: 15,
    rounds: {
      standard: { name: "10mm Standard",         costPerRound: 5,   apBonus: 0, damageMod: 0, blastRadius: 0, description: "Standard ball round. Reliable, cheap." },
      ap:       { name: "10mm Armor Piercing",    costPerRound: 15,  apBonus: 2, damageMod: 0, blastRadius: 0, description: "+2 AP. Penetrates light corporate armor." },
      he:       { name: "10mm High Explosive",    costPerRound: 35,  apBonus: 0, damageMod: 1, blastRadius: 0, description: "+1 damage on impact. Fragmentation effect." }
    }
  },
  // ── SMG calibres ─────────────────────────────────────────────────────────
  "9mm": {
    label: "9mm SMG",
    fitWeaponTypes: ["smg", "machine pistol"],
    magazineDefault: 30,
    rounds: {
      standard: { name: "9mm Standard",           costPerRound: 4,   apBonus: 0, damageMod: 0, blastRadius: 0, description: "High-velocity SMG round." },
      ap:       { name: "9mm Armor Piercing",      costPerRound: 12,  apBonus: 1, damageMod: 0, blastRadius: 0, description: "+1 AP. Drill-tip penetrator." },
      he:       { name: "9mm High Explosive",      costPerRound: 28,  apBonus: 0, damageMod: 1, blastRadius: 0, description: "+1 damage. Micro-charge detonation." }
    }
  },
  // ── Assault rifle calibres ────────────────────────────────────────────────
  "5.56mm": {
    label: "5.56mm NATO",
    fitWeaponTypes: ["rifle", "assault rifle", "carbine"],
    magazineDefault: 30,
    rounds: {
      standard: { name: "5.56mm Standard",         costPerRound: 8,   apBonus: 0, damageMod: 0, blastRadius: 0, description: "Standard assault rifle round." },
      ap:       { name: "5.56mm Armor Piercing",    costPerRound: 22,  apBonus: 3, damageMod: 0, blastRadius: 0, description: "+3 AP. Military-grade tungsten tip." },
      he:       { name: "5.56mm High Explosive",    costPerRound: 45,  apBonus: 0, damageMod: 2, blastRadius: 1, description: "+2 damage, 1m blast. Detonates on impact." }
    }
  },
  // ── Battle rifle / LMG ───────────────────────────────────────────────────
  "7.62mm": {
    label: "7.62mm Battle Rifle",
    fitWeaponTypes: ["battle rifle", "lmg", "sniper"],
    magazineDefault: 20,
    rounds: {
      standard: { name: "7.62mm Standard",         costPerRound: 12,  apBonus: 0, damageMod: 0, blastRadius: 0, description: "Heavy battle rifle cartridge." },
      ap:       { name: "7.62mm Armor Piercing",    costPerRound: 35,  apBonus: 4, damageMod: 0, blastRadius: 0, description: "+4 AP. Penetrates medium body armor." },
      he:       { name: "7.62mm High Explosive",    costPerRound: 70,  apBonus: 0, damageMod: 3, blastRadius: 2, description: "+3 damage, 2m blast. Anti-vehicle." }
    }
  },
  // ── Heavy weapon calibres ─────────────────────────────────────────────────
  "12.7mm": {
    label: "12.7mm Heavy Autocannon",
    fitWeaponTypes: ["hw", "heavy weapon", "autocannon"],
    magazineDefault: 20,
    rounds: {
      standard: { name: "12.7mm Standard",          costPerRound: 25,  apBonus: 0, damageMod: 0, blastRadius: 0, description: "Heavy caliber autocannon round." },
      ap:       { name: "12.7mm Armor Piercing",     costPerRound: 65,  apBonus: 5, damageMod: 0, blastRadius: 0, description: "+5 AP. Penetrates vehicle hull." },
      he:       { name: "12.7mm High Explosive",     costPerRound: 120, apBonus: 0, damageMod: 4, blastRadius: 3, description: "+4 damage, 3m blast. Anti-materiel." }
    }
  }
};

// Weapon type → default caliber mapping (matches weaponType field)
const SLA_WEAPON_DEFAULT_CALIBER = {
  "Pistol":        "10mm",
  "SMG":           "9mm",
  "Rifle":         "5.56mm",
  "Assault Rifle": "5.56mm",
  "Battle Rifle":  "7.62mm",
  "Sniper":        "7.62mm",
  "LMG":           "7.62mm",
  "HW":            "12.7mm",
  "Heavy Weapon":  "12.7mm",
  "Autocannon":    "12.7mm"
};

/**
 * Get the cost per round for a weapon's current round type.
 * Reads `caliber` and `roundType` from weaponData.
 * Falls back to default caliber for weaponType if caliber not set.
 */
function _getAmmoCostForWeapon(weaponData) {
  const caliber = weaponData.caliber
    || SLA_WEAPON_DEFAULT_CALIBER[weaponData.weaponType]
    || null;
  if (!caliber) return 0;
  const catalog = SLA_AMMO_CATALOG[caliber];
  if (!catalog) return 0;
  const roundType = (weaponData.roundType || weaponData.ammoType || "standard").toLowerCase();
  const rd = catalog.rounds[roundType] || catalog.rounds.standard;
  return rd ? rd.costPerRound : 0;
}

/**
 * Get AP and damage modifiers from the current round type.
 */
function _getAmmoModifiers(weaponData) {
  const caliber = weaponData.caliber
    || SLA_WEAPON_DEFAULT_CALIBER[weaponData.weaponType]
    || null;
  if (!caliber) return { apBonus: 0, damageMod: 0, blastRadius: 0 };
  const catalog = SLA_AMMO_CATALOG[caliber];
  if (!catalog) return { apBonus: 0, damageMod: 0, blastRadius: 0 };
  const roundType = (weaponData.roundType || weaponData.ammoType || "standard").toLowerCase();
  const rd = catalog.rounds[roundType] || catalog.rounds.standard;
  return rd ? { apBonus: rd.apBonus, damageMod: rd.damageMod, blastRadius: rd.blastRadius } : { apBonus: 0, damageMod: 0, blastRadius: 0 };
}

/**
 * Deduct bullet tax from actor credits and update session ammo log.
 * Called after a weapon fires.
 */
async function _applyBulletTax(actor, weaponData, roundsFired) {
  if (!actor || roundsFired <= 0) return 0;
  const costPerRound = _getAmmoCostForWeapon(weaponData);
  if (costPerRound <= 0) return 0;

  const totalCost = costPerRound * roundsFired;
  const currentCredits = Number(actor.system?.details?.credits ?? 0);
  const newCredits = currentCredits - totalCost;

  // Deduct from credits; track session bullet tax
  const sessionSpent = Number(actor.system?.finances?.ammoSpentSession ?? 0) + totalCost;
  const bulletTaxTotal = Number(actor.system?.finances?.expenses?.bulletTax ?? 0) + totalCost;

  await actor.update({
    "system.details.credits": newCredits,
    "system.finances.ammoSpentSession": sessionSpent,
    "system.finances.expenses.bulletTax": bulletTaxTotal
  });

  return totalCost;
}

/**
 * Build a complete ammo stock for a weapon.
 * Returns array of ammo item data objects (all 3 round types).
 */
function _buildAmmoStockForWeapon(weaponName, caliber) {
  const catalog = SLA_AMMO_CATALOG[caliber];
  if (!catalog) return [];
  const mag = catalog.magazineDefault;
  return Object.entries(catalog.rounds).map(([type, rd]) => ({
    name: rd.name,
    type: "ammo",
    system: {
      description: rd.description,
      caliber,
      roundType: type,
      quantity: type === "standard" ? mag * 3 : mag,  // 3 mags standard, 1 each for AP/HE
      costPerRound: rd.costPerRound,
      apBonus: rd.apBonus,
      damageMod: rd.damageMod,
      blastRadius: rd.blastRadius,
      weight: 0
    }
  }));
}

// ── Hook: Auto-set caliber on weapons when created or updated ─────────────────
Hooks.on("createItem", async (item, _options, userId) => {
  if (game.user?.id !== userId) return;
  if (item.type !== "weapon") return;
  const wt = item.system?.weaponType || "";
  if (!item.system?.caliber && SLA_WEAPON_DEFAULT_CALIBER[wt]) {
    const caliber = SLA_WEAPON_DEFAULT_CALIBER[wt];
    const catalog  = SLA_AMMO_CATALOG[caliber];
    if (!catalog) return;
    await item.update({
      "system.caliber":       caliber,
      "system.roundType":     "standard",
      "system.roundCostStd":  catalog.rounds.standard.costPerRound,
      "system.roundCostAP":   catalog.rounds.ap.costPerRound,
      "system.roundCostHE":   catalog.rounds.he.costPerRound
    });
  }
});

// ── Chat helper: show bullet tax in weapon result messages ────────────────────
function _formatBulletTaxLine(totalCost, roundsFired, costPerRound, roundType, caliber) {
  if (!totalCost) return '';
  const label = caliber ? `${caliber} ${roundType}` : roundType;
  return `<div class="bullet-tax-line">💸 Bullet Tax: <strong>${roundsFired}× ${label} @ ${costPerRound}c = <span class="btax-total">−${totalCost}c</span></strong></div>`;
}


// ══════════════════════════════════════════════════════════════════════════════
//   ZERO ENGINE — CHARACTER SHEET MARK 2
// ══════════════════════════════════════════════════════════════════════════════

class ZeroEngineActorSheetMk2 extends ZeroEngineActorSheet {
  /** Override the base class's hardcoded template path */
  get template() {
    return "systems/zero-engine/templates/actor/character-sheet-mk2.hbs";
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["zero-engine", "sheet", "actor"],
      template: "systems/zero-engine/templates/actor/character-sheet-mk2.hbs",
      width:  760,
      height: 720,
      tabs: [],
      resizable: true
    });
  }

  async getData(options = {}) {
    const context = await super.getData(options);

    // ── Safe finances defaults ─────────────────────────────────────────────
    if (!context.system.finances) {
      context.system.finances = {
        income:   { salary: 0, bpnReward: 0, other: 0 },
        expenses: { accommodation: 0, drugs: 0, subscriptions: 0, other: 0, bulletTax: 0 },
        debt: 0, ammoSpentSession: 0
      };
    }
    const inc = context.system.finances.income  || {};
    const exp = context.system.finances.expenses || {};
    context.weeklyIncome   = (inc.salary||0) + (inc.bpnReward||0) + (inc.other||0);
    context.weeklyExpenses = (exp.accommodation||0) + (exp.drugs||0) + (exp.subscriptions||0) + (exp.other||0);
    context.weeklyNet      = context.weeklyIncome - context.weeklyExpenses;
    context.weeklyNetSign  = context.weeklyNet >= 0 ? '+' : '';
    context.weeklyNetColor = context.weeklyNet >= 0 ? '#44cc66' : '#cc1111';

    // ── Attribute groups — each attribute with its 3 skills underneath ───
    const ATTR_SKILL_MAP = {
      strength: { label: 'STR', colorClass: 'str-color', skills: ['force','melee','stamina'] },
      agility:  { label: 'AGI', colorClass: 'agi-color', skills: ['marksmanship','mobility','stealth'] },
      wits:     { label: 'WIT', colorClass: 'wit-color', skills: ['crafting','observation','survival'] },
      empathy:  { label: 'EMP', colorClass: 'emp-color', skills: ['healing','insight','persuasion'] }
    };
    context.attributeGroups = Object.entries(ATTR_SKILL_MAP).map(([attrKey, cfg]) => {
      const attrVal = context.system.attributes?.[attrKey]?.value || 2;
      return {
        key: attrKey, label: cfg.label, colorClass: cfg.colorClass, value: attrVal,
        skills: cfg.skills.map(sk => {
          const skill = context.system.skills?.[sk] || { value: 0, label: sk };
          return {
            key: sk, label: skill.label || sk, value: skill.value || 0,
            attribute: attrKey,
            dots: Array.from({length: 5}, (_, i) => ({ filled: i < (skill.value || 0) }))
          };
        })
      };
    });

    // ── Flat skills list (for ebb skill separately) ───────────────────────
    const skillDotCount = 5;
    context.skillsWithDots = Object.entries(context.system.skills || {}).map(([key, skill]) => ({
      key, label: skill.label || key, value: skill.value || 0, attribute: skill.attribute || '',
      dots: Array.from({length: skillDotCount}, (_, i) => ({ filled: i < (skill.value || 0) }))
    }));
    context.attributeList = Object.entries(context.system.attributes || {}).map(([key, attr]) => ({
      key, value: attr.value || 2, label: key.toUpperCase().slice(0, 3)
    }));

    // ── Weapon shot options for each weapon ────────────────────────────────
    context.weaponItems = (context.items || []).filter(i => i.type === 'weapon').map(w => {
      const fireModes = Array.isArray(w.system?.fireModes) ? w.system.fireModes : ['single'];
      const shots = _getShotOptions(fireModes);
      const caliber = w.system?.caliber || SLA_WEAPON_DEFAULT_CALIBER?.[w.system?.weaponType] || '';
      const roundType = w.system?.roundType || 'standard';
      const costStd = w.system?.roundCostStd || 0;
      const costAP  = w.system?.roundCostAP  || 0;
      const costHE  = w.system?.roundCostHE  || 0;
      const currentCost = roundType === 'ap' ? costAP : roundType === 'he' ? costHE : costStd;
      return { ...w, caliber, roundType, currentCost, multiShot: shots.length > 1, shotOptions: shots };
    });

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = html instanceof jQuery ? html[0] : html;

    // ── Tab switching (new template uses .mk2-nav-tab / .mk2-panel) ──────────
    // Tab switching — template uses .mk2-tab, panels use data-panel matching data-tab
    root.querySelectorAll('.mk2-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        root.querySelectorAll('.mk2-tab').forEach(t => t.classList.remove('active'));
        root.querySelectorAll('.mk2-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = root.querySelector(`.mk2-panel[data-panel="${tab.dataset.tab}"]`);
        if (panel) panel.classList.add('active');
      });
    });

    // ── Round type selector ────────────────────────────────────────────────
    root.querySelectorAll('.round-select').forEach(btn => {
      btn.addEventListener('click', async () => {
        const itemId = btn.dataset.itemId;
        const round  = btn.dataset.round;
        const item   = this.actor.items.get(itemId);
        if (!item) return;
        await item.update({ "system.roundType": round });
      });
    });

    // ── Mk2 critical buttons ───────────────────────────────────────────────
    root.querySelector('.physical-critical-btn')?.addEventListener('click', ev => {
      ev.preventDefault(); this._rollPhysicalCritical(ev);
    });
    root.querySelector('.mental-critical-btn')?.addEventListener('click', ev => {
      ev.preventDefault(); this._rollMentalCritical(ev);
    });

    // ── Ammo quantity inline edit ──────────────────────────────────────────
    root.querySelectorAll('.ammo-qty-input').forEach(input => {
      input.addEventListener('change', async () => {
        const itemId = input.dataset.itemId;
        const item   = this.actor.items.get(itemId);
        if (!item) return;
        await item.update({ "system.quantity": parseInt(input.value) || 0 });
      });
    });

    // ── Net income live update ─────────────────────────────────────────────
    const netEl = root.querySelector('#mk2-net-income');
    const updateNet = () => {
      if (!netEl) return;
      const salary  = parseInt(root.querySelector('[name="system.finances.income.salary"]')?.value)  || 0;
      const bpn     = parseInt(root.querySelector('[name="system.finances.income.bpnReward"]')?.value) || 0;
      const other   = parseInt(root.querySelector('[name="system.finances.income.other"]')?.value)   || 0;
      const acc     = parseInt(root.querySelector('[name="system.finances.expenses.accommodation"]')?.value) || 0;
      const drugs   = parseInt(root.querySelector('[name="system.finances.expenses.drugs"]')?.value) || 0;
      const subs    = parseInt(root.querySelector('[name="system.finances.expenses.subscriptions"]')?.value) || 0;
      const othExp  = parseInt(root.querySelector('[name="system.finances.expenses.other"]')?.value) || 0;
      const net = (salary + bpn + other) - (acc + drugs + subs + othExp);
      netEl.textContent = `${net >= 0 ? '+' : ''}${net}c`;
      netEl.style.color = net >= 0 ? '#44cc66' : '#cc1111';
    };
    root.querySelectorAll('[name^="system.finances"]').forEach(el => {
      el.addEventListener('input', updateNet);
    });
    updateNet();
  }
}

// (Mk2 sheet registration moved to the main init hook above)


// ══════════════════════════════════════════════════════════════════════════════
//   SLA INDUSTRIES — COMBAT CONDITIONS + MULTI-SHOT SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

// ─── CONDITION DEFINITIONS ───────────────────────────────────────────────────

const SLA_CONDITIONS = [
  {
    id: "sla-bleeding",
    label: "Bleeding",
    icon: "icons/svg/blood.svg",
    hpPerTurn: 1,
    diceModifiers: {},
    description: "Lose 1 HP at the start of each turn. Cleared by any healing."
  },
  {
    id: "sla-stunned",
    label: "Stunned",
    icon: "icons/svg/daze.svg",
    hpPerTurn: 0,
    diceModifiers: { all: -3 },
    description: "-3 dice to all rolls. Clears at end of turn."
  },
  {
    id: "sla-pinned",
    label: "Pinned",
    icon: "icons/svg/target.svg",
    hpPerTurn: 0,
    diceModifiers: { melee: -2, marksmanship: -2, mobility: -2 },
    description: "-2 dice on attacks and mobility. Requires cover action to clear."
  },
  {
    id: "sla-suppressed",
    label: "Suppressed",
    icon: "icons/svg/cowled.svg",
    hpPerTurn: 0,
    diceModifiers: { all: -2 },
    description: "-2 dice to all actions. Cleared by passing a STAMINA roll."
  },
  {
    id: "sla-on-fire",
    label: "On Fire",
    icon: "icons/svg/fire.svg",
    hpPerTurn: 2,
    escalating: true,
    diceModifiers: { all: -1 },
    description: "Lose 2+ HP/turn (escalates). -1 die to all rolls. Requires action to extinguish."
  },
  {
    id: "sla-blinded",
    label: "Blinded",
    icon: "icons/svg/blind.svg",
    hpPerTurn: 0,
    diceModifiers: { marksmanship: -3, melee: -2, observation: -3 },
    description: "-3 dice on ranged attacks and observation. -2 on melee."
  },
  {
    id: "sla-deafened",
    label: "Deafened",
    icon: "icons/svg/deaf.svg",
    hpPerTurn: 0,
    diceModifiers: { observation: -1 },
    description: "-1 die to observation. Cannot hear audio cues."
  },
  {
    id: "sla-broken",
    label: "Broken",
    icon: "icons/svg/skull.svg",
    hpPerTurn: 0,
    diceModifiers: { all: -2 },
    description: "-2 dice to all rolls. Must roll STAMINA to act. Cleared by healing to above 0 HP."
  },
  {
    id: "sla-winded",
    label: "Winded",
    icon: "icons/svg/daze.svg",
    hpPerTurn: 0,
    diceModifiers: { all: -1 },
    description: "Winded — -1 die to all rolls. Clears at end of round."
  },
  {
    id: "sla-broken-arm",
    label: "Broken Arm",
    icon: "icons/svg/blood.svg",
    hpPerTurn: 0,
    diceModifiers: { melee: -2, marksmanship: -1, force: -1 },
    description: "Broken arm — cannot use that arm; -2 Melee, -1 Marksmanship, -1 Force."
  },
  {
    id: "sla-broken-leg",
    label: "Broken Leg",
    icon: "icons/svg/blood.svg",
    hpPerTurn: 0,
    diceModifiers: { mobility: -2, stealth: -1 },
    description: "Broken leg — cannot run; -2 Mobility, -1 Stealth."
  },
  {
    id: "sla-concussed",
    label: "Concussed",
    icon: "icons/svg/daze.svg",
    hpPerTurn: 0,
    diceModifiers: { all: -1, observation: -1, wits: -1 },
    description: "Concussed — -1 die to all rolls, extra -1 to Observation/Wits-based rolls."
  },
  {
    id: "sla-gut-wound",
    label: "Gut Wound",
    icon: "icons/svg/blood.svg",
    hpPerTurn: 0,
    diceModifiers: { all: -2 },
    description: "Gut wound — severe pain, -2 dice to all rolls."
  },
  {
    id: "sla-panicking",
    label: "Panicking",
    icon: "icons/svg/terror.svg",
    hpPerTurn: 0,
    diceModifiers: { all: -2 },
    description: "Panicking — cannot act normally. -2 dice to all rolls."
  },
  {
    id: "sla-shaken",
    label: "Shaken",
    icon: "icons/svg/terror.svg",
    hpPerTurn: 0,
    diceModifiers: { all: -1 },
    description: "Shaken — rattled by horror or trauma. -1 die to all rolls."
  }
];

// Conditions are registered in the main init hook (search for "SLA_CONDITIONS" above this line)

// ─── CONDITION MODIFIER HELPER ────────────────────────────────────────────────

/**
 * Returns dice-pool penalty from any active SLA conditions on this actor.
 * Checks actor.statuses (Foundry v14 Set<string>) and system.derivedStats.broken.
 */
function _getConditionModifiers(actor, { skill = "", attribute = "" } = {}) {
  const statuses = actor.statuses ?? new Set();
  let bonus = 0;
  const breakdown = [];

  for (const cond of SLA_CONDITIONS) {
    if (!statuses.has(cond.id)) continue;
    const mods = cond.diceModifiers || {};
    // "all" modifier applies to everything
    if (mods.all) {
      bonus += mods.all;
      breakdown.push(`${cond.label} ${mods.all}`);
      continue;
    }
    // skill-specific modifier
    if (skill && mods[skill] !== undefined) {
      bonus += mods[skill];
      breakdown.push(`${cond.label} ${mods[skill]}`);
    }
  }

  // Legacy broken flag — only apply while CURRENT HP is actually 0
  // (The flag used to persist forever after healing, causing a permanent -2 penalty)
  if (actor.system?.derivedStats?.broken && !statuses.has("sla-broken")) {
    const currentHp = Number(
      typeof actor.system.derivedStats.health === "object"
        ? actor.system.derivedStats.health?.value
        : actor.system.derivedStats.health
    ) || 0;
    if (currentHp <= 0) {
      bonus -= 2;
      breakdown.push("Broken −2");
    }
    // If HP > 0 the broken flag is stale — ignore it (cleared on next recalc)
  }

  return { bonus, breakdown };
}

// ─── AUTO-DAMAGE FROM CONDITIONS EACH COMBAT TURN ────────────────────────────

Hooks.on("combatTurnChange", async (combat, _prior, current) => {
  if (!game.user?.isGM) return;
  const combatant = combat.combatants.get(current.combatantId);
  if (!combatant?.actor) return;
  const actor = combatant.actor;
  const statuses = actor.statuses ?? new Set();

  const updates = {};
  const messages = [];

  // Bleeding: -1 HP
  if (statuses.has("sla-bleeding")) {
    const hp    = Number(actor.system?.derivedStats?.health?.value ?? 0);
    const newHp = Math.max(0, hp - 1);
    updates["system.derivedStats.health.value"] = newHp;
    messages.push(`🩸 <strong>${actor.name}</strong> bleeds — ${hp} → ${newHp} HP`);
    if (newHp <= 0) messages.push(`⚠ ${actor.name} is at 0 HP!`);
  }

  // On Fire: -2 HP (escalating tracked via a flag)
  if (statuses.has("sla-on-fire")) {
    const fireLvl = Number(actor.getFlag("zero-engine", "fireLevel") ?? 1);
    const hp    = Number((updates["system.derivedStats.health.value"] ?? actor.system?.derivedStats?.health?.value) ?? 0);
    const dmg   = fireLvl + 1;
    const newHp = Math.max(0, hp - dmg);
    updates["system.derivedStats.health.value"] = newHp;
    await actor.setFlag("zero-engine", "fireLevel", Math.min(fireLvl + 1, 5));
    messages.push(`🔥 <strong>${actor.name}</strong> burns (level ${fireLvl}) — ${hp} → ${newHp} HP`);
  }

  if (Object.keys(updates).length > 0) {
    await actor.update(updates);
  }

  if (messages.length > 0) {
    ChatMessage.create({
      speaker: { alias: "Combat Conditions" },
      content: `<div class="yze-initiative-card" style="border-color:rgba(204,17,17,0.5);">${messages.join('<br>')}</div>`
    });
  }
});

// Clear fire level when fire is extinguished
Hooks.on("updateActor", async (actor, changes) => {
  if (!game.user?.isGM) return;
  // If fire condition removed, reset fire level
  const statuses = actor.statuses ?? new Set();
  if (!statuses.has("sla-on-fire")) {
    const lvl = actor.getFlag("zero-engine", "fireLevel");
    if (lvl) await actor.unsetFlag("zero-engine", "fireLevel");
  }
});

// ─── CONDITION APPLICATION UI ─────────────────────────────────────────────────

/**
 * Add condition buttons to the token HUD.
 * This supplements Foundry's built-in status icon system.
 */
Hooks.on("renderTokenHUD", (hud, html, data) => {
  // Foundry's built-in status icons will handle the SLA conditions
  // since we registered them in CONFIG.statusEffects.
  // No additional code needed here — the token HUD will show them.
});

// ══════════════════════════════════════════════════════════════════════════════
//   MULTI-SHOT SYSTEM
//   Allows firing multiple rounds for bonus dice at cost of ammo + bullet tax.
//   Shot count capped by weapon fire mode capability.
// ══════════════════════════════════════════════════════════════════════════════

const SHOT_OPTIONS = [
  { shots: 1, label: "1 Shot (single)",   diceBonus: 0, requiresMode: ["single","semi","burst","auto"] },
  { shots: 2, label: "2 Shots (+1 die)",  diceBonus: 1, requiresMode: ["semi","burst","auto"] },
  { shots: 3, label: "3 Shots (+2 dice)", diceBonus: 2, requiresMode: ["burst","auto"] },
  { shots: 6, label: "6 Shots (+3 dice)", diceBonus: 3, requiresMode: ["auto"] },
];

/**
 * Get which shot options are available for a weapon based on its fire modes.
 */
function _getShotOptions(fireModes) {
  const modes = (Array.isArray(fireModes) ? fireModes : [fireModes]).map(m => String(m).toLowerCase());
  const hasAuto  = modes.some(m => m === "auto" || m === "full_auto" || m === "full");
  const hasBurst = modes.some(m => m === "burst");
  const hasSemi  = modes.some(m => m === "semi" || m === "semi_auto");
  const hasSingle = modes.some(m => m === "single");

  const caps = [];
  if (hasSingle || !hasSemi && !hasBurst && !hasAuto) caps.push("single");
  if (hasSemi || hasBurst || hasAuto) caps.push("semi");
  if (hasBurst || hasAuto) caps.push("burst");
  if (hasAuto) caps.push("auto");

  return SHOT_OPTIONS.filter(opt =>
    opt.requiresMode.some(req => caps.includes(req))
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//   SLA INDUSTRIES — GAME PAUSED ANIMATION
//   Animated SVG overlay: dual rotating rings, SLA logo, scan-line, flicker
// ══════════════════════════════════════════════════════════════════════════════

let _zePauseRefreshHandle = null;

function _zeInjectPauseAnimation() {
  document.body?.classList.add("ze-pause-active");
  if (document.querySelector('.ze-pause-root')) return;

  const html = `
  <div class="ze-pause-root" aria-label="SLA Industries — System Standby">
    <div class="ze-pause-stage">
      <svg class="ze-pause-svg" viewBox="-120 -120 240 280" xmlns="http://www.w3.org/2000/svg" role="img">
        <defs>
          <filter id="ze-glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="ze-glow-ring" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="ze-bg-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stop-color="#1a0000" stop-opacity="0.98"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0.0"/>
          </radialGradient>
          <clipPath id="ze-clip-outer"><circle cx="0" cy="0" r="108"/></clipPath>
        </defs>

        <!-- Background glow -->
        <circle cx="0" cy="0" r="108" fill="url(#ze-bg-grad)" class="ze-pause-core-glow"/>

        <!-- Outer ring — clockwise -->
        <g class="ze-ring-outer">
          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="20s" repeatCount="indefinite"/>
          <circle cx="0" cy="0" r="90" fill="none" stroke="#8b1a1a" stroke-width="0.8" stroke-dasharray="6 4" opacity="0.7" filter="url(#ze-glow-ring)"/>
          <!-- 3 orbital nodes -->
          <circle cx="0"     cy="-90" r="5" fill="#cc1111" filter="url(#ze-glow-red)" class="ze-sat"/>
          <circle cx="77.9"  cy="45"  r="5" fill="#cc1111" filter="url(#ze-glow-red)" class="ze-sat"/>
          <circle cx="-77.9" cy="45"  r="5" fill="#cc1111" filter="url(#ze-glow-red)" class="ze-sat"/>
          <!-- Tick marks every 30° -->
          <line x1="0" y1="-86" x2="0" y2="-94" stroke="#8b1a1a" stroke-width="1" transform="rotate(0)"/>
          <line x1="0" y1="-86" x2="0" y2="-94" stroke="#8b1a1a" stroke-width="1" transform="rotate(30)"/>
          <line x1="0" y1="-86" x2="0" y2="-94" stroke="#8b1a1a" stroke-width="1" transform="rotate(60)"/>
          <line x1="0" y1="-86" x2="0" y2="-94" stroke="#8b1a1a" stroke-width="1" transform="rotate(90)"/>
          <line x1="0" y1="-86" x2="0" y2="-94" stroke="#8b1a1a" stroke-width="1" transform="rotate(120)"/>
          <line x1="0" y1="-86" x2="0" y2="-94" stroke="#8b1a1a" stroke-width="1" transform="rotate(150)"/>
          <line x1="0" y1="-86" x2="0" y2="-94" stroke="#8b1a1a" stroke-width="1" transform="rotate(180)"/>
          <line x1="0" y1="-86" x2="0" y2="-94" stroke="#8b1a1a" stroke-width="1" transform="rotate(210)"/>
          <line x1="0" y1="-86" x2="0" y2="-94" stroke="#8b1a1a" stroke-width="1" transform="rotate(240)"/>
          <line x1="0" y1="-86" x2="0" y2="-94" stroke="#8b1a1a" stroke-width="1" transform="rotate(270)"/>
          <line x1="0" y1="-86" x2="0" y2="-94" stroke="#8b1a1a" stroke-width="1" transform="rotate(300)"/>
          <line x1="0" y1="-86" x2="0" y2="-94" stroke="#8b1a1a" stroke-width="1" transform="rotate(330)"/>
        </g>

        <!-- Inner ring — counter-clockwise -->
        <g class="ze-ring-inner">
          <animateTransform attributeName="transform" type="rotate" from="360 0 0" to="0 0 0" dur="14s" repeatCount="indefinite"/>
          <circle cx="0" cy="0" r="62" fill="none" stroke="#6b1010" stroke-width="0.6" stroke-dasharray="4 6" opacity="0.6" filter="url(#ze-glow-ring)"/>
          <circle cx="53.7"  cy="-31" r="3.5" fill="#dd3311" filter="url(#ze-glow-red)" class="ze-sat-inner"/>
          <circle cx="-53.7" cy="-31" r="3.5" fill="#dd3311" filter="url(#ze-glow-red)" class="ze-sat-inner"/>
          <circle cx="0"     cy="62"  r="3.5" fill="#dd3311" filter="url(#ze-glow-red)" class="ze-sat-inner"/>
        </g>

        <!-- SLA logo hexagon -->
        <g filter="url(#ze-glow-red)" class="ze-pause-logo-core">
          <polygon points="0,-38 33,-19 33,19 0,38 -33,19 -33,-19"
            fill="#110000" stroke="#cc1111" stroke-width="1.5" opacity="0.95"/>
          <text x="0" y="14" text-anchor="middle"
            font-family="'SLA Borg Title','Oswald','Impact','Arial Narrow',sans-serif"
            font-size="36" font-weight="700" letter-spacing="3" fill="#ff2222">SLA</text>
        </g>

        <!-- Separator line -->
        <line x1="-72" y1="52" x2="72" y2="52" stroke="#8b1a1a" stroke-width="0.5" opacity="0.7"/>

        <!-- OPERATIVE STATUS: STANDBY -->
        <text x="0" y="72" text-anchor="middle"
          font-family="'SLA Borg Title','Oswald','Courier New',monospace"
          font-size="10.5" font-weight="500" letter-spacing="3" fill="#ff6666"
          class="ze-pause-standby">OPERATIVE STATUS</text>
        <text x="0" y="88" text-anchor="middle"
          font-family="'SLA Borg Tech','Courier New',monospace"
          font-size="9" font-weight="400" letter-spacing="4" fill="#ff3333"
          class="ze-pause-standby2">STAND BY</text>

        <!-- SLA INDUSTRIES sub-label -->
        <text x="0" y="108" text-anchor="middle"
          font-family="'SLA Borg UI','Oswald','Arial Narrow',sans-serif"
          font-size="7.5" font-weight="300" letter-spacing="3.5" fill="#881111" opacity="0.85">
          SLA INDUSTRIES · MORT CITY GRID
        </text>

        <!-- Scan sweep line -->
        <line x1="0" y1="-90" x2="0" y2="0"
          stroke="#ff1111" stroke-width="0.9" opacity="0.15" class="ze-pause-scan"/>
      </svg>
    </div>
  </div>`;

  document.body?.insertAdjacentHTML('beforeend', html);
}

function _zeRemovePauseAnimation() {
  document.querySelector('.ze-pause-root')?.remove();
  document.body?.classList.remove('ze-pause-active');
}

function _zeQueuePauseRefresh(delay = 0) {
  window.clearTimeout(_zePauseRefreshHandle);
  _zePauseRefreshHandle = window.setTimeout(() => {
    if (!game?.paused) return;
    _zeInjectPauseAnimation();
  }, delay);
}

Hooks.once('ready', () => {
  if (game.paused) {
    _zeQueuePauseRefresh(0);
    _zeQueuePauseRefresh(60);
    _zeQueuePauseRefresh(180);
  }
});

Hooks.on('pauseGame', (paused) => {
  if (paused) {
    requestAnimationFrame(() => requestAnimationFrame(() => _zeInjectPauseAnimation()));
    _zeQueuePauseRefresh(60);
    _zeQueuePauseRefresh(200);
  } else {
    _zeRemovePauseAnimation();
  }
});
