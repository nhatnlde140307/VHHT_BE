import {
  CERTIFICATE_MESSAGE,
  CAMPAIGN_MESSAGE,
} from "../constants/messages.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import {
  getCampaignById,
  getCertificateDetailByVerifyCode,
  getAllCertificates,
  issueCertificateEarly,
  getUserById,
  getDownloadUrl,
  deleteCertificateById,
  getCertificateDetailById,
} from "../services/certificate.service.js";
import jwt from "jsonwebtoken";
import Certificate from "../models/certificate.model.js";

export const getCertificateByCampaign = async (req, res, next) => {
  try {
    const campaignId = req.params.campaignId;
    console.log("campaignId:", campaignId);

    const result = await getCampaignById(campaignId);

    return res.status(HTTP_STATUS.OK).json({
      message: CERTIFICATE_MESSAGE.GET_BY_CAMPAIGN_SUCCESS,
      result,
    });
  } catch (error) {
    console.error("Error getting campaigns:", error);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: CERTIFICATE_MESSAGE.GET_BY_CAMPAIGN_FAIL,
      details: error.message,
    });
  }
};

export const getCertificateByUser = async (req, res) => {
  try {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: CERTIFICATE_MESSAGE.GET_BY_USER_FAIL,
        details: 'User not found in token'
      })
    }
    const result = await getUserById(userId)

    if (!result || (Array.isArray(result) && result.length === 0)) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: CERTIFICATE_MESSAGE.NOT_FOUND,
        details: 'No certificate for this user'
      })
    }

    return res.status(HTTP_STATUS.OK).json({

      message: CERTIFICATE_MESSAGE.GET_BY_USER_SUCCESS,
      result
    })
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: CERTIFICATE_MESSAGE.GET_BY_USER_FAIL,
      details: error.message
    })
  }
}

export const downloadCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const downloadUrl = await getDownloadUrl(certificateId);
    return res.redirect(downloadUrl);
  } catch (error) {
    console.error("Download error:", error.message);
    res
      .status(404)
      .json({ message: error.message || "Không thể tải chứng chỉ" });
  }
};

export const deleteCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    await deleteCertificateById(certificateId);
    res.status(200).json({ message: "Xoá chứng chỉ thành công" });
  } catch (error) {
    res
      .status(404)
      .json({ message: error.message || "Không thể xoá chứng chỉ" });
  }
};

export const getCertificateDetail = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const cert = await getCertificateDetailById(certificateId);
    if (!cert) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: "CERTIFICATE_NOT_FOUND",
      });
    }
    return res.status(HTTP_STATUS.OK).json({
      message: "GET_CERTIFICATE_DETAIL_SUCCESS",
      result: cert,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: "GET_CERTIFICATE_DETAIL_FAILED",
      details: error.message,
    });
  }
};

export const getCertificateDetailByVerifyCodeHandler = async (req, res) => {
  try {
    const { verifyCode } = req.params;
    const cert = await getCertificateDetailByVerifyCode(verifyCode);
    if (!cert) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: "CERTIFICATE_NOT_FOUND",
      });
    }
    return res.status(HTTP_STATUS.OK).json({
      message: "GET_CERTIFICATE_DETAIL_SUCCESS",
      result: cert,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: "GET_CERTIFICATE_DETAIL_FAILED",
      details: error.message,
    });
  }
};

export const issueCertificateEarlyHandler = async (req, res) => {
  try {
    const { campaignId, userId, issuedDate } = req.body;

    // Validate required fields
    if (!campaignId || !userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: "ISSUE_CERTIFICATE_EARLY_FAILED",
        details: "Missing required fields: campaignId and userId are required",
      });
    }

    const cert = await issueCertificateEarly({
      campaignId,
      userId,
      issuedDate,
    });
    return res.status(HTTP_STATUS.OK).json({
      message: "ISSUE_CERTIFICATE_EARLY_SUCCESS",
      result: cert,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: "ISSUE_CERTIFICATE_EARLY_FAILED",
      details: error.message,
    });
  }
};

export const getAllCertificatesHandler = async (req, res) => {
  try {
    const { page, limit, campaignId, userId } = req.query;
    const result = await getAllCertificates({
      page,
      limit,
      campaignId,
      userId,
    });
    return res.status(HTTP_STATUS.OK).json({
      message: "GET_ALL_CERTIFICATES_SUCCESS",
      result,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: "GET_ALL_CERTIFICATES_FAILED",
      details: error.message,
    });
  }
};
