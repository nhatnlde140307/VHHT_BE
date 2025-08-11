import usersService from '../services/users.services.js';
import User from '../models/users.model.js';
import { CommuneModel } from '../models/commune.model.js';
import { hashPassword } from '../utils/crypto.js';
import { MailGenerator, transporter } from '../utils/nodemailerConfig.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import xlsx from 'xlsx';
import { comparePassword } from '../utils/crypto.js';
import DonorProfile from '../models/donorProfile.model.js';

jest.mock('../models/users.model.js');
jest.mock('../models/commune.model.js');
jest.mock('../utils/crypto.js');
jest.mock('../utils/nodemailerConfig.js');
jest.mock('jsonwebtoken');
jest.mock('xlsx');
jest.mock('../models/donorProfile.model.js', () => ({
  default: { findOne: jest.fn(), create: jest.fn() }
}));

describe('UsersService - register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should register a new user and send verification email (no communeId)', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };

    hashPassword.mockReturnValue('hashedPassword');
    User.prototype.save = jest.fn().mockResolvedValue({ _id: 'userId123', email: payload.email });
    jwt.sign.mockReturnValue('mocked_token');
    MailGenerator.generate.mockReturnValue('<html>Email</html>');
    transporter.sendMail.mockResolvedValue(true);

    const result = await usersService.register(payload);

    expect(User.prototype.save).toHaveBeenCalled();
    expect(jwt.sign).toHaveBeenCalled();
    expect(transporter.sendMail).toHaveBeenCalled();
    expect(result).toEqual({ message: 'User registered. Please check email to verify.' });
  });
});

describe('UsersService - createManager', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should create manager successfully (without setting communeId)', async () => {
    const payload = {
      fullName: 'Manager',
      email: 'manager@example.com',
      password: '123456',
      phone: '123456789',
      date_of_birth: new Date('2000-01-01'),
      communeId: undefined
    };

    CommuneModel.findById.mockResolvedValue({ _id: 'mockedCommuneId' });
    User.findOne.mockResolvedValue(null);
    hashPassword.mockResolvedValue('hashed_pass');
    User.mockImplementation(() => ({
      _id: 'mockedManagerId',
      role: 'manager',
      save: jest.fn()
    }));

    const result = await usersService.createManager(payload);

    expect(result).toHaveProperty('_id', 'mockedManagerId');
    expect(result).toHaveProperty('role', 'manager');
  });

  it('should throw error if commune does not exist', async () => {
    CommuneModel.findById.mockResolvedValue(null);
    await expect(usersService.createManager({})).rejects.toThrow('Xã không tồn tại trong hệ thống');
  });

  it('should throw error if email already exists', async () => {
    CommuneModel.findById.mockResolvedValue({ _id: 'fake' });
    User.findOne.mockResolvedValue({ email: 'exist@example.com' });
    await expect(usersService.createManager({ email: 'exist@example.com' })).rejects.toThrow('Email đã được sử dụng');
  });
});

describe('UsersService - getUsers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return users with no filters', async () => {
    User.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([{ _id: '1' }, { _id: '2' }])
    });

    const result = await usersService.getUsers({});
    expect(User.find).toHaveBeenCalledWith({ role: { $ne: 'admin' } });
    expect(result).toHaveLength(2);
  });

  it('should filter users by role (e.g., "manager")', async () => {
    User.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([{ _id: '1', role: 'manager' }])
    });

    await usersService.getUsers({ role: 'manager' });

    expect(User.find).toHaveBeenCalledWith({ role: { $ne: 'admin' } });
  });

  it('should filter users by district and province using communeId', async () => {
    CommuneModel.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: 'c1' }, { _id: 'c2' }])
    });

    User.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([{ _id: '1' }, { _id: '2' }])
    });

    const result = await usersService.getUsers({ district: 'Hương Khê', province: 'Hà Tĩnh' });
    expect(User.find).toHaveBeenCalledWith({
      role: { $ne: 'admin' },
      communeId: { $in: ['c1', 'c2'] }
    });
    expect(result).toHaveLength(2);
  });
});

