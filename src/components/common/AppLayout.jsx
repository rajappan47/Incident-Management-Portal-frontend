import React from 'react';
import { Layout, Menu, Dropdown, Avatar } from 'antd';
import { DashboardOutlined, AlertOutlined, UserOutlined, SettingOutlined, LogoutOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const { Header, Content, Sider } = Layout;

// 🆕 NEW — derive Swagger docs URL from the same env var api.js already uses
// VITE_API_BASE_URL = http://localhost:5000/api  →  http://localhost:5000/api-docs
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SWAGGER_URL = API_BASE.replace(/\/api\/?$/, '') + '/api-docs';
const HELP_KEY = '__help__'; // special key so onClick can tell it apart from real routes

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/incidents', icon: <AlertOutlined />, label: 'Incidents' },
  ...(user?.role === 'Admin' ? [
    { key: '/admin/users', icon: <UserOutlined />, label: 'Users' },
    { key: '/admin/categories', icon: <SettingOutlined />, label: 'Categories' },
    // 🆕 NEW — Help item, Admin only
    { key: HELP_KEY, icon: <QuestionCircleOutlined />, label: 'Help' },
  ] : [])
];

  // 🆕 NEW — routes to internal pages normally, but opens Swagger docs
  // in a new tab when the Help item is clicked
  const handleMenuClick = ({ key }) => {
    if (key === HELP_KEY) {
      window.open(SWAGGER_URL, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', color: '#fff', textAlign: 'center', lineHeight: '32px' }}>
          Incident Portal
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} onClick={handleMenuClick} items={menuItems} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: logout }] }}>
            <span style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
              {user?.name} ({user?.role})
            </span>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;