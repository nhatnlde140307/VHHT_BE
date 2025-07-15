import NewsPostService from '../services/newsPost.services.js';
import NewsPost from '../models/newsPost.model.js';
import { cloudinary } from '../utils/cloudinary.config.js';

jest.mock('../models/newsPost.model.js');
jest.mock('../utils/cloudinary.config.js');

describe('NewsPostService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createNewPost', () => {
        it('tạo bài viết thành công', async () => {
            const mockData = { title: 'Hello' };
            const savedPost = { ...mockData, _id: '1' };
            NewsPost.mockImplementation(() => ({ save: jest.fn().mockResolvedValue(savedPost) }));

            const result = await NewsPostService.createNewPost(mockData, 'user123');
            expect(result._id).toBe('1');
        });
    });

    describe('getAll', () => {
        it('trả về danh sách bài viết', async () => {
            const mockData = [{ title: 'Bài 1' }, { title: 'Bài 2' }];
            const populateMock = jest.fn().mockReturnThis();

            NewsPost.find.mockReturnValue({
                sort: () => ({
                    populate: populateMock.mockReturnValue({
                        populate: jest.fn().mockResolvedValue(mockData),
                    }),
                }),
            });

            const result = await NewsPostService.getAll();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('getById', () => {
        it('trả về 1 bài viết theo id', async () => {
            NewsPost.findById.mockResolvedValue({ title: 'Post A' });
            const result = await NewsPostService.getById('id123');
            expect(result.title).toBe('Post A');
        });
    });

    describe('delete', () => {
        it('xóa bài viết và ảnh cloudinary', async () => {
            const mockNews = {
                images: ['https://res.cloudinary.com/demo/image/upload/v1/VHHT/news/img1.jpg'],
            };
            NewsPost.findById.mockResolvedValue(mockNews);
            NewsPost.findByIdAndDelete.mockResolvedValue({ deleted: true });
            cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

            const result = await NewsPostService.delete('id456');
            expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('VHHT/news/img1');
            expect(result.deleted).toBe(true);
        });

        it('trả về null nếu không tìm thấy bài viết', async () => {
            NewsPost.findById.mockResolvedValue(null);
            const result = await NewsPostService.delete('invalid-id');
            expect(result).toBeNull();
        });
    });

    describe('update', () => {
        it('cập nhật bài viết thành công', async () => {
            const updatedPost = { title: 'New Title' };
            NewsPost.findByIdAndUpdate.mockResolvedValue(updatedPost);

            const result = await NewsPostService.update('id789', { title: 'New Title' });
            expect(result.title).toBe('New Title');
        });
    });

    describe('upvote', () => {
        it('vote thành công', async () => {
            const mockPost = {
                upvotes: [],
                downvotes: ['user123'],
                save: jest.fn().mockResolvedValue(true),
            };

            NewsPost.findById.mockResolvedValue(mockPost);

            const result = await NewsPostService.upvote('postId', 'user123');

            expect(result.message).toBe('Post upvoted');
            expect(mockPost.upvotes).toContain('user123');
            expect(mockPost.downvotes).not.toContain('user123');
            expect(mockPost.save).toHaveBeenCalled();
        });

        it('xóa vote nếu đã upvote trước đó', async () => {
            const mockPost = {
                upvotes: ['user123'],
                downvotes: [],
                save: jest.fn().mockResolvedValue(true),
            };

            NewsPost.findById.mockResolvedValue(mockPost);

            const result = await NewsPostService.upvote('postId', 'user123');

            expect(result.message).toBe('Upvote removed');
            expect(mockPost.upvotes).not.toContain('user123');
            expect(mockPost.save).toHaveBeenCalled();
        });

        it('báo lỗi nếu không tìm thấy post', async () => {
            NewsPost.findById.mockResolvedValue(null);

            await expect(NewsPostService.upvote('postId', 'user123')).rejects.toThrow('News post not found');
        });
    });

    describe('downvote', () => {
        it('downvote thành công', async () => {
            const mockPost = {
                upvotes: ['user123'],
                downvotes: [],
                save: jest.fn().mockResolvedValue(true),
            };

            NewsPost.findById.mockResolvedValue(mockPost);

            const result = await NewsPostService.downvote('postId', 'user123');

            expect(result.message).toBe('News downvoted');
            expect(mockPost.downvotes).toContain('user123');
            expect(mockPost.upvotes).not.toContain('user123');
            expect(mockPost.save).toHaveBeenCalled();
        });

        it('xóa downvote nếu đã downvote trước đó', async () => {
            const mockPost = {
                upvotes: [],
                downvotes: ['user123'],
                save: jest.fn().mockResolvedValue(true),
            };

            NewsPost.findById.mockResolvedValue(mockPost);

            const result = await NewsPostService.downvote('postId', 'user123');

            expect(result.message).toBe('Downvote removed');
            expect(mockPost.downvotes).not.toContain('user123');
            expect(mockPost.save).toHaveBeenCalled();
        });

        it('báo lỗi nếu không tìm thấy bài viết', async () => {
            NewsPost.findById.mockResolvedValue(null);

            await expect(NewsPostService.downvote('postId', 'user123')).rejects.toThrow('News not found');
        });
    });

});
