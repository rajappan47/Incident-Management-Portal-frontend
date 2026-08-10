import React, { useState, useEffect, useCallback } from 'react';
import { 
  Row, Col, Card, Typography, Button, Space, Select, Tag, 
  Descriptions, Spin, Tabs, App, Divider, Result 
} from 'antd';
import { ArrowLeftOutlined, UserSwitchOutlined, LockOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/common/AppLayout';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { SLABadge } from '../components/common/SLABadge';
import CommentSection from '../components/incidents/CommentSection';
import ActivityHistory from '../components/incidents/ActivityHistory';
import { useAuth } from '../hooks/useAuth';
import { STATUS_OPTIONS } from '../config/constants';
import api from '../services/api';

const { Title, Paragraph } = Typography;
const { Option } = Select;

// Standardized list of statuses that allow reassignment
const REASSIGNABLE_STATUSES = ['In Progress', 'InProgress', 'Hold On', 'On Hold'];
const ASSIGNABLE_STATUS_OPTIONS = STATUS_OPTIONS.filter(
  (st) => st.toLowerCase().trim() !== 'new'
);
// Standard 24-character hex Mongo ObjectId validator
const isValidMongoId = (str) => typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str);

const IncidentDetail = () => {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { message } = App.useApp();

  // Strip accidental trailing colons or line numbers (e.g. "65baf460...:1" -> "65baf460...")
  const id = rawId ? rawId.split(':')[0].trim() : '';

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [incident, setIncident] = useState(null);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [agents, setAgents] = useState([]);
  const [updating, setUpdating] = useState(false);

  // Derived user roles
  const normalizedRole = user?.role?.toLowerCase()?.trim();
  const isAdmin = normalizedRole === 'admin';
  const isSupportAgent = normalizedRole === 'support agent' || normalizedRole === 'agent';
  const isStaff = isAdmin || isSupportAgent;

  const fetchIncidentDetails = useCallback(async () => {
    if (!id || !isValidMongoId(id)) {
      message.error('Invalid Incident ID format');
      setLoading(false);
      return;
    }

    setLoading(true);
    setForbidden(false);

    try {
      const [incRes, commRes, actRes] = await Promise.all([
        api.get(`/incidents/${id}`),
        api.get(`/incidents/${id}/comments`).catch((err) => {
          console.warn('Comments fetch failed:', err?.response?.data || err.message);
          return { data: [] };
        }),
        api.get(`/incidents/${id}/activities`).catch((err) => {
          console.warn('Activities fetch failed:', err?.response?.data || err.message);
          return { data: [] };
        })
      ]);

      setIncident(incRes.data?.incident || incRes.data);
      setComments(commRes.data || []);
      setActivities(actRes.data || []);
    } catch (err) {
      console.error('Fetch Details Error:', err);
      if (err.response?.status === 403) {
        setForbidden(true);
      } else {
        message.error(err.response?.data?.message || 'Failed to load incident details');
      }
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  const fetchAgents = useCallback(async () => {
    try {
      let res;
      if (isSupportAgent) {
        res = await api.get('/incidents/team-members');
      } else {
        res = await api.get('/users/agents').catch(async () => await api.get('/users'));
      }

      const rawData = res.data?.data || res.data || [];
      const agentList = Array.isArray(rawData) ? rawData : [];

      setAgents(agentList);
    } catch (err) {
      console.error('Failed to fetch support agents:', err);
      setAgents([]);
    }
  }, [isSupportAgent]);

  useEffect(() => {
    if (id && isValidMongoId(id)) {
      fetchIncidentDetails();
      if (isStaff) {
        fetchAgents();
      }
    } else {
      setLoading(false);
    }
  }, [id, isStaff, fetchIncidentDetails, fetchAgents]);

  const handleStatusChange = async (newStatus) => {
    if (!newStatus) return;
    setUpdating(true);
    try {
      await api.patch(`/incidents/${id}/status`, { status: newStatus });
      message.success(`Status updated to ${newStatus}`);
      fetchIncidentDetails();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignAgent = async (agentId) => {
    setUpdating(true);
    try {
      await api.patch(`/incidents/${id}/assign`, { agentId: agentId || null });
      message.success('Agent assignment updated successfully');
      fetchIncidentDetails();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to assign agent');
    } finally {
      setUpdating(false);
    }
  };

  const handleReassignTeamMember = async (targetAgentId) => {
    if (!targetAgentId || !isValidMongoId(targetAgentId)) return;
    setUpdating(true);
    try {
      await api.put(`/incidents/${id}/reassign`, { targetAgentId });
      message.success('Incident successfully reassigned within team');
      fetchIncidentDetails();
    } catch (err) {
      console.error('Reassign Error:', err);
      message.error(err.response?.data?.message || 'Failed to reassign incident');
    } finally {
      setUpdating(false);
    }
  };

  const canReassignStatus = REASSIGNABLE_STATUSES.some(
    (st) => st.toLowerCase() === incident?.status?.toLowerCase()
  );

  const filteredSupportAgents = agents.filter((a) => {
    if (!a.role) return true;
    const role = a.role.toLowerCase().trim();
    return role === 'support agent' || role === 'agent';
  });

  if (loading) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Loading incident details..." />
        </div>
      </AppLayout>
    );
  }

  // Render 403 Forbidden Access Page
  if (forbidden) {
    return (
      <AppLayout>
        <Result
          status="403"
          icon={<LockOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />}
          title="Access Restricted"
          subTitle="Not authorized to view this incident. You can only view tickets assigned to you or your team."
          extra={
            <Button type="primary" onClick={() => navigate('/incidents')}>
              Back to My Incidents
            </Button>
          }
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* Header Bar */}
        <div>
          <Button 
            type="link" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/incidents')} 
            style={{ paddingLeft: 0 }}
          >
            Back to Incidents
          </Button>
          
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Space align="center" wrap>
                <Title level={2} style={{ margin: 0 }}>
                  {incident?.title || 'Untitled Incident'}
                </Title>
                <PriorityBadge priority={incident?.priority} />
                <SLABadge isOverdue={incident?.isOverdue} />
              </Space>
            </Col>
            
            {/* Action Controls for Staff */}
            {isStaff && (
              <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                <Space wrap>
                  
                  {/* Status Dropdown */}

                  <Select
                    placeholder="Update Status"
                    value={incident?.status}
                    onChange={(val) => handleStatusChange(val)}
                    loading={updating}
                    style={{ width: 140 }}
                  >
                    {ASSIGNABLE_STATUS_OPTIONS.map((st) => (   
                      <Option key={st} value={st}>{st}</Option>
                    ))}
                  </Select>

                  {/* Admin Direct Assign Dropdown */}

                  {isAdmin && canReassignStatus && (   
                    <Select
                      placeholder="Assign Agent"
                      value={incident?.assignedTo?._id || incident?.assignedTo?.id || undefined}
                      onChange={(val) => handleAssignAgent(val)}
                      loading={updating}
                      style={{ width: 180 }}
                      allowClear
                      notFoundContent="No support agents found"
                    >
                      {filteredSupportAgents.map((a) => (
                        <Option key={a._id || a.id} value={a._id || a.id}>
                          {a.name}
                        </Option>
                      ))}
                    </Select>
                  )}

                  {/* Reassign within Team (SUPPORT AGENTS ONLY) */}
                  {!isAdmin && isSupportAgent && canReassignStatus && (
                    <Select
                      placeholder="Reassign in Team"
                      suffixIcon={<UserSwitchOutlined />}
                      value={undefined}
                      onChange={(selectedAgentId) => {
                        if (selectedAgentId) {
                          handleReassignTeamMember(selectedAgentId);
                        }
                      }}
                      loading={updating}
                      style={{ width: 180 }}
                      allowClear
                      notFoundContent="No team members found"
                    >
                      {filteredSupportAgents.map((member) => (
                        <Option key={member._id || member.id} value={member._id || member.id}>
                          {member.name}
                        </Option>
                      ))}
                    </Select>
                  )}

                </Space>
              </Col>
            )}
          </Row>
        </div>

        {/* Main Details Grid */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card 
              title="Incident Description" 
              bordered={false} 
              style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
              <Paragraph style={{ fontSize: 16, whiteSpace: 'pre-line' }}>
                {incident?.description || 'No description provided.'}
              </Paragraph>

              <Divider />

              {/* Tabs for Comments and Activity Log */}
              <Tabs 
                defaultActiveKey="1"
                items={[
                  {
                    key: '1',
                    label: `Comments (${comments.length})`,
                    children: (
                      <CommentSection 
                        incidentId={id} 
                        comments={comments} 
                        onCommentAdded={fetchIncidentDetails}
                        userRole={user?.role} 
                      />
                    ),
                  },
                  {
                    key: '2',
                    label: `Audit History (${activities.length})`,
                    children: <ActivityHistory activities={activities} />,
                  },
                ]}
              />
            </Card>
          </Col>

          {/* Sidebar Meta Info */}
          <Col xs={24} lg={8}>
            <Card 
              title="Ticket Information" 
              bordered={false} 
              style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
              <Descriptions column={1} layout="vertical" size="small">
                <Descriptions.Item label="Status">
                  <Tag color="blue">{incident?.status || 'New'}</Tag>
                </Descriptions.Item>

                <Descriptions.Item label="Category">
                  {incident?.category?.name || 'Uncategorized'}
                </Descriptions.Item>

                <Descriptions.Item label="Reported By">
                  {incident?.reportedBy?.name 
                    ? `${incident.reportedBy.name} (${incident.reportedBy.email})` 
                    : 'Unknown User'}
                </Descriptions.Item>

                <Descriptions.Item label="Assigned Support Agent">
                  {incident?.assignedTo?.name 
                    ? `${incident.assignedTo.name} (${incident.assignedTo.email})` 
                    : 'Unassigned'}
                </Descriptions.Item>

                <Descriptions.Item label="Team">
                  <Tag color="geekblue">{incident?.assignedTo?.team || user?.team || 'Unassigned'}</Tag>
                </Descriptions.Item>

                <Descriptions.Item label="SLA Target Date">
                  {incident?.dueBy ? new Date(incident.dueBy).toLocaleString() : 'N/A'}
                </Descriptions.Item>

                <Descriptions.Item label="Created On">
                  {incident?.createdAt ? new Date(incident.createdAt).toLocaleString() : 'N/A'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

      </Space>
    </AppLayout>
  );
};

export default IncidentDetail;