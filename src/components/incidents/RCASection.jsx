import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Descriptions, Tag, Button, Form, Select, Input,
  Space, Spin, Empty, Modal, App, Typography,
} from 'antd';
import {
  EditOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import api from '../../services/api';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;
const { Option } = Select;

// 🔧 Keep this in sync with backend/models/RCA.js RCA_CATEGORIES
const RCA_CATEGORIES = [
  'Human Error',
  'Process Gap',
  'System / Technical Failure',
  'Configuration Error',
  'Third-Party / Vendor Issue',
  'Documentation Gap',
  'Capacity / Performance',
  'Other',
];

const STATUS_COLORS = {
  Draft: 'default',
  'In Review': 'processing',
  Approved: 'success',
};

/**
 * FR3-01 (RCA Record) + FR3-02 (Draft -> In Review -> Approved workflow)
 *
 * Props:
 *  - incidentId: string
 *  - incident: the incident object already loaded by the parent page
 *               (needs .status, .priority, .assignedTo)
 *  - currentUser: from useAuth().user
 *  - onUpdated: optional callback, called after any RCA change so the parent
 *               can refresh the incident (e.g. IncidentDetail's fetchIncidentDetails)
 */
const RCASection = ({ incidentId, incident, currentUser, onUpdated, onRCALoaded }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [rca, setRca] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const normalizedRole = currentUser?.role?.toLowerCase()?.trim();
  const isAdmin = normalizedRole === 'admin';
  const isSupportAgent = normalizedRole === 'support agent' || normalizedRole === 'agent';
  const isEndUser = normalizedRole === 'end user' || normalizedRole === 'customer';

  const currentUserId = currentUser?._id || currentUser?.id;
  const assignedAgentId =
    incident?.assignedTo?._id || incident?.assignedTo?.id || incident?.assignedTo;
  const isAssignedAgent =
    isSupportAgent && assignedAgentId && String(assignedAgentId) === String(currentUserId);

  // Per permissions table: only the Support Agent assigned to this incident
  // may author an RCA. Admin's RCA role is approve/reject only.
  const canAuthor = isAssignedAgent;
  const canApproveReject = isAdmin;

  const fetchRCA = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await api.get(`/incidents/${incidentId}/rca`);
      setRca(res.data);
      onRCALoaded?.(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setRca(null);
        setNotFound(true);
        onRCALoaded?.(null);
      } else {
        message.error(err.response?.data?.message || 'Failed to load RCA record');
      }
    } finally {
      setLoading(false);
    }
  }, [incidentId, message, onRCALoaded]);

  useEffect(() => {
    if (incidentId) fetchRCA();
  }, [incidentId, fetchRCA]);

  const openCreateOrEditForm = () => {
    form.setFieldsValue({
      category: rca?.category,
      fiveWhys: {
        why1: rca?.fiveWhys?.why1,
        why2: rca?.fiveWhys?.why2,
        why3: rca?.fiveWhys?.why3,
        why4: rca?.fiveWhys?.why4,
        why5: rca?.fiveWhys?.why5,
      },
      description: rca?.description,
      contributingFactors: rca?.contributingFactors,
      correctiveActions: rca?.correctiveActions,
      preventiveActions: rca?.preventiveActions,
    });
    setEditing(true);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      if (rca) {
        await api.put(`/incidents/${incidentId}/rca`, values);
        message.success('RCA draft updated');
      } else {
        await api.post(`/incidents/${incidentId}/rca`, values);
        message.success('RCA record created');
      }
      setEditing(false);
      form.resetFields();
      await fetchRCA();
      onUpdated?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to save RCA record');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    setSaving(true);
    try {
      await api.patch(`/incidents/${incidentId}/rca/submit`);
      message.success('RCA submitted for review');
      await fetchRCA();
      onUpdated?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to submit RCA');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await api.patch(`/incidents/${incidentId}/rca/approve`);
      message.success('RCA approved');
      await fetchRCA();
      onUpdated?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to approve RCA');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectComments.trim()) {
      message.warning('Comments are required to send an RCA back for revision');
      return;
    }
    setRejecting(true);
    try {
      await api.patch(`/incidents/${incidentId}/rca/reject`, { comments: rejectComments });
      message.success('RCA sent back for revision');
      setRejectModalOpen(false);
      setRejectComments('');
      await fetchRCA();
      onUpdated?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to send RCA back');
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin tip="Loading RCA record..." />
      </div>
    );
  }

  // 🆕 FR3-07 — End User sees the RCA summary read-only, but only once the
  // RCA itself is Approved — not merely once the incident is Resolved/Closed.
  // An incident can be Resolved while its RCA is still Draft/In Review.
  if (isEndUser) {
    if (!rca || rca.status !== 'Approved') {
      return (
        <Empty description="Root cause analysis becomes available here once it has been approved." />
      );
    }
    // else: rca exists and is Approved — fall through to the read-only summary below.
  }

  // No RCA exists yet for this incident
  if (notFound && !editing) {
    if (!canAuthor) {
      return <Empty description="No RCA record has been created for this incident yet." />;
    }
    return (
      <Empty description="No RCA record yet for this incident.">
        <Button type="primary" icon={<EditOutlined />} onClick={openCreateOrEditForm}>
          Create RCA Record
        </Button>
      </Empty>
    );
  }

  // Create / edit form (Draft only — enforced again server-side)
  if (editing) {
    return (
      <Form form={form} layout="vertical" onFinish={handleSave} style={{ maxWidth: 640 }}>
        <Form.Item
          name="category"
          label="Root Cause Category"
          rules={[{ required: true, message: 'Please select a category' }]}
        >
          <Select placeholder="Select a category">
            {RCA_CATEGORIES.map((c) => (
              <Option key={c} value={c}>{c}</Option>
            ))}
          </Select>
        </Form.Item>

        {/* 🆕 FR3-04 — Guided 5-Whys template: structured prompts instead of
            a single free-text box. Why 1 is required (matches the backend
            validator); Why 2-5 unlock progressively as each prior one is
            answered, nudging the author to actually dig deeper rather than
            stopping at the surface-level cause. */}
        <Card size="small" title="Guided Root Cause (5 Whys)" style={{ marginBottom: 24 }}>
          <Form.Item
            name={['fiveWhys', 'why1']}
            label="Why 1 — Why did this incident happen?"
            rules={[{ required: true, message: 'Why 1 is required to start the guided analysis' }]}
          >
            <TextArea rows={2} placeholder="e.g. The database connection pool was exhausted" />
          </Form.Item>

          <Form.Item shouldUpdate={(prev, cur) => prev?.fiveWhys?.why1 !== cur?.fiveWhys?.why1} noStyle>
            {({ getFieldValue }) =>
              getFieldValue(['fiveWhys', 'why1']) ? (
                <Form.Item name={['fiveWhys', 'why2']} label="Why 2 — Why did that happen?">
                  <TextArea rows={2} placeholder="Dig one level deeper..." />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item shouldUpdate={(prev, cur) => prev?.fiveWhys?.why2 !== cur?.fiveWhys?.why2} noStyle>
            {({ getFieldValue }) =>
              getFieldValue(['fiveWhys', 'why2']) ? (
                <Form.Item name={['fiveWhys', 'why3']} label="Why 3 — Why did that happen?">
                  <TextArea rows={2} placeholder="Keep going..." />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item shouldUpdate={(prev, cur) => prev?.fiveWhys?.why3 !== cur?.fiveWhys?.why3} noStyle>
            {({ getFieldValue }) =>
              getFieldValue(['fiveWhys', 'why3']) ? (
                <Form.Item name={['fiveWhys', 'why4']} label="Why 4 — Why did that happen?">
                  <TextArea rows={2} placeholder="Getting closer to the root..." />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item shouldUpdate={(prev, cur) => prev?.fiveWhys?.why4 !== cur?.fiveWhys?.why4} noStyle>
            {({ getFieldValue }) =>
              getFieldValue(['fiveWhys', 'why4']) ? (
                <Form.Item name={['fiveWhys', 'why5']} label="Why 5 — The systemic root cause">
                  <TextArea rows={2} placeholder="The underlying process/system gap" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Card>

        <Form.Item
          name="description"
          label="Root Cause Description"
          rules={[{ required: true, message: 'Please describe the root cause' }]}
        >
          <TextArea rows={3} placeholder="What actually caused this incident?" />
        </Form.Item>

        <Form.Item name="contributingFactors" label="Contributing Factors">
          <TextArea rows={2} placeholder="What else made this more likely or worse?" />
        </Form.Item>

        <Form.Item name="correctiveActions" label="Corrective Actions">
          <TextArea rows={2} placeholder="What was done to fix this specific incident?" />
        </Form.Item>

        <Form.Item name="preventiveActions" label="Preventive Actions">
          <TextArea rows={2} placeholder="What will prevent this from happening again?" />
        </Form.Item>

        <Space>
          <Button type="primary" htmlType="submit" loading={saving}>
            {rca ? 'Save Changes' : 'Create RCA Record'}
          </Button>
          <Button onClick={() => { setEditing(false); form.resetFields(); }}>
            Cancel
          </Button>
        </Space>
      </Form>
    );
  }

  // Read-only summary + role-based workflow actions
  return (
    <div>
      {rca.status === 'Draft' && rca.rejectionComments && (
        <Card
          size="small"
          style={{ marginBottom: 16, borderColor: '#ffccc7', background: '#fff2f0' }}
        >
          <Text strong>Sent back for revision:</Text> <Text>{rca.rejectionComments}</Text>
        </Card>
      )}

      <Descriptions
        column={1}
        bordered
        size="small"
        title={<Tag color={STATUS_COLORS[rca.status] || 'default'}>{rca.status}</Tag>}
      >
        <Descriptions.Item label="Category">{rca.category}</Descriptions.Item>
        {rca.fiveWhys?.why1 && (
          <Descriptions.Item label="Guided Root Cause (5 Whys)">
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {[rca.fiveWhys.why1, rca.fiveWhys.why2, rca.fiveWhys.why3, rca.fiveWhys.why4, rca.fiveWhys.why5]
                .filter(Boolean)
                .map((why, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>{why}</li>
                ))}
            </ol>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Description">
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-line' }}>{rca.description}</Paragraph>
        </Descriptions.Item>
        <Descriptions.Item label="Contributing Factors">
          {rca.contributingFactors || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Corrective Actions">
          {rca.correctiveActions || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Preventive Actions">
          {rca.preventiveActions || '—'}
        </Descriptions.Item>
        {rca.status === 'Approved' && (
          <Descriptions.Item label="Approved On">
            {rca.approvedAt ? new Date(rca.approvedAt).toLocaleString() : '—'}
          </Descriptions.Item>
        )}
      </Descriptions>

      {!isEndUser && (
        <Space style={{ marginTop: 16 }} wrap>
          {rca.status === 'Draft' && canAuthor && (
            <>
              <Button icon={<EditOutlined />} onClick={openCreateOrEditForm}>
                Edit Draft
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={saving}
                onClick={handleSubmitForReview}
              >
                Submit for Review
              </Button>
            </>
          )}

          {rca.status === 'In Review' && canApproveReject && (
            <>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={saving}
                onClick={handleApprove}
              >
                Approve
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => setRejectModalOpen(true)}
              >
                Send Back with Comments
              </Button>
            </>
          )}
        </Space>
      )}

      <Modal
        title="Send RCA back for revision"
        open={rejectModalOpen}
        onOk={handleReject}
        onCancel={() => { setRejectModalOpen(false); setRejectComments(''); }}
        confirmLoading={rejecting}
        okText="Send Back"
        okButtonProps={{ danger: true }}
      >
        <TextArea
          rows={4}
          placeholder="What needs to change before this can be approved?"
          value={rejectComments}
          onChange={(e) => setRejectComments(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default RCASection;