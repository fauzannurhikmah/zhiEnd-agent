export type NoticeType = 'success' | 'error' | 'warning' | 'info';

export interface NoticeOptions {
  title?: string;
  message: string;
  type?: NoticeType;
  buttonText?: string;
  onClose?: () => void;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  action: () => void | Promise<void>;
}

class DialogStore {
  notice = $state<{
    isOpen: boolean;
    title: string;
    message: string;
    type: NoticeType;
    buttonText: string;
    onClose?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    buttonText: 'Mengerti'
  });

  confirm = $state<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: 'danger' | 'warning' | 'primary';
    action: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Lanjutkan',
    cancelText: 'Batal',
    variant: 'danger',
    action: () => {}
  });

  showNotice(options: NoticeOptions | string, type: NoticeType = 'info', title?: string) {
    if (typeof options === 'string') {
      this.notice = {
        isOpen: true,
        title: title || (type === 'success' ? 'Berhasil' : type === 'error' ? 'Terjadi Kesalahan' : type === 'warning' ? 'Perhatian' : 'Informasi'),
        message: options,
        type,
        buttonText: 'Mengerti'
      };
    } else {
      this.notice = {
        isOpen: true,
        title: options.title || (options.type === 'success' ? 'Berhasil' : options.type === 'error' ? 'Terjadi Kesalahan' : options.type === 'warning' ? 'Perhatian' : 'Informasi'),
        message: options.message,
        type: options.type || 'info',
        buttonText: options.buttonText || 'Mengerti',
        onClose: options.onClose
      };
    }
  }

  showSuccess(message: string, title: string = 'Berhasil') {
    this.showNotice({ message, title, type: 'success' });
  }

  showError(message: string, title: string = 'Terjadi Kesalahan') {
    this.showNotice({ message, title, type: 'error' });
  }

  showWarning(message: string, title: string = 'Peringatan') {
    this.showNotice({ message, title, type: 'warning' });
  }

  showInfo(message: string, title: string = 'Informasi') {
    this.showNotice({ message, title, type: 'info' });
  }

  closeNotice() {
    const cb = this.notice.onClose;
    this.notice.isOpen = false;
    if (cb) cb();
  }

  showConfirm(options: ConfirmOptions) {
    this.confirm = {
      isOpen: true,
      title: options.title || 'Konfirmasi Tindakan',
      message: options.message,
      confirmText: options.confirmText || 'Lanjutkan',
      cancelText: options.cancelText || 'Batal',
      variant: options.variant || 'danger',
      action: options.action
    };
  }

  async handleConfirm() {
    const act = this.confirm.action;
    this.confirm.isOpen = false;
    if (act) await act();
  }

  closeConfirm() {
    this.confirm.isOpen = false;
  }
}

export const dialog = new DialogStore();
