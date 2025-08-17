import { z } from 'zod';

import { getErrorMessage } from '../../../utils/error';

import { Tool } from './index';

interface Task {
  name: string;
  content: string;
  execution_time: string;
}

export const createTaskFunction = new Tool(
  'create_task',
  'Create a new task with name, content, and execution time.',
  {
    name: z
      .string()
      .min(1)
      .max(64)
      .describe('Task name (primary key, max 64 characters)'),
    content: z
      .string()
      .min(1)
      .max(500)
      .describe('Task content (max 500 characters)'),
    execution_time: z.iso
      .datetime({ offset: true })
      .describe(
        'Execution time in ISO8601 format with timezone offset. Must be in the future.'
      ),
  },
  async ({ name, content, execution_time }, ctx) => {
    try {
      if (new Date(execution_time) < new Date()) {
        return {
          success: false,
          error: 'Execution time cannot be in the past',
        };
      }

      const tasks = (await ctx.storage.get<Task[]>('tasks')) ?? [];

      if (tasks.some((task) => task.name === name)) {
        return {
          success: false,
          error: `Task with name "${name}" already exists`,
        };
      }

      tasks.push({ name, content, execution_time });
      await ctx.storage.put('tasks', tasks);

      return {
        success: true,
      };
    } catch (error) {
      await ctx.logger.error(`Error creating task: ${getErrorMessage(error)}`);
      return {
        success: false,
        error: 'Failed to create task',
      };
    }
  }
);

export const listTaskFunction = new Tool(
  'list_task',
  'List all tasks.',
  {},
  async (_args, ctx) => {
    try {
      const tasks = (await ctx.storage.get<Task[]>('tasks')) ?? [];

      return {
        success: true,
        tasks: tasks.sort((a, b) =>
          a.execution_time < b.execution_time ? -1 : 1
        ),
      };
    } catch (error) {
      await ctx.logger.error(`Error listing tasks: ${getErrorMessage(error)}`);
      return {
        success: false,
        error: 'Failed to list tasks',
      };
    }
  }
);

export const updateTaskFunction = new Tool(
  'update_task',
  'Update an existing task. All fields are optional except name.',
  {
    name: z.string().describe('Task name to update (required)'),
    content: z
      .string()
      .min(1)
      .max(500)
      .optional()
      .describe('New task content (max 500 characters)'),
    execution_time: z.iso
      .datetime({ offset: true })
      .optional()
      .describe(
        'New execution time in ISO8601 format with timezone offset. Must be in the future.'
      ),
  },
  async ({ name, content, execution_time }, ctx) => {
    try {
      if (content === undefined && execution_time === undefined) {
        return {
          success: false,
          error: 'At least one of content or execution_time must be provided',
        };
      }

      if (
        execution_time !== undefined &&
        new Date(execution_time) < new Date()
      ) {
        return {
          success: false,
          error: 'Execution time cannot be in the past',
        };
      }

      const tasks = (await ctx.storage.get<Task[]>('tasks')) ?? [];
      const originalTask = tasks.find((task) => task.name === name);

      if (!originalTask) {
        return {
          success: false,
          error: `Task with name "${name}" not found`,
        };
      }

      const updatedTask = {
        name,
        content: content ?? originalTask.content,
        execution_time: execution_time ?? originalTask.execution_time,
      };

      tasks[tasks.findIndex((task) => task.name === name)] = updatedTask;
      await ctx.storage.put('tasks', tasks);

      return {
        success: true,
        updated_task: updatedTask,
      };
    } catch (error) {
      await ctx.logger.error(`Error updating task: ${getErrorMessage(error)}`);
      return {
        success: false,
        error: 'Failed to update task',
      };
    }
  }
);

export const deleteTaskFunction = new Tool(
  'delete_task',
  'Delete a task by name.',
  {
    name: z.string().describe('Task name to delete'),
  },
  async ({ name }, ctx) => {
    try {
      const tasks = (await ctx.storage.get<Task[]>('tasks')) ?? [];

      if (!tasks.some((task) => task.name === name)) {
        return {
          success: false,
          error: `Task with name "${name}" not found`,
        };
      }

      await ctx.storage.put(
        'tasks',
        tasks.filter((task) => task.name !== name)
      );

      return {
        success: true,
      };
    } catch (error) {
      await ctx.logger.error(`Error deleting task: ${getErrorMessage(error)}`);
      return {
        success: false,
        error: 'Failed to delete task',
      };
    }
  }
);

export const completeTaskFunction = new Tool(
  'complete_task',
  'Complete a task by name.',
  {
    name: z.string().describe('Task name to complete'),
  },
  async ({ name }, ctx) => {
    try {
      const tasks = (await ctx.storage.get<Task[]>('tasks')) ?? [];

      if (!tasks.some((task) => task.name === name)) {
        return {
          success: false,
          error: `Task with name "${name}" not found`,
        };
      }

      await ctx.storage.put(
        'tasks',
        tasks.filter((task) => task.name !== name)
      );

      return {
        success: true,
      };
    } catch (error) {
      await ctx.logger.error(
        `Error completing task: ${getErrorMessage(error)}`
      );
      return {
        success: false,
        error: 'Failed to complete task',
      };
    }
  }
);
