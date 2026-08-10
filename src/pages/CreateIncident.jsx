import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Space, Typography, message, Spin } from 'antd';
import { ArrowLeftOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/common/AppLayout';
import AttachmentUploader from '../components/incidents/AttachmentUploader';
import { PRIORITY_COLORS } from '../config/constants';
import api from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

const CreateIncident = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [fileList, setFileList] = useState([]);

  // 🤖 State for Support Agents linked to selected category
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      const categoryList = Array.isArray(data) ? data : data?.categories || [];
      setCategories(categoryList);
    } catch (err) {
      console.error('Failed to load categories:', err);
      message.error('Failed to load incident categories.');
    }
  };

  // 🔄 Fetch Agents when Category Selection Changes
const handleCategoryChange = async (selectedCategoryId) => {
  form.setFieldsValue({ assignedTo: undefined });
  setAgents([]);

  if (!selectedCategoryId) return;

  setAgentsLoading(true);
  try {
    // Pass only categoryId as query parameter
    const response = await api.get('/users/agents-by-category', {
      params: { categoryId: selectedCategoryId }
    });

    const agentList = Array.isArray(response.data) ? response.data : response.data?.data || [];
    setAgents(agentList);
  } catch (err) {
    console.error('Failed to fetch agents for category:', err);
    message.error('Failed to load agents handling this category.');
  } finally {
    setAgentsLoading(false);
  }
};

 const onFinish = async (values) => {
  setLoading(true);
  try {
    const formData = new FormData();
    formData.append('title', values.title.trim());
    formData.append('description', values.description.trim());
    formData.append('category', values.category);
    formData.append('priority', values.priority || 'Medium');

    if (values.assignedTo) {
      formData.append('assignedTo', values.assignedTo);
    }

    // Attachment field name MUST match multer upload name in backend (e.g., 'attachment')
    if (fileList.length > 0) {
      formData.append('attachment', fileList[0]); 
    }

    await api.post('/incidents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    message.success('Incident logged successfully!');
    navigate('/incidents');
  } catch (err) {
    console.error('Create Incident Error:', err.response?.data);
    message.error(err.response?.data?.message || 'Failed to create incident.');
  } finally {
    setLoading(false);
  }
};
  return (
    <AppLayout>
      <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
        
        {/* Header Section */}
        <div>
          <Button 
            type="link" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/incidents')} 
            style={{ paddingLeft: 0 }}
          >
            Back to Incidents
          </Button>
          <Title level={2} style={{ margin: 0 }}>Create New Incident</Title>
          <Text type="secondary">Submit a technical issue or request support</Text>
        </div>

        {/* Form Card */}
<Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ priority: 'Medium' }}
          >
            {/* Title */}
            <Form.Item
              name="title"
              label="Incident Title"
              rules={[{ required: true, message: 'Please enter an incident title' }]}
            >
              <Input placeholder="e.g., Unable to connect to VPN server" maxLength={100} showCount />
            </Form.Item>

            {/* Category */}
            <Form.Item
              name="category"
              label="Category"
              rules={[{ required: true, message: 'Please select a category' }]}
            >
              <Select 
                placeholder="Select incident category"
                onChange={handleCategoryChange}
              >
                {categories.map((cat) => {
                  const catId = cat?._id || cat?.id;
                  if (!catId) return null;
                  return (
                    <Option key={catId} value={catId}>
                      {cat.name}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>

            {/* 🤖 Dynamic Support Agent Selection Dropdown */}
            <Form.Item
              name="assignedTo"
              label="Assign Support Agent (Optional)"
              extra={
                !form.getFieldValue('category')
                  ? "Select a category first to view specialized agents"
                  : "Agents listed here are specialized in handling this category"
              }
            >
              <Select
                placeholder={
                  agentsLoading 
                    ? "Loading agents..." 
                    : form.getFieldValue('category')
                      ? "Select an agent to assign directly" 
                      : "Please choose a category first"
                }
                loading={agentsLoading}
                disabled={!form.getFieldValue('category')}
                allowClear
                notFoundContent={
                  agentsLoading ? <Spin size="small" /> : 'No agents found for this category'
                }
              >
                {agents.map((agent) => {
                  const agentId = agent?._id || agent?.id;
                  return (
                    <Option key={agentId} value={agentId}>
                      {agent.name} {agent.team ? `(${agent.team})` : ''}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>

            {/* Priority */}
            <Form.Item
              name="priority"
              label="Priority Level"
              rules={[{ required: true, message: 'Please select priority' }]}
            >
              <Select placeholder="Select priority">
                {Object.keys(PRIORITY_COLORS).map((p) => (
                  <Option key={p} value={p}>
                    {p}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* Description */}
            <Form.Item
              name="description"
              label="Detailed Description"
              rules={[{ required: true, message: 'Please provide issue details' }]}
            >
              <Input.TextArea 
                rows={5} 
                placeholder="Describe the problem, steps to reproduce, and any error messages..." 
              />
            </Form.Item>

            {/* Attachment */}
            <Form.Item label="Attachment / Screenshot (Optional)">
              <AttachmentUploader fileList={fileList} setFileList={setFileList} />
            </Form.Item>

            {/* Submit */}
            <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => navigate('/incidents')}>Cancel</Button>
                <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={loading}>
                  Submit Ticket
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

      </Space>
    </AppLayout>
  );
};

export default CreateIncident;