import mongoose from "mongoose";
import dotenv from "dotenv";
import Menu from "./models/Menu";
import MenuItem from "./models/MenuItem";

// Load environment variables
dotenv.config();

// MongoDB connection
const connectDB = async () => {
  const uri: string =
    process.env.MONGODB_URI || "mongodb://localhost:27017/hospitality-training";

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Restaurant ID
const RESTAURANT_ID = "680cc041a5063e15878bd0fd";

// Sample menu data
const menus = [
  {
    name: "Breakfast Menu",
    description: "Start your day with our freshly prepared breakfast options",
  },
  {
    name: "Lunch Menu",
    description: "Quick and delicious lunch options for your midday meal",
  },
  {
    name: "Dinner Menu",
    description: "Elegant dinner selections prepared by our expert chefs",
  },
  {
    name: "Seasonal Specials",
    description: "Limited-time dishes featuring seasonal ingredients",
  },
  {
    name: "Dessert Menu",
    description: "Sweet treats to finish your dining experience",
  },
];

// Sample menu items for each menu
const menuItems = {
  "Breakfast Menu": [
    {
      name: "Eggs Benedict",
      description: "Poached eggs on English muffin with hollandaise sauce",
      price: 14.99,
      ingredients: ["eggs", "english muffin", "hollandaise sauce", "ham"],
      itemType: "food",
      category: "main",
      isGlutenFree: false,
      isDairyFree: false,
      isVegetarian: false,
      isVegan: false,
    },
    {
      name: "Avocado Toast",
      description:
        "Whole grain toast topped with avocado, tomatoes, and microgreens",
      price: 12.5,
      ingredients: [
        "avocado",
        "whole grain bread",
        "tomatoes",
        "microgreens",
        "olive oil",
      ],
      itemType: "food",
      category: "main",
      isGlutenFree: false,
      isDairyFree: true,
      isVegetarian: true,
      isVegan: true,
    },
    {
      name: "Belgian Waffles",
      description:
        "Homemade Belgian waffles served with maple syrup and berries",
      price: 13.75,
      ingredients: [
        "flour",
        "eggs",
        "milk",
        "butter",
        "maple syrup",
        "berries",
      ],
      itemType: "food",
      category: "main",
      isGlutenFree: false,
      isDairyFree: false,
      isVegetarian: true,
      isVegan: false,
    },
    {
      name: "Fresh Fruit Bowl",
      description: "Seasonal fruits with Greek yogurt and honey",
      price: 9.5,
      ingredients: ["seasonal fruits", "greek yogurt", "honey", "granola"],
      itemType: "food",
      category: "appetizer",
      isGlutenFree: true,
      isDairyFree: false,
      isVegetarian: true,
      isVegan: false,
    },
    {
      name: "Specialty Coffee",
      description: "House-roasted coffee beans prepared to your preference",
      price: 4.25,
      ingredients: ["coffee beans"],
      itemType: "beverage",
      category: "hot",
      isGlutenFree: true,
      isDairyFree: true,
      isVegetarian: true,
      isVegan: true,
    },
  ],
  "Lunch Menu": [
    {
      name: "Chicken Caesar Salad",
      description:
        "Grilled chicken breast with romaine lettuce, croutons, and Caesar dressing",
      price: 15.99,
      ingredients: [
        "chicken breast",
        "romaine lettuce",
        "croutons",
        "parmesan cheese",
        "caesar dressing",
      ],
      itemType: "food",
      category: "main",
      isGlutenFree: false,
      isDairyFree: false,
      isVegetarian: false,
      isVegan: false,
    },
    {
      name: "Gourmet Burger",
      description:
        "Angus beef patty with cheddar, bacon, lettuce, and tomato on a brioche bun",
      price: 18.5,
      ingredients: [
        "beef patty",
        "cheddar cheese",
        "bacon",
        "lettuce",
        "tomato",
        "brioche bun",
      ],
      itemType: "food",
      category: "main",
      isGlutenFree: false,
      isDairyFree: false,
      isVegetarian: false,
      isVegan: false,
    },
    {
      name: "Quinoa Bowl",
      description:
        "Protein-packed quinoa with roasted vegetables and tahini dressing",
      price: 14.25,
      ingredients: [
        "quinoa",
        "roasted vegetables",
        "tahini",
        "chickpeas",
        "lemon",
      ],
      itemType: "food",
      category: "main",
      isGlutenFree: true,
      isDairyFree: true,
      isVegetarian: true,
      isVegan: true,
    },
    {
      name: "French Onion Soup",
      description:
        "Classic soup with caramelized onions and melted gruyère cheese",
      price: 8.99,
      ingredients: ["onions", "beef broth", "gruyère cheese", "baguette"],
      itemType: "food",
      category: "appetizer",
      isGlutenFree: false,
      isDairyFree: false,
      isVegetarian: false,
      isVegan: false,
    },
    {
      name: "Fresh Lemonade",
      description: "Housemade lemonade with mint and berries",
      price: 5.25,
      ingredients: ["lemon", "sugar", "mint", "berries"],
      itemType: "beverage",
      category: "cold",
      isGlutenFree: true,
      isDairyFree: true,
      isVegetarian: true,
      isVegan: true,
    },
  ],
  "Dinner Menu": [
    {
      name: "Grilled Salmon",
      description:
        "Wild-caught salmon with lemon butter sauce and seasonal vegetables",
      price: 24.99,
      ingredients: ["salmon", "lemon", "butter", "seasonal vegetables"],
      itemType: "food",
      category: "main",
      isGlutenFree: true,
      isDairyFree: false,
      isVegetarian: false,
      isVegan: false,
    },
    {
      name: "Filet Mignon",
      description:
        "8oz filet with garlic mashed potatoes and red wine reduction",
      price: 32.5,
      ingredients: ["beef filet", "potatoes", "garlic", "red wine"],
      itemType: "food",
      category: "main",
      isGlutenFree: true,
      isDairyFree: false,
      isVegetarian: false,
      isVegan: false,
    },
    {
      name: "Mushroom Risotto",
      description: "Creamy risotto with wild mushrooms and truffle oil",
      price: 19.75,
      ingredients: [
        "arborio rice",
        "mushrooms",
        "parmesan",
        "truffle oil",
        "vegetable broth",
      ],
      itemType: "food",
      category: "main",
      isGlutenFree: true,
      isDairyFree: false,
      isVegetarian: true,
      isVegan: false,
    },
    {
      name: "Charcuterie Board",
      description:
        "Selection of cured meats, artisanal cheeses, and accompaniments",
      price: 22.0,
      ingredients: ["cured meats", "cheeses", "fruits", "nuts", "crackers"],
      itemType: "food",
      category: "appetizer",
      isGlutenFree: false,
      isDairyFree: false,
      isVegetarian: false,
      isVegan: false,
    },
    {
      name: "Red Wine",
      description: "House-selected red wine by the glass",
      price: 12.0,
      ingredients: ["grapes"],
      itemType: "beverage",
      category: "alcoholic",
      isGlutenFree: true,
      isDairyFree: true,
      isVegetarian: true,
      isVegan: true,
    },
  ],
  "Seasonal Specials": [
    {
      name: "Butternut Squash Soup",
      description: "Creamy soup with roasted butternut squash and spices",
      price: 9.99,
      ingredients: ["butternut squash", "vegetable broth", "cream", "spices"],
      itemType: "food",
      category: "appetizer",
      isGlutenFree: true,
      isDairyFree: false,
      isVegetarian: true,
      isVegan: false,
    },
    {
      name: "Harvest Salad",
      description:
        "Mixed greens with apple, cranberries, pecans, and maple vinaigrette",
      price: 14.5,
      ingredients: [
        "mixed greens",
        "apple",
        "cranberries",
        "pecans",
        "feta cheese",
        "maple vinaigrette",
      ],
      itemType: "food",
      category: "appetizer",
      isGlutenFree: true,
      isDairyFree: false,
      isVegetarian: true,
      isVegan: false,
    },
    {
      name: "Pumpkin Ravioli",
      description:
        "Handmade ravioli filled with pumpkin and ricotta in sage butter sauce",
      price: 21.75,
      ingredients: ["pasta", "pumpkin", "ricotta", "sage", "butter"],
      itemType: "food",
      category: "main",
      isGlutenFree: false,
      isDairyFree: false,
      isVegetarian: true,
      isVegan: false,
    },
    {
      name: "Apple Cider",
      description: "Warm spiced apple cider with cinnamon stick",
      price: 5.25,
      ingredients: ["apple cider", "cinnamon", "cloves", "orange zest"],
      itemType: "beverage",
      category: "hot",
      isGlutenFree: true,
      isDairyFree: true,
      isVegetarian: true,
      isVegan: true,
    },
    {
      name: "Maple Glazed Duck",
      description: "Roasted duck breast with maple glaze and root vegetables",
      price: 28.0,
      ingredients: ["duck breast", "maple syrup", "root vegetables", "herbs"],
      itemType: "food",
      category: "main",
      isGlutenFree: true,
      isDairyFree: true,
      isVegetarian: false,
      isVegan: false,
    },
  ],
  "Dessert Menu": [
    {
      name: "Chocolate Lava Cake",
      description:
        "Warm chocolate cake with molten center and vanilla ice cream",
      price: 9.99,
      ingredients: ["chocolate", "flour", "eggs", "sugar", "vanilla ice cream"],
      itemType: "food",
      category: "dessert",
      isGlutenFree: false,
      isDairyFree: false,
      isVegetarian: true,
      isVegan: false,
    },
    {
      name: "New York Cheesecake",
      description: "Classic cheesecake with berry compote",
      price: 8.5,
      ingredients: [
        "cream cheese",
        "sugar",
        "eggs",
        "graham crackers",
        "berries",
      ],
      itemType: "food",
      category: "dessert",
      isGlutenFree: false,
      isDairyFree: false,
      isVegetarian: true,
      isVegan: false,
    },
    {
      name: "Tiramisu",
      description:
        "Italian coffee-flavored dessert with mascarpone and ladyfingers",
      price: 10.25,
      ingredients: ["mascarpone", "coffee", "ladyfingers", "cocoa"],
      itemType: "food",
      category: "dessert",
      isGlutenFree: false,
      isDairyFree: false,
      isVegetarian: true,
      isVegan: false,
    },
    {
      name: "Seasonal Fruit Sorbet",
      description: "Refreshing sorbet made with seasonal fruits",
      price: 7.75,
      ingredients: ["seasonal fruits", "sugar"],
      itemType: "food",
      category: "dessert",
      isGlutenFree: true,
      isDairyFree: true,
      isVegetarian: true,
      isVegan: true,
    },
    {
      name: "Espresso",
      description: "Rich, concentrated coffee served in a small cup",
      price: 3.5,
      ingredients: ["coffee beans"],
      itemType: "beverage",
      category: "hot",
      isGlutenFree: true,
      isDairyFree: true,
      isVegetarian: true,
      isVegan: true,
    },
  ],
};

// Function to create a menu and its items
const createMenuWithItems = async (menuData: any, menuItemsData: any[]) => {
  try {
    // Create the menu
    const menu = new Menu({
      name: menuData.name,
      description: menuData.description,
      restaurantId: new mongoose.Types.ObjectId(RESTAURANT_ID),
    });

    const savedMenu = await menu.save();
    console.log(`Menu created: ${savedMenu.name}`);

    // Create the menu items associated with this menu
    for (const itemData of menuItemsData) {
      const menuItem = new MenuItem({
        ...itemData,
        menuId: savedMenu._id,
        restaurantId: new mongoose.Types.ObjectId(RESTAURANT_ID),
      });

      await menuItem.save();
      console.log(`Item created: ${itemData.name}`);
    }

    return true;
  } catch (error) {
    console.error("Error creating menu and items:", error);
    return false;
  }
};

// Main function to populate data
const populateData = async () => {
  try {
    await connectDB();

    for (const menu of menus) {
      const menuItems_forThisMenu =
        menuItems[menu.name as keyof typeof menuItems];
      await createMenuWithItems(menu, menuItems_forThisMenu);
    }

    console.log("Data population complete!");
    mongoose.connection.close();
  } catch (error) {
    console.error("Error in data population:", error);
    mongoose.connection.close();
  }
};

// Run the script
populateData();
