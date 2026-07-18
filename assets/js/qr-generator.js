/**
 * Make QR Generator — private, browser-only QR creation
 */
(function () {
    'use strict';

    function initQRGenerator() {
        const generateBtn = document.getElementById('generate-btn');
        const downloadBtn = document.getElementById('download-btn');
        const qrcodeContainer = document.getElementById('qrcode-container');
        const qrcode = document.getElementById('qrcode');

        if (!generateBtn || !downloadBtn || !qrcode || typeof QRCodeStyling === 'undefined') return;

        let qrInstance = null;
        let logoDataUrl = '';
        let livePreviewTimer = null;
        let generationToken = 0;
        const placeholderTemplate = qrcode.firstElementChild
            ? qrcode.firstElementChild.cloneNode(true)
            : null;

        function resetGeneratedResult() {
            generationToken += 1;
            qrInstance = null;
            qrcode.replaceChildren();
            if (placeholderTemplate) qrcode.appendChild(placeholderTemplate.cloneNode(true));
            qrcodeContainer.classList.remove('hidden');
            downloadBtn.disabled = true;
        }

        function escapeQrText(value) {
            return String(value).replace(/([\\;,":])/g, '\\$1');
        }

        function getQrContent() {
            const activeTab = document.querySelector('.tab-content.active');
            if (!activeTab) return '';

            switch (activeTab.id) {
                case 'tab-text':
                    return document.getElementById('text-input').value.trim();
                case 'tab-url':
                    return document.getElementById('url-input').value.trim();
                case 'tab-vcard': {
                    const name = document.getElementById('vcard-name').value.trim();
                    const org = document.getElementById('vcard-org').value.trim();
                    const phone = document.getElementById('vcard-phone').value.trim();
                    const email = document.getElementById('vcard-email').value.trim();
                    const url = document.getElementById('vcard-url').value.trim();
                    const address = document.getElementById('vcard-address').value.trim();
                    if (!name && !phone && !email) return '';
                    const fields = ['BEGIN:VCARD', 'VERSION:3.0'];
                    if (name) fields.push(`FN:${escapeQrText(name)}`, `N:${escapeQrText(name)}`);
                    if (org) fields.push(`ORG:${escapeQrText(org)}`);
                    if (phone) fields.push(`TEL:${escapeQrText(phone)}`);
                    if (email) fields.push(`EMAIL:${escapeQrText(email)}`);
                    if (url) fields.push(`URL:${url}`);
                    if (address) fields.push(`ADR:;;${escapeQrText(address)};;;`);
                    fields.push('END:VCARD');
                    return fields.join('\n');
                }
                case 'tab-email': {
                    const to = document.getElementById('email-to').value.trim();
                    const subject = document.getElementById('email-subject').value.trim();
                    const body = document.getElementById('email-body').value.trim();
                    if (!to) return '';
                    const params = new URLSearchParams();
                    if (subject) params.set('subject', subject);
                    if (body) params.set('body', body);
                    return `mailto:${to}${params.size ? `?${params}` : ''}`;
                }
                case 'tab-sms': {
                    const phone = document.getElementById('sms-phone').value.trim();
                    const message = document.getElementById('sms-message').value.trim();
                    if (!phone) return '';
                    return `sms:${phone}${message ? `?body=${encodeURIComponent(message)}` : ''}`;
                }
                case 'tab-wifi': {
                    const ssid = document.getElementById('wifi-ssid').value.trim();
                    const password = document.getElementById('wifi-password').value;
                    const encryption = document.getElementById('wifi-encryption').value;
                    const hidden = document.getElementById('wifi-hidden').checked;
                    if (!ssid) return '';
                    return [
                        'WIFI:',
                        encryption !== 'nopass' ? `T:${encryption};` : '',
                        `S:${escapeQrText(ssid)};`,
                        encryption !== 'nopass' ? `P:${escapeQrText(password)};` : '',
                        hidden ? 'H:true;' : '',
                        ';'
                    ].join('');
                }
                case 'tab-file':
                    return null;
                default:
                    return '';
            }
        }

        function getDesignOptions() {
            return {
                size: Number.parseInt(document.getElementById('qr-size').value, 10),
                foreground: document.getElementById('qr-foreground').value,
                background: document.getElementById('qr-background').value,
                frameColor: document.getElementById('frame-color').value,
                frameStyle: document.getElementById('frame-style').value,
                shape: document.getElementById('qr-shape').value,
                errorLevel: document.getElementById('error-level').value,
                caption: document.getElementById('qr-caption').value.trim()
            };
        }

        function renderQr(content) {
            if (!content || typeof content !== 'string') return;
            const token = ++generationToken;
            const options = getDesignOptions();
            qrcode.replaceChildren();

            const wrapper = document.createElement('div');
            if (options.frameStyle !== 'none') {
                wrapper.className = 'qr-with-frame';
                const frame = document.createElement('div');
                frame.className = `qr-frame qr-frame-${options.frameStyle}`;
                frame.style.borderColor = options.frameColor;
                wrapper.append(frame);
            }

            const qrElement = document.createElement('div');
            qrElement.className = 'qr-styled-code';
            wrapper.append(qrElement);

            if (options.caption) {
                const caption = document.createElement('div');
                caption.className = 'qr-caption';
                caption.textContent = options.caption;
                caption.style.color = options.frameColor;
                wrapper.append(caption);
            }
            qrcode.append(wrapper);

            qrInstance = new QRCodeStyling({
                width: options.size,
                height: options.size,
                type: 'canvas',
                data: content,
                image: logoDataUrl || undefined,
                margin: 8,
                qrOptions: {
                    errorCorrectionLevel: logoDataUrl ? 'H' : options.errorLevel
                },
                dotsOptions: {
                    color: options.foreground,
                    type: options.shape
                },
                cornersSquareOptions: {
                    color: options.foreground,
                    type: options.shape === 'dots' ? 'extra-rounded' : 'square'
                },
                cornersDotOptions: {
                    color: options.foreground,
                    type: options.shape === 'square' ? 'square' : 'dot'
                },
                backgroundOptions: {
                    color: options.background
                },
                imageOptions: {
                    hideBackgroundDots: true,
                    imageSize: 0.32,
                    margin: 6,
                    crossOrigin: 'anonymous',
                    saveAsBlob: true
                }
            });
            qrInstance.append(qrElement);

            window.setTimeout(() => {
                if (token === generationToken && qrElement.querySelector('canvas, svg')) {
                    downloadBtn.disabled = false;
                }
            }, logoDataUrl ? 450 : 80);
        }

        function generateFromFile() {
            const fileInput = document.getElementById('file-upload');
            if (!fileInput.files.length) return;
            const file = fileInput.files[0];
            if (file.size > 100 * 1024) return;
            const reader = new FileReader();
            reader.onload = event => {
                if (event.target.result) renderQr(event.target.result);
            };
            reader.readAsDataURL(file);
        }

        function generateCurrentQr() {
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab?.id === 'tab-file') {
                generateFromFile();
                return;
            }
            renderQr(getQrContent());
        }

        function hasLiveContent() {
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab?.id === 'tab-file') {
                return document.getElementById('file-upload').files.length > 0;
            }
            return Boolean(getQrContent());
        }

        function scheduleLivePreview() {
            window.clearTimeout(livePreviewTimer);
            if (!hasLiveContent()) return;
            livePreviewTimer = window.setTimeout(generateCurrentQr, 300);
        }

        generateBtn.addEventListener('click', generateCurrentQr);

        document.querySelectorAll('.tab-btn[data-target]').forEach(button => {
            button.addEventListener('click', function () {
                resetGeneratedResult();
                window.setTimeout(scheduleLivePreview, 0);
            });
        });

        document.querySelectorAll('.qr-builder-editor input, .qr-builder-editor textarea, .qr-builder-editor select')
            .forEach(input => {
                ['input', 'change'].forEach(eventName => {
                    input.addEventListener(eventName, function () {
                        resetGeneratedResult();
                        scheduleLivePreview();
                    });
                });
            });

        const logoUpload = document.getElementById('logo-upload');
        logoUpload.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) {
                logoDataUrl = '';
                scheduleLivePreview();
                return;
            }
            if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
                alert('Please choose a PNG, JPG, or SVG logo smaller than 2 MB.');
                this.value = '';
                logoDataUrl = '';
                scheduleLivePreview();
                return;
            }
            const reader = new FileReader();
            reader.onload = event => {
                logoDataUrl = event.target.result;
                document.getElementById('error-level').value = 'H';
                resetGeneratedResult();
                scheduleLivePreview();
            };
            reader.readAsDataURL(file);
        });

        const frameColorInput = document.getElementById('frame-color');
        frameColorInput.addEventListener('input', function () {
            document.querySelectorAll('.qr-frame').forEach(frame => {
                frame.style.borderColor = this.value;
            });
        });

        downloadBtn.addEventListener('click', async function () {
            if (!qrInstance || this.disabled) return;
            this.disabled = true;
            const originalLabel = this.textContent;
            this.textContent = 'Preparing PNG…';

            try {
                const options = getDesignOptions();
                const blob = await qrInstance.getRawData('png');
                const bitmap = await createImageBitmap(blob);
                const hasFrame = options.frameStyle !== 'none';
                const padding = hasFrame ? 24 : 0;
                const captionHeight = options.caption ? 44 : 0;
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width + padding * 2;
                canvas.height = bitmap.height + padding * 2 + captionHeight;
                const context = canvas.getContext('2d');

                context.fillStyle = options.background;
                context.fillRect(0, 0, canvas.width, canvas.height);
                drawFrame(context, options, canvas.width, canvas.height - captionHeight);
                context.drawImage(bitmap, padding, padding);

                if (options.caption) {
                    context.fillStyle = options.frameColor;
                    context.font = `700 ${Math.max(16, Math.round(options.size / 15))}px Arial`;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(
                        options.caption,
                        canvas.width / 2,
                        canvas.height - captionHeight / 2,
                        canvas.width - 24
                    );
                }

                const link = document.createElement('a');
                link.download = 'make-qr-code.png';
                link.href = canvas.toDataURL('image/png');
                document.body.append(link);
                link.click();
                link.remove();
                bitmap.close();
            } catch (error) {
                console.error('Unable to download QR code:', error);
                alert('Unable to prepare the PNG. Please try again.');
            } finally {
                this.textContent = originalLabel;
                this.disabled = false;
            }
        });

        function drawFrame(context, options, width, height) {
            if (options.frameStyle === 'none') return;
            context.strokeStyle = options.frameColor;
            context.lineWidth = Math.max(4, Math.round(options.size / 28));
            const inset = context.lineWidth / 2 + 2;
            const frameWidth = width - inset * 2;
            const frameHeight = height - inset * 2;

            if (options.frameStyle === 'style-2') {
                context.beginPath();
                context.ellipse(width / 2, height / 2, frameWidth / 2, frameHeight / 2, 0, 0, Math.PI * 2);
                context.stroke();
            } else if (options.frameStyle === 'style-4') {
                context.setLineDash([12, 10]);
                context.strokeRect(inset, inset, frameWidth, frameHeight);
                context.setLineDash([]);
            } else if (options.frameStyle === 'style-5') {
                context.strokeRect(inset, inset, frameWidth, frameHeight);
                const inner = inset + context.lineWidth * 1.5;
                context.strokeRect(inner, inner, width - inner * 2, height - inner * 2);
            } else if (options.frameStyle === 'style-3') {
                const length = Math.max(24, options.size * 0.15);
                const x2 = width - inset;
                const y2 = height - inset;
                [[inset, inset, 1, 1], [x2, inset, -1, 1], [inset, y2, 1, -1], [x2, y2, -1, -1]]
                    .forEach(([x, y, dx, dy]) => {
                        context.beginPath();
                        context.moveTo(x, y + dy * length);
                        context.lineTo(x, y);
                        context.lineTo(x + dx * length, y);
                        context.stroke();
                    });
            } else {
                context.strokeRect(inset, inset, frameWidth, frameHeight);
            }
        }

        const fileUpload = document.getElementById('file-upload');
        const filePreview = document.getElementById('file-preview');
        const imagePreview = document.getElementById('image-preview');
        const pdfPreview = document.getElementById('pdf-preview');
        const pdfName = document.getElementById('pdf-name');

        fileUpload.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) {
                filePreview.classList.add('hidden');
                return;
            }
            if (file.size > 100 * 1024) {
                alert('File QR codes are limited to 100 KB so they remain scannable.');
                this.value = '';
                filePreview.classList.add('hidden');
                resetGeneratedResult();
                return;
            }
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = event => {
                    imagePreview.src = event.target.result;
                    imagePreview.classList.remove('hidden');
                    pdfPreview.classList.add('hidden');
                    filePreview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            } else {
                pdfName.textContent = file.name;
                imagePreview.classList.add('hidden');
                pdfPreview.classList.remove('hidden');
                filePreview.classList.remove('hidden');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initQRGenerator);
    } else {
        initQRGenerator();
    }
})();
