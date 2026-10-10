import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const base = {
  background: '#12232a',
  color: '#e8edf4',
  confirmButtonColor: '#8ed6c8',
  cancelButtonColor: '#29424a',
  buttonsStyling: true,
  customClass: { popup: 'fb-alert', title: 'fb-alert-title', htmlContainer: 'fb-alert-copy', confirmButton: 'fb-alert-confirm', cancelButton: 'fb-alert-cancel' },
};

export const feedback = {
  error: (text: string, title = 'Algo salió mal') => Swal.fire({ ...base, icon: 'error', iconColor: '#ff8f9c', title, text }),
  success: (text: string, title = 'Listo') => Swal.fire({ ...base, icon: 'success', iconColor: '#8ed6c8', title, text, timer: 2200, showConfirmButton: false, toast: true, position: 'top-end' }),
  info: (text: string, title = 'Aviso') => Swal.fire({ ...base, icon: 'info', iconColor: '#8ecbe0', title, text }),
  confirm: (text: string, title = '¿Confirmas esta acción?') => Swal.fire({ ...base, icon: 'warning', iconColor: '#f2c879', title, text, showCancelButton: true, confirmButtonText: 'Sí, continuar', cancelButtonText: 'Cancelar', reverseButtons: true }),
  loading: (text: string) => Swal.fire({ ...base, title: text, allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() }),
};

export { Swal };
