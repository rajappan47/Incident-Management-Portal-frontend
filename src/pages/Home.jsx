import React from 'react';
import { Typography, Button, Row, Col, Card, Space, Layout, Tag } from 'antd';
import { 
  SafetyCertificateOutlined, 
  ThunderboltOutlined, 
  BarChartOutlined, 
  UserSwitchOutlined, 
  ArrowRightOutlined,
  LoginOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const { Title, Paragraph, Text } = Typography;
const { Header, Content, Footer } = Layout;

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard'); // ✅ fixed — was '/'
    } else {
      navigate('/login');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      
      {/* Top Navigation Bar */}
      <Header style={{ 
        background: '#fff', 
        display: 'flex', 
        justify: 'space-between', 
        alignItems: 'center', 
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <ThunderboltOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0, color: '#001529' }}>
            IncidentPortal
          </Title>
        </div>

        <Space wrap>
          {user ? (
            <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Button type="text" icon={<LoginOutlined />} onClick={() => navigate('/login')}>
                Log In
              </Button>
              <Button type="primary" icon={<UserAddOutlined />} onClick={() => navigate('/register')}>
                Register
              </Button>
            </>
          )}
        </Space>
      </Header>

      {/* Main Hero Section */}
      <Content>
        <div style={{ 
          background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)', 
          padding: '80px 24px', 
          textAlign: 'center' 
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <Tag color="blue" style={{ padding: '4px 12px', fontSize: 14, borderRadius: 12, marginBottom: 16 }}>
              Enterprise Incident Management Platform
            </Tag>
            <Title level={1} style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, marginBottom: 20 }}>
              Resolve Operational Incidents Faster & Smarter
            </Title>
            <Paragraph style={{ fontSize: 'clamp(16px, 2vw, 18px)', color: '#595959', marginBottom: 32 }}>
              Centralize ticket reporting, track SLA violations, and manage resolution workflows across teams in real-time.
            </Paragraph>
            <Space size="middle" wrap justify="center">
              <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={handleGetStarted} style={{ height: 48, padding: '0 32px', fontSize: 16 }}>
                {user ? 'Go to Dashboard' : 'Get Started Now'}
              </Button>
              {!user && (
                <Button size="large" onClick={() => navigate('/register')} style={{ height: 48, padding: '0 32px', fontSize: 16 }}>
                  Create Free Account
                </Button>
              )}
            </Space>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div style={{ maxWidth: 1200, margin: '60px auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Title level={2}>Designed for Efficiency & Visibility</Title>
            <Text type="secondary" style={{ fontSize: 16 }}>
              Everything you need to log, categorize, assign, and audit issue tickets.
            </Text>
          </div>

          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} md={6}>
              <Card hoverable borderless style={{ height: '100%', background: '#fafafa', textAlign: 'center' }}>
                <UserSwitchOutlined style={{ fontSize: 36, color: '#1890ff', marginBottom: 16 }} />
                <Title level={4}>Role-Based Access</Title>
                <Paragraph type="secondary">
                  Tailored dashboards for Admins, Support Agents, and End Users[cite: 1].
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Card hoverable borderless style={{ height: '100%', background: '#fafafa', textAlign: 'center' }}>
                <ThunderboltOutlined style={{ fontSize: 36, color: '#faad14', marginBottom: 16 }} />
                <Title level={4}>SLA Tracking</Title>
                <Paragraph type="secondary">
                  Automated SLA badges highlight overdue high-priority tickets immediately[cite: 1].
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Card hoverable borderless style={{ height: '100%', background: '#fafafa', textAlign: 'center' }}>
                <SafetyCertificateOutlined style={{ fontSize: 36, color: '#52c41a', marginBottom: 16 }} />
                <Title level={4}>Audit Trail</Title>
                <Paragraph type="secondary">
                  Comprehensive activity history and comment logging for every status change[cite: 1].
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Card hoverable borderless style={{ height: '100%', background: '#fafafa', textAlign: 'center' }}>
                <BarChartOutlined style={{ fontSize: 36, color: '#722ed1', marginBottom: 16 }} />
                <Title level={4}>Live Analytics</Title>
                <Paragraph type="secondary">
                  Visual metrics and pie charts summarizing ticket distribution at a glance[cite: 1].
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>

      {/* Footer */}
      <Footer style={{ textAlign: 'center', background: '#001529', color: '#rgba(255,255,255,0.65)', padding: '24px' }}>
        <Text style={{ color: '#8c8c8c' }}>
          Incident Management Portal ©{new Date().getFullYear()} — Built with React & Ant Design[cite: 1]
        </Text>
      </Footer>
    </Layout>
  );
};

export default Home;