describe('UsersService - getUserById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return user if ID is valid and user exists', async () => {
    const validId = '507f191e810c19729de860ea';

    User.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ _id: validId, email: 'test@example.com' })
    });

    const result = await usersService.getUserById(validId);

    expect(result).toHaveProperty('_id', validId);
  });

  it('should throw error if ID is invalid', async () => {
    await expect(usersService.getUserById('invalid-id')).rejects.toThrow('ID không hợp lệ');
  });

  it('should return null if user not found', async () => {
    User.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(null)
    });

    const result = await usersService.getUserById('507f191e810c19729de860ea');
    expect(result).toBeNull();
  });
});

describe('UsersService - getUserProfile', () => {
  it('should return user profile if user exists', async () => {
    User.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ _id: '123', email: 'user@example.com' })
    });

    const result = await usersService.getUserProfile('123');
    expect(result).toHaveProperty('email', 'user@example.com');
  });

  it('should throw error if user not found', async () => {
    User.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(null)
    });

    await expect(usersService.getUserProfile('123')).rejects.toThrow('Người dùng không tồn tại');
  });
});

describe('UsersService - disableUser', () => {
  it('should disable user if active', async () => {
    const mockUser = { _id: '1', status: 'active', save: jest.fn() };
    User.findById.mockResolvedValue(mockUser);

    const result = await usersService.disableUser('507f191e810c19729de860ea');
    expect(mockUser.status).toBe('inactive');
    expect(mockUser.save).toHaveBeenCalled();
    expect(result).toBe(mockUser);
  });

  it('should throw if ID is invalid', async () => {
    await expect(usersService.disableUser('bad-id')).rejects.toThrow('ID không hợp lệ');
  });

  it('should throw if user not found', async () => {
    User.findById.mockResolvedValue(null);
    await expect(usersService.disableUser('507f191e810c19729de860ea')).rejects.toThrow('Người dùng không tồn tại');
  });

  it('should throw if user already inactive', async () => {
    User.findById.mockResolvedValue({ status: 'inactive' });
    await expect(usersService.disableUser('507f191e810c19729de860ea')).rejects.toThrow('Tài khoản đã bị vô hiệu hóa trước đó');
  });
});

describe('UsersService - createOrganization', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should create organization under valid manager', async () => {
    const payload = {
      managerId: '507f191e810c19729de860ea',
      fullName: 'Org A',
      email: 'orga@example.com',
      phone: '123456789',
      password: 'abc123',
      date_of_birth: new Date('2000-01-01')
    };

    User.findById.mockResolvedValue({ _id: payload.managerId, role: 'manager', communeId: 'communeX' });
    User.findOne.mockResolvedValue(null);
    hashPassword.mockResolvedValue('hashed_pass');

    // ✅ Mock đúng cả instance + method
    User.mockImplementation(() => ({
      _id: 'org123',
      role: 'organization',
      email: payload.email,
      communeId: 'communeX',
      save: jest.fn(),
      toObject: jest.fn(() => ({
        _id: 'org123',
        role: 'organization',
        email: payload.email
      }))
    }));

    const result = await usersService.createOrganization(payload);

    expect(result).toHaveProperty('_id', 'org123');
    expect(result).toHaveProperty('role', 'organization');
  });

  it('should throw error if managerId is invalid', async () => {
    await expect(usersService.createOrganization({ managerId: 'invalid-id' })).rejects.toThrow('ID manager không hợp lệ');
  });

  it('should throw error if manager not found or not a manager', async () => {
    User.findById.mockResolvedValue({ role: 'user' });
    await expect(usersService.createOrganization({ managerId: '507f191e810c19729de860ea' }))
      .rejects.toThrow('Manager không tồn tại hoặc không hợp lệ');
  });

  it('should throw error if email already exists', async () => {
    User.findById.mockResolvedValue({ _id: '1', role: 'manager', communeId: 'x' });
    User.findOne.mockResolvedValue({ email: 'exist@example.com' });

    await expect(usersService.createOrganization({
      managerId: '507f191e810c19729de860ea',
      email: 'exist@example.com'
    })).rejects.toThrow('Email đã được sử dụng');
  });
});

