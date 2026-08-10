// frontend/src/pages/Register.jsx
import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, message, Spin } from 'antd';
import api from '../services/api';

const { Option } = Select;

const Register = () => {
  const [form] = Form.useForm();
  const [selectedRole, setSelectedRole] = useState('End User');
  const [loading, setLoading] = useState(false);
  
  // Dynamic categories state from database
  const [categoriesList, setCategoriesList] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // 🔄 Fetch categories dynamically from backend database on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const response = await api.get('/categories');
        // Check if response data is directly an array or inside data property
        const fetchedData = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];
        
        setCategoriesList(fetchedData);
      } catch (err) {
        console.error('Failed to load categories:', err);
        message.error('Failed to load categories list from database');
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await api.post('/auth/register', values);
      message.success('Registration successful!');
      form.resetFields();
      setSelectedRole('End User');
    } catch (err) {
      message.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="User Registration" style={{ maxWidth: 500, margin: '40px auto' }}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ role: 'End User' }}>
        
        <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Please enter full name' }]}>
          <Input placeholder="John Doe" />
        </Form.Item>

        <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}>
          <Input placeholder="john@example.com" />
        </Form.Item>

        <Form.Item name="password" label="Password" rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]}>
          <Input.Password placeholder="Password" />
        </Form.Item>

        <Form.Item name="role" label="Account Role" rules={[{ required: true }]}>
          <Select
            onChange={(val) => setSelectedRole(val)}
            options={[
              { label: 'End User / Customer', value: 'End User' },
              { label: 'Support Agent', value: 'Support Agent' },
            ]}
          />
        </Form.Item>

        {/* Shown ONLY for Support Agents */}
        {selectedRole === 'Support Agent' && (
          <>
            {/* Team Dropdown */}
            <Form.Item
              name="team"
              label="Assigned Team"
              rules={[{ required: true, message: 'Please select a team' }]}
            >
              <Select
                placeholder="Select Team"
                options={[
                  { label: 'IT Infrastructure', value: 'IT Infrastructure' },
                  { label: 'Application Support', value: 'Application Support' },
                  { label: 'Hardware Services', value: 'Hardware Services' },
                ]}
              />
            </Form.Item>

            {/* Handled Categories (Multi-select Dynamic Options) */}
            <Form.Item
              name="categories"
              label="Handled Categories (Specializations)"
              rules={[{ required: true, message: 'Select at least one category' }]}
            >
              <Select
                mode="multiple"
                placeholder={categoriesLoading ? "Loading categories..." : "Select categories this agent handles"}
                loading={categoriesLoading}
                allowClear
                notFoundContent={categoriesLoading ? <Spin size="small" /> : 'No categories found'}
              >
                {categoriesList.map((cat) => (
                  <Option key={cat._id || cat.id} value={cat._id || cat.name}>
                    {cat.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}

        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Register User
        </Button>
      </Form>
    </Card>
  );
};

export default Register;