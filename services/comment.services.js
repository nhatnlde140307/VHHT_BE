import { config } from 'dotenv'
import Comment from '../models/comment.model.js';

config()

class CommentServices {
    async createComment({ content, refType, refId, parentComment = null, createdBy }) {
        if (!content || !refType || !refId) {
            throw new Error('Thiếu thông tin');
        }

        return await Comment.create({
            content,
            refType,
            refId,
            parentComment,
            createdBy
        });
    }

    async getCommentsWithReplies(refType, refId) {

        if (!refType || !refId) throw new Error('Thiếu refType hoặc refId');

        const parents = await Comment.find({
            refType,
            refId,
            parentComment: null
        }).populate('createdBy', 'fullName avatar').sort({ createdAt: -1 });

        const replies = await Comment.find({
            parentComment: { $in: parents.map(p => p._id) }
        }).populate('createdBy', 'fullName avatar');

        const repliesMap = {};
        replies.forEach(reply => {
            const pid = reply.parentComment.toString();
            if (!repliesMap[pid]) repliesMap[pid] = [];
            repliesMap[pid].push(reply);
        });

        return parents.map(parent => ({
            ...parent.toObject(),
            replies: repliesMap[parent._id.toString()] || []
        }));
    }

    async deleteComment(commentId, userId, role) {
        const comment = await Comment.findById(commentId);
        if (!comment) {
            const err = new Error('Không tìm thấy comment');
            err.statusCode = 404;
            throw err;
        }

        if (role !== 'admin' && String(comment.createdBy) !== String(userId)) {
            const err = new Error('Bạn không có quyền xóa comment này');
            err.statusCode = 403;
            throw err;
        }

        await Comment.deleteMany({ parentComment: comment._id });
        await comment.deleteOne();
    }
}

export default new CommentServices();
