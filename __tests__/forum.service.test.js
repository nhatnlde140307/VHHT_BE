import forumServices from '../services/forum.services.js';
import NewsPost from '../models/newsPost.model.js';
import Comment from '../models/comment.model.js';
import mongoose from 'mongoose';

jest.mock('../models/newsPost.model.js');
jest.mock('../models/comment.model.js');

const forumService = forumServices;

describe('ForumService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should create new forum post', async () => {
    const saveMock = jest.fn().mockResolvedValue('new_forum_post');
    NewsPost.mockImplementation(() => ({ save: saveMock }));

    const result = await forumService.createNewForumPost({ title: 'Test' }, 'user123');
    expect(result).toBe('new_forum_post');
  });

  it('should find post by id', async () => {
    NewsPost.findById.mockResolvedValue('post');
    const result = await forumService.findById('id');
    expect(result).toBe('post');
  });

  it('should update post by id', async () => {
    NewsPost.findByIdAndUpdate.mockResolvedValue('updated');
    const result = await forumService.updateById('id', { title: 'Updated' });
    expect(result).toBe('updated');
  });

  it('should delete forum post and images', async () => {
    const mockPost = {
      images: [],
    };
    NewsPost.findById.mockResolvedValue(mockPost);
    NewsPost.findByIdAndDelete.mockResolvedValue('deleted');
    const result = await forumService.delete('id');
    expect(result).toBe('deleted');
  });

  it('should return null if post not found in delete', async () => {
    NewsPost.findById.mockResolvedValue(null);
    const result = await forumService.delete('id');
    expect(result).toBeNull();
  });

  it('should comment on forum post', async () => {
    Comment.create.mockResolvedValue('commented');
    const result = await forumService.commentForumPost('507f1f77bcf86cd799439011', '507f191e810c19729de860ea', 'Content');
    expect(result).toBe('commented');
  });

  it('should delete forum post comment', async () => {
    Comment.findByIdAndDelete.mockResolvedValue('deleted');
    const result = await forumService.deleteCommentForumPost('507f1f77bcf86cd799439012');
    expect(result).toBe('deleted');
  });

  it('should reply to comment', async () => {
    Comment.create.mockResolvedValue('reply');
    const result = await forumService.commentForumPostComment('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', '507f191e810c19729de860ea', 'Content');
    expect(result).toBe('reply');
  });

  it('should delete comment reply', async () => {
    Comment.findByIdAndDelete.mockResolvedValue('deletedReply');
    const result = await forumService.deleteCommentForumPostComment('507f1f77bcf86cd799439012');
    expect(result).toBe('deletedReply');
  });

  it('should upvote a forum post', async () => {
    NewsPost.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011' })
    });
    const result = await forumService.upvoteForumPost('507f1f77bcf86cd799439011', '507f191e810c19729de860ea');
    expect(result).toEqual({ isUpvoted: true, isDownvoted: false });
  });

  it('should downvote a forum post', async () => {
    NewsPost.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011' })
    });
    const result = await forumService.downvoteForumPost('507f1f77bcf86cd799439011', '507f191e810c19729de860ea');
    expect(result).toEqual({ isUpvoted: false, isDownvoted: true });
  });

  it('should unvote a forum post', async () => {
    NewsPost.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011' })
    });
    const result = await forumService.unvoteForumPost('507f1f77bcf86cd799439011', '507f191e810c19729de860ea');
    expect(result).toEqual({ isUpvoted: false, isDownvoted: false });
  });

  it('should upvote a comment', async () => {
    Comment.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439012' })
    });
    const result = await forumService.upvoteForumPostComment('507f1f77bcf86cd799439012', '507f191e810c19729de860ea');
    expect(result).toEqual({ isUpvoted: true, isDownvoted: false });
  });

  it('should downvote a comment', async () => {
    Comment.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439012' })
    });
    const result = await forumService.downvoteForumPostComment('507f1f77bcf86cd799439012', '507f191e810c19729de860ea');
    expect(result).toEqual({ isUpvoted: false, isDownvoted: true });
  });

  it('should unvote a comment', async () => {
    Comment.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439012' })
    });
    const result = await forumService.unvoteForumPostComment('507f1f77bcf86cd799439012', '507f191e810c19729de860ea');
    expect(result).toEqual({ isUpvoted: false, isDownvoted: false });
  });
});
