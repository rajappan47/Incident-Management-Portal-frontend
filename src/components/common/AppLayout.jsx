import React from 'react';
import { Layout, Menu, Dropdown, Avatar } from 'antd';
import { DashboardOutlined, AlertOutlined, UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const { Header, Content, Sider } = Layout;

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/incidents', icon: <AlertOutlined />, label: 'Incidents' },
  ...(user?.role === 'Admin' ? [
    { key: '/admin/users', icon: <UserOutlined />, label: 'Users' },
    { key: '/admin/categories', icon: <SettingOutlined />, label: 'Categories' }
  ] : [])
];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', color: '#fff', textAlign: 'center', lineHeight: '32px' }}>
          Incident Portal
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} onClick={({ key }) => navigate(key)} items={menuItems} />
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