const LIGHTBOX_ID = 'photo-lightbox';

function hide(box: HTMLElement, image: HTMLImageElement) {
  box.hidden = true;
  image.removeAttribute('src');
  document.body.classList.remove('modal-open');
}

function buildLightbox() {
  const box = document.createElement('div');
  box.id = LIGHTBOX_ID;
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Foto del registro');

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'lightbox-close';
  close.setAttribute('aria-label', 'Cerrar foto');
  close.innerHTML = '<span aria-hidden="true">×</span>';

  const image = document.createElement('img');
  image.id = 'photo-lightbox-img';
  image.alt = 'Foto del registro ampliada';

  box.append(close, image);
  document.body.append(box);

  close.addEventListener('click', () => hide(box, image));
  box.addEventListener('click', (event) => { if (event.target === box) hide(box, image); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !box.hidden) hide(box, image); });
}

export function openPhotoLightbox(url?: string | null) {
  if (!url) return;
  let box = document.getElementById(LIGHTBOX_ID);
  if (!box) { buildLightbox(); box = document.getElementById(LIGHTBOX_ID); }
  if (!box) return;
  const image = box.querySelector<HTMLImageElement>('img');
  if (!image) return;
  image.src = url;
  box.hidden = false;
  document.body.classList.add('modal-open');
  box.querySelector<HTMLButtonElement>('.lightbox-close')?.focus();
}
