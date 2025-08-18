import mongoose from 'mongoose'
import TemplateCert from '../models/templateCert.model.js'

function isValidId(id) {
  return mongoose.isValidObjectId(id)
}

export async function createTemplate(data, url) {
  const doc = await TemplateCert.create({
    name: data.name,
    url: url,
    description: data.description || ''
  })
  return doc
}

export async function getTemplates(query = {}) {
  const {
    search = '',
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    order = 'desc'
  } = query

  const filter = {}
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ]
  }

  const sort = { [sortBy]: order === 'asc' ? 1 : -1 }

  const [items, total] = await Promise.all([
    TemplateCert.find(filter).sort(sort).skip((page - 1) * limit).limit(Number(limit)),
    TemplateCert.countDocuments(filter)
  ])

  return {
    data: items,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total
    }
  }
}

export async function getTemplateById(id) {
  if (!isValidId(id)) return null
  return TemplateCert.findById(id)
}

export async function updateTemplate(id, data) {
  if (!isValidId(id)) return null
  return TemplateCert.findByIdAndUpdate(
    id,
    {
      $set: {
        name: data.name,
        url: data.url,
        description: data.description
      }
    },
    { new: true }
  )
}

export async function deleteTemplate(id) {
  if (!isValidId(id)) return null
  return TemplateCert.findByIdAndDelete(id)
}
