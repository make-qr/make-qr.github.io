/**
 * QR Code Generator - homepage logic
 */
(function () {
    function initQRGenerator() {
        const generateBtn = document.getElementById('generate-btn');
        const downloadBtn = document.getElementById('download-btn');
        const qrcodeContainer = document.getElementById('qrcode-container');
        const qrcode = document.getElementById('qrcode');

        if (!generateBtn || !downloadBtn || !qrcode) return;

        let selectedFrameStyle = 'none';

        document.querySelectorAll('.frame-option').forEach(option => {
            option.addEventListener('click', function () {
                document.querySelectorAll('.frame-option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                selectedFrameStyle = this.getAttribute('data-frame-style');
            });
        });

        const frameColorInput = document.getElementById('frame-color');
        if (frameColorInput) {
            frameColorInput.addEventListener('input', function () {
                const frameColor = this.value;
                document.querySelectorAll('.frame-preview-inner').forEach(frame => {
                    if (frame.classList.length > 1) {
                        frame.style.borderColor = frameColor;
                    }
                });
            });
        }

        function generateQRCode(text) {
            if (!text || typeof text !== 'string') {
                alert('Cannot generate QR code: Invalid data');
                return;
            }

            try {
                qrcode.innerHTML = '';

                const size = parseInt(document.getElementById('qr-size').value, 10);
                const foreground = document.getElementById('qr-foreground').value;
                const background = document.getElementById('qr-background').value;
                const frameColor = document.getElementById('frame-color').value;
                const caption = document.getElementById('qr-caption').value.trim();

                const qrContainer = document.createElement('div');

                if (selectedFrameStyle !== 'none') {
                    qrContainer.className = 'qr-with-frame';
                    const frameElement = document.createElement('div');
                    frameElement.className = `qr-frame qr-frame-${selectedFrameStyle}`;
                    frameElement.style.borderColor = frameColor;
                    qrContainer.appendChild(frameElement);
                }

                const qrElement = document.createElement('div');
                qrElement.id = 'qr-code-element';
                qrContainer.appendChild(qrElement);

                if (caption) {
                    const captionElement = document.createElement('div');
                    captionElement.className = 'qr-caption';
                    captionElement.textContent = caption;
                    captionElement.style.color = frameColor;
                    qrContainer.appendChild(captionElement);
                }

                qrcode.appendChild(qrContainer);

                new QRCode(qrElement, {
                    text: text,
                    width: size,
                    height: size,
                    colorDark: foreground,
                    colorLight: background,
                    correctLevel: QRCode.CorrectLevel.H
                });

                qrcodeContainer.classList.remove('hidden');
                downloadBtn.disabled = false;
            } catch (error) {
                console.error('Error generating QR code:', error);
                alert('Cannot generate QR code: ' + error.message);
                qrcode.innerHTML = '';
                qrcodeContainer.classList.add('hidden');
                downloadBtn.disabled = true;
            }
        }

        generateBtn.addEventListener('click', function () {
            const activeTab = document.querySelector('.tab-content.active');
            if (!activeTab) return;

            let qrContent = '';

            switch (activeTab.id) {
                case 'tab-text':
                    qrContent = document.getElementById('text-input').value.trim();
                    break;
                case 'tab-url':
                    qrContent = document.getElementById('url-input').value.trim();
                    break;
                case 'tab-vcard': {
                    const name = document.getElementById('vcard-name').value.trim();
                    const org = document.getElementById('vcard-org').value.trim();
                    const phone = document.getElementById('vcard-phone').value.trim();
                    const email = document.getElementById('vcard-email').value.trim();
                    const url = document.getElementById('vcard-url').value.trim();
                    const address = document.getElementById('vcard-address').value.trim();
                    qrContent = 'BEGIN:VCARD\nVERSION:3.0\n';
                    if (name) qrContent += `FN:${name}\nN:${name}\n`;
                    if (org) qrContent += `ORG:${org}\n`;
                    if (phone) qrContent += `TEL:${phone}\n`;
                    if (email) qrContent += `EMAIL:${email}\n`;
                    if (url) qrContent += `URL:${url}\n`;
                    if (address) qrContent += `ADR:;;${address};;;\n`;
                    qrContent += 'END:VCARD';
                    break;
                }
                case 'tab-email': {
                    const emailTo = document.getElementById('email-to').value.trim();
                    const emailSubject = document.getElementById('email-subject').value.trim();
                    const emailBody = document.getElementById('email-body').value.trim();
                    qrContent = `mailto:${emailTo}`;
                    if (emailSubject || emailBody) {
                        qrContent += '?';
                        if (emailSubject) qrContent += `subject=${encodeURIComponent(emailSubject)}`;
                        if (emailSubject && emailBody) qrContent += '&';
                        if (emailBody) qrContent += `body=${encodeURIComponent(emailBody)}`;
                    }
                    break;
                }
                case 'tab-sms': {
                    const smsPhone = document.getElementById('sms-phone').value.trim();
                    const smsMessage = document.getElementById('sms-message').value.trim();
                    qrContent = `sms:${smsPhone}`;
                    if (smsMessage) qrContent += `?body=${encodeURIComponent(smsMessage)}`;
                    break;
                }
                case 'tab-wifi': {
                    const wifiSsid = document.getElementById('wifi-ssid').value.trim();
                    const wifiPassword = document.getElementById('wifi-password').value;
                    const wifiEncryption = document.getElementById('wifi-encryption').value;
                    const wifiHidden = document.getElementById('wifi-hidden').checked;
                    qrContent = 'WIFI:';
                    if (wifiEncryption !== 'nopass') qrContent += `T:${wifiEncryption};`;
                    qrContent += `S:${wifiSsid};`;
                    if (wifiEncryption !== 'nopass') qrContent += `P:${wifiPassword};`;
                    if (wifiHidden) qrContent += 'H:true;';
                    qrContent += ';';
                    break;
                }
                case 'tab-file': {
                    const fileInput = document.getElementById('file-upload');
                    if (!fileInput.files.length) {
                        alert('Please select a file!');
                        return;
                    }
                    const file = fileInput.files[0];
                    if (file.size > 1024 * 100) {
                        alert('File is too large! QR code may not work. Please select a file smaller than 100KB.');
                    }
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        if (!e.target.result) {
                            alert('Cannot read file data.');
                            return;
                        }
                        if (e.target.result.length > 1024 * 200) {
                            alert('Converted file is too large. QR code may not work properly. Please select a smaller file.');
                        }
                        generateQRCode(e.target.result);
                    };
                    reader.onerror = function () {
                        alert('Error reading file. Please try another file.');
                    };
                    reader.readAsDataURL(file);
                    return;
                }
            }

            if (!qrContent) {
                alert('Please enter content to generate QR code!');
                return;
            }
            generateQRCode(qrContent);
        });

        downloadBtn.addEventListener('click', function () {
            const qrImg = qrcode.querySelector('img');
            if (!qrImg) {
                alert('Please generate a QR code first!');
                return;
            }

            const qrWithFrame = qrcode.querySelector('.qr-with-frame') || qrcode;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const padding = 20;
            const hasFrame = qrWithFrame.classList.contains('qr-with-frame');
            const hasCaption = qrWithFrame.querySelector('.qr-caption');
            const captionHeight = hasCaption ? 40 : 0;
            const frameWidth = hasFrame ? padding * 2 : 0;

            canvas.width = qrImg.width + frameWidth;
            canvas.height = qrImg.height + frameWidth + captionHeight;

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (hasFrame) {
                const frameColor = document.getElementById('frame-color').value;
                ctx.strokeStyle = frameColor;
                ctx.lineWidth = 10;

                if (selectedFrameStyle === 'style-1') {
                    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - captionHeight - 10);
                    ctx.lineWidth = 1;
                    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - captionHeight - 30);
                } else if (selectedFrameStyle === 'style-2') {
                    ctx.beginPath();
                    ctx.arc(canvas.width / 2, (canvas.height - captionHeight) / 2, canvas.width / 2 - 10, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (selectedFrameStyle === 'style-4') {
                    ctx.setLineDash([10, 10]);
                    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - captionHeight - 10);
                } else if (selectedFrameStyle === 'style-5') {
                    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - captionHeight - 10);
                    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - captionHeight - 30);
                } else {
                    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - captionHeight - 10);
                }
            }

            ctx.drawImage(qrImg, hasFrame ? padding / 2 : 0, hasFrame ? padding / 2 : 0);

            if (hasCaption) {
                ctx.font = 'bold 20px Arial';
                ctx.fillStyle = document.getElementById('frame-color').value;
                ctx.textAlign = 'center';
                ctx.fillText(hasCaption.textContent, canvas.width / 2, canvas.height - captionHeight / 2);
            }

            const link = document.createElement('a');
            link.download = 'qrcode-with-frame.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        const fileUpload = document.getElementById('file-upload');
        if (fileUpload) {
            const filePreview = document.getElementById('file-preview');
            const imagePreview = document.getElementById('image-preview');
            const pdfPreview = document.getElementById('pdf-preview');
            const pdfName = document.getElementById('pdf-name');

            fileUpload.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (!file) {
                    filePreview.classList.add('hidden');
                    return;
                }

                const MAX_FILE_SIZE = 100 * 1024;
                if (file.size > MAX_FILE_SIZE) {
                    alert(`File is too large (${Math.round(file.size / 1024)}KB). Please select a file smaller than ${MAX_FILE_SIZE / 1024}KB.`);
                    fileUpload.value = '';
                    filePreview.classList.add('hidden');
                    return;
                }

                const fileType = document.getElementById('file-type').value;

                if (fileType === 'image') {
                    if (!file.type.startsWith('image/')) {
                        alert('Please select an image file');
                        fileUpload.value = '';
                        filePreview.classList.add('hidden');
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = function (event) {
                        imagePreview.src = event.target.result;
                        imagePreview.classList.remove('hidden');
                        pdfPreview.classList.add('hidden');
                        filePreview.classList.remove('hidden');
                    };
                    reader.readAsDataURL(file);
                } else if (fileType === 'pdf') {
                    if (file.type !== 'application/pdf') {
                        alert('Please select a PDF file');
                        fileUpload.value = '';
                        filePreview.classList.add('hidden');
                        return;
                    }
                    pdfName.textContent = file.name;
                    imagePreview.classList.add('hidden');
                    pdfPreview.classList.remove('hidden');
                    filePreview.classList.remove('hidden');
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initQRGenerator);
    } else {
        initQRGenerator();
    }
})();
