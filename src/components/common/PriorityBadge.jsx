import React from 'react';
import { Tag } from 'antd';
import { PRIORITY_COLORS } from '../../config/constants';

export const PriorityBadge = ({ priority }) => {
  const color = PRIORITY_COLORS[priority] || 'default';
  return <Tag color={color}>{priority || 'Low'}</Tag>;
};

export default PriorityBadge;