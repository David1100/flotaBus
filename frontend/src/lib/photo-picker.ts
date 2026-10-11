const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

type PhotoPickerOptions = { inputId: string; title: string; currentUrl?: string };

export type PhotoPickerController = {
  input: HTMLInputElement;
  setCurrent: (url?: string) => void;
  reset: () => void;
  getState: () => { file?: File; currentUrl?: string; removalRequested: boolean };
};

const controllers = new WeakMap<HTMLFormElement, PhotoPickerController>();

export function getPhotoPicker(form: HTMLFormElement) { return controllers.get(form); }

export function setupPhotoPicker(form: HTMLFormElement, options: PhotoPickerOptions) {
  if (form.dataset.photoPickerReady) return;
  form.dataset.photoPickerReady = 'true';
  const field = document.createElement('div');
  field.className = 'photo-field full';
  field.innerHTML = `<span class="photo-field-label">${options.title}</span>
    <div class="photo-picker" data-photo-picker>
      <input id="${options.inputId}" class="photo-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-describedby="${options.inputId}-help ${options.inputId}-error">
      <label class="photo-dropzone" for="${options.inputId}">
        <span class="photo-dropzone-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M4 17.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5M12 4v11m0-11 4 4m-4-4-4 4"/></svg></span>
        <span class="photo-dropzone-copy"><strong data-photo-action>Seleccionar imagen</strong><small data-photo-empty>Sin imagen seleccionada</small></span>
        <span class="photo-dropzone-meta">JPG, PNG, WEBP o GIF · máximo 5 MB</span>
      </label>
      <div class="photo-selected" hidden data-photo-selected>
        <img class="photo-preview" alt="Vista previa de la imagen seleccionada">
        <div class="photo-selected-copy"><strong data-photo-name></strong><small data-photo-size></small></div>
        <button class="photo-remove" type="button" data-photo-remove aria-label="Quitar imagen">×</button>
      </div>
      <small class="field-help photo-help" id="${options.inputId}-help">La foto se optimiza y almacena de forma segura.</small>
      <small class="photo-error" id="${options.inputId}-error" role="alert" hidden></small>
    </div>`;
  const content = form.querySelector<HTMLElement>('.modal-form-scroll') ?? form;
  content.insertBefore(field, content.querySelector('.form-actions') || null);

  const input = field.querySelector<HTMLInputElement>('.photo-input')!;
  const dropzone = field.querySelector<HTMLElement>('.photo-dropzone')!;
  const selected = field.querySelector<HTMLElement>('[data-photo-selected]')!;
  const preview = field.querySelector<HTMLImageElement>('.photo-preview')!;
  const name = field.querySelector<HTMLElement>('[data-photo-name]')!;
  const size = field.querySelector<HTMLElement>('[data-photo-size]')!;
  const error = field.querySelector<HTMLElement>('.photo-error')!;
  const action = field.querySelector<HTMLElement>('[data-photo-action]')!;
  const emptyCopy = field.querySelector<HTMLElement>('[data-photo-empty]')!;
  let objectUrl = '';
  let currentUrl = options.currentUrl ?? '';
  let removalRequested = false;

  const showError = (message = '') => { error.textContent = message; error.hidden = !message; input.setCustomValidity(message); };
  const clearObjectUrl = () => { if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = ''; } };
  const renderEmpty = (message = '') => {
    clearObjectUrl(); selected.hidden = true; action.textContent = 'Seleccionar imagen'; emptyCopy.textContent = 'Sin imagen seleccionada'; emptyCopy.hidden = false; preview.removeAttribute('src'); name.textContent = ''; size.textContent = message;
  };
  const renderCurrent = (url?: string) => {
    clearObjectUrl();
    if (!url) return renderEmpty();
    preview.src = url; name.textContent = 'Imagen actual'; size.textContent = 'Selecciona otra para reemplazarla'; selected.hidden = false; action.textContent = 'Cambiar imagen'; emptyCopy.hidden = true;
  };
  const render = (file?: File) => {
    showError();
    if (!file) return renderEmpty();
    if (!ACCEPTED_TYPES.includes(file.type)) { input.value = ''; return showError('Formato no compatible. Usa JPG, PNG, WEBP o GIF.'); }
    if (file.size > MAX_PHOTO_BYTES) { input.value = ''; return showError('La imagen supera el máximo permitido de 5 MB.'); }
    clearObjectUrl();
    objectUrl = URL.createObjectURL(file); preview.src = objectUrl; name.textContent = `Imagen nueva · ${file.name}`; size.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB · lista para subir`; selected.hidden = false; action.textContent = 'Cambiar imagen'; emptyCopy.hidden = true;
  };
  input.addEventListener('change', () => render(input.files?.[0]));
  ['dragenter', 'dragover'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => { event.preventDefault(); dropzone.classList.add('is-dragging'); }));
  ['dragleave', 'drop'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => { event.preventDefault(); dropzone.classList.remove('is-dragging'); }));
  dropzone.addEventListener('drop', (event) => { const file = (event as DragEvent).dataTransfer?.files[0]; if (!file) return; const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files; render(file); });
  field.querySelector<HTMLButtonElement>('[data-photo-remove]')!.addEventListener('click', () => {
    input.value = ''; removalRequested = Boolean(currentUrl); renderEmpty(currentUrl ? 'La imagen guardada no cambiará sin una operación de eliminación compatible.' : ''); input.focus();
  });
  const controller: PhotoPickerController = {
    input,
    setCurrent: (url = '') => { input.value = ''; currentUrl = url; removalRequested = false; showError(); renderCurrent(url); },
    reset: () => { input.value = ''; currentUrl = ''; removalRequested = false; showError(); renderEmpty(); },
    getState: () => ({ file: input.files?.[0], currentUrl: currentUrl || undefined, removalRequested }),
  };
  controllers.set(form, controller);
  (form as HTMLFormElement & { photoPicker?: PhotoPickerController }).photoPicker = controller;
  renderCurrent(currentUrl);
  return controller;
}
