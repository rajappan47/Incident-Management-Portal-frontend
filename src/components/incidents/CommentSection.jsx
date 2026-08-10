import React, { useState } from 'react';
import { List, Avatar, Form, Input, Button, Space, Typography, Checkbox, Tag, App } from 'antd';
import { UserOutlined, SendOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Text } = Typography;

const CommentSection = ({ incidentId, comments, onCommentAdded, userRole }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  
  // Use Ant Design's message hook from App context
  const { message } = App.useApp();

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await api.post(`/incidents/${incidentId}/comments`, {
        message: values.commentText,
        isInternal: values.isInternal || false,
      });
      
      message.success('Comment added successfully');
      form.resetFields();
      if (onCommentAdded) onCommentAdded();
    } catch (err) {
      console.error('Post Comment Error:', err.response?.data);
      message.error(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const isStaff = userRole === 'Admin' || userRole === 'Support Agent';

  return (
    <div>
      <List
        header={`${comments?.length || 0} Comments`}
        itemLayout="horizontal"
        dataSource={comments || []}
        renderItem={(item) => {
          const authorName = item.authorId?.name || item.postedBy?.name || item.author?.name || 'User';
          const commentMessage = item.message || item.commentText;

          return (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={
                  <Space>
                    <Text strong>{authorName}</Text>
                    {item.isInternal && <Tag color="red" style={{ fontSize: 10 }}>Internal Note</Tag>}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </Space>
                }
                description={commentMessage}
              />
            </List.Item>
          );
        }}
      />

      <Form form={form} onFinish={handleSubmit} style={{ marginTop: 20 }}>
        <Form.Item
          name="commentText"
          rules={[{ required: true, message: 'Please enter a comment' }]}
        >
          <Input.TextArea rows={3} placeholder="Write a response or note..." />
        </Form.Item>

        {isStaff && (
          <Form.Item name="isInternal" valuePropName="checked">
            <Checkbox>Mark as Internal Note (hidden from end user)</Checkbox>
          </Form.Item>
        )}

        <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={submitting}>
            Post Comment
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CommentSection;