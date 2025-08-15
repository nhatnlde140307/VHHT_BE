import { config } from "dotenv";
import Comment from "../models/comment.model.js";
import User from "../models/users.model.js";
import NewsPost from "../models/newsPost.model.js";
import Campaign from "../models/campaign.model.js";
import DonationCampaign from "../models/donationCampaign.model.js";
import { getIO } from "../socket/socket.js";
import Notification from "../models/notification.model.js";

config();

class CommentServices {
  async createComment({
    content,
    refType,
    refId,
    parentComment = null,
    createdBy,
  }) {
    if (!content || !refType || !refId) {
      throw new Error("Thiếu thông tin");
    }

    return await Comment.create({
      content,
      refType,
      refId,
      parentComment,
      createdBy,
    });
  }

  async getCommentsWithReplies(refType, refId) {
    if (!refType || !refId) throw new Error("Thiếu refType hoặc refId");

    // Fetch all comments for the given refType and refId
    const allComments = await Comment.find({
      refType,
      refId,
    })
      .populate("createdBy", "fullName avatar")
      .sort({ createdAt: -1 });

    // Build a map of comments for quick lookup
    const commentMap = {};
    allComments.forEach((comment) => {
      commentMap[comment._id.toString()] = {
        ...comment.toObject(),
        replies: [],
      };
    });

    // Organize comments into a tree structure
    const topLevelComments = [];
    Object.values(commentMap).forEach((comment) => {
      if (comment.parentComment) {
        const parentId = comment.parentComment.toString();
        if (commentMap[parentId]) {
          commentMap[parentId].replies.push(comment);
        }
      } else {
        topLevelComments.push(comment);
      }
    });

    // Sort replies by createdAt descending
    const sortReplies = (comments) => {
      comments.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      comments.forEach((comment) => {
        if (comment.replies && comment.replies.length > 0) {
          sortReplies(comment.replies);
        }
      });
    };

    sortReplies(topLevelComments);

    return topLevelComments;
  }

  async deleteComment(commentId, userId, role) {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      const err = new Error("Không tìm thấy comment");
      err.statusCode = 404;
      throw err;
    }

    if (role !== "admin" && String(comment.createdBy) !== String(userId)) {
      const err = new Error("Bạn không có quyền xóa comment này");
      err.statusCode = 403;
      throw err;
    }

    await Comment.deleteMany({ parentComment: comment._id });
    await comment.deleteOne();
  }

  async handleCommentNotifications({
    refType,
    refId,
    parentComment,
    commenterId,
  }) {
    const io = getIO();
    const user = await User.findById(commenterId).lean();
    const commenterName = user?.fullName || "Người dùng";

    // send to reply
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      const repliedUserId = parent?.createdBy?.toString();

      if (repliedUserId && repliedUserId !== commenterId) {
        const noti = await Notification.create({
          recipient: repliedUserId,
          title: "Bình luận của bạn được phản hồi",
          content: `${commenterName} đã trả lời bình luận của bạn.`,
          link: `/${refType}/${parentComment.refId}`,
          type: "comment_reply",
        });

        io.to(repliedUserId.toString()).emit("notification", {
          title: noti.title,
          content: noti.content,
          link: noti.link,
          type: noti.type,
        });
      }
    }

    // send to org
    else {
      let creatorId = null;
      let contentType = "";
      const link = `/${refType}/${refId}`;

      if (refType === "campaign") {
        const campaign = await Campaign.findById(refId);
        creatorId = campaign?.createBy?.toString();
        contentType = "chiến dịch";
      } else if (refType === "news") {
        const news = await NewsPost.findById(refId);
        creatorId = news?.createdBy?.toString();
        contentType = "bài viết";
      } else if (refType === "donation") {
        const donation = await DonationCampaign.findById(refId);
        creatorId = donation?.createBy?.toString();
        contentType = "chiến dịch quyên góp";
      }

      if (creatorId && creatorId !== commenterId) {
        const noti = await Notification.create({
          recipient: creatorId,
          title: `Bạn nhận được bình luận mới`,
          content: `${commenterName} đã bình luận vào ${contentType} của bạn.`,
          link,
          type: "new_comment",
        });

        io.to(creatorId).emit("notification", {
          title: noti.title,
          content: noti.content,
          link: noti.link,
          type: noti.type,
        });
      }
    }
  }

  async upvote(commentId, userId) {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new Error("Comment not found");

    const hasUpvoted = comment.upvotes.includes(userId);

    if (hasUpvoted) {
      comment.upvotes.pull(userId);
    } else {
      comment.upvotes.push(userId);
      comment.downvotes.pull(userId);
    }

    await comment.save();

    return {
      message: hasUpvoted ? "Upvote removed" : "Comment upvoted",
      upvotes: comment.upvotes.length,
      downvotes: comment.downvotes.length,
      votes: comment.upvotes.length - comment.downvotes.length,
    };
  }

  async downvote(commentId, userId) {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new Error("Comment not found");

    comment.upvotes = comment.upvotes || [];
    comment.downvotes = comment.downvotes || [];

    const hasDownvoted = comment.downvotes.includes(userId);

    if (hasDownvoted) {
      comment.downvotes.pull(userId);
    } else {
      comment.downvotes.push(userId);
      comment.upvotes.pull(userId);
    }

    await comment.save();

    return {
      message: hasDownvoted ? "Downvote removed" : "Comment downvoted",
      upvotes: comment.upvotes.length,
      downvotes: comment.downvotes.length,
      votes: comment.upvotes.length - comment.downvotes.length,
    };
  }
}

export default new CommentServices();
