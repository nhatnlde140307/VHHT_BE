import {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate
} from '../services/templateCert.service.js'

export async function createTemplateCtrl(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Không có file nào được upload' })
    const url = req.file.path
    const doc = await createTemplate(req.body, url)
    return res.status(201).json({ message: 'Created', data: doc })
  } catch (e) {
    return res.status(400).json({ message: e.message })
  }
}

export async function getTemplatesCtrl(req, res) {
  try {
    const result = await getTemplates(req.query)
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ message: e.message })
  }
}

export async function getTemplateByIdCtrl(req, res) {
  try {
    const doc = await getTemplateById(req.params.id)
    if (!doc) return res.status(404).json({ message: 'Not found' })
    return res.json({ data: doc })
  } catch (e) {
    return res.status(400).json({ message: e.message })
  }
}

export async function updateTemplateCtrl(req, res) {
  try {
    const doc = await updateTemplate(req.params.id, req.body)
    if (!doc) return res.status(404).json({ message: 'Not found' })
    return res.json({ message: 'Updated', data: doc })
  } catch (e) {
    return res.status(400).json({ message: e.message })
  }
}

export async function deleteTemplateCtrl(req, res) {
  try {
    const doc = await deleteTemplate(req.params.id)
    if (!doc) return res.status(404).json({ message: 'Not found' })
    return res.json({ message: 'Deleted' })
  } catch (e) {
    return res.status(400).json({ message: e.message })
  }
}
