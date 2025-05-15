// Image Processing Functions
class ImageProcessor {
    static async compressImage(file, options = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
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
                        ctx.fillStyle = options.backgroundColor || 'white';
                        
                        // If working with transparent PNG, only fill background if specified
                        if (options.format !== 'image/png' || options.backgroundColor) {
                            ctx.fillRect(0, 0, width, height);
                        }
                        
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject(new Error('Failed to create blob from canvas'));
                                return;
                            }
                            resolve({
                                blob: blob,
                                width: width,
                                height: height,
                                originalSize: file.size,
                                newSize: blob.size,
                                name: options.outputFileName || `converted_${file.name}`,
                                url: URL.createObjectURL(blob)
                            });
                        }, options.format || 'image/jpeg', options.quality || 0.8);
                    } catch (error) {
                        console.error('Error processing image:', error);
                        reject(error);
                    }
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    static async convertToWebP(file, quality = 0.8, lossless = false) {
        return this.compressImage(file, {
            format: 'image/webp',
            quality: quality,
            outputFileName: file.name.replace(/\.[^/.]+$/, '.webp')
        });
    }

    static async webPToPNG(file, quality = 1.0) {
        return this.compressImage(file, {
            format: 'image/png',
            quality: quality,
            outputFileName: file.name.replace(/\.webp$/i, '.png')
        });
    }

    static async compressPNG(file, quality = 0.8) {
        return this.compressImage(file, {
            format: 'image/png',
            quality: quality,
            outputFileName: `compressed_${file.name}`
        });
    }

    static async compressJPG(file, quality = 0.8) {
        return this.compressImage(file, {
            format: 'image/jpeg',
            quality: quality,
            outputFileName: `compressed_${file.name}`
        });
    }

    static downloadBlob(blobOrResult, filename) {
        let blob, url;
        
        if (blobOrResult instanceof Blob) {
            blob = blobOrResult;
            url = URL.createObjectURL(blob);
        } else if (blobOrResult && blobOrResult.blob && blobOrResult.url) {
            // If we have a result object from our compression functions
            url = blobOrResult.url;
            filename = filename || blobOrResult.name;
        } else {
            console.error('Invalid blob or result object');
            return;
        }
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Only revoke if we created the URL in this function
        if (blobOrResult instanceof Blob) {
            URL.revokeObjectURL(url);
        }
    }

    static formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} bytes`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / 1048576).toFixed(2)} MB`;
    }

    static formatPercent(originalSize, newSize) {
        const diff = originalSize - newSize;
        const percent = (diff / originalSize) * 100;
        return `${Math.abs(percent).toFixed(1)}%`;
    }
}

