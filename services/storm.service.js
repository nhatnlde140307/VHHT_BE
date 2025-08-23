import Storm from '../models/storm.model.js';
import mongoose from 'mongoose';
import { config } from 'dotenv'
import AiService from './ai.servive.js'
import axios from 'axios';
import newsPostServices from './newsPost.services.js';

config()

export const createStorm = async (data) => {
  if (data.isActive) {
    // Tự động tắt các storm cũ đang active
    await Storm.updateMany({ isActive: true }, { isActive: false });
  }

  return Storm.create(data);
};


export const activateStorm = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid storm ID");
  }
  const img = process.env.WARNING_URL || 'https://media-cdn-v2.laodong.vn/Storage/NewsPortal/2017/9/14/564479/21728846_10154910938-01.jpg'
  const storm = await Storm.findById(id);
  if (!storm) throw new Error("Storm not found");
  try {
    const content = await AiService.generateWarningContent({
      name: storm.name,
      description: storm.description,
      instruction: storm.instruction,
      startDate: storm.startDate
        ? storm.startDate.toLocaleDateString()
        : "Chưa xác định",
      endDate: storm.endDate
        ? storm.endDate.toLocaleDateString()
        : "Chưa xác định",
    });
    console.log(content);
    const data = {
      title: storm.name,
      type: 'news',
      content: content,
      images: img
    }

    await newsPostServices.createNewPost(data)

    await axios.post(
      "https://hooks.zapier.com/hooks/catch/23147694/2v3x9r1/",
      {
        title: Storm.name,
        content,
        image: img,
      }
    );
  } catch (zapErr) {
    console.error("❌ Zapier or AI failed:", zapErr.message);
  }
  await Storm.updateMany({ isActive: true }, { isActive: false });

  return Storm.findByIdAndUpdate(id, { isActive: true, status: 'active' }, { new: true });
};

export const deactivateStorm = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid storm ID");
  }

  return Storm.findByIdAndUpdate(id, { isActive: false, status: 'ended' }, { new: true });
};

export const getActiveStorm = () => {
  return Storm.findOne({ isActive: true });
};

export const getAllStorms = () => {
  return Storm.find().sort({ createdAt: -1 });
};
