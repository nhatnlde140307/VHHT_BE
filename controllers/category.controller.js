import categoryServices from '../services/category.service.js'

export const getCategories = async (req, res) => {
  try {
    const categories = await categoryServices.getCategories();
    res.status(200).json({
      message: "categories success",
      data: categories
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};