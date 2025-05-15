// QR Code Generator Functions
function generateQRCode(text, options = {}) {
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    
    const defaultOptions = {
        text: text,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    };

    new QRCode(qrContainer, { ...defaultOptions, ...options });
}

// QR Code Scanner Functions
function initQRScanner() {
    const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader", { fps: 10, qrbox: 250 }
    );
    
    html5QrcodeScanner.render((decodedText, decodedResult) => {
        document.getElementById('scan-result').value = decodedText;
        html5QrcodeScanner.clear();
    });
}

// QR Code Frame Functions
function applyQRFrame(frameStyle) {
    const qrContainer = document.querySelector('.qr-with-frame');
    qrContainer.className = 'qr-with-frame';
    if (frameStyle) {
        qrContainer.classList.add(`qr-frame-style-${frameStyle}`);
    }
}

// QR Code Caption Functions
function updateQRCaption(text) {
    const caption = document.querySelector('.qr-caption');
    if (caption) {
        caption.textContent = text;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-qr');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            const text = document.getElementById('qr-text').value;
            const color = document.getElementById('qr-color').value;
            generateQRCode(text, { colorDark: color });
        });
    }

    const frameOptions = document.querySelectorAll('.frame-option');
    frameOptions.forEach(option => {
        option.addEventListener('click', () => {
            const frameStyle = option.dataset.style;
            applyQRFrame(frameStyle);
        });
    });
}); 