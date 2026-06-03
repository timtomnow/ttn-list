// Starter library for the Shopping flavor. A curated set of ~110 common
// grocery-store items, each pre-tagged with the aisle/category it usually
// lives in. Loaded on demand (never auto-inserted) via
// `seedStarterShoppingItems()` in db/repo.ts, which skips any name already in
// the library so it's safe to run more than once.
//
// Tags are Title-cased here but compared case-insensitively everywhere else
// (see lib/tags.ts), so they slot straight into the existing tag picker.

export type SeedItem = { name: string; tags: string[] };

export const STARTER_SHOPPING_ITEMS: SeedItem[] = [
  // --- Produce: vegetables ---
  { name: 'Lettuce', tags: ['Produce', 'Vegetables'] },
  { name: 'Tomatoes', tags: ['Produce', 'Vegetables'] },
  { name: 'Cucumber', tags: ['Produce', 'Vegetables'] },
  { name: 'Carrots', tags: ['Produce', 'Vegetables'] },
  { name: 'Broccoli', tags: ['Produce', 'Vegetables'] },
  { name: 'Spinach', tags: ['Produce', 'Vegetables'] },
  { name: 'Bell Peppers', tags: ['Produce', 'Vegetables'] },
  { name: 'Onions', tags: ['Produce', 'Vegetables'] },
  { name: 'Garlic', tags: ['Produce', 'Vegetables'] },
  { name: 'Potatoes', tags: ['Produce', 'Vegetables'] },
  { name: 'Sweet Potatoes', tags: ['Produce', 'Vegetables'] },
  { name: 'Celery', tags: ['Produce', 'Vegetables'] },
  { name: 'Mushrooms', tags: ['Produce', 'Vegetables'] },
  { name: 'Zucchini', tags: ['Produce', 'Vegetables'] },
  { name: 'Green Beans', tags: ['Produce', 'Vegetables'] },
  { name: 'Corn', tags: ['Produce', 'Vegetables'] },
  { name: 'Avocado', tags: ['Produce', 'Vegetables'] },

  // --- Produce: fruit ---
  { name: 'Bananas', tags: ['Produce', 'Fruit'] },
  { name: 'Apples', tags: ['Produce', 'Fruit'] },
  { name: 'Oranges', tags: ['Produce', 'Fruit'] },
  { name: 'Strawberries', tags: ['Produce', 'Fruit'] },
  { name: 'Blueberries', tags: ['Produce', 'Fruit'] },
  { name: 'Grapes', tags: ['Produce', 'Fruit'] },
  { name: 'Lemons', tags: ['Produce', 'Fruit'] },
  { name: 'Limes', tags: ['Produce', 'Fruit'] },
  { name: 'Watermelon', tags: ['Produce', 'Fruit'] },
  { name: 'Pineapple', tags: ['Produce', 'Fruit'] },
  { name: 'Peaches', tags: ['Produce', 'Fruit'] },

  // --- Dairy & eggs ---
  { name: 'Milk', tags: ['Dairy'] },
  { name: 'Eggs', tags: ['Dairy'] },
  { name: 'Butter', tags: ['Dairy'] },
  { name: 'Cheddar Cheese', tags: ['Dairy'] },
  { name: 'Shredded Cheese', tags: ['Dairy'] },
  { name: 'Cream Cheese', tags: ['Dairy'] },
  { name: 'Yogurt', tags: ['Dairy'] },
  { name: 'Greek Yogurt', tags: ['Dairy'] },
  { name: 'Sour Cream', tags: ['Dairy'] },
  { name: 'Heavy Cream', tags: ['Dairy'] },
  { name: 'Parmesan', tags: ['Dairy'] },
  { name: 'Mozzarella', tags: ['Dairy'] },

  // --- Meat & seafood ---
  { name: 'Chicken Breast', tags: ['Meat'] },
  { name: 'Ground Beef', tags: ['Meat'] },
  { name: 'Bacon', tags: ['Meat'] },
  { name: 'Pork Chops', tags: ['Meat'] },
  { name: 'Sausage', tags: ['Meat'] },
  { name: 'Ground Turkey', tags: ['Meat'] },
  { name: 'Steak', tags: ['Meat'] },
  { name: 'Deli Ham', tags: ['Meat', 'Deli'] },
  { name: 'Sliced Turkey', tags: ['Meat', 'Deli'] },
  { name: 'Salmon', tags: ['Seafood'] },
  { name: 'Shrimp', tags: ['Seafood'] },
  { name: 'Canned Tuna', tags: ['Seafood', 'Canned Goods'] },

  // --- Bakery & bread ---
  { name: 'Bread', tags: ['Bakery'] },
  { name: 'Bagels', tags: ['Bakery'] },
  { name: 'Tortillas', tags: ['Bakery'] },
  { name: 'Hamburger Buns', tags: ['Bakery'] },
  { name: 'English Muffins', tags: ['Bakery'] },
  { name: 'Dinner Rolls', tags: ['Bakery'] },

  // --- Pantry & food staples ---
  { name: 'Rice', tags: ['Food Staples', 'Pantry'] },
  { name: 'Pasta', tags: ['Food Staples', 'Pantry'] },
  { name: 'Spaghetti', tags: ['Food Staples', 'Pantry'] },
  { name: 'Flour', tags: ['Food Staples', 'Baking'] },
  { name: 'Sugar', tags: ['Food Staples', 'Baking'] },
  { name: 'Brown Sugar', tags: ['Baking'] },
  { name: 'Olive Oil', tags: ['Food Staples', 'Pantry'] },
  { name: 'Vegetable Oil', tags: ['Pantry'] },
  { name: 'Salt', tags: ['Spices', 'Pantry'] },
  { name: 'Black Pepper', tags: ['Spices', 'Pantry'] },
  { name: 'Cereal', tags: ['Breakfast', 'Pantry'] },
  { name: 'Oatmeal', tags: ['Breakfast', 'Pantry'] },
  { name: 'Peanut Butter', tags: ['Pantry'] },
  { name: 'Jelly', tags: ['Pantry'] },
  { name: 'Honey', tags: ['Pantry'] },
  { name: 'Pasta Sauce', tags: ['Pantry', 'Canned Goods'] },
  { name: 'Canned Tomatoes', tags: ['Canned Goods', 'Pantry'] },
  { name: 'Canned Beans', tags: ['Canned Goods', 'Pantry'] },
  { name: 'Chicken Broth', tags: ['Canned Goods', 'Pantry'] },
  { name: 'Maple Syrup', tags: ['Breakfast', 'Pantry'] },

  // --- Condiments ---
  { name: 'Ketchup', tags: ['Condiments'] },
  { name: 'Mustard', tags: ['Condiments'] },
  { name: 'Mayonnaise', tags: ['Condiments'] },
  { name: 'Soy Sauce', tags: ['Condiments'] },
  { name: 'Salsa', tags: ['Condiments'] },
  { name: 'Hot Sauce', tags: ['Condiments'] },

  // --- Frozen ---
  { name: 'Frozen Pizza', tags: ['Frozen'] },
  { name: 'Frozen Vegetables', tags: ['Frozen'] },
  { name: 'Ice Cream', tags: ['Frozen', 'Dessert'] },
  { name: 'Frozen Berries', tags: ['Frozen'] },
  { name: 'Frozen Waffles', tags: ['Frozen', 'Breakfast'] },

  // --- Beverages ---
  { name: 'Coffee', tags: ['Beverages'] },
  { name: 'Tea', tags: ['Beverages'] },
  { name: 'Orange Juice', tags: ['Beverages'] },
  { name: 'Bottled Water', tags: ['Beverages'] },
  { name: 'Soda', tags: ['Beverages'] },
  { name: 'Sparkling Water', tags: ['Beverages'] },

  // --- Snacks & dessert ---
  { name: 'Chips', tags: ['Snacks'] },
  { name: 'Crackers', tags: ['Snacks'] },
  { name: 'Pretzels', tags: ['Snacks'] },
  { name: 'Popcorn', tags: ['Snacks'] },
  { name: 'Cookies', tags: ['Snacks', 'Dessert'] },
  { name: 'Chocolate', tags: ['Snacks', 'Dessert'] },
  { name: 'Granola Bars', tags: ['Snacks'] },

  // --- Cleaning ---
  { name: 'Dish Soap', tags: ['Cleaning'] },
  { name: 'Laundry Detergent', tags: ['Cleaning'] },
  { name: 'Dishwasher Pods', tags: ['Cleaning'] },
  { name: 'Hand Soap', tags: ['Cleaning', 'Personal Care'] },
  { name: 'Sponges', tags: ['Cleaning'] },
  { name: 'All-Purpose Cleaner', tags: ['Cleaning'] },

  // --- Household ---
  { name: 'Paper Towels', tags: ['Household'] },
  { name: 'Toilet Paper', tags: ['Household'] },
  { name: 'Trash Bags', tags: ['Household'] },
  { name: 'Aluminum Foil', tags: ['Household'] },
  { name: 'Plastic Wrap', tags: ['Household'] },
  { name: 'Storage Bags', tags: ['Household'] },

  // --- Personal care ---
  { name: 'Toothpaste', tags: ['Personal Care'] },
  { name: 'Shampoo', tags: ['Personal Care'] },
  { name: 'Deodorant', tags: ['Personal Care'] },
  { name: 'Body Wash', tags: ['Personal Care'] },
];