// Event listeners for all image processing pages
document.addEventListener('DOMContentLoaded', () => {
    // Compress PNG 
    const pngUpload = document.getElementById('png-upload');
    const compressBtn = document.getElementById('compress-btn');
    const resultsSection = document.getElementById('results-section');
    const downloadBtn = document.getElementById('download-btn');
    const resetBtn = document.getElementById('reset-btn');
    let compressedResult = null;
    
    if (pngUpload) {
        pngUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type === 'image/png') {
                compressBtn.disabled = false;
                
                // Show file details
                const originalSize = document.getElementById('original-size');
                if (originalSize) {
                    originalSize.textContent = `Size: ${ImageProcessor.formatFileSize(file.size)}`;
                }
                
                // Create image to get dimensions
                const img = new Image();
                img.onload = () => {
                    const originalDimensions = document.getElementById('original-dimensions');
                    if (originalDimensions) {
                        originalDimensions.textContent = `Dimensions: ${img.width} × ${img.height}`;
                    }
                    URL.revokeObjectURL(img.src);
                };
                img.src = URL.createObjectURL(file);
            }
        });
    }
    
    if (compressBtn) {
        compressBtn.addEventListener('click', async () => {
            const file = pngUpload.files[0];
            if (!file) return;
            
            const qualitySlider = document.getElementById('quality-slider');
            const quality = qualitySlider ? (parseInt(qualitySlider.value) / 100) : 0.8;
            
            try {
                compressBtn.disabled = true;
                compressBtn.textContent = 'Compressing...';
                
                compressedResult = await ImageProcessor.compressPNG(file, quality);
                
                // Update results
                const compressedSize = document.getElementById('compressed-size');
                const compressionRatio = document.getElementById('compression-ratio');
                
                if (compressedSize) {
                    compressedSize.textContent = `Size: ${ImageProcessor.formatFileSize(compressedResult.newSize)}`;
                }
                
                if (compressionRatio) {
                    const savingPercent = ImageProcessor.formatPercent(file.size, compressedResult.newSize);
                    compressionRatio.textContent = `Compression Ratio: ${savingPercent} smaller`;
                }
                
                // Show results section
                if (resultsSection) resultsSection.classList.remove('hidden');
                
                compressBtn.textContent = 'Compress Image';
                compressBtn.disabled = false;
            } catch (error) {
                console.error('Compression error:', error);
                alert('Error compressing image. Please try again.');
                compressBtn.textContent = 'Compress Image';
                compressBtn.disabled = false;
            }
        });
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (compressedResult) {
                ImageProcessor.downloadBlob(compressedResult);
            }
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            pngUpload.value = '';
            compressBtn.disabled = true;
            if (resultsSection) resultsSection.classList.add('hidden');
            compressedResult = null;
        });
    }
    
    // Convert to WebP
    const imageUpload = document.getElementById('image-upload');
    const convertBtn = document.getElementById('convert-btn');
    const webpResultsSection = document.getElementById('results-section');
    let convertedWebPResults = [];
    
    if (imageUpload) {
        imageUpload.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                convertBtn.disabled = false;
            } else {
                convertBtn.disabled = true;
            }
        });
    }
    
    if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
            const files = imageUpload.files;
            if (files.length === 0) return;
            
            const qualitySlider = document.getElementById('quality-slider');
            const quality = qualitySlider ? (parseInt(qualitySlider.value) / 100) : 0.8;
            
            const losslessCheck = document.getElementById('lossless');
            const lossless = losslessCheck ? losslessCheck.checked : false;
            
            convertBtn.disabled = true;
            convertBtn.textContent = 'Converting...';
            
            try {
                convertedWebPResults = [];
                const conversionList = document.getElementById('conversion-list');
                if (conversionList) conversionList.innerHTML = '';
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const result = await ImageProcessor.convertToWebP(file, quality, lossless);
                    convertedWebPResults.push(result);
                    
                    if (conversionList) {
                        const listItem = document.createElement('div');
                        listItem.className = 'bg-gray-50 p-4 rounded-lg flex flex-col md:flex-row items-center';
                        
                        const savingText = file.size > result.newSize ? 'saved' : 'increased';
                        const savingPercent = ImageProcessor.formatPercent(file.size, result.newSize);
                        
                        listItem.innerHTML = `
                            <div class="w-full md:w-1/4 mb-2 md:mb-0">
                                <img src="${result.url}" alt="Converted image" class="max-h-20 max-w-full mx-auto object-contain">
                            </div>
                            <div class="w-full md:w-2/4 px-4">
                                <p class="text-sm font-medium truncate">${result.name}</p>
                                <p class="text-xs text-gray-500">Original: ${ImageProcessor.formatFileSize(file.size)} → WebP: ${ImageProcessor.formatFileSize(result.newSize)}</p>
                                <p class="text-xs text-gray-500">${savingPercent} ${savingText}</p>
                            </div>
                            <div class="w-full md:w-1/4 mt-2 md:mt-0 text-right">
                                <button class="download-webp-btn bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700" data-index="${i}">
                                    Download
                                </button>
                            </div>
                        `;
                        
                        conversionList.appendChild(listItem);
                    }
                }
                
                if (webpResultsSection) webpResultsSection.classList.remove('hidden');
                
                // Add event listeners to download buttons
                const downloadBtns = document.querySelectorAll('.download-webp-btn');
                downloadBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const index = parseInt(btn.getAttribute('data-index'));
                        if (convertedWebPResults[index]) {
                            ImageProcessor.downloadBlob(convertedWebPResults[index]);
                        }
                    });
                });
                
                // Enable download all button
                const downloadAllBtn = document.getElementById('download-all-btn');
                if (downloadAllBtn) {
                    downloadAllBtn.addEventListener('click', () => {
                        if (convertedWebPResults.length === 1) {
                            ImageProcessor.downloadBlob(convertedWebPResults[0]);
                        } else if (convertedWebPResults.length > 1) {
                            // Create a ZIP file with all converted images
                            const zip = new JSZip();
                            
                            // Add files to zip
                            Promise.all(convertedWebPResults.map(result => {
                                return fetch(result.url)
                                    .then(res => res.blob())
                                    .then(blob => {
                                        zip.file(result.name, blob);
                                    });
                            }))
                            .then(() => {
                                return zip.generateAsync({type: 'blob'});
                            })
                            .then(content => {
                                const zipUrl = URL.createObjectURL(content);
                                const a = document.createElement('a');
                                a.href = zipUrl;
                                a.download = 'converted_webp_images.zip';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(zipUrl);
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('Conversion error:', error);
                alert('Error converting images. Please try again.');
            }
            
            convertBtn.textContent = 'Convert to WebP';
            convertBtn.disabled = false;
        });
    }
    
    // WebP to PNG
    const webpToPngForm = document.getElementById('webp-to-png-form');
    if (webpToPngForm) {
        webpToPngForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = document.getElementById('webp-input').files[0];
            const quality = document.getElementById('quality-slider') ? 
                            (parseInt(document.getElementById('quality-slider').value) / 100) : 0.9;
            
            try {
                const result = await ImageProcessor.webPToPNG(file, quality);
                ImageProcessor.downloadBlob(result);
            } catch (error) {
                console.error('Conversion error:', error);
                alert('Error converting WebP to PNG. Please try again.');
            }
        });
    }
}); 