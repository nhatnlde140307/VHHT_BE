import mongoose from 'mongoose';
import Department from '../models/departments.model.js';
import { departmentService } from '../services/department.service.js';

jest.mock('../models/departments.model.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('departmentService', () => {
  describe('getDepartmentsByCampaignId', () => {
    it('should return departments for valid campaignId', async () => {
      const mockDepartments = [{ name: 'Dep 1' }, { name: 'Dep 2' }];
      Department.find.mockResolvedValue(mockDepartments);

      const result = await departmentService.getDepartmentsByCampaignId('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockDepartments);
    });
  });

  describe('getDepartmentByVolunteer', () => {
    it('should return departments by volunteerId and campaignId', async () => {
      const mockDepartments = [{ name: 'Dep A' }];
      Department.find.mockResolvedValue(mockDepartments);
      const result = await departmentService.getDepartmentByVolunteer('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');
      expect(result).toEqual(mockDepartments);
    });
  });

  describe('createDepartment', () => {
    it('should create and return a department', async () => {
      const mockDepartment = {
        save: jest.fn().mockResolvedValue(true),
      };
      Department.mockImplementation(() => mockDepartment);

      const result = await departmentService.createDepartment({
        campaignId: '507f1f77bcf86cd799439011',
        name: 'New Dep',
        description: 'desc',
        maxMembers: 5,
      });

      expect(mockDepartment.save).toHaveBeenCalled();
      expect(result).toBe(mockDepartment);
    });
  });

  describe('updateDepartment', () => {
    it('should update and return department', async () => {
      const mockDepartment = {
        name: 'Old',
        save: jest.fn().mockResolvedValue(true),
      };
      Department.findById.mockResolvedValue(mockDepartment);
      const result = await departmentService.updateDepartment('507f1f77bcf86cd799439011', { name: 'Updated' });

      expect(mockDepartment.name).toBe('Updated');
      expect(result).toBe(mockDepartment);
    });
  });

  describe('deleteDepartment', () => {
    it('should delete department if exists', async () => {
      const mockDepartment = {
        deleteOne: jest.fn().mockResolvedValue(true),
      };
      Department.findById.mockResolvedValue(mockDepartment);
      await departmentService.deleteDepartment('507f1f77bcf86cd799439011');
      expect(mockDepartment.deleteOne).toHaveBeenCalled();
    });
  });

  describe('addMember', () => {
    it('should add member to department', async () => {
      const mockDepartment = {
        memberIds: [],
        maxMembers: 3,
        save: jest.fn().mockResolvedValue(true),
      };
      Department.findById.mockResolvedValue(mockDepartment);
      const result = await departmentService.addMember('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');
      expect(mockDepartment.memberIds).toContain('507f1f77bcf86cd799439012');
      expect(result).toBe(mockDepartment);
    });
  });

  describe('removeMember', () => {
    it('should remove member from department', async () => {
      const mockDepartment = {
        memberIds: ['507f1f77bcf86cd799439012'],
        save: jest.fn().mockResolvedValue(true),
      };
      Department.findById.mockResolvedValue(mockDepartment);
      const result = await departmentService.removeMember('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');
      expect(mockDepartment.memberIds).not.toContain('507f1f77bcf86cd799439012');
      expect(result).toBe(mockDepartment);
    });
  });
});