describe('UsersService - enableUser', () => {
  it('should enable user if inactive', async () => {
    const mockUser = { _id: '1', status: 'inactive', save: jest.fn() };
    User.findById.mockResolvedValue(mockUser);

    const result = await usersService.enableUser('507f191e810c19729de860ea');

    expect(mockUser.status).toBe('active');
    expect(mockUser.save).toHaveBeenCalled();
    expect(result).toBe(mockUser);
  });

  it('should throw if ID is invalid', async () => {
    await expect(usersService.enableUser('invalid-id')).rejects.toThrow('ID không hợp lệ');
  });

  it('should throw if user not found', async () => {
    User.findById.mockResolvedValue(null);
    await expect(usersService.enableUser('507f191e810c19729de860ea')).rejects.toThrow('Người dùng không tồn tại');
  });

  it('should throw if user already active', async () => {
    User.findById.mockResolvedValue({ status: 'active' });
    await expect(usersService.enableUser('507f191e810c19729de860ea')).rejects.toThrow('Tài khoản đã đang ở trạng thái active');
  });
});


describe('UsersService - importUsersFromExcelBuffer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should import valid users and skip existing emails', async () => {
    const mockBuffer = Buffer.from('fake-xlsx');
    const mockData = [
      {
        fullName: 'User A',
        email: 'a@example.com',
        phone: '123456',
        password: '123456',
        date_of_birth: '2000-01-01'
      },
      {
        fullName: 'User B',
        email: 'b@example.com',
        phone: '789101',
        password: '123456',
        date_of_birth: '2001-01-01'
      }
    ];

    // Email b@example.com đã tồn tại
    User.findOne
      .mockResolvedValueOnce(null) // a@example.com → không tồn tại
      .mockResolvedValueOnce({ email: 'b@example.com' }); // b@example.com → tồn tại

    xlsx.read.mockReturnValue({
      Sheets: { Sheet1: {} },
      SheetNames: ['Sheet1']
    });

    xlsx.utils.sheet_to_json.mockReturnValue(mockData);

    User.prototype.save = jest.fn().mockResolvedValue({});

    const result = await usersService.importUsersFromExcelBuffer(mockBuffer, 'user');

    expect(result.successCount).toBe(1);
    expect(result.failed).toEqual([
      { email: 'b@example.com', reason: 'Email đã tồn tại trong hệ thống' }
    ]);
  });
});

describe('UsersService - checkExistEmail', () => {
  it('should return true if user exists', async () => {
    User.findOne.mockResolvedValue({ email: 'test@example.com' });
    const result = await usersService.checkExistEmail('test@example.com');
    expect(result).toBe(true);
  });

  it('should return false if user does not exist', async () => {
    User.findOne.mockResolvedValue(null);
    const result = await usersService.checkExistEmail('nonexist@example.com');
    expect(result).toBe(false);
  });
});

describe('UsersService - checkActivityUser', () => {
  it('should return true if user is inactive', async () => {
    User.findOne.mockResolvedValue({ email: 'a@example.com', status: 'inactive' });
    const result = await usersService.checkActivityUser('a@example.com');
    expect(result).toBe(true);
  });

  it('should return false if user is active', async () => {
    User.findOne.mockResolvedValue({ email: 'a@example.com', status: 'active' });
    const result = await usersService.checkActivityUser('a@example.com');
    expect(result).toBe(false);
  });

  it('should return false if user not found', async () => {
    User.findOne.mockResolvedValue(null);
    const result = await usersService.checkActivityUser('a@example.com');
    expect(result).toBe(false);
  });
});

