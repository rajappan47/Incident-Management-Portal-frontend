import React from 'react';
import { Layout, Menu } from 'antd';
import { DashboardOutlined, AlertOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const { Sider } = Layout;

const Sidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/incidents', icon: <AlertOutlined />, label: 'Incidents' },
    ...(user?.role === 'Admin' ? [
      { key: '/admin/users', icon: <UserOutlined />, label: 'Users' },
      { key: '/admin/categories', icon: <SettingOutlined />, label: 'Categories' }
    ] : [])
  ];

  return (
    <Sider collapsible>
      <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', color: '#fff', textAlign: 'center', lineHeight: '32px' }}>
        Incident Portal
      </div>
      <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} onClick={({ key }) => navigate(key)} items={menuItems} />
    </Sider>
  );
};

export default Sidebar;