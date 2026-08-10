import React from 'react';
import { Timeline, Typography, Tag, Space } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const ActivityHistory = ({ activities }) => {
  return (
    <Timeline mode="left" style={{ marginTop: 16 }}>
      {(activities || []).map((act, index) => (
        <Timeline.Item 
          key={act._id || index}
          dot={<ClockCircleOutlined style={{ fontSize: 16 }} />}
          color="blue"
        >
          <div>
            <Text strong>{act.action}</Text> by{' '}
            <Text type="secondary">{act.performedBy?.name || 'System'}</Text>
          </div>
          {(act.oldValue || act.newValue) && (
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Changed from <Tag color="default">{act.oldValue}</Tag> to <Tag color="processing">{act.newValue}</Tag>
            </div>
          )}
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
            {new Date(act.timestamp || act.createdAt).toLocaleString()}
          </div>
        </Timeline.Item>
      ))}
    </Timeline>
  );
};

export default ActivityHistory;