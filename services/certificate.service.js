import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'
import QRCode from 'qrcode'
import { cloudinary } from '../utils/cloudinary.config.js'

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

export async function generateCertificateAndUpload({ name, campaign, date, code }) {
  const templateUrl = 'https://res.cloudinary.com/dw2tbex85/raw/upload/v1748906141/VHHT/templates/CERTADOBE.pdf'
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
  const verifyUrl = `https://your-domain.com/certificates/verify/${code}`
  const qrDataUrl = await QRCode.toDataURL(verifyUrl)
  const pngBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64')
  const qrImage = await pdfDoc.embedPng(pngBytes)

  const pages = pdfDoc.getPages()
  pages[0].drawImage(qrImage, {
    x: 430,
    y: 300,
    width: 100,
    height: 100
  })

  const buffer = await pdfDoc.save()
  const fileName = `${name.replace(/\s+/g, '_')}_${code}`
  return await uploadPDFtoCloudinary(buffer, fileName)
}