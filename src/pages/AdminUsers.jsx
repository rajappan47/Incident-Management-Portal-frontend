import React, { useEffect, useState } from 'react';
import { 
  Table, Tag, Card, Typography, App, Space, Button, Modal, Form, 
  Input, Select, Dropdown, Popconfirm 
} from 'antd';
import { 
  UserAddOutlined, MoreOutlined, EditOutlined, DeleteOutlined 
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = Create Mode, object = Edit Mode
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data || res.data || []);
    } catch (err) {
      console.error('Fetch Users Error:', err);
      message.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Open Modal for Create or Edit
  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
      });
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    form.resetFields();
  };

  // Create or Update User
  const handleSaveUser = async (values) => {
    setSubmitting(true);
    try {
      if (editingUser) {
        // UPDATE existing user (only name and email)
        await api.put(`/users/${editingUser._id}`, {
          name: values.name,
          email: values.email,
        });
        message.success('User updated successfully');
      } else {
        // CREATE new user (includes role)
        await api.post('/users', values);
        message.success('User created successfully');
      }
      handleCloseModal();
      fetchUsers();
    } catch (err) {
      console.error('Save User Error:', err);
      message.error(err.response?.data?.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      message.success('User deleted successfully');
      fetchUsers();
    } catch (err) {
      console.error('Delete User Error:', err);
      message.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Define Action Menu Items (Hides Delete for Admin Users)
  const getActionMenuItems = (record) => {
    const items = [
      {
        key: 'edit',
        label: 'Edit Details',
        icon: <EditOutlined />,
        onClick: () => handleOpenModal(record),
      },
    ];

    // Only add Delete option if the user is NOT an Admin
    if (record.role !== 'Admin') {
      items.push(
        {
          type: 'divider',
        },
        {
          key: 'delete',
          label: (
            <Popconfirm
              title="Delete User"
              description="Are you sure you want to delete this user?"
              onConfirm={() => handleDeleteUser(record._id)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <span style={{ color: '#ff4d4f' }}>Delete User</span>
            </Popconfirm>
          ),
          icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
          danger: true,
        }
      );
    }

    return items;
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text || 'N/A'}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        let color = 'blue';
        if (role === 'Admin') color = 'gold';
        else if (role === 'Support Agent' || role === 'Agent') color = 'green';
        return <Tag color={color}>{role || 'End User'}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Dropdown
          menu={{ items: getActionMenuItems(record) }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button type="text" icon={<MoreOutlined style={{ fontSize: 18 }} />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>User Management</Title>
              <Text type="secondary">Manage user accounts across the system.</Text>
            </div>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => handleOpenModal(null)}
            >
              Add User
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={users}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 8 }}
          />
        </Space>
      </Card>

      {/* Add / Edit User Modal */}
      <Modal
        title={editingUser ? 'Edit User Details' : 'Add New User'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveUser}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter full name' }]}
          >
            <Input placeholder="e.g. John Doe" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please enter email address' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="e.g. john@example.com" disabled={!!editingUser} />
          </Form.Item>

          {/* New User Only Fields */}
          {!editingUser && (
            <>
              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'Please enter a password' }]}
              >
                <Input.Password placeholder="Enter initial password" />
              </Form.Item>

              {/* Role dropdown shows only when ADDING a user */}
              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: 'Please select a role' }]}
                initialValue="End User"
              >
                <Select
                  placeholder="Select user role"
                  options={[
                    { value: 'End User', label: 'End User' },
                    { value: 'Support Agent', label: 'Support Agent' },
                  
                  ]}
                />
              </Form.Item>
            </>
          )}

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingUser ? 'Update Details' : 'Create User'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsers;