// Turns "grams the plan needs" into "what you actually pick up at the store".
//
// Recipes think in grams; shoppers think in eggs, loaves, and pounds. Each
// ingredient below says how it's sold. Package sizes are typical US grocery
// sizes — they're estimates, so adjust a line here if your store differs.
// Ingredients not listed fall back to plain grams, so new recipes never break.

export type StoreQuantity = {
  /** What to put in the cart, e.g. "2 dozen eggs". */
  buy: string;
  /** The exact amount the plan needs, e.g. "≈ 19 eggs · 902 g". */
  detail: string;
};

type Rule =
  // Sold by the pound (meat, fish, loose produce) — rounded UP to the next ¼ lb.
  | { kind: 'weight' }
  // Counted individually; optionally sold in fixed-size cartons (eggs by the dozen).
  | { kind: 'count'; each: number; one: string; many: string; carton?: { size: number; one: string; many: string } }
  // Sold in a fixed-size package (jar, bag, can).
  | { kind: 'pack'; grams: number; label: string };

const LB = 453.592;
// Packages are coarse and recipe weights are estimates, so being up to 5% short
// of a package boundary doesn't justify buying a whole extra one.
const PACK_SLACK = 0.05;

const RULES: Record<string, Rule> = {
  // Meat, fish, and produce sold by weight
  'Chicken breast, raw': { kind: 'weight' },
  'Salmon, raw': { kind: 'weight' },
  'Broccoli': { kind: 'weight' },
  'Green beans': { kind: 'weight' },
  // Counted
  'Eggs, edible portion': { kind: 'count', each: 50, one: 'egg', many: 'eggs', carton: { size: 12, one: 'dozen', many: 'dozen' } },
  'Avocado': { kind: 'count', each: 140, one: 'avocado', many: 'avocados' },
  'Banana': { kind: 'count', each: 120, one: 'banana', many: 'bananas' },
  'Cucumber': { kind: 'count', each: 300, one: 'cucumber', many: 'cucumbers' },
  'Lemon': { kind: 'count', each: 100, one: 'lemon', many: 'lemons' },
  'Sweet potato': { kind: 'count', each: 250, one: 'sweet potato', many: 'sweet potatoes' },
  'Fresh ginger': { kind: 'count', each: 50, one: 'knob of ginger', many: 'knobs of ginger' },
  // Packaged
  'Wholegrain bread': { kind: 'pack', grams: 680, label: '24 oz loaf' },
  'Greek yogurt': { kind: 'pack', grams: 907, label: '32 oz tub' },
  'Feta': { kind: 'pack', grams: 200, label: '7 oz block' },
  'Rolled oats, dry': { kind: 'pack', grams: 510, label: '18 oz canister' },
  'Chia seeds': { kind: 'pack', grams: 340, label: '12 oz bag' },
  'Peanut butter': { kind: 'pack', grams: 454, label: '16 oz jar' },
  'Brown rice, dry': { kind: 'pack', grams: 907, label: '2 lb bag' },
  'Quinoa, dry': { kind: 'pack', grams: 340, label: '12 oz bag' },
  'Lentils, dry': { kind: 'pack', grams: 454, label: '1 lb bag' },
  'Wholewheat noodles, dry': { kind: 'pack', grams: 454, label: '1 lb box' },
  'Canned tomatoes': { kind: 'pack', grams: 400, label: '14 oz can' },
  'Chickpeas, drained': { kind: 'pack', grams: 250, label: '15 oz can' },
  'Olive oil': { kind: 'pack', grams: 455, label: '500 mL bottle' },
  'Soy sauce': { kind: 'pack', grams: 355, label: '10 oz bottle' },
  'Firm tofu': { kind: 'pack', grams: 397, label: '14 oz block' },
  'Cherry tomatoes': { kind: 'pack', grams: 283, label: 'pint' },
  'Mixed berries': { kind: 'pack', grams: 340, label: '12 oz bag' },
  'Spinach': { kind: 'pack', grams: 283, label: '10 oz bag' },
};

const FRACTIONS = ['', '¼', '½', '¾'];

/** Grams → pounds, rounded UP to the next quarter pound: "1¼ lb". */
export function pounds(grams: number) {
  const quarters = Math.max(1, Math.ceil((grams / LB) * 4 - 1e-9));
  const whole = Math.floor(quarters / 4);
  return `${whole > 0 ? whole : ''}${FRACTIONS[quarters % 4]} lb`;
}

const grams = (g: number) => (g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${Math.round(g)} g`);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function storeQuantity(name: string, amount: number): StoreQuantity {
  const rule = RULES[name];
  const needed = grams(amount);

  if (!rule) return { buy: needed, detail: '' };

  if (rule.kind === 'weight') {
    return { buy: pounds(amount), detail: `${needed} needed` };
  }

  if (rule.kind === 'count') {
    const count = Math.max(1, Math.ceil(amount / rule.each - 1e-9));
    const exact = `≈ ${count} ${plural(count, rule.one, rule.many)} · ${needed}`;
    if (rule.carton) {
      const cartons = Math.ceil(count / rule.carton.size);
      return { buy: `${cartons} ${plural(cartons, rule.carton.one, rule.carton.many)} ${rule.many}`, detail: exact };
    }
    return { buy: `${count} ${plural(count, rule.one, rule.many)}`, detail: needed + ' needed' };
  }

  const packs = Math.max(1, Math.ceil((amount * (1 - PACK_SLACK)) / rule.grams - 1e-9));
  return { buy: `${packs} × ${rule.label}`, detail: `${needed} needed` };
}
