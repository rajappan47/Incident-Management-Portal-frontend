import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await login(values);
      message.success('Login successful!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.message || err?.response?.data?.error;

      if (status === 401 || status === 400) {
        // Wrong email/password
        message.error(backendMsg || 'Invalid email or password. Please try again.');
      } else if (backendMsg) {
        message.error(backendMsg);
      } else {
        message.error('Login failed. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card title="Incident Portal Login" style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Form name="login" onFinish={onFinish} layout="vertical">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>
          <Form.Item style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Log in
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            Don't have an account? <Link to="/register">Register</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;