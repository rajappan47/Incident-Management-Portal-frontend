import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, List, Tag, Button, Select, Space, Spin, Empty, App,
  Typography, Popconfirm, Progress, Alert,
} from 'antd';
import {
  LinkOutlined, DisconnectOutlined, BulbOutlined, ApartmentOutlined, MinusCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const { Text } = Typography;
const { Option } = Select;

const RELATIONSHIP_TYPES = ['Related', 'Duplicate', 'Caused-By'];

const RELATIONSHIP_COLORS = {
  Related: 'blue',
  Duplicate: 'orange',
  'Caused-By': 'red',
  'Caused By': 'red',
  Causes: 'volcano',
};

/**
 * FR3-08 (Manual Incident Linking) + FR3-09 (Correlation Suggestions)
 *
 * Props:
 *  - incidentId: string
 *  - currentUser: from useAuth().user
 *  - onUpdated: optional callback fired after any change (link created/removed)
 */
const IncidentLinks = ({ incidentId, currentUser, onUpdated }) => {
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [loadingLinks, setLoadingLinks] = useState(true);
  const [links, setLinks] = useState([]);

  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [windowHours, setWindowHours] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(new Set()); // client-side only

  const [allIncidents, setAllIncidents] = useState([]);
  const [manualTargetId, setManualTargetId] = useState(null);
  const [manualRelationship, setManualRelationship] = useState('Related');
  const [linking, setLinking] = useState(false);

  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmRelationship, setConfirmRelationship] = useState('Related');

  // 🆕 FR3-11 — grouping state
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [group, setGroup] = useState({ isParentIncident: false, parent: null, children: [] });
  const [marking, setMarking] = useState(false);
  const [addChildTargetId, setAddChildTargetId] = useState(null);
  const [addingChild, setAddingChild] = useState(false);

  const normalizedRole = currentUser?.role?.toLowerCase()?.trim();
  const isAdmin = normalizedRole === 'admin';
  const isSupportAgent = normalizedRole === 'support agent' || normalizedRole === 'agent';
  const canLink = isAdmin || isSupportAgent; // FR3-08: not restricted to assigned agent
  const canUnlink = isAdmin; // permissions table: "unlink" is an Admin action

  const fetchLinks = useCallback(async () => {
    setLoadingLinks(true);
    try {
      const res = await api.get(`/incidents/${incidentId}/links`);
      setLinks(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load linked incidents');
    } finally {
      setLoadingLinks(false);
    }
  }, [incidentId, message]);

  const fetchSuggestions = useCallback(async () => {
    if (!canLink) {
      setLoadingSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const res = await api.get(`/incidents/${incidentId}/correlation-suggestions`);
      setSuggestions(res.data?.suggestions || []);
      setWindowHours(res.data?.windowHours ?? null);
    } catch (err) {
      console.warn('Failed to load correlation suggestions:', err.response?.data || err.message);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [incidentId, canLink]);

  const fetchIncidentsForManualLink = useCallback(async () => {
    if (!canLink) return;
    try {
      const res = await api.get('/incidents/All');
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAllIncidents(list.filter((i) => (i._id || i.id) !== incidentId));
    } catch (err) {
      console.warn('Failed to load incident list for manual linking:', err.response?.data || err.message);
    }
  }, [incidentId, canLink]);

  // 🆕 FR3-11 / FR3-12
  const fetchGroup = useCallback(async () => {
    setLoadingGroup(true);
    try {
      const res = await api.get(`/incidents/${incidentId}/group`);
      setGroup(res.data || { isParentIncident: false, parent: null, children: [] });
    } catch (err) {
      console.warn('Failed to load incident grouping:', err.response?.data || err.message);
    } finally {
      setLoadingGroup(false);
    }
  }, [incidentId]);

  useEffect(() => {
    if (incidentId) {
      fetchLinks();
      fetchSuggestions();
      fetchIncidentsForManualLink();
      fetchGroup(); // 🆕 FR3-11
    }
  }, [incidentId, fetchLinks, fetchSuggestions, fetchIncidentsForManualLink, fetchGroup]);

  const doCreateLink = async (toIncidentId, relationshipType) => {
    try {
      await api.post(`/incidents/${incidentId}/links`, { toIncidentId, relationshipType });
      message.success('Incidents linked successfully');
      await fetchLinks();
      await fetchSuggestions();
      onUpdated?.();
      return true;
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to create link');
      return false;
    }
  };

  const handleManualLink = async () => {
    if (!manualTargetId) {
      message.warning('Select an incident to link to');
      return;
    }
    setLinking(true);
    const ok = await doCreateLink(manualTargetId, manualRelationship);
    setLinking(false);
    if (ok) {
      setManualTargetId(null);
      setManualRelationship('Related');
    }
  };

  const handleConfirmSuggestion = async (suggestionIncidentId) => {
    setConfirmingId(suggestionIncidentId);
    const ok = await doCreateLink(suggestionIncidentId, confirmRelationship);
    setConfirmingId(null);
    if (ok) setConfirmRelationship('Related');
  };

  const handleDismissSuggestion = (suggestionIncidentId) => {
    // Client-side only — doesn't persist across sessions. FR3-09 only asks
    // that suggestions be surfaced, not that dismissals be remembered.
    setDismissedIds((prev) => new Set(prev).add(suggestionIncidentId));
  };

  const handleUnlink = async (linkId) => {
    try {
      await api.delete(`/incidents/${incidentId}/links/${linkId}`);
      message.success('Link removed');
      await fetchLinks();
      onUpdated?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to remove link');
    }
  };

  // 🆕 FR3-11 handlers
  const handleMarkMajor = async () => {
    setMarking(true);
    try {
      await api.patch(`/incidents/${incidentId}/mark-major`);
      message.success('Marked as major incident');
      await fetchGroup();
      onUpdated?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to mark as major incident');
    } finally {
      setMarking(false);
    }
  };

  const handleUnmarkMajor = async () => {
    setMarking(true);
    try {
      await api.patch(`/incidents/${incidentId}/unmark-major`);
      message.success('Unmarked as major incident');
      await fetchGroup();
      onUpdated?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to unmark major incident');
    } finally {
      setMarking(false);
    }
  };

  const handleAddChild = async () => {
    if (!addChildTargetId) {
      message.warning('Select an incident to add as a child');
      return;
    }
    setAddingChild(true);
    try {
      await api.post(`/incidents/${incidentId}/children`, { childIncidentId: addChildTargetId });
      message.success('Child incident added');
      setAddChildTargetId(null);
      await fetchGroup();
      onUpdated?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to add child incident');
    } finally {
      setAddingChild(false);
    }
  };

  const handleRemoveChild = async (childId) => {
    try {
      await api.delete(`/incidents/${incidentId}/children/${childId}`);
      message.success('Child incident removed');
      await fetchGroup();
      onUpdated?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to remove child incident');
    }
  };

  const visibleSuggestions = suggestions.filter(
    (s) => !dismissedIds.has(s.incident._id || s.incident.id)
  );

  return (
    <div>
      {/* ===================== FR3-09 — Correlation Suggestions ===================== */}
      {canLink && (
        <Card
          size="small"
          title={
            <Space>
              <BulbOutlined style={{ color: '#faad14' }} />
              Correlation Suggestions
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          {loadingSuggestions ? (
            <Spin size="small" />
          ) : visibleSuggestions.length === 0 ? (
            <Text type="secondary">
              No likely matches found{windowHours ? ` (same category, within ${windowHours}h)` : ''}.
            </Text>
          ) : (
            <List
              dataSource={visibleSuggestions}
              renderItem={(s) => {
                const otherId = s.incident._id || s.incident.id;
                return (
                  <List.Item
                    actions={[
                      <Select
                        key="rel"
                        size="small"
                        value={confirmingId === otherId ? confirmRelationship : undefined}
                        placeholder="Link as..."
                        style={{ width: 130 }}
                        onChange={(val) => {
                          setConfirmingId(otherId);
                          setConfirmRelationship(val);
                        }}
                      >
                        {RELATIONSHIP_TYPES.map((t) => (
                          <Option key={t} value={t}>{t}</Option>
                        ))}
                      </Select>,
                      <Button
                        key="confirm"
                        size="small"
                        type="primary"
                        loading={confirmingId === otherId}
                        onClick={() => handleConfirmSuggestion(otherId)}
                      >
                        Confirm
                      </Button>,
                      <Button key="dismiss" size="small" onClick={() => handleDismissSuggestion(otherId)}>
                        Dismiss
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <a onClick={() => navigate(`/incidents/${otherId}`)}>
                          {s.incident.title}
                        </a>
                      }
                      description={
                        <Space size="small" wrap>
                          <Tag>{s.incident.status}</Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>Same category</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Title match: {s.titleSimilarityPercent}%
                          </Text>
                          <Progress
                            percent={s.scorePercent}
                            size="small"
                            style={{ width: 80 }}
                            showInfo={false}
                          />
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </Card>
      )}

      {/* ===================== FR3-08 — Manual Linking ===================== */}
      {canLink && (
        <Card size="small" title="Link to Another Incident" style={{ marginBottom: 24 }}>
          <Space wrap>
            <Select
              showSearch
              placeholder="Search incidents by title..."
              style={{ width: 320 }}
              value={manualTargetId}
              onChange={setManualTargetId}
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {allIncidents.map((i) => (
                <Option key={i._id || i.id} value={i._id || i.id}>
                  {i.title} — {i.status}
                </Option>
              ))}
            </Select>
            <Select
              value={manualRelationship}
              onChange={setManualRelationship}
              style={{ width: 130 }}
            >
              {RELATIONSHIP_TYPES.map((t) => (
                <Option key={t} value={t}>{t}</Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<LinkOutlined />}
              loading={linking}
              onClick={handleManualLink}
            >
              Create Link
            </Button>
          </Space>
        </Card>
      )}

      {/* ===================== FR3-11 — Major Incident Grouping ===================== */}
      <Card
        size="small"
        title={
          <Space>
            <ApartmentOutlined />
            Major Incident Grouping
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {loadingGroup ? (
          <Spin size="small" />
        ) : group.parent ? (
          // This incident IS a child — show its parent, nothing else (flat hierarchy)
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">This incident is a child of:</Text>
            <Space>
              <Tag color="purple">Parent</Tag>
              <a onClick={() => navigate(`/incidents/${group.parent._id || group.parent.id}`)}>
                {group.parent.title}
              </a>
              <Tag>{group.parent.status}</Tag>
            </Space>
          </Space>
        ) : (
          // This incident is either a parent already, or eligible to become one
          <Space direction="vertical" style={{ width: '100%' }}>
            {!group.isParentIncident && canLink && (
              <Button
                icon={<ApartmentOutlined />}
                loading={marking}
                onClick={handleMarkMajor}
              >
                Mark as Major Incident
              </Button>
            )}

            {group.isParentIncident && (
              <>
                <Alert
                  type="info"
                  showIcon
                  message={`Major Incident — ${group.children.length} child incident(s) grouped under this one`}
                />

                {group.children.length > 0 ? (
                  <List
                    size="small"
                    dataSource={group.children}
                    renderItem={(child) => {
                      const childId = child._id || child.id;
                      return (
                        <List.Item
                          actions={
                            canUnlink
                              ? [
                                  <Button
                                    key="remove"
                                    size="small"
                                    danger
                                    icon={<MinusCircleOutlined />}
                                    onClick={() => handleRemoveChild(childId)}
                                  >
                                    Remove
                                  </Button>,
                                ]
                              : []
                          }
                        >
                          <List.Item.Meta
                            title={
                              <a onClick={() => navigate(`/incidents/${childId}`)}>{child.title}</a>
                            }
                            description={<Tag>{child.status}</Tag>}
                          />
                        </List.Item>
                      );
                    }}
                  />
                ) : (
                  <Text type="secondary">No child incidents yet.</Text>
                )}

                {canLink && (
                  <Space wrap>
                    <Select
                      showSearch
                      placeholder="Add a child incident..."
                      style={{ width: 280 }}
                      value={addChildTargetId}
                      onChange={setAddChildTargetId}
                      filterOption={(input, option) =>
                        (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {allIncidents
                        .filter((i) => !group.children.some((c) => (c._id || c.id) === (i._id || i.id)))
                        .map((i) => (
                          <Option key={i._id || i.id} value={i._id || i.id}>
                            {i.title} — {i.status}
                          </Option>
                        ))}
                    </Select>
                    <Button loading={addingChild} onClick={handleAddChild}>
                      Add Child
                    </Button>
                  </Space>
                )}

                {canUnlink && group.children.length === 0 && (
                  <Popconfirm
                    title="Unmark this as a major incident?"
                    onConfirm={handleUnmarkMajor}
                  >
                    <Button size="small">Unmark as Major Incident</Button>
                  </Popconfirm>
                )}
              </>
            )}

            {!group.isParentIncident && !canLink && (
              <Text type="secondary">Not currently part of a major incident group.</Text>
            )}
          </Space>
        )}
      </Card>

      {/* ===================== FR3-08 — Existing Links ===================== */}
      <Card size="small" title="Linked Incidents">
        {loadingLinks ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Spin tip="Loading linked incidents..." />
          </div>
        ) : links.length === 0 ? (
          <Empty description="No incidents linked yet." />
        ) : (
          <List
            dataSource={links}
            renderItem={(link) => {
              const otherId = link.otherIncident._id || link.otherIncident.id;
              return (
                <List.Item
                  actions={
                    canUnlink
                      ? [
                          <Popconfirm
                            key="unlink"
                            title="Remove this link?"
                            onConfirm={() => handleUnlink(link.linkId)}
                            okText="Remove"
                            okButtonProps={{ danger: true }}
                          >
                            <Button size="small" danger icon={<DisconnectOutlined />}>
                              Unlink
                            </Button>
                          </Popconfirm>,
                        ]
                      : []
                  }
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color={RELATIONSHIP_COLORS[link.relationshipType] || 'default'}>
                          {link.relationshipType}
                        </Tag>
                        <a onClick={() => navigate(`/incidents/${otherId}`)}>
                          {link.otherIncident.title}
                        </a>
                      </Space>
                    }
                    description={
                      <Space size="small" wrap>
                        <Tag>{link.otherIncident.status}</Tag>
                        {link.linkedBy?.name && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Linked by {link.linkedBy.name}
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default IncidentLinks;