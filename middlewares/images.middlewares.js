import { cloudinary } from "../utils/cloudinary.config.js";

const uploadSingleImage = async (input) => {
  const isBase64 = /^data:image\/[a-z]+;base64,/.test(input);
  if (!isBase64) return input;

  const result = await cloudinary.uploader.upload(input, {
    folder: "VHHT/upload-images",
    resource_type: "image",
  });
  return result.secure_url;
};

/**
 * Value can be
 *  - a string
 *  - a list of string
 *  - a object of {field: string, assign: string, max: number}
 *  - a list of object of {field: string, assign: string, max: number} | string
 * @param {*} value
 * @returns
 */
export const imagesUploader = (value) => {
  const assignList = [];
  if (typeof value === "string") {
    assignList.push({
      field: value,
      assign: value,
      max: Number.MAX_SAFE_INTEGER,
    });
  } else if (Array.isArray(value)) {
    for (const val of value) {
      if (typeof val === "string") {
        assignList.push({
          field: val,
          assign: val,
          max: Number.MAX_SAFE_INTEGER,
        });
      } else if (typeof val === "object") {
        if (val.field) {
          assignList.push({
            field: val.field,
            assign: val.assign ? val.assign : val.field,
            max: val.max ? val.max : Number.MAX_SAFE_INTEGER,
          });
        }
      }
    }
  } else if (typeof value === "object") {
    if (value.field) {
      assignList.push({
        field: value.field,
        assign: value.assign ? value.assign : value.field,
        max: value.max ? value.max : Number.MAX_SAFE_INTEGER,
      });
    }
  }

  return async (req, res, next) => {
    const body = req.body || {};
    for (const assignItem of assignList) {
      const { field, assign, max } = assignItem;
      const input = body[field];
      if (typeof input === "string") {
        const url = await uploadSingleImage(input);
        body[assign] = url;
      } else if (Array.isArray(input)) {
        if (input.length > max) {
          return next(new Error("Max images reached"));
        }
        const urls = [];
        for (const i of input) {
          const url = await uploadSingleImage(i);
          urls.push(url);
        }
        body[assign] = urls;
      }
    }
    next();
  };
};
