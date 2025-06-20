import { config } from 'dotenv'
import NewsPost from '../models/newsPost.model.js'
import { cloudinary } from '../utils/cloudinary.config.js'
import Category from '../models/category.model.js'
config()

class NewsPostService {
    async createNewPost(data, userId) {
        return await new NewsPost({ ...data, createdBy: userId }).save()
    }

    async getAll() {
        return await NewsPost.find().sort({ createdAt: -1 }).populate('Category').populate('User')
    }
    async getById(id) {
        return await NewsPost.findById(id)
    }
    async delete(id) {
        const news = await NewsPost.findById(id)
        if (!news) return null

        for (const url of news.images) {
            const publicId = url.split('/').pop().split('.')[0]
            await cloudinary.uploader.destroy(`VHHT/news/${publicId}`)
        }

        return await NewsPost.findByIdAndDelete(id)
    }
    async update(id, data) {
        return await NewsPost.findByIdAndUpdate(id, data, { new: true })
    }

    async upvote(postId, userId) {
        const post = await NewsPost.findById(postId);
        if (!post) throw new Error('News post not found');

        post.upvotes = post.upvotes || [];
        post.downvotes = post.downvotes || [];

        const hasUpvoted = post.upvotes.includes(userId);

        if (hasUpvoted) {
            post.upvotes.pull(userId);
        } else {
            post.upvotes.push(userId);
            post.downvotes.pull(userId);
        }

        await post.save();

        return {
            message: hasUpvoted ? 'Upvote removed' : 'Post upvoted',
            upvotes: post.upvotes.length,
            downvotes: post.downvotes.length,
            votes: post.upvotes.length - post.downvotes.length
        };
    }

    async downvote(postId, userId) {
        return NewsPost.findById(postId).then(news => {
            if (!news) throw new Error('News not found');

            news.upvotes = news.upvotes || [];
            news.downvotes = news.downvotes || [];

            const hasDownvoted = news.downvotes.includes(userId);

            if (hasDownvoted) {
                news.downvotes.pull(userId); // toggle off
            } else {
                news.downvotes.push(userId);
                news.upvotes.pull(userId); // remove upvote if exists
            }

            return news.save().then(() => ({
                message: hasDownvoted ? 'Downvote removed' : 'News downvoted',
                upvotes: news.upvotes.length,
                downvotes: news.downvotes.length,
                votes: news.upvotes.length - news.downvotes.length
            }));
        });
    }


}

export default new NewsPostService()