import { formatDatetime } from '../../../utils/datetime';

import type { Knowledge } from '../../types';
import type { FC } from 'hono/jsx';

export const KnowledgeList: FC<{
  id: string;
  knowledges: Knowledge[];
}> = async ({ id: _id, knowledges }) => {
  if (knowledges.length === 0) {
    return <p className="muted small">No knowledge stored.</p>;
  }

  const getCategoryColor = (category: string): string => {
    const colors = {
      fact: '#22c55e',
      experience: '#3b82f6',
      insight: '#8b5cf6',
      pattern: '#f59e0b',
      other: '#6b7280',
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  return (
    <div className="list">
      {knowledges.map(
        async ({ content, category, tags, accessCount, lastAccessedAt }, i) => (
          <article
            className="item"
            key={`knowledge-${i}`}
            id={`knowledge-${i}`}
          >
            <div>
              <div
                className="small muted"
                style={{
                  marginBottom: '6px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                <span
                  className="pill small"
                  style={{
                    backgroundColor: getCategoryColor(category),
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    fontSize: '10px',
                  }}
                >
                  {category}
                </span>
                {tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {tags.map(async (tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="pill small muted"
                        style={{
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontSize: '10px',
                          backgroundColor: '#f3f4f6',
                          color: '#6b7280',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div
                className="small"
                style={{ marginBottom: '6px', lineHeight: '1.4' }}
              >
                {content}
              </div>
              <div
                className="small muted mono"
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <span>accessed {accessCount} times</span>
                <span>{formatDatetime(new Date(lastAccessedAt))}</span>
              </div>
            </div>
          </article>
        )
      )}
    </div>
  );
};
