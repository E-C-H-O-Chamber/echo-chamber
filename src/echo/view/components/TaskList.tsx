import { formatDatetime } from '../../../utils/datetime';

import type { Task } from '../../types';
import type { FC } from 'hono/jsx';

export const TaskList: FC<{ id: string; tasks: Task[] }> = async ({
  id,
  tasks,
}) => {
  if (tasks.length === 0) {
    return <p className="muted small">No tasks scheduled.</p>;
  }
  return (
    <div className="list">
      {tasks.map(async ({ name, content, execution_time }, i) => (
        <article className="item" key={`task-${i}`} id={`task-${i}`}>
          <div>
            <h3>{name}</h3>
            <div className="small muted mono">
              {formatDatetime(new Date(execution_time))}
            </div>
            <div className="small" style={{ marginTop: '6px' }}>
              {content}
            </div>
          </div>
          <button
            className="btn btn-danger"
            hx-delete={`/${id}/tasks/`}
            hx-vals={`{"name": "${name}"}`}
            hx-confirm={`Delete task "${name}"?`}
            hx-target={`#task-${i}`}
            hx-swap="delete"
          >
            削除
          </button>
        </article>
      ))}
    </div>
  );
};
