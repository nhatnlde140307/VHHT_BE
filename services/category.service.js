import Category from "../models/category.model.js";

class categoryServices {
  async getCategories() {
    try {
      const categories = await Category.find();
      return categories;
    } catch (err) {
      throw new Error(`Failed to get category list: ${err.message}`);
    }
  }
}

export default new categoryServices();