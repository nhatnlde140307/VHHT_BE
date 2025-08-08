import newsPostService from '../services/newsPost.services.js';
import NewsPost from '../models/newsPost.model.js';
import { cloudinary } from '../utils/cloudinary.config.js';

jest.mock('../models/newsPost.model.js');
jest.mock('../utils/cloudinary.config.js', () => ({
  cloudinary: {
    uploader: {
      destroy: jest.fn()
    }
  }
}));

describe('newsPostService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should create new post', async () => {
    const data = { title: 'abc' };
    const saveMock = jest.fn().mockResolvedValue('new_post');
    NewsPost.mockImplementation(() => ({ ...data, save: saveMock }));

    const result = await newsPostService.createNewPost(data, 'user123');
    expect(saveMock).toHaveBeenCalled();
    expect(result).toBe('new_post');
  });

  it('should get all news posts', async () => {
    const populateMock = jest.fn().mockReturnThis();
    const sortMock = jest.fn().mockReturnValue({ populate: populateMock });
    NewsPost.find.mockReturnValue({ sort: sortMock });

    await newsPostService.getAll();
    expect(NewsPost.find).toHaveBeenCalled();
  });

  it('should get post by id', async () => {
    NewsPost.findById.mockResolvedValue('post123');
    const result = await newsPostService.getById('id123');
    expect(result).toBe('post123');
  });

  it('should delete post and images', async () => {
    const post = {
      images: ['https://res.cloudinary.com/demo/image/upload/VHHT/news/test1.jpg'],
    };
    NewsPost.findById.mockResolvedValue(post);
    NewsPost.findByIdAndDelete.mockResolvedValue('deleted');

    const result = await newsPostService.delete('id123');
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('VHHT/news/test1');
    expect(result).toBe('deleted');
  });

  it('should return null if post not found for delete', async () => {
    NewsPost.findById.mockResolvedValue(null);
    const result = await newsPostService.delete('id123');
    expect(result).toBeNull();
  });

  it('should update post', async () => {
    NewsPost.findByIdAndUpdate.mockResolvedValue('updated');
    const result = await newsPostService.update('id123', { title: 'new' });
    expect(result).toBe('updated');
  });

  it('should upvote post', async () => {
    const save = jest.fn().mockResolvedValue();
    const post = {
      upvotes: Object.assign([], { pull: jest.fn(), push: Array.prototype.push, includes: Array.prototype.includes }),
      downvotes: Object.assign(['u2'], { pull: jest.fn(), push: Array.prototype.push, includes: Array.prototype.includes }),
      save,
    };
    NewsPost.findById.mockResolvedValue(post);

    const result = await newsPostService.upvote('post1', 'u1');
    expect(post.upvotes).toContain('u1');
    expect(post.downvotes).not.toContain('u1');
    expect(result.message).toBe('Post upvoted');
  });

  it('should remove upvote if already upvoted', async () => {
    const save = jest.fn().mockResolvedValue();
    const upvotesArray = ['u1'];
    upvotesArray.pull = function(id) {
      const index = this.indexOf(id);
      if (index !== -1) this.splice(index, 1);
    };
    upvotesArray.push = Array.prototype.push;
    upvotesArray.includes = Array.prototype.includes;
    const post = {
      upvotes: upvotesArray,
      downvotes: Object.assign([], { pull: jest.fn(), push: Array.prototype.push, includes: Array.prototype.includes }),
      save,
    };
    NewsPost.findById.mockResolvedValue(post);

    const result = await newsPostService.upvote('post1', 'u1');
    expect(post.upvotes).not.toContain('u1');
    expect(result.message).toBe('Upvote removed');
  });

  it('should downvote post', async () => {
    const save = jest.fn().mockResolvedValue();
    const post = {
      upvotes: Object.assign(['u1'], { pull: jest.fn(), push: Array.prototype.push, includes: Array.prototype.includes }),
      downvotes: Object.assign([], { pull: jest.fn(), push: Array.prototype.push, includes: Array.prototype.includes }),
      save,
    };
    NewsPost.findById.mockResolvedValue(post);

    const result = await newsPostService.downvote('post1', 'u2');
    expect(post.downvotes).toContain('u2');
    expect(post.upvotes).not.toContain('u2');
    expect(result.message).toBe('News downvoted');
  });

  it('should remove downvote if already downvoted', async () => {
    const save = jest.fn().mockResolvedValue();
    const downvotesArray = ['u1'];
    downvotesArray.pull = function(id) {
      const index = this.indexOf(id);
      if (index !== -1) this.splice(index, 1);
    };
    downvotesArray.push = Array.prototype.push;
    downvotesArray.includes = Array.prototype.includes;
    const post = {
      upvotes: Object.assign([], { pull: jest.fn(), push: Array.prototype.push, includes: Array.prototype.includes }),
      downvotes: downvotesArray,
      save,
    };
    NewsPost.findById.mockResolvedValue(post);

    const result = await newsPostService.downvote('post1', 'u1');
    expect(post.downvotes).not.toContain('u1');
    expect(result.message).toBe('Downvote removed');
  });

  it('should throw error if post not found for upvote', async () => {
    NewsPost.findById.mockResolvedValue(null);
    await expect(newsPostService.upvote('id', 'user')).rejects.toThrow('News post not found');
  });

  it('should throw error if post not found for downvote', async () => {
    NewsPost.findById.mockResolvedValue(null);
    await expect(newsPostService.downvote('id', 'user')).rejects.toThrow('News not found');
  });
});