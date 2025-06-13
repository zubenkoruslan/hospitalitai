// Test comprehensive food parsing with extensive menu

const sampleExtensiveFoodMenuText = `
RESTAURANT MENU

APPETIZERS & STARTERS

Crispy Calamari - £8.50
Fresh squid rings served with marinara sauce and lemon wedge

Bruschetta Trio - £7.25  
Three slices of toasted sourdough topped with: tomato & basil, mushroom & truffle, goat cheese & honey

Burrata Caprese - £9.75
Creamy burrata cheese with heirloom tomatoes, fresh basil, and aged balsamic reduction

Buffalo Wings - £6.95
Spicy chicken wings with blue cheese dip and celery sticks

Prawn Cocktail - £8.25
Fresh prawns with marie rose sauce, lettuce, and lemon

Garlic Bread - £4.50 (V)
Toasted ciabatta with garlic butter and herbs

Loaded Potato Skins - £7.50
Crispy potato skins with bacon, cheese, and sour cream

Antipasto Platter - £12.95
Selection of cured meats, cheeses, olives, and pickled vegetables

SOUPS & SALADS

Wild Mushroom Soup - £6.50 (V)
Roasted porcini and shiitake mushrooms in cream broth

French Onion Soup - £6.25
Traditional onion soup with gruyere cheese and croutons

Tomato Basil Soup - £5.75 (VG)
Fresh tomato soup with basil oil

Caesar Salad - £8.25
Crisp romaine, parmesan, croutons, anchovies, classic dressing
Add grilled chicken +£4.50

Greek Salad - £9.50 (V)
Feta, olives, tomatoes, cucumber, red onion, oregano dressing

Quinoa Power Bowl - £11.95 (VG, GF)
Roasted vegetables, chickpeas, avocado, tahini dressing, mixed greens

Waldorf Salad - £8.75 (V)
Apples, celery, walnuts, grapes with creamy dressing

Niçoise Salad - £12.50
Tuna, anchovies, eggs, green beans, potatoes, olives

MAINS - MEAT & POULTRY

Beef Wellington - £32.50  
Tender fillet wrapped in puff pastry, mushroom duxelles, red wine jus

Lamb Rack - £28.75
Herb-crusted rack of lamb, rosemary jus, roasted root vegetables

Ribeye Steak - £26.95
28-day aged ribeye with chips and béarnaise sauce

Slow-Roasted Pork Belly - £18.50
Crispy pork belly with apple sauce and crackling

Chicken Supreme - £19.75
Pan-roasted chicken breast with wild mushroom risotto

Duck Confit - £22.50
Traditional duck leg confit with cherry sauce

Beef Bourguignon - £21.95
Slow-braised beef in red wine with pearl onions and mushrooms

Roast Lamb Shoulder - £24.50
Slow-roasted lamb with mint sauce and seasonal vegetables

MAINS - SEAFOOD

Pan-Seared Sea Bass - £24.95
With lemon risotto, asparagus, and white wine sauce

Grilled Salmon - £22.50
Scottish salmon with herb crust and hollandaise

Fish & Chips - £16.95
Beer-battered cod with triple-cooked chips and mushy peas

Seafood Paella - £26.50 (GF)
Traditional Spanish paella with prawns, mussels, and squid

Lobster Thermidor - £35.95
Half lobster with thermidor sauce and cheese

Sole Meunière - £28.50
Dover sole with brown butter and capers

Crab Cakes - £19.75
Pan-fried crab cakes with remoulade sauce

Bouillabaisse - £24.95
Traditional French fish stew with rouille

MAINS - VEGETARIAN & VEGAN

Mushroom Gnocchi - £18.50 (V)
House-made potato gnocchi with wild mushrooms, truffle cream sauce, parmesan

Thai Green Curry - £16.95 (VG)
Coconut curry with seasonal vegetables, jasmine rice, fresh herbs

Eggplant Parmigiana - £17.25 (V)
Layers of roasted eggplant, tomato sauce, and mozzarella

Beetroot Wellington - £19.50 (VG)
Roasted beetroot wrapped in puff pastry with mushroom duxelles

Stuffed Portobello - £16.75 (V)
Large portobello mushrooms stuffed with quinoa and goat cheese

Vegetable Lasagna - £17.95 (V)
Layers of pasta with seasonal vegetables and béchamel

Cauliflower Steak - £15.95 (VG, GF)
Roasted cauliflower with tahini and pomegranate

Ratatouille Tart - £16.25 (V)
Puff pastry tart with Mediterranean vegetables

PASTA & RISOTTO

Spaghetti Carbonara - £14.95
Traditional carbonara with pancetta, egg, and parmesan

Lobster Ravioli - £22.50
Fresh pasta parcels with lobster and bisque sauce

Penne Arrabbiata - £12.95 (VG)
Spicy tomato sauce with garlic and chili

Truffle Risotto - £18.75 (V)
Arborio rice with black truffle, parmesan, white wine

Seafood Linguine - £19.95
Fresh pasta with prawns, mussels, and white wine

Mushroom Risotto - £16.50 (V)
Creamy risotto with wild mushrooms and herbs

Beef Ragu Pappardelle - £17.25
Slow-cooked beef ragu with fresh pappardelle

Pesto Gnocchi - £15.75 (V)
Potato gnocchi with basil pesto and pine nuts

PIZZAS

Margherita - £12.95 (V)
Tomato base, mozzarella, fresh basil

Pepperoni - £14.50
Tomato base, mozzarella, spicy pepperoni

Quattro Stagioni - £16.25
Four sections: mushrooms, ham, artichokes, olives

Prosciutto & Rocket - £15.75
White base, mozzarella, prosciutto, rocket, parmesan

Vegetarian Supreme - £14.95 (V)
Tomato base, mozzarella, peppers, mushrooms, olives, onions

BBQ Chicken - £15.50
BBQ base, mozzarella, chicken, red onions, peppers

Seafood Special - £17.95
White base, mozzarella, prawns, mussels, calamari

Vegan Delight - £13.95 (VG)
Tomato base, vegan cheese, roasted vegetables

DESSERTS

Chocolate Lava Cake - £7.95
Warm chocolate cake with molten center, vanilla ice cream

Tiramisu - £6.75 (V)
Classic Italian dessert with ladyfingers, mascarpone, coffee

Lemon Tart - £6.50 (V)
Sharp lemon curd in buttery pastry shell, berry compote

Crème Brûlée - £7.25 (V)
Vanilla custard with caramelized sugar top

Sticky Toffee Pudding - £7.50 (V)
Warm sponge cake with toffee sauce and clotted cream

Chocolate Brownie - £6.95 (V)
Rich brownie with chocolate sauce and ice cream

Panna Cotta - £6.75 (V)
Vanilla panna cotta with berry coulis

Apple Crumble - £7.25 (V)
Traditional crumble with custard or ice cream

Cheese Board - £12.95 (V)
Selection of British cheeses with crackers and chutney

Affogato - £5.95 (V)
Vanilla ice cream with hot espresso

SIDES

Truffle Fries - £5.95 (V)
Triple-cooked chips with truffle oil and parmesan

Parmesan Roasted Broccoli - £4.50 (V, GF)
Tender broccoli with parmesan and lemon

Garlic Mashed Potatoes - £4.25 (V)
Creamy mashed potatoes with roasted garlic

Grilled Asparagus - £5.25 (VG, GF)
Chargrilled asparagus with olive oil and sea salt

Sautéed Spinach - £4.75 (VG, GF)
Fresh spinach with garlic and chili

Honey Glazed Carrots - £4.50 (V, GF)
Baby carrots with honey and thyme

Roasted New Potatoes - £4.25 (VG, GF)
Baby potatoes with rosemary and sea salt

Green Bean Almondine - £5.50 (V, GF)
French beans with toasted almonds and butter

CHEF'S SPECIALS

Wagyu Beef Burger - £19.95
Premium wagyu beef with truffle mayo and hand-cut chips

Lobster Mac & Cheese - £24.50
Creamy mac and cheese with chunks of fresh lobster

Dry-Aged Porterhouse - £45.00
28-day aged steak for sharing with multiple sides

Tasting Menu - £65.00
Chef's selection of 7 courses with wine pairings

Whole Roasted Chicken - £28.50
Free-range chicken with seasonal vegetables (serves 2)
`;

