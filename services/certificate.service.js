import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'
import QRCode from 'qrcode'
import { cloudinary } from '../utils/cloudinary.config.js'
import { config } from 'dotenv'
import { HTTP_STATUS } from '../constants/httpStatus.js'
import { CAMPAIGN_MESSAGE } from '../constants/messages.js'
import Certificate from '../models/certificate.model.js'
import { nanoid } from 'nanoid'
import Campaign from '../models/campaign.model.js'
config()

export async function uploadPDFtoCloudinary(buffer, fileName) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        public_id: `certificates/${fileName}`,
        folder: 'certificates',
        format: 'pdf'
      },
      (error, result) => {
        if (error) return reject(error)
        resolve(result.secure_url)
      }
    )
    stream.end(buffer)
  })
}

function joinUrl(base, path) {
  const b = String(base || '').replace(/\/+$/, '')
  const p = String(path || '').replace(/^\/+/, '')
  return `${b}/${p}`
}

export async function generateCertificateAndUpload({ name, campaign, date, code }) {
  const templateUrl = process.env.CERTIFICATE_TEMPLATE
  const existingPdfBytes = await fetch(templateUrl).then(res => res.arrayBuffer())
  const pdfDoc = await PDFDocument.load(existingPdfBytes)

  // ✅ Nhúng font hỗ trợ Unicode
  pdfDoc.registerFontkit(fontkit)
  const fontPath = path.resolve('assets/fonts/Roboto-Regular.ttf')
  const fontBytes = fs.readFileSync(fontPath)
  const customFont = await pdfDoc.embedFont(fontBytes)

  // ✅ Gán dữ liệu vào form và cập nhật font hiển thị
  const form = pdfDoc.getForm()

  const nameField = form.getTextField('User')
  const campaignField = form.getTextField('Campaign')
  const dateField = form.getTextField('Date')

  nameField.setText(name)
  campaignField.setText(campaign)
  dateField.setText(date)

  // ⚠️ Cập nhật appearance để hiển thị Unicode
  form.updateFieldAppearances(customFont)

  // ✅ Không sửa được form nếu không flatten
  form.flatten()

  // ✅ QR code dẫn đến verify page
  const base = process.env.FRONTEND_URL || 'http://localhost:3000'
  const verifyUrl = joinUrl(base, `/certificates/verify/${code}`)
  const qrDataUrl = await QRCode.toDataURL(verifyUrl)
  const pngBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64')
  const qrImage = await pdfDoc.embedPng(pngBytes)

  const pages = pdfDoc.getPages()
  pages[0].drawImage(qrImage, {
    x: 572.67,
    y: 100.29,
    width: 100,
    height: 100
  })

  const buffer = await pdfDoc.save()
  const fileName = `${name.replace(/\s+/g, '_')}_${code}`
  return await uploadPDFtoCloudinary(buffer, fileName)
}

export async function getCampaignById(campaignId) {
  if (!campaignId) {
    throw new Error('CAMPAIGN_NOT_FOUND');
  }

  const listCerts = await Certificate.find({ campaignId }).populate('campaignId', 'name');
  return listCerts;
}


export async function getUserById(userId) {
  if (!userId) {
    throw new Error('User_NOT_FOUND');
  }

  const listCerts = await Certificate.find({ volunteerId: userId }).populate('campaignId', 'name');
  return listCerts;
}

export const getDownloadUrl = async (certificateId) => {
  const certificate = await Certificate.findById(certificateId);

  if (!certificate || !certificate.fileUrl) {
    throw new Error('Không tìm thấy chứng chỉ');
  }

  const downloadUrl = certificate.fileUrl.replace(
    '/upload/',
    `/upload/fl_attachment:certificate-${certificate.verifyCode}/`
  ); return downloadUrl;
};

export const deleteCertificateById = async (id) => {
  const cert = await Certificate.findByIdAndDelete(id);
  if (!cert) throw new Error('Không tìm thấy chứng chỉ');

  const matches = cert.fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.pdf/);
  if (matches && matches.length >= 2) {
    const publicId = matches[1];

    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw'
    });
  }
};

export async function getCertificateDetailById(id) {
  if (!id) throw new Error('CERTIFICATE_ID_REQUIRED')
  const cert = await Certificate.findById(id)
    .populate('volunteerId', 'fullName email')   
    .populate('campaignId', 'name')          
  return cert
}

export async function getCertificateDetailByVerifyCode(verifyCode) {
  if (!verifyCode) throw new Error('VERIFY_CODE_REQUIRED')
  const cert = await Certificate.findOne({ verifyCode })
    .populate('volunteerId', 'fullname email')   // tuỳ chỉnh
    .populate('campaignId', 'name')          // tuỳ chỉnh
  return cert
}

function toVNDate(d) {
  const date = d ? new Date(d) : new Date()
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export async function issueCertificateEarly({ campaignId, userId, issuedDate }) {
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND')
  const user = await User.findById(userId)
  if (!user) throw new Error('USER_NOT_FOUND')

  const isApproved = (campaign.volunteers || []).some(
    v => String(v.user) === String(userId) && v.status === 'approved'
  )
  if (!isApproved) throw new Error('VOLUNTEER_NOT_APPROVED')

  const existed = await Certificate.findOne({ campaignId, volunteerId: userId })
  if (existed) return existed

  const code = nanoid(10)
  const dateStr = toVNDate(issuedDate)
  const fileUrl = await generateCertificateAndUpload({
    name: user.fullName,
    campaign: campaign.name,
    date: dateStr,
    code
  })

  const cert = await Certificate.create({
    volunteerId: userId,
    campaignId,
    issuedDate: issuedDate ? new Date(issuedDate) : new Date(),
    fileUrl,
    verifyCode: code
  })

  return cert
}
