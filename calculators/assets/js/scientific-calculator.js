class ScientificCalculator {
    constructor() {
        this.previousOperandEl = document.getElementById('previousOperand');
        this.currentOperandEl = document.getElementById('currentOperand');
        this.angleModeEl = document.getElementById('angleMode');
        this.angleModeBtn = document.getElementById('angleModeBtn');
        this.memoryBadgeEl = document.getElementById('memoryBadge');
        this.historyListEls = [
            document.getElementById('historyList'),
            document.getElementById('historyListDesktop')
        ].filter(function (el) { return el; });
        this.historyModalEl = document.getElementById('historyModal');
        this.errorEl = document.getElementById('calcError');

        this.angleMode = 'DEG';
        this.memory = 0;
        this.history = [];
        this.shouldResetDisplay = false;
        this.errorMessage = '';

        this.loadState();
        this.currentOperand = '';
        this.previousOperand = '';
        this.operation = undefined;
        this.errorMessage = '';
        this.shouldResetDisplay = false;
        this.syncModeUI();
        this.syncMemoryUI();
        this.updateDisplay();
        this.bindKeyboard();
        this.bindModal();
        this.updateHistoryDisplay();
    }

    loadState() {
        try {
            var saved = JSON.parse(localStorage.getItem('sciCalcState') || '{}');
            if (saved.angleMode === 'DEG' || saved.angleMode === 'RAD') {
                this.angleMode = saved.angleMode;
            }
            if (typeof saved.memory === 'number' && isFinite(saved.memory)) {
                this.memory = saved.memory;
            }
            if (Array.isArray(saved.history)) {
                this.history = saved.history.slice(0, 50);
            }
        } catch (e) {
            /* ignore corrupt storage */
        }
        this.syncModeUI();
        this.syncMemoryUI();
    }

    saveState() {
        try {
            localStorage.setItem('sciCalcState', JSON.stringify({
                angleMode: this.angleMode,
                memory: this.memory,
                history: this.history.slice(0, 50)
            }));
        } catch (e) {
            /* ignore quota errors */
        }
    }

    clear() {
        this.currentOperand = '';
        this.previousOperand = '';
        this.operation = undefined;
        this.errorMessage = '';
        this.shouldResetDisplay = false;
        if (this.errorEl) {
            this.errorEl.textContent = '';
            this.errorEl.hidden = true;
        }
        this.updateDisplay();
    }

    resetInput() {
        this.currentOperand = '';
        this.shouldResetDisplay = false;
    }

    delete() {
        if (this.errorMessage) {
            this.clear();
            return;
        }
        if (this.shouldResetDisplay) {
            this.resetInput();
        }
        this.currentOperand = this.currentOperand.toString().slice(0, -1);
        if (this.currentOperand === '' || this.currentOperand === '-') {
            this.currentOperand = '';
        }
        this.updateDisplay();
    }

    appendNumber(number) {
        if (this.errorMessage) {
            this.clear();
        }
        if (this.shouldResetDisplay) {
            this.resetInput();
        }
        if (number === '.' && this.currentOperand.includes('.')) return;
        if (this.currentOperand === '0' && number !== '.') {
            this.currentOperand = number.toString();
        } else {
            this.currentOperand = this.currentOperand.toString() + number.toString();
        }
        this.updateDisplay();
    }

    insertConstant(value) {
        if (this.errorMessage) this.clear();
        this.currentOperand = String(value);
        this.shouldResetDisplay = true;
        this.updateDisplay();
    }

    toggleSign() {
        if (this.errorMessage) return;
        if (this.currentOperand === '' || this.shouldResetDisplay) {
            this.currentOperand = '-';
            this.shouldResetDisplay = false;
            this.updateDisplay();
            return;
        }
        if (this.currentOperand.startsWith('-')) {
            this.currentOperand = this.currentOperand.slice(1);
        } else {
            this.currentOperand = '-' + this.currentOperand;
        }
        this.updateDisplay();
    }

    chooseOperation(operation) {
        if (this.errorMessage) return;
        if (this.currentOperand === '') return;

        if (this.previousOperand !== '' && !this.shouldResetDisplay) {
            this.compute(true);
            if (this.errorMessage) return;
        }

        this.operation = operation;
        this.previousOperand = this.currentOperand;
        this.currentOperand = '';
        this.shouldResetDisplay = false;
        this.updateDisplay();
    }

    compute(chaining) {
        if (this.errorMessage) return;
        if (this.previousOperand === '' || this.currentOperand === '') return;

        var prev = parseFloat(this.previousOperand);
        var current = parseFloat(this.currentOperand);
        if (isNaN(prev) || isNaN(current)) return;

        var opSymbol = this.operation;
        var calculation = this.getDisplayNumber(this.previousOperand) + ' ' + opSymbol + ' ' + this.getDisplayNumber(this.currentOperand);
        var computation;

        switch (this.operation) {
            case '+': computation = prev + current; break;
            case '-': computation = prev - current; break;
            case '×': computation = prev * current; break;
            case '÷':
                if (current === 0) {
                    this.showError('Cannot divide by zero');
                    return;
                }
                computation = prev / current;
                break;
            case '%': computation = (prev * current) / 100; break;
            case '^': computation = Math.pow(prev, current); break;
            default: return;
        }

        if (!isFinite(computation)) {
            this.showError('Math error');
            return;
        }

        if (!chaining) {
            this.addToHistory(calculation, computation);
        }

        this.currentOperand = String(computation);
        this.operation = undefined;
        this.previousOperand = '';
        this.shouldResetDisplay = true;
        this.updateDisplay();
    }

    calculateFunction(func) {
        if (this.errorMessage) this.clear();

        var raw = this.currentOperand === '' ? '0' : this.currentOperand;
        var current = parseFloat(raw);
        if (isNaN(current)) return;

        var toRad = this.angleMode === 'DEG' ? Math.PI / 180 : 1;
        var toDeg = this.angleMode === 'DEG' ? 180 / Math.PI : 1;
        var result;
        var calculation;

        switch (func) {
            case 'sin':
                result = Math.sin(current * toRad);
                calculation = 'sin(' + this.formatDisplayValue(current) + ')';
                break;
            case 'cos':
                result = Math.cos(current * toRad);
                calculation = 'cos(' + this.formatDisplayValue(current) + ')';
                break;
            case 'tan':
                result = Math.tan(current * toRad);
                calculation = 'tan(' + this.formatDisplayValue(current) + ')';
                break;
            case 'asin':
                if (current < -1 || current > 1) {
                    this.showError('asin: value must be −1 to 1');
                    return;
                }
                result = Math.asin(current) * toDeg;
                calculation = 'asin(' + this.formatDisplayValue(current) + ')';
                break;
            case 'acos':
                if (current < -1 || current > 1) {
                    this.showError('acos: value must be −1 to 1');
                    return;
                }
                result = Math.acos(current) * toDeg;
                calculation = 'acos(' + this.formatDisplayValue(current) + ')';
                break;
            case 'atan':
                result = Math.atan(current) * toDeg;
                calculation = 'atan(' + this.formatDisplayValue(current) + ')';
                break;
            case 'log':
                if (current <= 0) {
                    this.showError('log: value must be > 0');
                    return;
                }
                result = Math.log10(current);
                calculation = 'log(' + this.formatDisplayValue(current) + ')';
                break;
            case 'ln':
                if (current <= 0) {
                    this.showError('ln: value must be > 0');
                    return;
                }
                result = Math.log(current);
                calculation = 'ln(' + this.formatDisplayValue(current) + ')';
                break;
            case 'sqrt':
                if (current < 0) {
                    this.showError('√: value must be ≥ 0');
                    return;
                }
                result = Math.sqrt(current);
                calculation = '√(' + this.formatDisplayValue(current) + ')';
                break;
            case 'square':
                result = current * current;
                calculation = '(' + this.formatDisplayValue(current) + ')²';
                break;
            case 'exp':
                result = Math.exp(current);
                calculation = 'e^(' + this.formatDisplayValue(current) + ')';
                break;
            case 'pow10':
                result = Math.pow(10, current);
                calculation = '10^(' + this.formatDisplayValue(current) + ')';
                break;
            case 'factorial':
                if (current < 0 || current !== Math.floor(current)) {
                    this.showError('x!: integer ≥ 0 only');
                    return;
                }
                if (current > 170) {
                    this.showError('x!: number too large');
                    return;
                }
                result = this.factorial(current);
                calculation = this.formatDisplayValue(current) + '!';
                break;
            case 'reciprocal':
                if (current === 0) {
                    this.showError('Cannot divide by zero');
                    return;
                }
                result = 1 / current;
                calculation = '1/(' + this.formatDisplayValue(current) + ')';
                break;
            default:
                return;
        }

        if (!isFinite(result)) {
            this.showError('Math error');
            return;
        }

        this.addToHistory(calculation, result);
        this.currentOperand = String(result);
        this.shouldResetDisplay = true;
        this.updateDisplay();
    }

    factorial(n) {
        if (n === 0 || n === 1) return 1;
        var result = 1;
        for (var i = 2; i <= n; i++) result *= i;
        return result;
    }

    toggleMode() {
        this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
        this.syncModeUI();
        this.saveState();
    }

    syncModeUI() {
        if (this.angleModeEl) this.angleModeEl.textContent = this.angleMode;
        if (this.angleModeBtn) {
            this.angleModeBtn.textContent = this.angleMode;
            this.angleModeBtn.setAttribute('aria-pressed', this.angleMode === 'RAD' ? 'true' : 'false');
        }
    }

    clearMemory() {
        this.memory = 0;
        this.syncMemoryUI();
        this.saveState();
    }

    recallMemory() {
        if (this.errorMessage) this.clear();
        this.currentOperand = String(this.memory);
        this.shouldResetDisplay = true;
        this.updateDisplay();
    }

    addToMemory() {
        var current = parseFloat(this.currentOperand);
        if (!isNaN(current)) {
            this.memory += current;
            this.syncMemoryUI();
            this.saveState();
        }
    }

    subtractFromMemory() {
        var current = parseFloat(this.currentOperand);
        if (!isNaN(current)) {
            this.memory -= current;
            this.syncMemoryUI();
            this.saveState();
        }
    }

    syncMemoryUI() {
        if (!this.memoryBadgeEl) return;
        if (this.memory !== 0) {
            this.memoryBadgeEl.hidden = false;
            this.memoryBadgeEl.textContent = 'M';
            this.memoryBadgeEl.title = 'Memory: ' + this.formatResult(this.memory);
        } else {
            this.memoryBadgeEl.hidden = true;
        }
    }

    showError(message) {
        this.errorMessage = message;
        if (this.errorEl) {
            this.errorEl.textContent = message;
            this.errorEl.hidden = false;
        }
        this.previousOperand = '';
        this.operation = undefined;
        this.currentOperandEl.textContent = 'Error';
        this.previousOperandEl.textContent = '';
    }

    formatResult(number) {
        var num = typeof number === 'number' ? number : parseFloat(number);
        if (!isFinite(num)) return 'Error';
        if (num === 0) return '0';

        var abs = Math.abs(num);
        if (abs >= 1e12 || (abs < 1e-8)) {
            return num.toExponential(8).replace(/\.?0+e/i, 'e');
        }

        var rounded = parseFloat(num.toPrecision(12));
        return rounded.toString();
    }

    formatDisplayValue(number) {
        return this.getDisplayNumber(number);
    }

    getDisplayNumber(number) {
        if (number === '' || number === undefined || number === null) {
            return '0';
        }
        var str = String(number);
        if (str === '-' || str.endsWith('.')) {
            return str;
        }
        var num = parseFloat(str);
        if (isNaN(num)) {
            return str;
        }
        return this.formatResult(num);
    }

    updateDisplay() {
        if (this.errorMessage) return;

        if (this.errorEl) this.errorEl.hidden = true;

        if (this.currentOperand === '') {
            this.currentOperandEl.textContent = '0';
        } else {
            this.currentOperandEl.textContent = this.getDisplayNumber(this.currentOperand);
        }

        if (this.operation != null && this.previousOperand !== '') {
            this.previousOperandEl.textContent =
                this.getDisplayNumber(this.previousOperand) + ' ' + this.operation;
        } else {
            this.previousOperandEl.textContent = '';
        }
    }

    toggleHistory() {
        if (!this.historyModalEl) return;
        var open = this.historyModalEl.hidden;
        this.historyModalEl.hidden = !open;
        if (open) {
            this.updateHistoryDisplay();
            document.body.classList.add('sci-modal-open');
        } else {
            document.body.classList.remove('sci-modal-open');
        }
    }

    closeHistory() {
        if (!this.historyModalEl) return;
        this.historyModalEl.hidden = true;
        document.body.classList.remove('sci-modal-open');
    }

    addToHistory(calculation, result) {
        this.history.unshift({
            calculation: calculation,
            result: result,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        if (this.history.length > 50) this.history.pop();
        this.saveState();
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        var self = this;
        var html;

        if (this.history.length === 0) {
            html = '<p class="sci-history-empty">No calculations yet</p>';
        } else {
            html = this.history.map(function (item, index) {
                return '<button type="button" class="sci-history-item" data-index="' + index + '">' +
                    '<span class="sci-history-expr">' + escapeHtml(item.calculation) + '</span>' +
                    '<span class="sci-history-eq">= ' + escapeHtml(self.formatResult(item.result)) + '</span>' +
                    '<span class="sci-history-time">' + escapeHtml(item.time) + '</span>' +
                    '</button>';
            }).join('');
        }

        this.historyListEls.forEach(function (el) {
            el.innerHTML = html;
            el.querySelectorAll('.sci-history-item').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var idx = parseInt(btn.getAttribute('data-index'), 10);
                    self.useHistoryResult(idx);
                });
            });
        });
    }

    useHistoryResult(index) {
        var item = this.history[index];
        if (!item) return;
        this.errorMessage = '';
        this.currentOperand = String(item.result);
        this.shouldResetDisplay = true;
        this.updateDisplay();
        this.closeHistory();
    }

    clearHistory() {
        if (this.history.length && confirm('Clear all calculation history?')) {
            this.history = [];
            this.updateHistoryDisplay();
            this.saveState();
        }
    }

    bindModal() {
        var self = this;
        if (this.historyModalEl) {
            this.historyModalEl.addEventListener('click', function (e) {
                if (e.target === self.historyModalEl) self.closeHistory();
            });
        }
    }

    bindKeyboard() {
        var self = this;
        var keyMap = {
            '0': function () { self.appendNumber('0'); },
            '1': function () { self.appendNumber('1'); },
            '2': function () { self.appendNumber('2'); },
            '3': function () { self.appendNumber('3'); },
            '4': function () { self.appendNumber('4'); },
            '5': function () { self.appendNumber('5'); },
            '6': function () { self.appendNumber('6'); },
            '7': function () { self.appendNumber('7'); },
            '8': function () { self.appendNumber('8'); },
            '9': function () { self.appendNumber('9'); },
            '.': function () { self.appendNumber('.'); },
            '+': function () { self.chooseOperation('+'); },
            '-': function () { self.chooseOperation('-'); },
            '*': function () { self.chooseOperation('×'); },
            '/': function () { self.chooseOperation('÷'); },
            '%': function () { self.chooseOperation('%'); },
            '^': function () { self.chooseOperation('^'); },
            'Enter': function () { self.compute(); },
            '=': function () { self.compute(); },
            'Backspace': function () { self.delete(); },
            'Delete': function () { self.clear(); },
            'Escape': function () { self.closeHistory(); }
        };

        document.addEventListener('keydown', function (e) {
            if (e.target.closest('input, textarea, select')) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            if (e.key === 'Escape') {
                self.closeHistory();
                return;
            }

            var action = keyMap[e.key];
            if (action) {
                e.preventDefault();
                action();
            }
        });
    }
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

var sciCalc;
document.addEventListener('DOMContentLoaded', function () {
    sciCalc = new ScientificCalculator();
});
