import React from 'react';
import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const AttachmentUploader = ({ fileList, setFileList }) => {
  // ✅ Only these file types are allowed
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];
  const MAX_SIZE_MB = 6;

  const props = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      // 1. File type validation — only JPG, PNG, PDF allowed
      const fileName = file.name?.toLowerCase() || '';
      const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
      const hasValidMimeType = ALLOWED_TYPES.includes(file.type);

      if (!hasValidExtension || !hasValidMimeType) {
        message.error(`"${file.name}" is not a valid file type! Only JPG, PNG, and PDF are allowed.`);
        return Upload.LIST_IGNORE;
      }

      // 2. File size validation — max 6MB
      const fileSizeMB = file.size / 1024 / 1024;
      if (fileSizeMB > MAX_SIZE_MB) {
        message.error(`"${file.name}" is ${fileSizeMB.toFixed(1)}MB — file must be smaller than ${MAX_SIZE_MB}MB!`);
        return Upload.LIST_IGNORE;
      }

      setFileList([...fileList, file]);
      return false; // Prevent automatic upload, send with form submission
    },
    fileList,
  };

  return (
    <Upload {...props} maxCount={1} accept=".jpg,.jpeg,.png,.pdf">
      <Button icon={<UploadOutlined />}>Select Attachment (JPG, PNG, PDF — Max 6MB)</Button>
    </Upload>
  );
};

export default AttachmentUploader;