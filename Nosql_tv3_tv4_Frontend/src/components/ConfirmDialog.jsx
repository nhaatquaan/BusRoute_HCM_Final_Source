import React from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận thao tác',
  message,
  confirmLabel = 'Xác nhận xóa',
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Hủy bỏ
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Đang xử lý...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
