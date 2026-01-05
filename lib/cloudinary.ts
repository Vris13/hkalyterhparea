export const openCloudinaryWidget = (
  onSuccess: (result: any) => void,
  folder: string = 'memory-book'
) => {
  if (typeof window === 'undefined') return;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  // @ts-ignore - Cloudinary widget is loaded via script tag
  const widget = window.cloudinary.createUploadWidget(
    {
      cloudName,
      uploadPreset,
      folder,
      multiple: false,
      maxFiles: 1,
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      maxFileSize: 5000000, // 5MB
      showAdvancedOptions: false,
      cropping: false,
      sources: ['local', 'camera'],
      theme: 'minimal',
    },
    (error: any, result: any) => {
      if (!error && result && result.event === 'success') {
        onSuccess(result.info);
      }
    }
  );

  widget.open();
};
