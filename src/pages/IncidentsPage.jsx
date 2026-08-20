import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, Tag, Typography, Button, Card, Input, Select, 
  Tabs, Spin, message, Row, Col, Flex, Alert 
} from 'antd';
import { 
  PlusOutlined, SearchOutlined, ReloadOutlined, EyeOutlined, 
  CheckCircleOutlined, DownloadOutlined, ClockCircleOutlined 
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom'; // 🆕 V3 — FR3-18 (useSearchParams)
import AppLayout from '../components/common/AppLayout';
import api from '../services/api';
import * as PriorityModule from '../components/common/PriorityBadge';
import { useAuth } from '../hooks/useAuth';

const { Title, Text } = Typography;
const { Option } = Select;

// Safely extract PriorityBadge component
const PriorityBadge = PriorityModule.PriorityBadge || PriorityModule.default || (({ priority }) => <Tag>{priority || 'Low'}</Tag>);

// Helper function to map priority string to rank
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

// Helper function to check if ticket status is closed/resolved
const isClosedOrResolved = (statusStr) => {
  if (!statusStr) return false;
  const s = String(statusStr).trim().toLowerCase();
  return s === 'closed' || s === 'resolved';
};

// Helper function to calculate SLA breach
const checkIsOverdue = (record) => {
  if (!record?.dueBy) return false;
  if (isClosedOrResolved(record.status)) return false;
  return new Date() > new Date(record.dueBy);
};

const Incidents = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams(); // 🆕 V3 — FR3-18
  const authContext = useAuth() || {};
  const user = authContext.user;
  
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [unrestrictedIncidents, setUnrestrictedIncidents] = useState([]);
  const [agents, setAgents] = useState([]);
  const [assigningId, setAssigningId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  
  // Search & Filter States
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // 🆕 V3 — FR3-18: drill-down filters, arriving via URL query params from
  // dashboard widgets (Agent/Team Performance, Top Root Causes, etc.)
  const [selectedAgent, setSelectedAgent] = useState(searchParams.get('assignedAgent') || null);
  const [selectedTeam, setSelectedTeam] = useState(searchParams.get('team') || null);
  const [activeRcaCategory, setActiveRcaCategory] = useState(searchParams.get('rcaCategory') || null);

  // User details
  const normalizedRole = user?.role?.toLowerCase()?.trim();
  const isAdmin = normalizedRole === 'admin';
  const currentUserId = user?._id || user?.id;

  // Fetch Support Agents for Inline Assign Dropdown
  const fetchAgents = useCallback(async () => {
    try {
      let res;
      try {
        res = await api.get('/users/agents');
      } catch (err) {
        res = await api.get('/users');
      }

      const rawData = res?.data?.data || res?.data || [];
      const agentList = Array.isArray(rawData) ? rawData : [];

      const filtered = agentList.filter((u) => {
        const r = u?.role?.toLowerCase()?.trim();
        return r === 'support agent' || r === 'agent';
      });

      setAgents(filtered);
    } catch (err) {
      console.warn('Failed to fetch agents:', err);
    }
  }, []);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setApiError(null);

    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 4000);

    try {
      let response;
      // 🆕 V3 — FR3-18: forward rcaCategory when drilling down from the Top
      // Root Causes widget — this can't be filtered client-side like the
      // other dropdowns, since RCA category isn't a field on the incident
      // objects this endpoint already returns.
      const baseQuery = 'all=true&scope=all';
      const queryString = activeRcaCategory
        ? `${baseQuery}&rcaCategory=${encodeURIComponent(activeRcaCategory)}`
        : baseQuery;

      // Fetching with all=true and scope=all to bypass backend user-specific filters
      try {
        response = await api.get(`/incidents?${queryString}`);
      } catch (err) {
        response = await api.get('/incidents');
      }
      
      const rawData = response?.data;
      let totalList = [];

      if (Array.isArray(rawData)) {
        totalList = rawData;
      } else if (Array.isArray(rawData?.data)) {
        totalList = rawData.data;
      } else if (Array.isArray(rawData?.incidents)) {
        totalList = rawData.incidents;
      } else if (Array.isArray(rawData?.incident)) {
        totalList = rawData.incident;
      }

      // Sort by Priority
      totalList.sort((a, b) => {
        const rankA = getPriorityRank(a?.priority);
        const rankB = getPriorityRank(b?.priority);
        if (rankA === rankB) {
          return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
        }
        return rankA - rankB;
      });

      setUnrestrictedIncidents(totalList);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
      setApiError(err?.response?.data?.message || err?.message || 'Failed to connect to backend server');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [activeRcaCategory]);

  useEffect(() => {
    fetchIncidents();
    if (isAdmin) {
      fetchAgents();
    }
  }, [fetchIncidents, fetchAgents, isAdmin]);

  const handleAssignAgent = async (incidentId, agentId) => {
    if (!incidentId) return;
    setAssigningId(incidentId);
    try {
      await api.patch(`/incidents/${incidentId}/assign`, { agentId: agentId || null });
      message.success('Agent assigned successfully');
      fetchIncidents();
    } catch (err) {
      console.error('Assign error:', err);
      message.error(err.response?.data?.message || 'Failed to assign agent');
    } finally {
      setAssigningId(null);
    }
  };

  const handleStatusChange = async (incidentId, newStatus) => {
    if (!incidentId) return;
    setAssigningId(incidentId); // reuse same loading flag, or add a separate one if you prefer
    try {
      await api.patch(`/incidents/${incidentId}/status`, { status: newStatus });
      message.success('Status updated successfully');
      fetchIncidents();
    } catch (err) {
      console.error('Status update error:', err);
      message.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setAssigningId(null);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const queryParams = { all: true };
      if (searchText) queryParams.search = searchText;
      if (selectedStatus) queryParams.status = selectedStatus;
      if (selectedPriority) queryParams.priority = selectedPriority;
      if (selectedCategory) queryParams.category = selectedCategory;

      const response = await api.get('/incidents/export/csv', {
        params: queryParams,
        responseType: 'blob',
      });

      let fileName = `incidents_export_${new Date().toISOString().slice(0, 10)}.csv`;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) fileName = match[1];
      }

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      message.success('Incidents report exported successfully!');
    } catch (err) {
      console.error('Failed to export CSV:', err);
      message.error('Failed to export CSV report');
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchText('');
    setSelectedStatus(null);
    setSelectedPriority(null);
    setSelectedCategory(null);
    // 🆕 V3 — FR3-18
    setSelectedAgent(null);
    setSelectedTeam(null);
    setActiveRcaCategory(null);
    setSearchParams({});
  };

  // Helper: Checks if ticket is assigned to the current user
  const isAssignedToMe = (item) => {
    if (!item?.assignedTo) return false;
    const assignedId = typeof item.assignedTo === 'object' 
      ? (item.assignedTo._id || item.assignedTo.id) 
      : item.assignedTo;
    return String(assignedId) === String(currentUserId);
  };

  // Main Filter Logic
  const applyFilters = (list = [], tab) => {
    return list.filter((item) => {
      if (!item) return false;

      // 1. TAB LEVEL FILTERING
      if (tab === 'active') {
        // "My Active Tickets" tab: Only open tickets assigned to ME
        if (isClosedOrResolved(item.status)) return false;
        if (!isAssignedToMe(item)) return false;
      } else if (tab === 'closed') {
        // "Closed / Resolved" tab: Only closed or resolved tickets
        if (!isClosedOrResolved(item.status)) return false;
      }
      // Note: tab === 'all' has NO user-level filtering so it shows EVERY support agent's tickets.

      // 2. SEARCH & DROPDOWN FILTERS
      const titleText = item.title ? String(item.title).toLowerCase() : '';
      const matchesTitle = !searchText || titleText.includes(searchText.toLowerCase());
      const matchesStatus = !selectedStatus || item.status === selectedStatus;
      const matchesPriority = !selectedPriority || item.priority === selectedPriority;
      
      const catName = typeof item.category === 'object' ? item.category?.name : item.category;
      const matchesCategory = !selectedCategory || catName === selectedCategory;

      // 🆕 V3 — FR3-18: drill-down filters from dashboard widgets. Applied
      // client-side since assignedTo (id + team) is already present on every
      // incident object returned by the existing fetch — no backend change
      // needed for these two, unlike rcaCategory above.
      const agentId = typeof item.assignedTo === 'object' ? (item.assignedTo?._id || item.assignedTo?.id) : item.assignedTo;
      const matchesAgent = !selectedAgent || String(agentId) === String(selectedAgent);
      const matchesTeam = !selectedTeam || item.assignedTo?.team === selectedTeam;

      return matchesTitle && matchesStatus && matchesPriority && matchesCategory && matchesAgent && matchesTeam;
    });
  };

  const columns = [
    {
      title: 'Ticket Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => {
        const ticketId = record?._id || record?.id;
        return (
          <Text 
            strong 
            style={{ cursor: 'pointer', color: '#1890ff' }}
            onClick={() => ticketId && navigate(`/incidents/${ticketId}`)}
          >
            {text || 'Untitled'}
          </Text>
        );
      },
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => {
        if (!cat) return 'N/A';
        return typeof cat === 'object' ? (cat.name || 'N/A') : String(cat);
      },
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
      render: (s, record) => {
        const status = String(s || '').toLowerCase();
        let color = 'default';
        if (status === 'new') color = 'blue';
        else if (status === 'in progress') color = 'warning';
        else if (status === 'on hold') color = 'default';
        else if (status === 'resolved' || status === 'closed') color = 'success';

        if (isAdmin) {
          const incidentId = record?._id || record?.id;
          return (
            <Select
              value={s || undefined}
              onChange={(value) => handleStatusChange(incidentId, value)}
              loading={assigningId === incidentId}
              style={{ width: 140 }}
              size="small"
              options={[
                { label: 'In Progress', value: 'In Progress' },
                { label: 'On Hold', value: 'On Hold' },
                { label: 'Resolved', value: 'Resolved' },
                { label: 'Closed', value: 'Closed' },
              ]}
            />
          );
        }

        return <Tag color={color}>{s || 'New'}</Tag>;
      },
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: (assignedTo, record) => {
        const incidentId = record?._id || record?.id;
        const currentAgentId = typeof assignedTo === 'object' 
          ? (assignedTo?._id || assignedTo?.id) 
          : (typeof assignedTo === 'string' ? assignedTo : undefined);

        const statusLower = String(record?.status || '').trim().toLowerCase();
        const canAssign = statusLower === 'in progress' || statusLower === 'on hold';

        if (isAdmin && canAssign) {
          return (
            <Select
              placeholder="Assign Agent"
              value={currentAgentId || undefined}
              onChange={(value) => handleAssignAgent(incidentId, value)}
              loading={assigningId === incidentId}
              style={{ width: 160 }}
              allowClear
              size="small"
            >
              {agents.map((agent) => {
                const aId = agent?._id || agent?.id;
                return (
                  <Option key={aId} value={aId}>
                    {agent?.name || 'Unknown Agent'}
                  </Option>
                );
              })}
            </Select>
          );
        }

        // Not assignable at this status (New / Resolved / Closed) — show plain text only
        return assignedTo?.name ? (
          <Text>{assignedTo.name}</Text>
        ) : (
          <Text type="secondary">Unassigned</Text>
        );
      },
    },
    {
      title: 'SLA Status',
      key: 'slaStatus',
      render: (_, record) => {
        const overdue = checkIsOverdue(record);
        return (
          <Tag 
            color={overdue ? 'error' : 'success'} 
            icon={overdue ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
          >
            {overdue ? 'Overdue' : 'On Time'}
          </Tag>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => {
        const ticketId = record?._id || record?.id;
        return (
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => ticketId && navigate(`/incidents/${ticketId}`)}
          >
            View
          </Button>
        );
      },
    },
  ];

  const allTickets = applyFilters(unrestrictedIncidents, 'all');
  const activeTickets = applyFilters(unrestrictedIncidents, 'active');
  const closedTickets = applyFilters(unrestrictedIncidents, 'closed');

  return (
    <AppLayout>
      <Flex vertical gap="large" style={{ width: '100%' }}>
        
        {/* Header Section */}
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Title level={2} style={{ margin: 0 }}>
              Incidents Management
            </Title>
            <Text type="secondary">View and manage all system support tickets across the team</Text>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Flex gap="small" justify="end" wrap="wrap">
              <Button
                type="default"
                icon={<DownloadOutlined />}
                loading={exporting}
                onClick={handleExportCSV}
              >
                Export CSV
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/incidents/new')}
              >
                Raise New Incident
              </Button>
            </Flex>
          </Col>
        </Row>

        {apiError && (
          <Alert 
            message="Connection Notice" 
            description={apiError} 
            type="warning" 
            showIcon 
            action={
              <Button size="small" onClick={fetchIncidents}>
                Retry
              </Button>
            }
          />
        )}

        {/* 🆕 V3 — FR3-18: drill-down filter banner */}
        {(selectedAgent || selectedTeam || activeRcaCategory) && (
          <Alert
            type="info"
            showIcon
            message={
              activeRcaCategory
                ? `Filtered by root cause: ${activeRcaCategory}`
                : selectedTeam
                ? `Filtered by team: ${selectedTeam}`
                : `Filtered by agent`
            }
            action={
              <Button size="small" onClick={handleResetFilters}>
                Clear Filter
              </Button>
            }
          />
        )}

        {/* Filter Controls Card */}
        <Card style={{ borderRadius: 8 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Input
                placeholder="Search by title..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: '100%' }}
                allowClear
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="Status"
                allowClear
                value={selectedStatus}
                onChange={(val) => setSelectedStatus(val)}
                style={{ width: '100%' }}
                options={[
                  { label: 'New', value: 'New' },
                  { label: 'In Progress', value: 'In Progress' },
                  { label: 'On Hold', value: 'On Hold' },
                  { label: 'Resolved', value: 'Resolved' },
                  { label: 'Closed', value: 'Closed' },
                ]}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="Priority"
                allowClear
                value={selectedPriority}
                onChange={(val) => setSelectedPriority(val)}
                style={{ width: '100%' }}
                options={[
                  { label: 'Critical', value: 'Critical' },
                  { label: 'High', value: 'High' },
                  { label: 'Medium', value: 'Medium' },
                  { label: 'Low', value: 'Low' },
                ]}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="Category"
                allowClear
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val)}
                style={{ width: '100%' }}
                options={[
                  { label: 'Network', value: 'Network' },
                  { label: 'Hardware', value: 'Hardware' },
                  { label: 'Software', value: 'Software' },
                ]}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Button icon={<ReloadOutlined />} onClick={handleResetFilters} style={{ width: '100%' }}>
                Reset
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Table & Tabs Container */}
        <Card style={{ borderRadius: 8 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <Spin size="large" tip="Loading incidents..." />
            </div>
          ) : (
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key)}
              items={[
                {
                  key: 'all',
                  label: `All Tickets (${allTickets.length})`,
                  children: (
                    <Table
                      rowKey={(record) => record?._id || record?.id || Math.random()}
                      columns={columns}
                      dataSource={allTickets}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 800 }}
                    />
                  ),
                },
                {
                  key: 'active',
                  label: `My Active Tickets (${activeTickets.length})`,
                  children: (
                    <Table
                      rowKey={(record) => record?._id || record?.id || Math.random()}
                      columns={columns}
                      dataSource={activeTickets}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 800 }}
                    />
                  ),
                },
                {
                  key: 'closed',
                  label: `Closed / Resolved (${closedTickets.length})`,
                  children: (
                    <Table
                      rowKey={(record) => record?._id || record?.id || Math.random()}
                      columns={columns}
                      dataSource={closedTickets}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 800 }}
                    />
                  ),
                },
              ]}
            />
          )}
        </Card>

      </Flex>
    </AppLayout>
  );
};

export default Incidents;