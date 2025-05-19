import mongoose, { Document, Schema, Types } from "mongoose";

// Interface for the Menu document
export interface IMenu extends Document {
  name: string;
  description?: string;
  restaurantId: Types.ObjectId;
  items: Types.ObjectId[]; // References to MenuItem documents
  categories: string[]; // List of unique category names derived from items or managed directly
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Future potential fields:
  // availability: [{ dayOfWeek: string, startTime: string, endTime: string }];
  // displayOrder: number;
}

const MenuSchema: Schema<IMenu> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Menu name is required."],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant", // Assuming you have a Restaurant model
      required: [true, "Restaurant ID is required for a menu."],
      index: true,
    },
    items: [
      {
        type: Schema.Types.ObjectId,
        ref: "MenuItem",
      },
    ],
    categories: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    // createdBy, updatedBy if needed
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    versionKey: false, // Disable the __v version key
  }
);

// Method to update categories from its items (example - might need refinement)
// This could be a pre-save hook or an instance method called when items change
MenuSchema.methods.syncCategoriesFromItems = async function (this: IMenu) {
  // Requires MenuItemModel to be imported and to have a 'category' field
  // This is a simplified example. Actual population might be more complex.
  // const items = await mongoose.model('MenuItem').find({ _id: { $in: this.items } }).select('category');
  // const uniqueCategories = new Set(items.map(item => (item as any).category));
  // this.categories = Array.from(uniqueCategories);
  // For now, categories might be managed manually or via a more direct update mechanism
  // when items are added/removed from the menu by a service.
};

// Index for frequently queried fields
MenuSchema.index({ restaurantId: 1, isActive: 1 });
MenuSchema.index({ name: 1, restaurantId: 1 }, { unique: true }); // Ensure menu names are unique per restaurant

const MenuModel =
  mongoose.models.Menu || mongoose.model<IMenu>("Menu", MenuSchema);

export default MenuModel;
