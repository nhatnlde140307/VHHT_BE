import CommentServices from "../services/comment.services.js";

export const createComment = async (req, res) => {
    try {
        const { content, refType, refId, parentComment } = req.body;
        const userId = req.decoded_authorization.user_id;

        const comment = await CommentServices.createComment({
            content, refType, refId, parentComment, createdBy: userId
        });

        await CommentServices.handleCommentNotifications({
            refType,
            refId,
            parentComment,
            commenterId: userId,
        });

        res.status(201).json(comment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getComments = async (req, res) => {
    try {
        const { refType, refId } = req.query;
        const comments = await CommentServices.getCommentsWithReplies(refType, refId);
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const commentId = req.params.id;

        const userId = req.decoded_authorization.user_id;
        const role = req.decoded_authorization.role;

        await CommentServices.deleteComment(commentId, userId, role);
        res.json({ message: 'Đã xóa comment' });
    } catch (err) {
        res.status(err.statusCode || 500).json({ message: err.message });
    }
};

export const upvoteComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.decoded_authorization.user_id;

    const result = await CommentServices.upvote(commentId, userId);

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const downvoteComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.decoded_authorization.user_id;
    const result = await CommentServices.downvote(commentId, userId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};