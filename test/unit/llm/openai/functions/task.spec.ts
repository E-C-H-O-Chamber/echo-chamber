import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  createTaskFunction,
  listTaskFunction,
  updateTaskFunction,
  deleteTaskFunction,
  completeTaskFunction,
} from '../../../../../src/llm/openai/functions/task';
import { mockToolContext } from '../../../../mocks/tool';

beforeEach(() => {
  vi.resetAllMocks();
});

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-08-04T08:00:00.000Z'));
});

afterAll(() => {
  vi.useRealTimers();
});

describe('Task Functions', () => {
  describe('createTaskFunction', () => {
    it('name', () => {
      expect(createTaskFunction.name).toBe('create_task');
    });

    it('description', () => {
      expect(createTaskFunction.description).toBeDefined();
    });

    it('parameters', () => {
      const { parameters } = createTaskFunction;
      expect(parameters).toBeDefined();
      expect(parameters.name.def.type).toBe('string');
      expect(parameters.name.minLength).toBe(1);
      expect(parameters.name.maxLength).toBe(64);
      expect(parameters.content.def.type).toBe('string');
      expect(parameters.content.minLength).toBe(1);
      expect(parameters.content.maxLength).toBe(500);
      expect(parameters.execution_time.def.type).toBe('string');
      expect(parameters.execution_time.format).toBe('datetime');
    });

    describe('handler', () => {
      it('正常な引数でタスクを作成する', async () => {
        const args = {
          name: 'test-task',
          content: 'Test task content',
          execution_time: '2025-08-04T12:00:00.000Z',
        };
        const result = await createTaskFunction.handler(args, mockToolContext);

        expect(mockToolContext.storage.get).toHaveBeenCalledWith('tasks');
        expect(mockToolContext.storage.put).toHaveBeenCalledWith('tasks', [
          {
            name: 'test-task',
            content: 'Test task content',
            execution_time: '2025-08-04T12:00:00.000Z',
          },
        ]);
        expect(result).toEqual({
          success: true,
        });
      });

      it('同じ名前のタスクが既に存在する場合はエラーを返す', async () => {
        mockToolContext.storage.get.mockResolvedValue([
          {
            name: 'existing-task',
            content: 'Existing task',
            execution_time: '2025-08-04T10:00:00.000Z',
          },
        ]);

        const args = {
          name: 'existing-task',
          content: 'New task content',
          execution_time: '2025-08-04T12:00:00.000Z',
        };
        const result = await createTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: false,
          error: 'Task with name "existing-task" already exists',
        });
        expect(mockToolContext.storage.put).not.toHaveBeenCalled();
      });

      it('過去の日時を指定した場合はエラーを返す', async () => {
        const args = {
          name: 'test-task',
          content: 'Test content',
          execution_time: '2025-08-03T12:00:00.000Z', // 過去の日時
        };
        const result = await createTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: false,
          error: 'Execution time cannot be in the past',
        });
        expect(mockToolContext.storage.put).not.toHaveBeenCalled();
      });

      it('storage.getでエラーが発生した場合はエラーを返す', async () => {
        mockToolContext.storage.get.mockRejectedValue(
          new Error('Storage error')
        );

        const args = {
          name: 'test-task',
          content: 'Test content',
          execution_time: '2025-08-04T12:00:00.000Z',
        };
        const result = await createTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: false,
          error: 'Failed to create task',
        });
      });

      it('storage.putでエラーが発生した場合はエラーを返す', async () => {
        mockToolContext.storage.put.mockRejectedValue(
          new Error('Storage error')
        );

        const args = {
          name: 'test-task',
          content: 'Test content',
          execution_time: '2025-08-04T12:00:00.000Z',
        };
        const result = await createTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: false,
          error: 'Failed to create task',
        });
      });
    });
  });

  describe('listTaskFunction', () => {
    it('name', () => {
      expect(listTaskFunction.name).toBe('list_task');
    });

    it('description', () => {
      expect(listTaskFunction.description).toBeDefined();
    });

    it('parameters', () => {
      expect(listTaskFunction.parameters).toEqual({});
    });

    describe('handler', () => {
      it('全タスクを返す', async () => {
        const mockTasks = [
          {
            name: 'task1',
            content: 'Content 1',
            execution_time: '2025-08-04T10:00:00.000Z',
          },
          {
            name: 'task2',
            content: 'Content 2',
            execution_time: '2025-08-04T12:00:00.000Z',
          },
        ];
        mockToolContext.storage.get.mockResolvedValue(mockTasks);

        const args = {};
        const result = await listTaskFunction.handler(args, mockToolContext);

        expect(mockToolContext.storage.get).toHaveBeenCalledWith('tasks');
        expect(result).toEqual({
          success: true,
          tasks: [
            {
              name: 'task1',
              content: 'Content 1',
              execution_time: '2025-08-04T10:00:00.000Z',
            },
            {
              name: 'task2',
              content: 'Content 2',
              execution_time: '2025-08-04T12:00:00.000Z',
            },
          ],
        });
      });

      it('実行日時の昇順でソートされる', async () => {
        const mockTasks = [
          {
            name: 'task2',
            content: 'Content 2',
            execution_time: '2025-08-04T12:00:00.000Z',
          },
          {
            name: 'task1',
            content: 'Content 1',
            execution_time: '2025-08-04T10:00:00.000Z',
          },
        ];
        mockToolContext.storage.get.mockResolvedValue(mockTasks);
        const args = {};
        const result = await listTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: true,
          tasks: [
            {
              name: 'task1',
              content: 'Content 1',
              execution_time: '2025-08-04T10:00:00.000Z',
            },
            {
              name: 'task2',
              content: 'Content 2',
              execution_time: '2025-08-04T12:00:00.000Z',
            },
          ],
        });
      });

      it('タスクが存在しない場合は空の配列を返す', async () => {
        mockToolContext.storage.get.mockResolvedValue(undefined);

        const args = {};
        const result = await listTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: true,
          tasks: [],
        });
      });

      it('storage.getでエラーが発生した場合はエラーを返す', async () => {
        mockToolContext.storage.get.mockRejectedValue(
          new Error('Storage error')
        );

        const args = {};
        const result = await listTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: false,
          error: 'Failed to list tasks',
        });
      });
    });
  });

  describe('updateTaskFunction', () => {
    it('name', () => {
      expect(updateTaskFunction.name).toBe('update_task');
    });

    it('description', () => {
      expect(updateTaskFunction.description).toBeDefined();
    });

    it('parameters', () => {
      const { parameters } = updateTaskFunction;
      expect(parameters).toBeDefined();
      expect(parameters.name.def.type).toBe('string');
      expect(parameters.content.unwrap().def.type).toBe('string');
      expect(parameters.content.unwrap().minLength).toBe(1);
      expect(parameters.content.unwrap().maxLength).toBe(500);
      expect(parameters.content.def.type).toBe('optional');
      expect(parameters.execution_time.unwrap().def.type).toBe('string');
      expect(parameters.execution_time.unwrap().format).toBe('datetime');
      expect(parameters.execution_time.def.type).toBe('optional');
    });

    describe('handler', () => {
      it('既存タスクの内容を更新する', async () => {
        const mockTasks = [
          {
            name: 'test-task',
            content: 'Old content',
            execution_time: '2025-08-04T10:00:00.000Z',
          },
        ];
        mockToolContext.storage.get.mockResolvedValue(mockTasks);

        const args = {
          name: 'test-task',
          content: 'Updated content',
          execution_time: '2025-08-04T14:00:00.000Z',
        };
        const result = await updateTaskFunction.handler(args, mockToolContext);

        expect(mockToolContext.storage.put).toHaveBeenCalledWith('tasks', [
          {
            name: 'test-task',
            content: 'Updated content',
            execution_time: '2025-08-04T14:00:00.000Z',
          },
        ]);
        expect(result).toEqual({
          success: true,
          updated_task: {
            name: 'test-task',
            content: 'Updated content',
            execution_time: '2025-08-04T14:00:00.000Z',
          },
        });
      });

      it('存在しないタスクを更新しようとした場合はエラーを返す', async () => {
        const args = {
          name: 'non-existent-task',
          content: 'New content',
          execution_time: '',
        };
        const result = await updateTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: false,
          error: 'Task with name "non-existent-task" not found',
        });
        expect(mockToolContext.storage.put).not.toHaveBeenCalled();
      });

      it('タスク内容のみの更新が可能', async () => {
        const mockTasks = [
          {
            name: 'test-task',
            content: 'Original content',
            execution_time: '2025-08-04T10:00:00.000Z',
          },
        ];
        mockToolContext.storage.get.mockResolvedValue(mockTasks);

        const args = {
          name: 'test-task',
          content: 'Updated content only',
        };
        const result = await updateTaskFunction.handler(args, mockToolContext);

        expect(mockToolContext.storage.put).toHaveBeenCalledWith('tasks', [
          {
            name: 'test-task',
            content: 'Updated content only',
            execution_time: '2025-08-04T10:00:00.000Z',
          },
        ]);
        expect(result).toEqual({
          success: true,
          updated_task: {
            name: 'test-task',
            content: 'Updated content only',
            execution_time: '2025-08-04T10:00:00.000Z',
          },
        });
      });

      it('実行日時のみの更新が可能', async () => {
        const mockTasks = [
          {
            name: 'test-task',
            content: 'Original content',
            execution_time: '2025-08-04T10:00:00.000Z',
          },
        ];
        mockToolContext.storage.get.mockResolvedValue(mockTasks);

        const args = {
          name: 'test-task',
          execution_time: '2025-08-05T12:00:00.000Z',
        };
        const result = await updateTaskFunction.handler(args, mockToolContext);

        expect(mockToolContext.storage.put).toHaveBeenCalledWith('tasks', [
          {
            name: 'test-task',
            content: 'Original content',
            execution_time: '2025-08-05T12:00:00.000Z',
          },
        ]);
        expect(result).toEqual({
          success: true,
          updated_task: {
            name: 'test-task',
            content: 'Original content',
            execution_time: '2025-08-05T12:00:00.000Z',
          },
        });
      });

      it('contentとexecution_timeのどちらも指定されない場合はエラーを返す', async () => {
        const mockTasks = [
          {
            name: 'test-task',
            content: 'Original content',
            execution_time: '2025-08-04T10:00:00.000Z',
          },
        ];
        mockToolContext.storage.get.mockResolvedValue(mockTasks);

        const args = {
          name: 'test-task',
        };
        const result = await updateTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: false,
          error: 'At least one of content or execution_time must be provided',
        });
        expect(mockToolContext.storage.put).not.toHaveBeenCalled();
      });

      it('過去の日時を指定して更新しようとした場合はエラーを返す', async () => {
        const mockTasks = [
          {
            name: 'test-task',
            content: 'Original content',
            execution_time: '2025-08-04T10:00:00.000Z',
          },
        ];
        mockToolContext.storage.get.mockResolvedValue(mockTasks);

        const args = {
          name: 'test-task',
          execution_time: '2025-08-03T14:00:00.000Z', // 過去の日時
        };
        const result = await updateTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: false,
          error: 'Execution time cannot be in the past',
        });
        expect(mockToolContext.storage.put).not.toHaveBeenCalled();
      });

      it('storage.getでエラーが発生した場合はエラーを返す', async () => {
        mockToolContext.storage.get.mockRejectedValue(
          new Error('Storage error')
        );

        const args = {
          name: 'test-task',
          content: 'Updated content',
        };
        const result = await updateTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: false,
          error: 'Failed to update task',
        });
      });

      it('storage.putでエラーが発生した場合はエラーを返す', async () => {
        const mockTasks = [
          {
            name: 'test-task',
            content: 'Original content',
            execution_time: '2025-08-04T10:00:00.000Z',
          },
        ];
        mockToolContext.storage.get.mockResolvedValue(mockTasks);
        mockToolContext.storage.put.mockRejectedValue(
          new Error('Storage error')
        );

        const args = {
          name: 'test-task',
          content: 'Updated content',
        };
        const result = await updateTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: false,
          error: 'Failed to update task',
        });
      });
    });
  });

  describe('deleteTaskFunction', () => {
    it('name', () => {
      expect(deleteTaskFunction.name).toBe('delete_task');
    });

    it('description', () => {
      expect(deleteTaskFunction.description).toBeDefined();
    });

    it('parameters', () => {
      const { parameters } = deleteTaskFunction;
      expect(parameters).toBeDefined();
      expect(parameters.name.def.type).toBe('string');
    });

    describe('handler', () => {
      it('既存タスクを削除する', async () => {
        const mockTasks = [
          {
            name: 'test-task',
            content: 'Test content',
            execution_time: '2025-08-04T12:00:00.000Z',
          },
          {
            name: 'other-task',
            content: 'Other content',
            execution_time: '2025-08-04T14:00:00.000Z',
          },
        ];
        mockToolContext.storage.get.mockResolvedValue(mockTasks);

        const args = { name: 'test-task' };
        const result = await deleteTaskFunction.handler(args, mockToolContext);

        expect(mockToolContext.storage.put).toHaveBeenCalledWith('tasks', [
          {
            name: 'other-task',
            content: 'Other content',
            execution_time: '2025-08-04T14:00:00.000Z',
          },
        ]);
        expect(result).toEqual({
          success: true,
        });
      });

      it('存在しないタスクを削除しようとした場合はエラーを返す', async () => {
        const args = { name: 'non-existent-task' };
        const result = await deleteTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: false,
          error: 'Task with name "non-existent-task" not found',
        });
        expect(mockToolContext.storage.put).not.toHaveBeenCalled();
      });

      it('storage.getでエラーが発生した場合はエラーを返す', async () => {
        mockToolContext.storage.get.mockRejectedValue(
          new Error('Storage error')
        );

        const args = { name: 'test-task' };
        const result = await deleteTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: false,
          error: 'Failed to delete task',
        });
      });

      it('storage.putでエラーが発生した場合はエラーを返す', async () => {
        const mockTasks = [
          {
            name: 'test-task',
            content: 'Test content',
            execution_time: '2025-08-04T12:00:00.000Z',
          },
        ];
        mockToolContext.storage.get.mockResolvedValue(mockTasks);
        mockToolContext.storage.put.mockRejectedValue(
          new Error('Storage error')
        );

        const args = { name: 'test-task' };
        const result = await deleteTaskFunction.handler(args, mockToolContext);

        expect(result).toEqual({
          success: false,
          error: 'Failed to delete task',
        });
      });
    });
  });

  describe('completeTaskFunction', () => {
    it('name', () => {
      expect(completeTaskFunction.name).toBe('complete_task');
    });

    it('description', () => {
      expect(completeTaskFunction.description).toBeDefined();
    });

    it('parameters', () => {
      const { parameters } = completeTaskFunction;
      expect(parameters).toBeDefined();
      expect(parameters.name.def.type).toBe('string');
    });

    describe('handler', () => {
      it('既存タスクを完了する', async () => {
        const mockTasks = [
          {
            name: 'test-task',
            content: 'Test content',
            execution_time: '2025-08-04T12:00:00.000Z',
          },
          {
            name: 'other-task',
            content: 'Other content',
            execution_time: '2025-08-04T14:00:00.000Z',
          },
        ];
        mockToolContext.storage.get.mockResolvedValue(mockTasks);

        const args = { name: 'test-task' };
        const result = await completeTaskFunction.handler(
          args,
          mockToolContext
        );

        expect(mockToolContext.storage.put).toHaveBeenCalledWith('tasks', [
          {
            name: 'other-task',
            content: 'Other content',
            execution_time: '2025-08-04T14:00:00.000Z',
          },
        ]);
        expect(result).toEqual({
          success: true,
        });
      });

      it('存在しないタスクを完了しようとした場合はエラーを返す', async () => {
        const args = { name: 'non-existent-task' };
        const result = await completeTaskFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: false,
          error: 'Task with name "non-existent-task" not found',
        });
        expect(mockToolContext.storage.put).not.toHaveBeenCalled();
      });

      it('storage.getでエラーが発生した場合はエラーを返す', async () => {
        mockToolContext.storage.get.mockRejectedValue(
          new Error('Storage error')
        );

        const args = { name: 'test-task' };
        const result = await completeTaskFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: false,
          error: 'Failed to complete task',
        });
      });

      it('storage.putでエラーが発生した場合はエラーを返す', async () => {
        const mockTasks = [
          {
            name: 'test-task',
            content: 'Test content',
            execution_time: '2025-08-04T12:00:00.000Z',
          },
        ];
        mockToolContext.storage.get.mockResolvedValue(mockTasks);
        mockToolContext.storage.put.mockRejectedValue(
          new Error('Storage error')
        );

        const args = { name: 'test-task' };
        const result = await completeTaskFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: false,
          error: 'Failed to complete task',
        });
      });
    });
  });
});