describe('UsersService - login', () => {
  it('should return access_token and user info', async () => {
    const fakeUser = {
      _doc: {
        _id: 'user123',
        role: 'user',
        email: 'test@example.com',
        password: 'hashedpw',
        name: 'Test User'
      }
    };

    usersService.signAccessToken = jest.fn().mockReturnValue('mocked_token');

    const result = await usersService.login(fakeUser);

    expect(usersService.signAccessToken).toHaveBeenCalledWith('user123', 'user');
    expect(result).toMatchObject({
      access_token: 'mocked_token',
      role: 'user',
      _id: 'user123'
    });
    expect(result.rest.email).toBe('test@example.com');
    expect(result.rest.password).toBeUndefined(); // Đảm bảo password bị loại
  });
});

describe('UsersService - getUser', () => {
  it('should return user by user_id', async () => {
    const user_id = '507f191e810c19729de860ea';
    const payload = { user_id };

    const mockUser = { _id: user_id, email: 'test@example.com' };

    User.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockUser)
    });

    const result = await usersService.getUser(payload);

    expect(User.findOne).toHaveBeenCalledWith({ _id: user_id });
    expect(result).toEqual({ getUser: mockUser, user_id });
  });
});

describe('UsersService - getUserByEmail', () => {
  it('should return user by email', async () => {
    const payload = { email: 'test@example.com' };
    const mockUser = { _id: '123', email: payload.email };

    User.findOne.mockResolvedValue(mockUser);

    const result = await usersService.getUserByEmail(payload);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(result).toEqual(mockUser);
  });

  it('should return null if user not found', async () => {
    User.findOne.mockResolvedValue(null);
    const result = await usersService.getUserByEmail({ email: 'notfound@example.com' });
    expect(result).toBeNull();
  });
});

describe('UsersService - updateUser', () => {
  it('should update user with avatar from file', async () => {
    const user_id = '507f191e810c19729de860ea';
    const payload = { fullName: 'Updated' };
    const file = { path: 'uploads/avatar.jpg' };

    User.findByIdAndUpdate.mockResolvedValue({ _id: user_id, fullName: 'Updated', avatar: file.path });

    const result = await usersService.updateUser(user_id, payload, file);

    expect(result.updateUser.avatar).toBe('uploads/avatar.jpg');
    expect(result.user_id).toBe(user_id);
  });
});

describe('UsersService - addSkills', () => {
  const userId = '507f191e810c19729de860ea';

  beforeEach(() => jest.clearAllMocks());

  // it('should add skills to user successfully', async () => {
  //   const skills = ['Leadership', 'Communication'];

  //   const mockUser = {
  //     _id: userId,
  //     skills: [],
  //     save: jest.fn()
  //   };

  //   User.findById.mockResolvedValue(mockUser);

  //   const result = await usersService.addSkills(userId, skills);

  //   expect(mockUser.skills).toEqual(skills);
  //   expect(mockUser.save).toHaveBeenCalled();
  //   expect(result).toMatchObject({
  //     message: 'Skills added successfully',
  //     user: {
  //       _id: userId,
  //       skills
  //     }
  //   });
  // });

  it('should throw error if user not found', async () => {
    User.findById.mockResolvedValue(null);

    await expect(usersService.addSkills(userId, ['Teamwork']))
      .rejects.toThrow('People dùng không tồn tại');
  });
});

describe('UsersService - updateSkills', () => {
  const userId = '507f191e810c19729de860ea';

  beforeEach(() => jest.clearAllMocks());

  // it('should update skills successfully', async () => {
  //   const newSkills = ['Problem-solving', 'Creativity'];

  //   const mockUser = {
  //     _id: userId,
  //     skills: ['OldSkill'],
  //     save: jest.fn()
  //   };

  //   User.findById.mockResolvedValue(mockUser);

  //   const result = await usersService.updateSkills(userId, newSkills);

  //   expect(mockUser.skills).toEqual(newSkills);
  //   expect(mockUser.save).toHaveBeenCalled();
  //   expect(result).toMatchObject({
  //     message: 'Skills updated successfully',
  //     user: {
  //       _id: userId,
  //       skills: newSkills
  //     }
  //   });
  // });

  it('should throw error if user not found', async () => {
    User.findById.mockResolvedValue(null);

    await expect(usersService.updateSkills(userId, ['NewSkill']))
      .rejects.toThrow('Người dùng không tồn tại');
  });
});

