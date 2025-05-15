// Image Processing Functions
class ImageProcessor {
    static async compressImage(file, options = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate new dimensions while maintaining aspect ratio
                    let { width, height } = img;
                    if (options.maxWidth && width > options.maxWidth) {
                        height *= options.maxWidth / width;
                        width = options.maxWidth;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw and compress
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, options.format || 'image/jpeg', options.quality || 0.8);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    static async convertToWebP(file) {
        return this.compressImage(file, {
            format: 'image/webp',
            quality: 0.8
        });
    }

    static async webPToPNG(file) {
        return this.compressImage(file, {
            format: 'image/png',
            quality: 1
        });
    }

    static downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Compress JPG
    const jpgCompressForm = document.getElementById('jpg-compress-form');
    if (jpgCompressForm) {
        jpgCompressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = document.getElementById('jpg-input').files[0];
            const quality = document.getElementById('jpg-quality').value / 100;
            const compressed = await ImageProcessor.compressImage(file, {
                format: 'image/jpeg',
                quality: quality
            });
            ImageProcessor.downloadBlob(compressed, 'compressed.jpg');
        });
    }

    // Compress PNG
    const pngCompressForm = document.getElementById('png-compress-form');
    if (pngCompressForm) {
        pngCompressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = document.getElementById('png-input').files[0];
            const compressed = await ImageProcessor.compressImage(file, {
                format: 'image/png',
                quality: 0.8
            });
            ImageProcessor.downloadBlob(compressed, 'compressed.png');
        });
    }

    // Convert to WebP
    const webpConvertForm = document.getElementById('webp-convert-form');
    if (webpConvertForm) {
        webpConvertForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = document.getElementById('image-input').files[0];
            const webp = await ImageProcessor.convertToWebP(file);
            ImageProcessor.downloadBlob(webp, 'converted.webp');
        });
    }

    // WebP to PNG
    const webpToPngForm = document.getElementById('webp-to-png-form');
    if (webpToPngForm) {
        webpToPngForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = document.getElementById('webp-input').files[0];
            const png = await ImageProcessor.webPToPNG(file);
            ImageProcessor.downloadBlob(png, 'converted.png');
        });
    }
}); 