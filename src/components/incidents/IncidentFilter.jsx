import React from 'react';
import { Row, Col, Input, Select, Button, Space } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { STATUS_OPTIONS, PRIORITY_COLORS } from '../../config/constants';

const { Option } = Select;

const IncidentFilter = ({ filters, setFilters, categories, onReset }) => {
  return (
    <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 20 }}>
      {/* Search Input */}
      <Col xs={24} sm={12} md={8}>
        <Input
          placeholder="Search by title..."
          prefix={<SearchOutlined />}
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          allowClear
        />
      </Col>

      {/* Status Filter */}
      <Col xs={12} sm={6} md={4}>
        <Select
          placeholder="Status"
          style={{ width: '100%' }}
          value={filters.status}
          onChange={(value) => setFilters({ ...filters, status: value })}
          allowClear
        >
          {STATUS_OPTIONS.map((status) => (
            <Option key={status} value={status}>
              {status}
            </Option>
          ))}
        </Select>
      </Col>

      {/* Priority Filter */}
      <Col xs={12} sm={6} md={4}>
        <Select
          placeholder="Priority"
          style={{ width: '100%' }}
          value={filters.priority}
          onChange={(value) => setFilters({ ...filters, priority: value })}
          allowClear
        >
          {Object.keys(PRIORITY_COLORS).map((priority) => (
            <Option key={priority} value={priority}>
              {priority}
            </Option>
          ))}
        </Select>
      </Col>

      {/* Category Filter */}
      <Col xs={12} sm={6} md={4}>
        <Select
          placeholder="Category"
          style={{ width: '100%' }}
          value={filters.category}
          onChange={(value) => setFilters({ ...filters, category: value })}
          allowClear
        >
          {categories?.map((cat) => (
            <Option key={cat._id} value={cat._id}>
              {cat.name}
            </Option>
          ))}
        </Select>
      </Col>

      {/* Reset Button */}
      <Col xs={12} sm={6} md={4}>
        <Button icon={<ReloadOutlined />} onClick={onReset} block>
          Reset
        </Button>
      </Col>
    </Row>
  );
};

export default IncidentFilter;