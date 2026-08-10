import React from 'react';
import { Layout, Dropdown, Avatar } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';

const { Header } = Layout;

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
      <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: logout }] }}>
        <span style={{ cursor: 'pointer' }}>
          <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
          {user?.name} ({user?.role})
        </span>
      </Dropdown>
    </Header>
  );
};

export default Navbar;