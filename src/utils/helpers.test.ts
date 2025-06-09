import { describe, it, expect } from 'vitest';
import { calculateTaskScore } from './helpers';
import { Task } from '../types';

describe('calculateTaskScore', () => {
  it('returns 5 for a completed authentic deposit task', () => {
    const task: Task = {
      id: '1',
      title: 'Deposit',
      description: '',
      roleIds: [],
      domains: ['physical'],
      isUrgent: false,
      isImportant: true,
      isAuthenticDeposit: true,
      status: 'completed',
      dateCreated: '',
    };
    expect(calculateTaskScore(task)).toBe(5);
  });
});