console.log("🍽️ Testing Comprehensive Food Parsing");
console.log("=====================================");

// Analyze the test menu
const lines = sampleExtensiveFoodMenuText
  .split("\n")
  .filter((line) => line.trim());
const categories = [
  "APPETIZERS",
  "SOUPS",
  "MAINS - MEAT",
  "MAINS - SEAFOOD",
  "MAINS - VEGETARIAN",
  "PASTA",
  "PIZZAS",
  "DESSERTS",
  "SIDES",
  "CHEF'S SPECIALS",
];

console.log(`📄 Total lines: ${lines.length}`);
console.log(`📄 Text length: ${sampleExtensiveFoodMenuText.length} characters`);

// Count items by category
let totalExpectedItems = 0;
categories.forEach((category) => {
  const categoryIndex = lines.findIndex((line) => line.includes(category));
  if (categoryIndex !== -1) {
    const nextCategoryIndex = lines
      .slice(categoryIndex + 1)
      .findIndex((line) =>
        categories.some((cat) => line.includes(cat) && cat !== category)
      );

    const categoryLines =
      nextCategoryIndex === -1
        ? lines.slice(categoryIndex + 1)
        : lines.slice(categoryIndex + 1, categoryIndex + 1 + nextCategoryIndex);

    const itemsInCategory = categoryLines.filter((line) =>
      line.includes("£")
    ).length;
    totalExpectedItems += itemsInCategory;
    console.log(`   - ${category}: ${itemsInCategory} items`);
  }
});

