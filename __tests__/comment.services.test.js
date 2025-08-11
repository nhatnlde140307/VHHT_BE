// __tests__/comment.services.test.js
import CommentServices from '../services/comment.services.js';
import Comment from '../models/comment.model.js';
import User from '../models/users.model.js';
import Notification from '../models/notification.model.js';
import Campaign from '../models/campaign.model.js';
import DonationCampaign from '../models/donationCampaign.model.js';
import NewsPost from '../models/newsPost.model.js';

jest.mock('../models/comment.model.js');
jest.mock('../models/users.model.js');
jest.mock('../models/notification.model.js');
jest.mock('../models/campaign.model.js');
jest.mock('../models/donationCampaign.model.js');
jest.mock('../models/newsPost.model.js');

describe('CommentServices', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should create comment', async () => {
    const mockComment = { content: 'test', refType: 'news', refId: 'post123', createdBy: 'user1' };
    Comment.create.mockResolvedValue(mockComment);

    const result = await CommentServices.createComment(mockComment);
    expect(result).toEqual(mockComment);
    expect(Comment.create).toHaveBeenCalledWith({
      content: 'test',
      refType: 'news',
      refId: 'post123',
      parentComment: null,
      createdBy: 'user1',
    });
  });

  it('should delete comment by creator', async () => {
    const mockComment = { _id: 'c1', createdBy: 'user1', deleteOne: jest.fn() };
    Comment.findById.mockResolvedValue(mockComment);
    Comment.deleteMany.mockResolvedValue();

    await CommentServices.deleteComment('c1', 'user1', 'user');
    expect(mockComment.deleteOne).toHaveBeenCalled();
  });

  it('should throw error when deleting comment by other user', async () => {
    Comment.findById.mockResolvedValue({ _id: 'c1', createdBy: 'otherUser' });

    await expect(
      CommentServices.deleteComment('c1', 'user1', 'user')
    ).rejects.toThrow('Bạn không có quyền xóa comment này');
  });

  it('should upvote and remove downvote', async () => {
    const comment = {
      upvotes: [],
      downvotes: [],
      save: jest.fn(),
    };
    comment.upvotes.pull = jest.fn(function (id) {
      const index = this.indexOf(id);
      if (index !== -1) this.splice(index, 1);
    }).bind(comment.upvotes);
    comment.downvotes = ['u2'];
    comment.downvotes.pull = jest.fn(function (id) {
      const index = this.indexOf(id);
      if (index !== -1) this.splice(index, 1);
    }).bind(comment.downvotes);
    Comment.findById.mockResolvedValue(comment);

    const result = await CommentServices.upvote('cid', 'u1');
    expect(result.message).toBe('Comment upvoted');
    expect(comment.upvotes).toContain('u1');
    expect(comment.downvotes).not.toContain('u1');
  });

  it('should remove upvote if already upvoted', async () => {
    const comment = {
      upvotes: [],
      downvotes: [],
      save: jest.fn(),
    };
    comment.upvotes = ['u1'];
    comment.upvotes.pull = jest.fn(function (id) {
      const index = this.indexOf(id);
      if (index !== -1) this.splice(index, 1);
    }).bind(comment.upvotes);
    comment.downvotes.pull = jest.fn(function (id) {
      const index = this.indexOf(id);
      if (index !== -1) this.splice(index, 1);
    }).bind(comment.downvotes);
    Comment.findById.mockResolvedValue(comment);

    const result = await CommentServices.upvote('cid', 'u1');
    expect(result.message).toBe('Upvote removed');
    expect(comment.upvotes).not.toContain('u1');
  });

  it('should downvote and remove upvote', async () => {
    const comment = {
      upvotes: [],
      downvotes: [],
      save: jest.fn(),
    };
    comment.upvotes = ['u1'];
    comment.upvotes.pull = jest.fn(function (id) {
      const index = this.indexOf(id);
      if (index !== -1) this.splice(index, 1);
    }).bind(comment.upvotes);
    comment.downvotes.pull = jest.fn(function (id) {
      const index = this.indexOf(id);
      if (index !== -1) this.splice(index, 1);
    }).bind(comment.downvotes);
    Comment.findById.mockResolvedValue(comment);

    const result = await CommentServices.downvote('cid', 'u2');
    expect(result.message).toBe('Comment downvoted');
    expect(comment.downvotes).toContain('u2');
    expect(comment.upvotes).not.toContain('u2');
  });

  it('should remove downvote if already downvoted', async () => {
    const comment = {
      upvotes: [],
      downvotes: [],
      save: jest.fn(),
    };
    comment.downvotes = ['u1'];
    comment.upvotes.pull = jest.fn(function (id) {
      const index = this.indexOf(id);
      if (index !== -1) this.splice(index, 1);
    }).bind(comment.upvotes);
    comment.downvotes.pull = jest.fn(function (id) {
      const index = this.indexOf(id);
      if (index !== -1) this.splice(index, 1);
    }).bind(comment.downvotes);
    Comment.findById.mockResolvedValue(comment);

    const result = await CommentServices.downvote('cid', 'u1');
    expect(result.message).toBe('Downvote removed');
    expect(comment.downvotes).not.toContain('u1');
  });
});