// describe('UsersService - changePassword', () => {
//   beforeEach(() => jest.clearAllMocks());

//   it('should change password successfully', async () => {
//     const user_id = '507f191e810c19729de860ea';
//     const originalHashed = 'old_hashed_password';

//     const mockUser = {
//       _id: user_id,
//       password: originalHashed,
//       save: jest.fn()
//     };

//     // 🔁 Lượt 1: load user ban đầu, Lượt 2: load sau khi cập nhật
//     User.findById
//       .mockResolvedValueOnce(mockUser)
//       .mockResolvedValueOnce({ _id: user_id, email: 'updated@example.com' });

//     comparePassword.mockResolvedValue(true);
//     hashPassword.mockReturnValue('new_hashed_password');

//     const result = await usersService.changePassword(user_id, 'oldPassword', 'newPassword');

//     expect(comparePassword).toHaveBeenCalledWith('oldPassword', originalHashed);
//     expect(mockUser.password).toBe('new_hashed_password');
//     expect(mockUser.save).toHaveBeenCalled();
//     expect(result).toEqual({
//       message: 'Password changed successfully',
//       user: { _id: user_id, email: 'updated@example.com' }
//     });
//   });

//   it('should throw if old password is invalid', async () => {
//     const mockUser = {
//       _id: '123',
//       password: 'wrongpw',
//       save: jest.fn()
//     };

//     User.findById.mockResolvedValue(mockUser);
//     comparePassword.mockResolvedValue(false);

//     await expect(usersService.changePassword('123', 'wrong', 'new'))
//       .rejects.toThrow('Invalid old password');
//   });

//   it('should throw if user not found', async () => {
//     User.findById.mockResolvedValue(null);

//     await expect(usersService.changePassword('123', 'any', 'new'))
//       .rejects.toThrow('User not found');
//   });
// });

// describe('UsersService - createDonorProfile', () => {
//   it('should create donor profile if not exists', async () => {
//     const user = { _id: '123' };
//     DonorProfile.findOne.mockResolvedValue(null);
//     DonorProfile.create.mockResolvedValue({ _id: 'donor123', userId: '123' });

//     const result = await usersService.createDonorProfile(user);

//     expect(result).toHaveProperty('_id', 'donor123');
//   });

//   it('should throw error if user is undefined', async () => {
//     await expect(usersService.createDonorProfile(undefined)).rejects.toThrow('User not found');
//   });

//   it('should throw error if donor profile already exists', async () => {
//     DonorProfile.findOne.mockResolvedValue({ _id: 'exist' });

//     await expect(usersService.createDonorProfile({ _id: '123' })).rejects.toThrow('Donor profile already exists');
//   });
// });

// describe('UsersService - getSkillsByUserId', () => {
//   it('should return skills of valid user', async () => {
//     User.findById.mockResolvedValue({ _id: '123', skills: ['teaching', 'cooking'] });

//     const result = await usersService.getSkillsByUserId('507f191e810c19729de860ea');
//     expect(result).toEqual(['teaching', 'cooking']);
//   });

//   it('should throw error if ID is invalid', async () => {
//     await expect(usersService.getSkillsByUserId('invalid-id')).rejects.toThrow('ID không hợp lệ');
//   });

//   it('should throw error if user not found', async () => {
//     User.findById.mockResolvedValue(null);
//     await expect(usersService.getSkillsByUserId('507f191e810c19729de860ea')).rejects.toThrow('Người dùng không tồn tại');
//   });
// });