console.log(`\n📊 Total expected food items: ${totalExpectedItems}`);

// Analyze dietary markers
const vegetarianItems = lines.filter(
  (line) => line.includes("(V)") && !line.includes("(VG)")
).length;
const veganItems = lines.filter((line) => line.includes("(VG)")).length;
const glutenFreeItems = lines.filter((line) => line.includes("(GF)")).length;

console.log(`\n🥗 Dietary Information:`);
console.log(`   - Vegetarian items: ${vegetarianItems}`);
console.log(`   - Vegan items: ${veganItems}`);
console.log(`   - Gluten-free items: ${glutenFreeItems}`);

// Check for food parsing triggers
console.log(`\n🔍 Food Parsing Indicators:`);

const foodSections = [
  "appetizers",
  "mains",
  "desserts",
  "sides",
  "pasta",
  "pizzas",
];
const foundSections = foodSections.filter((section) =>
  sampleExtensiveFoodMenuText.toLowerCase().includes(section)
);
console.log(
  `   - Food sections found: ${foundSections.length} (${foundSections.join(
    ", "
  )})`
);

const cookingMethods = [
  "grilled",
  "roasted",
  "pan-seared",
  "braised",
  "sautéed",
];
const cookingMethodCount = cookingMethods.reduce((count, method) => {
  const matches = (
    sampleExtensiveFoodMenuText
      .toLowerCase()
      .match(new RegExp(`\\b${method}\\b`, "g")) || []
  ).length;
  return count + matches;
}, 0);
console.log(`   - Cooking method mentions: ${cookingMethodCount}`);

const priceMatches = sampleExtensiveFoodMenuText.match(/£\s*\d+/g);
console.log(
  `   - Price patterns found: ${priceMatches ? priceMatches.length : 0}`
);

console.log(`\n✅ This menu should trigger comprehensive food parsing!`);
console.log(`📋 Expected results:`);
console.log(`   - Should detect extensive food menu: YES`);
console.log(`   - Should use chunked processing: YES (if >12 food indicators)`);
console.log(`   - Should extract all ${totalExpectedItems} food items`);
console.log(`   - Should preserve dietary markers and descriptions`);

export { sampleExtensiveFoodMenuText, totalExpectedItems };
