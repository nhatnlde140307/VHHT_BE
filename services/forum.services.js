import NewsPost from "../models/newsPost.model.js";
import Comment from "../models/comment.model.js";
import mongoose from "mongoose";

class ForumService {
  async createNewForumPost(data, userId) {
    return await new NewsPost({
      ...data,
      type: "forum",
      createdBy: userId,
    }).save();
  }

  async findById(postId) {
    return NewsPost.findById(postId);
  }

  async updateById(id, data) {
    return NewsPost.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    const news = await this.findById(id);
    if (!news) return null;

    for (const url of news.images) {
      const publicId = url.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`VHHT/news/${publicId}`);
    }

    return NewsPost.findByIdAndDelete(id);
  }

  async getNewForumPosts(searchUserId, skip = 0, limit = 20) {
    return NewsPost.aggregate([
      // Filter only forum-type posts
      { $match: { type: "forum" } },

      // Sort by newest first
      { $sort: { createdAt: -1 } },

      // Apply pagination
      { $skip: skip },
      { $limit: limit },

      // Join tags from the Category collection
      {
        $lookup: {
          from: "categories",
          localField: "tags",
          foreignField: "_id",
          as: "tags",
        },
      },

      // Join createdBy (user info)
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },

      // Count the child comments
      {
        $lookup: {
          from: "comments",
          let: { parentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$refId", "$$parentId"] } } },
            { $count: "count" },
          ],
          as: "childCount",
        },
      },

      // Count the child comments
      {
        $addFields: {
          commentsCount: {
            $cond: [
              { $gt: [{ $size: "$childCount" }, 0] },
              { $arrayElemAt: ["$childCount.count", 0] },
              0,
            ],
          },
        },
      },

      // Unwind to convert createdBy from array to single object
      { $unwind: "$createdBy" },

      // Project desired fields and compute counts
      {
        $project: {
          title: 1,
          content: 1,
          images: 1,
          createdAt: 1,
          updatedAt: 1,
          commentsCount: 1,
          tags: { _id: 1, name: 1, color: 1, icon: 1 },
          createdBy: {
            _id: 1,
            fullName: 1,
            avatar: 1,
          },
          upvotesCount: { $size: "$upvotes" },
          downvotesCount: { $size: "$downvotes" },
          isUpvoted: {
            $in: [new mongoose.Types.ObjectId(searchUserId), "$upvotes"],
          },
          isDownvoted: {
            $in: [new mongoose.Types.ObjectId(searchUserId), "$downvotes"],
          },
        },
      },
    ]).exec();
  }

  async getRelativeForumPosts(searchUserId, userId, skip = 0, limit = 20) {
    /**
     * Todos: Implement later
     */
    throw new Error("Method not implemented");
  }

  async getSavedForumPosts(searchUserId, userId, skip = 0, limit = 20) {
    /**
     * Todos: Implement later
     */
    throw new Error("Method not implemented");
  }

  async getUserForumPosts(searchUserId, userId, skip = 0, limit = 20) {
    return NewsPost.aggregate([
      // Filter only forum-type posts
      {
        $match: {
          type: "forum",
          createdBy: new mongoose.Types.ObjectId(userId),
        },
      },

      // Sort by newest first
      { $sort: { createdAt: -1 } },

      // Apply pagination
      { $skip: skip },
      { $limit: limit },

      // Join tags from the Category collection
      {
        $lookup: {
          from: "categories",
          localField: "tags",
          foreignField: "_id",
          as: "tags",
        },
      },

      // Join createdBy (user info)
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },

      // Count the child comments
      {
        $lookup: {
          from: "comments",
          let: { parentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$refId", "$$parentId"] } } },
            { $count: "count" },
          ],
          as: "childCount",
        },
      },

      // Count the child comments
      {
        $addFields: {
          commentsCount: {
            $cond: [
              { $gt: [{ $size: "$childCount" }, 0] },
              { $arrayElemAt: ["$childCount.count", 0] },
              0,
            ],
          },
        },
      },

      // Unwind to convert createdBy from array to single object
      { $unwind: "$createdBy" },

      // Project desired fields and compute counts
      {
        $project: {
          title: 1,
          content: 1,
          images: 1,
          createdAt: 1,
          updatedAt: 1,
          commentsCount: 1,
          tags: { _id: 1, name: 1, color: 1, icon: 1 },
          createdBy: {
            _id: 1,
            fullName: 1,
            avatar: 1,
          },
          upvotesCount: { $size: "$upvotes" },
          downvotesCount: { $size: "$downvotes" },
          isUpvoted: {
            $in: [new mongoose.Types.ObjectId(searchUserId), "$upvotes"],
          },
          isDownvoted: {
            $in: [new mongoose.Types.ObjectId(searchUserId), "$downvotes"],
          },
        },
      },
    ]).exec();
  }

  async getForumPostDetail(searchUserId, postId) {
    const posts = await NewsPost.aggregate([
      // Filter only forum-type posts
      {
        $match: {
          _id: new mongoose.Types.ObjectId(postId),
        },
      },

      // Sort by newest first
      { $sort: { createdAt: -1 } },

      // Join tags from the Category collection
      {
        $lookup: {
          from: "categories",
          localField: "tags",
          foreignField: "_id",
          as: "tags",
        },
      },

      // Join createdBy (user info)
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },

      // Unwind to convert createdBy from array to single object
      { $unwind: "$createdBy" },

      // Project desired fields and compute counts
      {
        $project: {
          title: 1,
          content: 1,
          images: 1,
          createdAt: 1,
          updatedAt: 1,
          commentsCount: 1,
          tags: { _id: 1, name: 1, color: 1, icon: 1 },
          createdBy: {
            _id: 1,
            fullName: 1,
            avatar: 1,
          },
          upvotesCount: { $size: "$upvotes" },
          downvotesCount: { $size: "$downvotes" },
          isUpvoted: {
            $in: [new mongoose.Types.ObjectId(searchUserId), "$upvotes"],
          },
          isDownvoted: {
            $in: [new mongoose.Types.ObjectId(searchUserId), "$downvotes"],
          },
        },
      },
    ]).exec();
    return posts[0] || null;
  }

  async upvoteForumPost(postId, userId) {
    const objectPostId = new mongoose.Types.ObjectId(postId);
    const objectUserId = new mongoose.Types.ObjectId(userId);

    const updated = await NewsPost.findByIdAndUpdate(
      objectPostId,
      {
        $addToSet: { upvotes: objectUserId },
        $pull: { downvotes: objectUserId },
      },
      { new: true }
    ).select("_id");

    if (updated == null) {
      return null;
    }

    return {
      isUpvoted: true,
      isDownvoted: false,
    };
  }

  async downvoteForumPost(postId, userId) {
    const objectPostId = new mongoose.Types.ObjectId(postId);
    const objectUserId = new mongoose.Types.ObjectId(userId);

    const updated = await NewsPost.findByIdAndUpdate(
      objectPostId,
      {
        $addToSet: { downvotes: objectUserId },
        $pull: { upvotes: objectUserId },
      },
      { new: true }
    ).select("_id");

    if (updated == null) {
      return null;
    }

    return {
      isUpvoted: false,
      isDownvoted: true,
    };
  }

  async unvoteForumPost(postId, userId) {
    const objectPostId = new mongoose.Types.ObjectId(postId);
    const objectUserId = new mongoose.Types.ObjectId(userId);

    const updated = await NewsPost.findByIdAndUpdate(
      objectPostId,
      {
        $pull: { downvotes: objectUserId },
        $pull: { upvotes: objectUserId },
      },
      { new: true }
    ).select("_id");

    if (updated == null) {
      return null;
    }

    return {
      isUpvoted: false,
      isDownvoted: false,
    };
  }

  async saveForumPost(postId, userId) {
    /**
     * Todo: Implement later
     */
    throw new Error("Method not implemented");
  }

  async getUpvotePostUsers(postId, skip = 0, limit = 20) {
    const objectPostId = new mongoose.Types.ObjectId(postId);

    const result = await NewsPost.aggregate([
      { $match: { _id: objectPostId } },

      {
        $project: {
          slicedUpvotes: { $slice: ["$upvotes", skip, limit] },
        },
      },

      { $unwind: "$slicedUpvotes" },

      {
        $lookup: {
          from: "users",
          localField: "slicedUpvotes",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      {
        $project: {
          _id: "$user._id",
          fullName: "$user.fullName",
          avatar: "$user.avatar",
        },
      },
    ]);

    return result;
  }

  async getDownvotePostUsers(postId, skip = 0, limit = 20) {
    const objectPostId = new mongoose.Types.ObjectId(postId);

    const result = await NewsPost.aggregate([
      { $match: { _id: objectPostId } },

      {
        $project: {
          slicedDownvotes: { $slice: ["$downvotes", skip, limit] },
        },
      },

      { $unwind: "$slicedDownvotes" },

      {
        $lookup: {
          from: "users",
          localField: "slicedDownvotes",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      {
        $project: {
          _id: "$user._id",
          fullName: "$user.fullName",
          avatar: "$user.avatar",
        },
      },
    ]);

    return result;
  }

  async commentForumPost(postId, userId, content) {
    return Comment.create({
      content: content,
      refType: "ForumPost",
      refId: new mongoose.Types.ObjectId(postId),
      parentComment: null,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
  }

  async deleteCommentForumPost(commentId) {
    return Comment.findByIdAndDelete(commentId);
  }

  async commentForumPostComment(postId, commentId, userId, content) {
    return Comment.create({
      content: content,
      refType: "ForumPost",
      refId: new mongoose.Types.ObjectId(postId),
      parentComment: new mongoose.Types.ObjectId(commentId),
      createdBy: new mongoose.Types.ObjectId(userId),
    });
  }

  async deleteCommentForumPostComment(commentId) {
    return Comment.findByIdAndDelete(commentId);
  }

  async upvoteForumPostComment(commentId, userId) {
    const objectCommentId = new mongoose.Types.ObjectId(commentId);
    const objectUserId = new mongoose.Types.ObjectId(userId);

    const updated = await Comment.findByIdAndUpdate(
      objectCommentId,
      {
        $pull: { downvotes: objectUserId },
        $addToSet: { upvotes: objectUserId },
      },
      { new: true }
    ).select("_id");

    if (updated == null) {
      return null;
    }

    return {
      isUpvoted: true,
      isDownvoted: false,
    };
  }

  async downvoteForumPostComment(commentId, userId) {
    const objectCommentId = new mongoose.Types.ObjectId(commentId);
    const objectUserId = new mongoose.Types.ObjectId(userId);

    const updated = await Comment.findByIdAndUpdate(
      objectCommentId,
      {
        $addToSet: { downvotes: objectUserId },
        $pull: { upvotes: objectUserId },
      },
      { new: true }
    ).select("_id");

    if (updated == null) {
      return null;
    }

    return {
      isUpvoted: false,
      isDownvoted: true,
    };
  }

  async unvoteForumPostComment(commentId, userId) {
    const objectCommentId = new mongoose.Types.ObjectId(commentId);
    const objectUserId = new mongoose.Types.ObjectId(userId);

    const updated = await Comment.findByIdAndUpdate(
      objectCommentId,
      {
        $pull: { downvotes: objectUserId },
        $pull: { upvotes: objectUserId },
      },
      { new: true }
    ).select("_id");

    if (updated == null) {
      return null;
    }

    return {
      isUpvoted: false,
      isDownvoted: false,
    };
  }

  async getForumPostComments(postId, searchUserId, skip = 0, limit = 20) {
    const objectRefId = new mongoose.Types.ObjectId(postId);
    const objectUserId = new mongoose.Types.ObjectId(searchUserId);

    return Comment.aggregate([
      //   Root comments
      {
        $match: {
          refId: objectRefId,
          parentComment: null,
        },
      },

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },

      // Populate createdBy
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      { $unwind: "$createdBy" },

      // Count the child comments
      {
        $lookup: {
          from: "comments",
          let: { parentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$parentComment", "$$parentId"] } } },
            { $count: "count" },
          ],
          as: "childCount",
        },
      },

      // Count the child comments
      {
        $addFields: {
          commentsCount: {
            $cond: [
              { $gt: [{ $size: "$childCount" }, 0] },
              { $arrayElemAt: ["$childCount.count", 0] },
              0,
            ],
          },

          //   User upvote/downvote
          isUpvoted: {
            $in: [objectUserId, "$upvotes"],
          },
          isDownvoted: {
            $in: [objectUserId, "$downvotes"],
          },
        },
      },

      // Filter response fields
      {
        $project: {
          content: 1,
          createdAt: 1,
          commentsCount: 1,
          isUpvoted: 1,
          isDownvoted: 1,
          createdBy: {
            _id: 1,
            fullName: 1,
            avatar: 1,
          },
        },
      },
    ]).exec();
  }

  async getForumPostCommentReplies(
    commentId,
    searchUserId,
    skip = 0,
    limit = 20
  ) {
    const objectParentCommentId = new mongoose.Types.ObjectId(commentId);
    const objectUserId = new mongoose.Types.ObjectId(searchUserId);

    return Comment.aggregate([
      //   Root comments
      {
        $match: {
          parentComment: objectParentCommentId,
        },
      },

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },

      // Populate createdBy
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      { $unwind: "$createdBy" },

      // Count the child comments
      {
        $lookup: {
          from: "comments",
          let: { parentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$parentComment", "$$parentId"] } } },
            { $count: "count" },
          ],
          as: "childCount",
        },
      },

      // Count the child comments
      {
        $addFields: {
          commentsCount: {
            $cond: [
              { $gt: [{ $size: "$childCount" }, 0] },
              { $arrayElemAt: ["$childCount.count", 0] },
              0,
            ],
          },

          //   User upvote/downvote
          isUpvoted: {
            $in: [objectUserId, "$upvotes"],
          },
          isDownvoted: {
            $in: [objectUserId, "$downvotes"],
          },
        },
      },

      // Filter response fields
      {
        $project: {
          content: 1,
          createdAt: 1,
          commentsCount: 1,
          isUpvoted: 1,
          isDownvoted: 1,
          createdBy: {
            _id: 1,
            fullName: 1,
            avatar: 1,
          },
        },
      },
    ]).exec();
  }

  async getUpvotePostCommentUsers(commentId, skip = 0, limit = 20) {
    const objectCommentId = new mongoose.Types.ObjectId(commentId);

    const result = await Comment.aggregate([
      { $match: { _id: objectCommentId } },

      {
        $project: {
          slicedUpvotes: { $slice: ["$upvotes", skip, limit] },
        },
      },

      { $unwind: "$slicedUpvotes" },

      {
        $lookup: {
          from: "users",
          localField: "slicedUpvotes",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      {
        $project: {
          _id: "$user._id",
          fullName: "$user.fullName",
          avatar: "$user.avatar",
        },
      },
    ]);

    return result;
  }

  async getDownvotePostCommentUsers(commentId, skip = 0, limit = 20) {
    const objectCommentId = new mongoose.Types.ObjectId(commentId);

    const result = await Comment.aggregate([
      { $match: { _id: objectCommentId } },

      {
        $project: {
          slicedDownvotes: { $slice: ["$downvotes", skip, limit] },
        },
      },

      { $unwind: "$slicedDownvotes" },

      {
        $lookup: {
          from: "users",
          localField: "slicedDownvotes",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      {
        $project: {
          _id: "$user._id",
          fullName: "$user.fullName",
          avatar: "$user.avatar",
        },
      },
    ]);

    return result;
  }
}

export default new ForumService();
