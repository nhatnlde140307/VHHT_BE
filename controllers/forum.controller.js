import forumServices from "../services/forum.services.js";
import { cloudinary } from "../utils/cloudinary.config.js";

/**
 * Controller for create a new forum post
 * @param {*} req
 * @param {*} res
 */
export const createNewForumPost = async (req, res) => {
  try {
    const images = req.body.images || [];
    const userId = req.decoded_authorization.user_id;
    const data = {
      ...req.body,
      images,
    };
    const post = await forumServices.createNewForumPost(data, userId);
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for update a forum post
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const updateForumPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const updateData = { ...req.body };

    // Remove old images
    if (req.body.images && req.body.images.length > 0) {
      const existing = await forumServices.findById(postId);
      if (!existing) return res.status(404).json({ error: "News not found" });

      // Remove cloudinary images
      for (const url of existing.images) {
        const publicId = url.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`VHHT/news/${publicId}`);
      }

      // Assign new images
      updateData.images = req.body.images || [];
    }

    const updated = await forumServices.updateById(postId, updateData);
    if (!updated)
      return res.status(404).json({ error: "No forum post not found" });

    res.json({
      data: updated,
    });
  } catch (err) {
    console.error("UPDATE POSTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for delete a forum post
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const deleteForumPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const deleted = await forumServices.delete(postId);

    if (!deleted) {
      return res.status(404).json({ error: "Forum post not found" });
    }

    res.json({ data: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for get newest forum posts
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const getNewForumPosts = async (req, res) => {
  try {
    const searchUserId = req.decoded_authorization.user_id;
    let { skip, limit } = req.query || {};
    if (skip == null || isNaN(+skip)) {
      skip = 0;
    }
    if (limit == null || isNaN(+limit)) {
      limit = 20;
    }
    const posts = await forumServices.getNewForumPosts(
      searchUserId,
      +skip,
      +limit
    );

    res.json({ data: posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller to get relative forum posts of an user
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const getRelativeForumPosts = async (req, res) => {
  try {
    const searchUserId = req.decoded_authorization.user_id;
    const userId = req.decoded_authorization.user_id;
    let { skip, limit } = req.query;
    if (skip == null || isNaN(+skip)) {
      skip = 0;
    }
    if (limit == null || isNaN(+limit)) {
      limit = 20;
    }
    const posts = await forumServices.getRelativeForumPosts(
      searchUserId,
      userId,
      +skip,
      +limit
    );

    if (!deleted) {
      return res.status(404).json({ error: "Forum post not found" });
    }

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for get saved forum posts of an user
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const getSavedForumPosts = async (req, res) => {
  try {
    const searchUserId = req.decoded_authorization.user_id;
    const userId = req.decoded_authorization.user_id;
    let { skip, limit } = req.query;
    if (skip == null || isNaN(+skip)) {
      skip = 0;
    }
    if (limit == null || isNaN(+limit)) {
      limit = 20;
    }
    const posts = await forumServices.getSavedForumPosts(
      searchUserId,
      userId,
      +skip,
      +limit
    );

    if (!deleted) {
      return res.status(404).json({ error: "Forum post not found" });
    }

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Middleware for get forum posts created by an user
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const getUserForumPosts = async (req, res) => {
  try {
    const searchUserId = req.decoded_authorization.user_id;
    const { userId } = req.params;
    let { skip, limit } = req.query;
    if (skip == null || isNaN(+skip)) {
      skip = 0;
    }
    if (limit == null || isNaN(+limit)) {
      limit = 20;
    }
    const posts = await forumServices.getUserForumPosts(
      searchUserId,
      userId,
      +skip,
      +limit
    );

    res.json({
      data: posts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for get detail of a forum post
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const getForumPostDetail = async (req, res) => {
  try {
    const searchUserId = req.decoded_authorization.user_id;
    const { postId } = req.params;
    const post = await forumServices.getForumPostDetail(searchUserId, postId);

    if (!post) {
      return res.status(404).json({ error: "Forum post not found" });
    }

    res.json({ data: post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for upvote a forum post
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const upvoteForumPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.decoded_authorization.user_id;
    const post = await forumServices.upvoteForumPost(postId, userId);

    if (!post) {
      return res.status(404).json({ error: "Forum post not found" });
    }

    res.json({
      data: post,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for downvote a forum post
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const downvoteForumPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.decoded_authorization.user_id;
    const post = await forumServices.downvoteForumPost(postId, userId);

    if (!post) {
      return res.status(404).json({ error: "Forum post not found" });
    }

    res.json({
      data: post,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for unvote a forum post
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const unvoteForumPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.decoded_authorization.user_id;
    const post = await forumServices.unvoteForumPost(postId, userId);

    if (!post) {
      return res.status(404).json({ error: "Forum post not found" });
    }

    res.json({
      data: post,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for saving a forum post
 * @param {*} req
 * @param {*} res
 */
export const saveForumPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.decoded_authorization.user_id;
    const post = await forumServices.saveForumPost(postId, userId);
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for get list of user upvote a forum post
 * @param {*} req
 * @param {*} res
 */
export const getUpvotePostUsers = async (req, res) => {
  try {
    const { postId } = req.params;
    let { skip, limit } = req.query;
    if (skip == null || isNaN(+skip)) {
      skip = 0;
    }
    if (limit == null || isNaN(+limit)) {
      limit = 20;
    }
    const users = await forumServices.getUpvotePostUsers(postId, +skip, +limit);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for get list of users downvote the forum post
 * @param {*} req
 * @param {*} res
 */
export const getDownvotePostUsers = async (req, res) => {
  try {
    const { postId } = req.params;
    let { skip, limit } = req.query;
    if (skip == null || isNaN(+skip)) {
      skip = 0;
    }
    if (limit == null || isNaN(+limit)) {
      limit = 20;
    }
    const users = await forumServices.getDownvotePostUsers(
      postId,
      +skip,
      +limit
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const commentForumPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.decoded_authorization.user_id;
    const { content } = req.body;
    const comment = await forumServices.commentForumPost(
      postId,
      userId,
      content
    );
    res.json({ data: comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const commentForumPostComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.decoded_authorization.user_id;
    const { content } = req.body;
    const comment = await forumServices.commentForumPostComment(
      postId,
      commentId,
      userId,
      content
    );
    res.json({ data: comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCommentForumPost = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await forumServices.deleteCommentForumPost(commentId);
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCommentForumPostComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await forumServices.deleteCommentForumPostComment(
      commentId
    );
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for upvote a forum post comment
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const upvoteForumPostComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.decoded_authorization.user_id;
    const post = await forumServices.upvoteForumPostComment(commentId, userId);

    if (!post) {
      return res.status(404).json({ error: "Forum post not found" });
    }

    res.json({
      data: post,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for downvote a forum post comment
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const downvoteForumPostComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.decoded_authorization.user_id;
    const post = await forumServices.downvoteForumPostComment(
      commentId,
      userId
    );

    if (!post) {
      return res.status(404).json({ error: "Forum post not found" });
    }

    res.json({
      data: post,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for unvote a forum post comment
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const unvoteForumPostComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.decoded_authorization.user_id;
    const post = await forumServices.unvoteForumPostComment(commentId, userId);

    if (!post) {
      return res.status(404).json({ error: "Forum post not found" });
    }

    res.json({
      data: post,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getForumPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const searchUserId = req.decoded_authorization.user_id;
    let { skip, limit } = req.query || {};
    if (skip == null || isNaN(+skip)) {
      skip = 0;
    }
    if (limit == null || isNaN(+limit)) {
      limit = 20;
    }
    const comments = await forumServices.getForumPostComments(
      postId,
      searchUserId,
      +skip,
      +limit
    );

    res.json({ data: comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getForumPostCommentRelies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const searchUserId = req.decoded_authorization.user_id;
    let { skip, limit } = req.query;
    if (skip == null || isNaN(+skip)) {
      skip = 0;
    }
    if (limit == null || isNaN(+limit)) {
      limit = 20;
    }
    const comments = await forumServices.getForumPostCommentReplies(
      commentId,
      searchUserId,
      +skip,
      +limit
    );

    res.json({ data: comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for get list of user upvote a forum post
 * @param {*} req
 * @param {*} res
 */
export const getUpvotePostCommentUsers = async (req, res) => {
  try {
    const { commentId } = req.params;
    let { skip, limit } = req.query;
    if (skip == null || isNaN(+skip)) {
      skip = 0;
    }
    if (limit == null || isNaN(+limit)) {
      limit = 20;
    }
    const users = await forumServices.getUpvotePostCommentUsers(
      commentId,
      +skip,
      +limit
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller for get list of users downvote the forum post
 * @param {*} req
 * @param {*} res
 */
export const getDownvotePostCommentUsers = async (req, res) => {
  try {
    const { commentId } = req.params;
    let { skip, limit } = req.query;
    if (skip == null || isNaN(+skip)) {
      skip = 0;
    }
    if (limit == null || isNaN(+limit)) {
      limit = 20;
    }
    const users = await forumServices.getDownvotePostCommentUsers(
      commentId,
      +skip,
      +limit
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
