import React from 'react';
import { Table, Tag, Button, Space, Tooltip } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PriorityBadge } from '../common/PriorityBadge';
import { SLABadge } from '../common/SLABadge';

const IncidentTable = ({ incidents, loading }) => {
  const navigate = useNavigate();

  const columns = [
    {
      title: 'Ticket Title',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Category',
      dataIndex: ['category', 'name'],
      key: 'category',
      render: (cat) => cat || 'N/A',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (p) => <PriorityBadge priority={p} />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => (
        <Tag color={s === 'New' ? 'blue' : s === 'In Progress' ? 'warning' : s === 'Resolved' ? 'success' : 'default'}>
          {s}
        </Tag>
      ),
    },
    {
      title: 'Assigned To',
      dataIndex: ['assignedTo', 'name'],
      key: 'assignedTo',
      render: (agent) => agent || <span style={{ color: '#8c8c8c' }}>Unassigned</span>,
    },
    {
      title: 'SLA Status',
      key: 'sla',
      render: (_, record) => <SLABadge isOverdue={record.isOverdue} />,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          icon={<EyeOutlined />}
          onClick={() => navigate(`/incidents/${record._id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Table
      rowKey="_id"
      columns={columns}
      dataSource={incidents}
      loading={loading}
      pagination={{ pageSize: 10, showSizeChanger: true }}
    />
  );
};

export default IncidentTable;