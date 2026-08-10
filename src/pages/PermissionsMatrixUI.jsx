import React, { useState, useEffect } from 'react';
import { 
  Table, Switch, Card, Button, Tag, Space, Typography, 
  Message, Alert, Divider, Modal, Form, Input, Row, Col 
} from 'antd';
import { 
  CheckCircleOutlined, CloseCircleOutlined, KeyOutlined, 
  UserAddOutlined, SecurityScanOutlined 
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;

// 1. Role-based Master Permission Catalog
const PERMISSIONS_CATALOG = {
  SUPPORT_AGENT: [
    { key: 'tickets:view_active', label: 'View Active Tickets', desc: 'Allows viewing currently active/assigned tickets', module: 'Tickets' },
    { key: 'tickets:view_all', label: 'View All Queue Tickets', desc: 'Allows viewing full support team queue', module: 'Tickets' },
    { key: 'tickets:assign', label: 'Assign / Reassign Tickets', desc: 'Allows transferring tickets to agents', module: 'Actions' },
    { key: 'tickets:resolve', label: 'Resolve / Close Ticket', desc: 'Allows marking tickets as resolved', module: 'Actions' },
    { key: 'tickets:internal_notes', label: 'Add Private Notes', desc: 'Allows adding internal agent-only notes', module: 'Collaboration' }
  ],
  END_USER: [
    { key: 'tickets:create', label: 'Create New Tickets', desc: 'Allows submitting new tickets under parent account', module: 'Tickets' },
    { key: 'tickets:view_org', label: 'View Company Tickets', desc: 'Allows viewing tickets raised by teammates', module: 'Visibility' },
    { key: 'tickets:reply', label: 'Reply to Tickets', desc: 'Allows posting responses on open tickets', module: 'Actions' },
    { key: 'tickets:close_own', label: 'Close Own Tickets', desc: 'Allows closing submitted issues when resolved', module: 'Actions' }
  ]
};

const PermissionsMatrixUI = ({ currentUserRole = 'END_USER' }) => {
  const [subUsers, setSubUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubUser, setSelectedSubUser] = useState(null);
  const [permissionsMap, setPermissionsMap] = useState({});
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Get correct catalog depending on who logged in
  const activeCatalog = PERMISSIONS_CATALOG[currentUserRole] || PERMISSIONS_CATALOG.END_USER;

  // Load Sub-Users
  const fetchSubUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/sub-users');
      setSubUsers(res.data || []);
    } catch (err) {
      message.error('Failed to load sub-users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubUsers();
  }, []);

  // Open Permission Switcher Matrix for a Sub-User
  const handleManagePermissions = (user) => {
    setSelectedSubUser(user);
    // Convert permissions array into an key-value object map e.g., { 'tickets:create': true }
    const initialMap = {};
    activeCatalog.forEach((perm) => {
      initialMap[perm.key] = (user.permissions || []).includes(perm.key);
    });
    setPermissionsMap(initialMap);
  };

  // Toggle dynamic grant
  const handleTogglePermission = (permKey, isAllowed) => {
    setPermissionsMap((prev) => ({
      ...prev,
      [permKey]: isAllowed
    }));
  };

  // Save changes to backend
  const handleSaveGrants = async () => {
    if (!selectedSubUser) return;
    
    // Extract array of allowed permissions
    const updatedPermissions = Object.keys(permissionsMap).filter(key => permissionsMap[key]);

    try {
      await api.patch(`/users/sub-users/${selectedSubUser._id}/permissions`, {
        permissions: updatedPermissions
      });
      message.success(`Permissions updated for ${selectedSubUser.name}`);
      setSelectedSubUser(null);
      fetchSubUsers();
    } catch (err) {
      message.error('Failed to update grants');
    }
  };

  // Postgres Grant Style Matrix Columns
  const matrixColumns = [
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Permission Name',
      dataIndex: 'label',
      key: 'label',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.desc}</Text>
        </div>
      )
    },
    {
      title: 'Postgres Command',
      dataIndex: 'key',
      key: 'key',
      render: (key) => <code style={{ color: '#d63384' }}>GRANT {key}</code>
    },
    {
      title: 'Access Status',
      key: 'status',
      align: 'center',
      render: (_, record) => {
        const isAllowed = !!permissionsMap[record.key];
        return (
          <Switch
            checked={isAllowed}
            checkedChildren={<><CheckCircleOutlined /> ALLOWED</>}
            unCheckedChildren={<><CloseCircleOutlined /> DENIED</>}
            onChange={(checked) => handleTogglePermission(record.key, checked)}
          />
        );
      }
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              <SecurityScanOutlined /> Sub-User Grant & Permission Control Panel
            </Title>
            <Text type="secondary">
              Logged in as: <Tag color="purple">{currentUserRole}</Tag> — Grant/Revoke access rights to your delegates.
            </Text>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<UserAddOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              Add New Sub-User
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Sub-Users List Table */}
      <Card title="Your Sub-Users List">
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={subUsers}
          columns={[
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { title: 'Email', dataIndex: 'email', key: 'email' },
            { 
              title: 'Granted Rights', 
              dataIndex: 'permissions', 
              key: 'permissions',
              render: (perms = []) => (
                <Space wrap>
                  {perms.map(p => <Tag color="green" key={p}>{p}</Tag>)}
                  {perms.length === 0 && <Tag color="red">NO ACCESS GRANTED</Tag>}
                </Space>
              )
            },
            {
              title: 'Action',
              key: 'action',
              render: (_, record) => (
                <Button 
                  icon={<KeyOutlined />} 
                  type="primary"
                  ghost
                  onClick={() => handleManagePermissions(record)}
                >
                  Configure Access Matrix
                </Button>
              )
            }
          ]}
        />
      </Card>

      {/* 2. POSTGRES SQL SUPERADMIN STYLE ACCESS MATRIX MODAL */}
      <Modal
        title={`Permission Grants Matrix — [ ${selectedSubUser?.name} ]`}
        open={!!selectedSubUser}
        onCancel={() => setSelectedSubUser(null)}
        onOk={handleSaveGrants}
        okText="Apply & Save Grants"
        width={800}
      >
        <Alert
          message="Postgres-Style Dynamic Access Management"
          description="Toggle switches to instantly GRANT or REVOKE operations for this sub-user."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          pagination={false}
          dataSource={activeCatalog}
          rowKey="key"
          columns={matrixColumns}
          size="middle"
        />
      </Modal>
    </div>
  );
};

export default PermissionsMatrixUI;