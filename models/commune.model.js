import mongoose from 'mongoose'

const CommuneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  province: {
    type: String,
    required: true
  }
})

export const CommuneModel = mongoose.model('CommuneInfo', CommuneSchema, 'communeInfo')