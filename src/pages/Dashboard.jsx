import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Statistic, Table, Tag, Typography, 
  Spin, Space, Button, Tabs 
} from 'antd';
import { 
  AlertOutlined, 
  SyncOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  PlusOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/common/AppLayout';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { PriorityBadge } from '../components/common/PriorityBadge';

const { Title, Text } = Typography;

const STATUS_COLORS = {
  New: '#1890ff',
  'In Progress': '#faad14',
  'On Hold': '#d9d9d9',
  Resolved: '#52c41a',
  Closed: '#8c8c8c',
};

// Case-insensitive map to give each priority level a weight
const getPriorityRank = (priorityStr) => {
  if (!priorityStr) return 99;
  const p = String(priorityStr).trim().toLowerCase();
  switch (p) {
    case 'critical': return 1;
    case 'high':     return 2;
    case 'medium':   return 3;
    case 'low':      return 4;
    default:         return 99;
  }
};

//Helper function to check if a ticket is closed
const isClosedOrResolved = (statusStr) => {
  if (!statusStr) return false;
  const s = String(statusStr).trim().toLowerCase();
  return s === 'closed' || s === 'resolved';
};

const checkIsOverdue = (record) => {
  if (!record?.dueBy) return false;
  if (isClosedOrResolved(record.status)) return false;
    return new Date() > new Date(record.dueBy);
  };

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    overdue: 0,
  });
  const [statusChartData, setStatusChartData] = useState([]);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [closedIncidents, setClosedIncidents] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/incidents');
      // Ensure totalList is always an array
      const totalList = Array.isArray(response?.data) ? response.data : [];

      // 1. Separate Active vs Closed/Resolved
      const activeList = totalList.filter(item => !isClosedOrResolved(item.status));
      const closedList = totalList.filter(item => isClosedOrResolved(item.status));

      // 2. Sort Active Tickets by Priority (Critical -> High -> Medium -> Low)
      activeList.sort((a, b) => {
        const rankA = getPriorityRank(a.priority);
        const rankB = getPriorityRank(b.priority);

        if (rankA === rankB) {
          // Newest tickets first if priorities match
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        return rankA - rankB;
      });

      // 3. Sort Closed Tickets by Newest First
      closedList.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

      // 4. Calculate Stats
      const openCount = totalList.filter(i => String(i.status).toLowerCase() === 'new').length;
      const inProgressCount = totalList.filter(i => String(i.status).toLowerCase() === 'in progress').length;
      const resolvedCount = closedList.length;
      //const overdueCount = totalList.filter(i => i.isOverdue).length;
      const overdueCount = totalList.filter(checkIsOverdue).length;

      setStats({
        total: totalList.length,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        overdue: overdueCount,
      });

      // 5. Chart Data
      setStatusChartData([
        { name: 'New', value: openCount },
        { name: 'In Progress', value: inProgressCount },
        { name: 'Resolved / Closed', value: resolvedCount },
      ]);

      setActiveIncidents(activeList);
      setClosedIncidents(closedList);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const incidentColumns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <Text strong>{text || 'Untitled'}</Text>,
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
      render: (s) => {
        const status = String(s || '').toLowerCase();
        let color = 'default';
        if (status === 'new') color = 'blue';
        else if (status === 'in progress') color = 'warning';
        else if (status === 'resolved' || status === 'closed') color = 'success';

        return <Tag color={color}>{s}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/incidents/${record._id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header Section */}
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              Welcome back, {user?.name} 👋
            </Title>
            <Text type="secondary">
              Role: <Tag color="geekblue">{user?.role}</Tag> | Overview of operational incidents and service tickets.
            </Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => navigate('/incidents/new')}
            >
              Raise New Incident
            </Button>
          </Col>
        </Row>

        {/* Statistic Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable borderless style={{ background: '#e6f7ff', borderRadius: 8 }}>
              <Statistic
                title={<Text type="secondary">Total Incidents</Text>}
                value={stats.total}
                prefix={<AlertOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable borderless style={{ background: '#fffbe6', borderRadius: 8 }}>
              <Statistic
                title={<Text type="secondary">In Progress</Text>}
                value={stats.inProgress}
                prefix={<SyncOutlined spin style={{ color: '#faad14' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable borderless style={{ background: '#f6ffed', borderRadius: 8 }}>
              <Statistic
                title={<Text type="secondary">Resolved / Closed</Text>}
                value={stats.resolved}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable borderless style={{ background: '#fff1f0', borderRadius: 8 }}>
              <Statistic
                title={<Text type="secondary">SLA Overdue</Text>}
                value={stats.overdue}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Charts & Separate Ticket Tables */}
        <Row gutter={[16, 16]}>
          {/* Chart */}
          <Col xs={24} lg={9}>
            <Card title="Incident Status Distribution" style={{ borderRadius: 8, height: '100%' }}>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill={STATUS_COLORS['New']} />
                      <Cell fill={STATUS_COLORS['In Progress']} />
                      <Cell fill={STATUS_COLORS['Resolved']} />
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          {/* Active Priority Queue vs Closed Queue */}
          <Col xs={24} lg={15}>
            <Card style={{ borderRadius: 8, height: '100%' }}>
              <Tabs
                defaultActiveKey="active"
                extra={
                  <Button type="link" onClick={() => navigate('/incidents')}>
                    View All
                  </Button>
                }
                items={[
                  {
                    key: 'active',
                    label: `Active Queue (${activeIncidents.length})`,
                    children: (
                      <Table
                        rowKey="_id"
                        columns={incidentColumns}
                        dataSource={activeIncidents.slice(0, 8)}
                        pagination={false}
                        size="small"
                      />
                    ),
                  },
                  {
                    key: 'closed',
                    label: `Closed / Resolved (${closedIncidents.length})`,
                    children: (
                      <Table
                        rowKey="_id"
                        columns={incidentColumns}
                        dataSource={closedIncidents.slice(0, 8)}
                        pagination={false}
                        size="small"
                      />
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Space>
    </AppLayout>
  );
};

export default Dashboard;