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
  field.className = 'grid gap-[.45rem] col-span-full mt-4';
  field.innerHTML = `<span class="text-[.82rem] text-[#c9d2cc]">${options.title}</span>
    <div class="grid gap-[.6rem]" data-photo-picker>
      <input id="${options.inputId}" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-describedby="${options.inputId}-help ${options.inputId}-error">
      <label class="group flex min-h-[6.4rem] cursor-pointer items-center gap-[.85rem] rounded-2xl border border-dashed border-[rgba(72,228,224,.38)] bg-[linear-gradient(135deg,rgba(72,228,224,.08),rgba(5,11,14,.3))] p-4 text-[var(--ink)] transition-[border-color,background,transform,box-shadow] duration-200 hover:-translate-y-px hover:border-[var(--cyan)] hover:bg-[rgba(72,228,224,.12)] hover:shadow-[0_10px_28px_rgba(0,0,0,.18)] [&.is-dragging]:border-[var(--cyan)] [&.is-dragging]:bg-[rgba(72,228,224,.12)]" for="${options.inputId}">
        <span class="grid h-[2.6rem] w-[2.6rem] flex-none place-items-center rounded-[.8rem] bg-[var(--cyan)] text-[#10211c]" aria-hidden="true"><svg class="h-[1.35rem] w-[1.35rem] fill-none stroke-current" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M4 17.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5M12 4v11m0-11 4 4m-4-4-4 4"/></svg></span>
        <span class="grid min-w-0 gap-[.22rem]"><strong class="text-[.8rem]" data-photo-action>Seleccionar imagen</strong><small class="text-[.68rem] leading-[1.35] text-[#c9d2cc]" data-photo-empty>Sin imagen seleccionada</small></span>
        <span class="ml-auto whitespace-nowrap text-right text-[.68rem] leading-[1.35] text-[var(--muted)]">JPG, PNG, WEBP o GIF · máximo 5 MB</span>
      </label>
      <div class="flex items-center gap-3 rounded-[.85rem] border border-[rgba(72,228,224,.2)] bg-[rgba(5,11,14,.38)] p-[.55rem]" hidden data-photo-selected>
        <img class="m-0 h-[3.8rem] w-[3.8rem] rounded-[.6rem] border border-[rgba(72,228,224,.25)] object-cover" alt="Vista previa de la imagen seleccionada">
        <div class="grid min-w-0 gap-[.2rem] overflow-hidden"><strong class="truncate text-[.76rem] text-[var(--ink)]" data-photo-name></strong><small class="truncate text-[.67rem] text-[var(--muted)]" data-photo-size></small></div>
        <button class="ml-auto cursor-pointer rounded-lg border-0 bg-[rgba(184,91,50,.12)] px-[.55rem] py-[.35rem] text-xl leading-none text-[#ffad98] hover:bg-[rgba(184,91,50,.24)]" type="button" data-photo-remove aria-label="Quitar imagen">×</button>
      </div>
      <small class="block text-[.68rem] text-[var(--muted)]" id="${options.inputId}-help">La foto se optimiza y almacena de forma segura.</small>
      <small class="text-[.72rem] text-[#ff9daa]" id="${options.inputId}-error" role="alert" hidden></small>
    </div>`;
  const content = form.querySelector<HTMLElement>('.modal-form-scroll') ?? form;
  content.insertBefore(field, content.querySelector('.form-actions') || null);

  const input = field.querySelector<HTMLInputElement>('input[type="file"]')!;
  const dropzone = field.querySelector<HTMLElement>('label')!;
  const selected = field.querySelector<HTMLElement>('[data-photo-selected]')!;
  const preview = field.querySelector<HTMLImageElement>('img')!;
  const name = field.querySelector<HTMLElement>('[data-photo-name]')!;
  const size = field.querySelector<HTMLElement>('[data-photo-size]')!;
  const error = field.querySelector<HTMLElement>(`#${options.inputId}-error`)!;
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
