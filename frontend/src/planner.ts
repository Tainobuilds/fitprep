export type Ingredient = { name: string; grams: number; category: string };
export type Recipe = {
  id: string; name: string; slot: 'Breakfast' | 'Lunch' | 'Dinner';
  vegetarian: boolean; emoji: string; color: string; minutes: number;
  protein: number; carbs: number; fat: number; ingredients: Ingredient[]; steps: string[];
};
const ingredient = (name: string, grams: number, category: string): Ingredient => ({ name, grams, category });
export const recipes: Recipe[] = [
  { id: 'berry-oats', name: 'Berry overnight oats', slot: 'Breakfast', vegetarian: true, emoji: '🫐', color: 'lavender', minutes: 10, protein: 29, carbs: 65, fat: 14,
    ingredients: [ingredient('Rolled oats, dry', 65, 'Pantry'), ingredient('Greek yogurt', 170, 'Chilled'), ingredient('Mixed berries', 100, 'Produce'), ingredient('Chia seeds', 15, 'Pantry')],
    steps: ['Mix oats, yogurt, and chia seeds with a splash of water.', 'Divide between containers and top with berries.', 'Cover and refrigerate overnight.'] },
  { id: 'egg-toast', name: 'Egg & avocado toast', slot: 'Breakfast', vegetarian: true, emoji: '🥑', color: 'sage', minutes: 15, protein: 25, carbs: 43, fat: 24,
    ingredients: [ingredient('Eggs, edible portion', 100, 'Chilled'), ingredient('Wholegrain bread', 90, 'Bakery'), ingredient('Avocado', 65, 'Produce'), ingredient('Cherry tomatoes', 80, 'Produce')],
    steps: ['Cook eggs to your preference.', 'Toast the bread just before eating.', 'Top with mashed avocado, eggs, and halved tomatoes. Keep components separate until serving.'] },
  { id: 'yogurt-bowl', name: 'Banana crunch bowl', slot: 'Breakfast', vegetarian: true, emoji: '🍌', color: 'butter', minutes: 5, protein: 29, carbs: 67, fat: 14,
    ingredients: [ingredient('Greek yogurt', 220, 'Chilled'), ingredient('Banana', 120, 'Produce'), ingredient('Rolled oats, dry', 45, 'Pantry'), ingredient('Peanut butter', 20, 'Pantry')],
    steps: ['Portion yogurt into containers.', 'Add sliced banana and peanut butter before serving.', 'Sprinkle with oats for crunch.'] },
  { id: 'chicken-bowl', name: 'Lemon chicken grain bowl', slot: 'Lunch', vegetarian: false, emoji: '🥗', color: 'sage', minutes: 30, protein: 49, carbs: 68, fat: 19,
    ingredients: [ingredient('Chicken breast, raw', 180, 'Protein'), ingredient('Brown rice, dry', 75, 'Pantry'), ingredient('Broccoli', 150, 'Produce'), ingredient('Olive oil', 14, 'Pantry'), ingredient('Lemon', 30, 'Produce')],
    steps: ['Cook rice according to the package instructions.', 'Season chicken with lemon and cook thoroughly in a pan.', 'Steam broccoli and divide all components between containers. Drizzle with olive oil.'] },
  { id: 'chickpea-bowl', name: 'Mediterranean chickpea bowl', slot: 'Lunch', vegetarian: true, emoji: '🥒', color: 'peach', minutes: 20, protein: 26, carbs: 83, fat: 24,
    ingredients: [ingredient('Chickpeas, drained', 180, 'Pantry'), ingredient('Quinoa, dry', 60, 'Pantry'), ingredient('Cucumber', 100, 'Produce'), ingredient('Cherry tomatoes', 100, 'Produce'), ingredient('Feta', 40, 'Chilled'), ingredient('Olive oil', 8, 'Pantry')],
    steps: ['Cook quinoa according to the package instructions and let cool.', 'Chop cucumber and tomatoes. Rinse and drain chickpeas.', 'Combine everything, crumble over feta, and dress with olive oil.'] },
  { id: 'tofu-bowl', name: 'Ginger tofu rice bowl', slot: 'Lunch', vegetarian: true, emoji: '🥦', color: 'butter', minutes: 25, protein: 33, carbs: 77, fat: 23,
    ingredients: [ingredient('Firm tofu', 200, 'Protein'), ingredient('Brown rice, dry', 75, 'Pantry'), ingredient('Broccoli', 150, 'Produce'), ingredient('Olive oil', 8, 'Pantry'), ingredient('Soy sauce', 15, 'Pantry'), ingredient('Fresh ginger', 10, 'Produce')],
    steps: ['Cook rice according to the package instructions.', 'Pat tofu dry, cube, and pan-fry in olive oil until golden.', 'Add broccoli, grated ginger, and soy sauce. Cook until broccoli is tender and portion over rice.'] },
  { id: 'salmon-tray', name: 'Salmon & sweet potato tray', slot: 'Dinner', vegetarian: false, emoji: '🍠', color: 'peach', minutes: 35, protein: 40, carbs: 66, fat: 28,
    ingredients: [ingredient('Salmon, raw', 180, 'Protein'), ingredient('Sweet potato', 300, 'Produce'), ingredient('Green beans', 150, 'Produce'), ingredient('Olive oil', 10, 'Pantry'), ingredient('Lemon', 30, 'Produce')],
    steps: ['Cube sweet potato, toss with oil, and roast until nearly tender.', 'Add salmon and green beans and continue roasting until fish is fully cooked.', 'Finish with lemon and portion into containers.'] },
  { id: 'lentil-pot', name: 'Smoky lentil & rice pot', slot: 'Dinner', vegetarian: true, emoji: '🍅', color: 'rose', minutes: 30, protein: 31, carbs: 102, fat: 13,
    ingredients: [ingredient('Lentils, dry', 90, 'Pantry'), ingredient('Brown rice, dry', 55, 'Pantry'), ingredient('Canned tomatoes', 200, 'Pantry'), ingredient('Spinach', 80, 'Produce'), ingredient('Olive oil', 10, 'Pantry')],
    steps: ['Cook rice according to the package instructions.', 'Simmer lentils with tomatoes and enough water until tender; season to taste.', 'Stir in spinach and olive oil, then portion with rice.'] },
  { id: 'tofu-noodles', name: 'Peanut tofu noodles', slot: 'Dinner', vegetarian: true, emoji: '🍜', color: 'lavender', minutes: 25, protein: 38, carbs: 76, fat: 27,
    ingredients: [ingredient('Firm tofu', 180, 'Protein'), ingredient('Wholewheat noodles, dry', 80, 'Pantry'), ingredient('Broccoli', 120, 'Produce'), ingredient('Peanut butter', 25, 'Pantry'), ingredient('Soy sauce', 15, 'Pantry'), ingredient('Fresh ginger', 10, 'Produce')],
    steps: ['Cook noodles according to the package instructions.', 'Pan-cook cubed tofu and broccoli until hot and tender.', 'Whisk peanut butter, soy sauce, ginger, and a splash of water. Toss with noodles and tofu.'] },
];
export const slots = ['Breakfast', 'Lunch', 'Dinner'] as const;
export type Settings = { calories: number; partnerCalories: number; household: boolean; vegetarian: boolean; variety: 'minimal' | 'balanced' | 'high' };
export type Meal = { recipeId: string; factor: number };
export type Plan = { version: 1; start: string; settings: Settings; days: Meal[][]; checked: string[]; prepped: string[]; generation: number };
export const defaults: Settings = { calories: 2000, partnerCalories: 2400, household: false, vegetarian: false, variety: 'balanced' };
export const kcal = (r: Recipe) => r.protein * 4 + r.carbs * 4 + r.fat * 9;
export const recipeFor = (meal: Meal) => recipes.find(r => r.id === meal.recipeId)!;
export const eligible = (slot: Recipe['slot'], settings: Settings) => recipes.filter(r => r.slot === slot && (!settings.vegetarian || r.vegetarian));
export function monday(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dateAt(start: string, offset: number) { const d = new Date(`${start}T12:00:00`); d.setDate(d.getDate() + offset); return d; }
export function generate(settings: Settings, generation = 0, start = monday()): Plan {
  if (![settings.calories, settings.partnerCalories].every(n => Number.isFinite(n) && n >= 1000 && n <= 5000)) throw new Error('Enter calorie targets between 1,000 and 5,000.');
  const days = Array.from({ length: 7 }, (_, day) => slots.map((slot, index) => {
    const options = eligible(slot, settings);
    const rotation = settings.variety === 'minimal' ? 0 : settings.variety === 'balanced' ? Math.floor(day / 3) : day;
    const recipe = options[(rotation + generation) % options.length];
    return { recipeId: recipe.id, factor: settings.calories * [0.25, 0.35, 0.4][index] / kcal(recipe) };
  }));
  return { version: 1, start, settings: { ...settings }, days, checked: [], prepped: [], generation };
}
export function swap(plan: Plan, day: number, slot: number, recipeId: string): Plan {
  const recipe = eligible(slots[slot], plan.settings).find(r => r.id === recipeId);
  if (!recipe) throw new Error('Choose a recipe that matches this meal and diet.');
  return { ...plan, checked: [], prepped: [], days: plan.days.map((meals, d) => meals.map((meal, s) => d === day && s === slot ? { recipeId, factor: plan.settings.calories * [0.25, 0.35, 0.4][slot] / kcal(recipe) } : meal)) };
}
export function totals(meals: Meal[], multiplier = 1) {
  return meals.reduce((sum, meal) => {
    const r = recipeFor(meal), factor = meal.factor * multiplier;
    return { calories: sum.calories + kcal(r) * factor, protein: sum.protein + r.protein * factor, carbs: sum.carbs + r.carbs * factor, fat: sum.fat + r.fat * factor };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}
export const householdMultiplier = (settings: Settings) => settings.household ? 1 + settings.partnerCalories / settings.calories : 1;
export function groceries(plan: Plan) {
  const items = new Map<string, Ingredient>();
  for (const meal of plan.days.flat()) for (const item of recipeFor(meal).ingredients) {
    const amount = item.grams * meal.factor * householdMultiplier(plan.settings);
    const existing = items.get(item.name);
    items.set(item.name, { ...item, grams: (existing?.grams ?? 0) + amount });
  }
  return [...items.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
export function batches(plan: Plan) {
  const grouped = new Map<string, { recipe: Recipe; factor: number; portions: number; days: number[] }>();
  for (const [day, meals] of plan.days.entries()) for (const meal of meals) {
    const previous = grouped.get(meal.recipeId);
    grouped.set(meal.recipeId, { recipe: recipeFor(meal), factor: (previous?.factor ?? 0) + meal.factor * householdMultiplier(plan.settings), portions: (previous?.portions ?? 0) + (plan.settings.household ? 2 : 1), days: [...previous?.days ?? [], day] });
  }
  return [...grouped.values()];
}
export const quantity = (grams: number) => grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${Math.round(grams)} g`;
// Validate saved data before allowing it back into the planner (including older schemas).
export function parsePlan(raw: string | null): Plan | null {
  try {
    const p = JSON.parse(raw ?? 'null');
    if (!p || p.version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(p.start) || !Number.isFinite(dateAt(p.start, 0).getTime())) return null;
    const s = p.settings;
    if (!s || ![s.calories, s.partnerCalories].every(n => typeof n === 'number' && n >= 1000 && n <= 5000) || typeof s.household !== 'boolean' || typeof s.vegetarian !== 'boolean' || !['minimal', 'balanced', 'high'].includes(s.variety)) return null;
    if (!Array.isArray(p.days) || p.days.length !== 7 || !p.days.every((day: Meal[]) => Array.isArray(day) && day.length === 3 && day.every((meal, i) => meal && Number.isFinite(meal.factor) && meal.factor > 0 && meal.factor < 20 && eligible(slots[i], s).some(r => r.id === meal.recipeId)))) return null;
    if (![p.checked, p.prepped].every(list => Array.isArray(list) && list.every(item => typeof item === 'string')) || !Number.isInteger(p.generation) || p.generation < 0) return null;
    return p as Plan;
  } catch { return null; }
}
