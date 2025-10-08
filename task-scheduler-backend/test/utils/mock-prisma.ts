import { TaskStatus, LogStatus } from '@prisma/client';

type Task = {
  id: string;
  name: string;
  schedule: string;
  channelId?: string;
  webhookUrl?: string;
  maxRetry: number;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
};

type TaskLog = {
  id: string;
  taskId: string;
  executionTime: Date;
  status: LogStatus;
  retryCount: number;
  message: string | null;
  createdAt: Date;
};

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createMockPrisma() {
  const store: { tasks: Task[]; logs: TaskLog[] } = { tasks: [], logs: [] };

  const task = {
    create: async ({ data }: { data: Partial<Task> }) => {
      const now = new Date();
      const newTask: Task = {
        id: uuid(),
        name: data.name as string,
        schedule: data.schedule as string,
        channelId: data.channelId,
        webhookUrl: data.webhookUrl,
        maxRetry: (data.maxRetry as number) ?? 3,
        status: (data.status as TaskStatus) ?? TaskStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };
      store.tasks.push(newTask);
      return newTask;
    },
    createMany: async ({ data }: { data: Partial<Task>[] }) => {
      const now = new Date();
      const created = data.map((d) => ({
        id: uuid(),
        name: d.name as string,
        schedule: d.schedule as string,
        channelId: d.channelId,
        webhookUrl: d.webhookUrl,
        maxRetry: (d.maxRetry as number) ?? 3,
        status: (d.status as TaskStatus) ?? TaskStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      }));
      store.tasks.push(...created);
      return { count: created.length } as any;
    },
    deleteMany: async () => {
      store.tasks = [];
      return { count: 0 };
    },
    findUnique: async ({ where, include }: any) => {
      const task = store.tasks.find((t) => t.id === where.id) || null;
      if (!task) return null;
      if (include?.logs) {
        let logs = store.logs.filter((l) => l.taskId === task.id);
        const { orderBy, take } = include.logs;
        if (orderBy?.executionTime === 'desc') {
          logs = logs.sort((a, b) => b.executionTime.getTime() - a.executionTime.getTime());
        }
        if (typeof take === 'number') {
          logs = logs.slice(0, take);
        }
        return { ...task, logs } as any;
      }
      return task as any;
    },
    findMany: async ({ where, skip = 0, take = 10, orderBy }: any = {}) => {
      let result = store.tasks.slice();
      if (where?.status) {
        result = result.filter((t) => t.status === where.status);
      }
      if (orderBy?.createdAt === 'desc') {
        result = result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return result.slice(skip, skip + take);
    },
    count: async ({ where }: any = {}) => {
      if (where?.status) {
        return store.tasks.filter((t) => t.status === where.status).length;
      }
      return store.tasks.length;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Task> }) => {
      const idx = store.tasks.findIndex((t) => t.id === where.id);
      if (idx === -1) throw new Error('No record found for update');
      const updated = { ...store.tasks[idx], ...data, updatedAt: new Date() };
      store.tasks[idx] = updated as Task;
      return store.tasks[idx];
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const idx = store.tasks.findIndex((t) => t.id === where.id);
      if (idx === -1) throw new Error('No record found for delete');
      const [removed] = store.tasks.splice(idx, 1);
      // Cascade delete logs for this task
      store.logs = store.logs.filter((l) => l.taskId !== removed.id);
      return removed;
    },
  };

  const taskLog = {
    create: async ({ data }: { data: Partial<TaskLog> }) => {
      const baseTime = (data.executionTime as Date) || new Date();
      const execTime = new Date(baseTime.getTime() + store.logs.length);
      const log: TaskLog = {
        id: uuid(),
        taskId: data.taskId as string,
        executionTime: execTime,
        status: data.status as LogStatus,
        retryCount: (data.retryCount as number) ?? 0,
        message: (data.message as string) ?? null,
        createdAt: new Date(),
      };
      store.logs.push(log);
      return log;
    },
    createMany: async ({ data }: { data: Partial<TaskLog>[] }) => {
      const created = data.map((d, idx) => {
        const baseTime = (d.executionTime as Date) || new Date();
        const execTime = new Date(baseTime.getTime() + store.logs.length + idx);
        return {
          id: uuid(),
          taskId: d.taskId as string,
          executionTime: execTime,
          status: d.status as LogStatus,
          retryCount: (d.retryCount as number) ?? 0,
          message: (d.message as string) ?? null,
          createdAt: new Date(),
        } as TaskLog;
      });
      store.logs.push(...created);
      return { count: created.length } as any;
    },
    findMany: async ({ where = {}, skip = 0, take = 20, orderBy, include }: any = {}) => {
      let result = store.logs.slice();

      if (where.taskId) {
        result = result.filter((l) => l.taskId === where.taskId);
      }

      if (where.status) {
        result = result.filter((l) => l.status === where.status);
      }

      if (where.executionTime) {
        const { gte, lte } = where.executionTime;
        if (gte) {
          const gteDate = new Date(gte);
          result = result.filter((l) => l.executionTime >= gteDate);
        }
        if (lte) {
          const lteDate = new Date(lte);
          result = result.filter((l) => l.executionTime <= lteDate);
        }
      }

      if (orderBy?.executionTime === 'desc') {
        result = result.sort((a, b) => b.executionTime.getTime() - a.executionTime.getTime());
      }

      result = result.slice(skip, skip + take);

      // Handle include.task.select.name
      if (include?.task?.select?.name) {
        return result.map((l) => ({
          ...l,
          task: {
            name: store.tasks.find((t) => t.id === l.taskId)?.name || 'Unknown',
          },
        }));
      }

      return result;
    },
    count: async ({ where = {} }: any = {}) => {
      let result = store.logs.slice();
      if (where.taskId) {
        result = result.filter((l) => l.taskId === where.taskId);
      }
      if (where.status) {
        result = result.filter((l) => l.status === where.status);
      }
      if (where.executionTime) {
        const { gte, lte } = where.executionTime;
        if (gte) {
          const gteDate = new Date(gte);
          result = result.filter((l) => l.executionTime >= gteDate);
        }
        if (lte) {
          const lteDate = new Date(lte);
          result = result.filter((l) => l.executionTime <= lteDate);
        }
      }
      return result.length;
    },
    deleteMany: async () => {
      store.logs = [];
      return { count: 0 };
    },
  };

  return {
    task,
    taskLog,
    $disconnect: async () => {},
  };
}