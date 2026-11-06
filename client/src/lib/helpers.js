export function compressImage(file, { maxDimension = 1800, quality = 0.82 } = {}) {
  if (!(file instanceof Blob) || !file.type.startsWith('image/')) {
    return Promise.reject(new Error('Choose a valid image file.'));
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('This browser could not process the selected image.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('This browser could not compress the selected image.'));
      }, 'image/jpeg', quality);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('The selected file could not be opened as an image.'));
    };
    image.src = objectUrl;
  });
}