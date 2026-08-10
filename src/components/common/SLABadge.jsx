import React from 'react';
import { Tag } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';

export const SLABadge = ({ isOverdue }) => {
  return isOverdue ? (
    <Tag icon={<ClockCircleOutlined />} color="error">
      Overdue
    </Tag>
  ) : (
    <Tag icon={<CheckCircleOutlined />} color="success">
      On Time
    </Tag>
  );
};

export default SLABadge;