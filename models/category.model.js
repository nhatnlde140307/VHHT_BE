import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  color: { type: String },
  icon: { type: String }
}, {
  timestamps: true
});

const Category = mongoose.model('Category', categorySchema);
export default Category;