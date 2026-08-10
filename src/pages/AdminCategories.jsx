import React, { useEffect, useState } from 'react';
import { 
  Table, Card, Typography, Button, Form, Input, Modal, Space, App, Popconfirm 
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null = Create Mode, object = Edit Mode
  
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data || res.data || []);
    } catch (err) {
      console.error('Fetch Categories Error:', err);
      message.error(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Open Modal for Add or Edit
  const handleOpenModal = (category = null) => {
    setEditingCategory(category);
    if (category) {
      form.setFieldsValue({
        name: category.name,
        description: category.description,
      });
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  // Close Modal and reset state
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    form.resetFields();
  };

  // Save Category (Handles both POST for new and PUT for edit)
  const handleSaveCategory = async (values) => {
  setSubmitting(true);
  try {
    if (editingCategory) {
      // Send ONLY name and description, avoid sending _id or createdAt in the body
      const payload = {
        name: values.name,
        description: values.description,
      };

      await api.put(`/categories/${editingCategory._id}`, payload);
      message.success('Category updated successfully');
    } else {
      // CREATE new category
      await api.post('/categories', values);
      message.success('Category created successfully');
    }
    handleCloseModal();
    fetchCategories();
  } catch (err) {
    console.error('Save Category Error:', err);
    // Log backend's detailed error message in console
    console.error('Backend Details:', err.response?.data); 
    message.error(err.response?.data?.message || 'Failed to save category');
  } finally {
    setSubmitting(false);
  }
};

  // Handle Delete Category
  const handleDeleteCategory = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      message.success('Category deleted successfully');
      fetchCategories();
    } catch (err) {
      console.error('Delete Category Error:', err);
      message.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const columns = [
    {
      title: 'Category Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || <Text type="secondary">No description provided</Text>,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (date ? new Date(date).toLocaleDateString() : 'N/A'),
    },
    {
      title: 'Action',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          {/* EDIT BUTTON */}
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            Edit
          </Button>

          {/* DELETE BUTTON WITH CONFIRMATION PROMPT */}
          <Popconfirm
            title="Delete Category"
            description="Are you sure you want to delete this category?"
            onConfirm={() => handleDeleteCategory(record._id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>Incident Categories</Title>
              <Text type="secondary">Manage issue categories available during ticket creation.</Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal(null)}
            >
              Add Category
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={categories}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 8 }}
          />
        </Space>
      </Card>

      {/* Add / Edit Category Modal */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Add New Category'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        destroyOnClose
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleSaveCategory} 
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="e.g. Hardware, Network, Software" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Brief details on when to pick this category..." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminCategories;