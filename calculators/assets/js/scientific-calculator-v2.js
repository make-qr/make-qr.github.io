class ExpressionParser {
    constructor(expression, options) {
        this.angleMode = options.angleMode;
        this.ans = options.ans;
        this.tokens = this.tokenize(expression);
        this.position = 0;
    }

    tokenize(expression) {
        const source = String(expression)
            .replace(/[×·]/g, '*')
            .replace(/÷/g, '/')
            .replace(/[−–]/g, '-')
            .replace(/√/g, 'sqrt')
            .replace(/π/g, 'pi');
        const tokens = [];
        let index = 0;

        while (index < source.length) {
            const rest = source.slice(index);
            const whitespace = rest.match(/^\s+/);
            if (whitespace) {
                index += whitespace[0].length;
                continue;
            }

            const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
            if (number) {
                tokens.push({type: 'number', value: Number(number[0])});
                index += number[0].length;
                continue;
            }

            const identifier = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
            if (identifier) {
                tokens.push({type: 'identifier', value: identifier[0].toLowerCase()});
                index += identifier[0].length;
                continue;
            }

            const symbol = rest[0];
            if ('+-*/^%!(),'.includes(symbol)) {
                tokens.push({type: 'symbol', value: symbol});
                index += 1;
                continue;
            }

            throw new Error('Unsupported character: ' + symbol);
        }

        return this.addImplicitMultiplication(tokens);
    }

    addImplicitMultiplication(tokens) {
        const result = [];
        const constants = new Set(['pi', 'e', 'ans']);
        const endsValue = token => token && (
            token.type === 'number' ||
            (token.type === 'identifier' && constants.has(token.value)) ||
            (token.type === 'symbol' && [')', '!', '%'].includes(token.value))
        );
        const startsValue = token => token && (
            token.type === 'number' ||
            token.type === 'identifier' ||
            (token.type === 'symbol' && token.value === '(')
        );

        tokens.forEach(token => {
            const previous = result[result.length - 1];
            const isFunctionCall = previous && previous.type === 'identifier' &&
                !constants.has(previous.value) && token.type === 'symbol' && token.value === '(';
            if (endsValue(previous) && startsValue(token) && !isFunctionCall) {
                result.push({type: 'symbol', value: '*'});
            }
            result.push(token);
        });
        return result;
    }

    evaluate() {
        if (this.tokens.length === 0) throw new Error('Enter an expression');
        const value = this.parseAdditive();
        if (this.position !== this.tokens.length) {
            throw new Error('Unexpected token: ' + this.peek().value);
        }
        if (!Number.isFinite(value)) throw new Error('Result is outside the supported range');
        return value;
    }

    peek(value) {
        const token = this.tokens[this.position];
        if (value === undefined) return token;
        return token && token.value === value;
    }

    consume(value) {
        if (!this.peek(value)) return false;
        this.position += 1;
        return true;
    }

    expect(value) {
        if (!this.consume(value)) throw new Error('Expected “' + value + '”');
    }

    parseAdditive() {
        let value = this.parseMultiplicative();
        while (this.peek('+') || this.peek('-')) {
            const operator = this.tokens[this.position++].value;
            const right = this.parseMultiplicative();
            value = operator === '+' ? value + right : value - right;
        }
        return value;
    }

    parseMultiplicative() {
        let value = this.parseUnary();
        while (this.peek('*') || this.peek('/')) {
            const operator = this.tokens[this.position++].value;
            const right = this.parseUnary();
            if (operator === '/' && right === 0) throw new Error('Cannot divide by zero');
            value = operator === '*' ? value * right : value / right;
        }
        return value;
    }

    parseUnary() {
        if (this.consume('+')) return this.parseUnary();
        if (this.consume('-')) return -this.parseUnary();
        return this.parsePower();
    }

    parsePower() {
        const base = this.parsePostfix();
        if (this.consume('^')) return Math.pow(base, this.parseUnary());
        return base;
    }

    parsePostfix() {
        let value = this.parsePrimary();
        while (this.peek('!') || this.peek('%')) {
            if (this.consume('!')) value = this.factorial(value);
            else if (this.consume('%')) value /= 100;
        }
        return value;
    }

    parsePrimary() {
        const token = this.peek();
        if (!token) throw new Error('Expression is incomplete');

        if (token.type === 'number') {
            this.position += 1;
            return token.value;
        }

        if (this.consume('(')) {
            const value = this.parseAdditive();
            this.expect(')');
            return value;
        }

        if (token.type === 'identifier') {
            this.position += 1;
            if (token.value === 'pi') return Math.PI;
            if (token.value === 'e') return Math.E;
            if (token.value === 'ans') return this.ans;
            this.expect('(');
            const args = [];
            if (!this.peek(')')) {
                do {
                    args.push(this.parseAdditive());
                } while (this.consume(','));
            }
            this.expect(')');
            return this.callFunction(token.value, args);
        }

        throw new Error('Unexpected token: ' + token.value);
    }

    callFunction(name, args) {
        const oneArgument = () => {
            if (args.length !== 1) throw new Error(name + ' expects one value');
            return args[0];
        };
        const radians = value => this.angleMode === 'DEG' ? value * Math.PI / 180 : value;
        const angleResult = value => this.angleMode === 'DEG' ? value * 180 / Math.PI : value;
        let value;

        switch (name) {
            case 'sin': return Math.sin(radians(oneArgument()));
            case 'cos': return Math.cos(radians(oneArgument()));
            case 'tan': return Math.tan(radians(oneArgument()));
            case 'asin':
                value = oneArgument();
                if (value < -1 || value > 1) throw new Error('asin expects −1 to 1');
                return angleResult(Math.asin(value));
            case 'acos':
                value = oneArgument();
                if (value < -1 || value > 1) throw new Error('acos expects −1 to 1');
                return angleResult(Math.acos(value));
            case 'atan': return angleResult(Math.atan(oneArgument()));
            case 'sqrt':
                value = oneArgument();
                if (value < 0) throw new Error('Square root requires a value ≥ 0');
                return Math.sqrt(value);
            case 'log':
                value = oneArgument();
                if (value <= 0) throw new Error('log requires a value > 0');
                return Math.log10(value);
            case 'ln':
                value = oneArgument();
                if (value <= 0) throw new Error('ln requires a value > 0');
                return Math.log(value);
            case 'exp': return Math.exp(oneArgument());
            case 'abs': return Math.abs(oneArgument());
            case 'floor': return Math.floor(oneArgument());
            case 'ceil': return Math.ceil(oneArgument());
            case 'round': return Math.round(oneArgument());
            case 'pow':
                if (args.length !== 2) throw new Error('pow expects two values');
                return Math.pow(args[0], args[1]);
            case 'root':
                if (args.length !== 2 || args[1] === 0) throw new Error('root expects value and non-zero degree');
                return Math.pow(args[0], 1 / args[1]);
            case 'ncr':
                if (args.length !== 2) throw new Error('nCr expects two integers');
                return this.combination(args[0], args[1]);
            case 'npr':
                if (args.length !== 2) throw new Error('nPr expects two integers');
                return this.permutation(args[0], args[1]);
            case 'min': return Math.min(...args);
            case 'max': return Math.max(...args);
            default: throw new Error('Unknown function: ' + name);
        }
    }

    factorial(value) {
        if (!Number.isInteger(value) || value < 0) throw new Error('Factorial requires an integer ≥ 0');
        if (value > 170) throw new Error('Factorial value is too large');
        let result = 1;
        for (let index = 2; index <= value; index += 1) result *= index;
        return result;
    }

    combination(n, r) {
        if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
            throw new Error('nCr requires integers where 0 ≤ r ≤ n');
        }
        return this.factorial(n) / (this.factorial(r) * this.factorial(n - r));
    }

    permutation(n, r) {
        if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
            throw new Error('nPr requires integers where 0 ≤ r ≤ n');
        }
        return this.factorial(n) / this.factorial(n - r);
    }
}

class ScientificCalculator {
    constructor() {
        this.expressionInput = document.getElementById('expressionInput');
        this.previousOperandEl = document.getElementById('previousOperand');
        this.currentOperandEl = document.getElementById('currentOperand');
        this.angleModeEl = document.getElementById('angleMode');
        this.angleModeBtn = document.getElementById('angleModeBtn');
        this.memoryBadgeEl = document.getElementById('memoryBadge');
        this.errorEl = document.getElementById('calcError');
        this.historyModalEl = document.getElementById('historyModal');
        this.historyListEls = [
            document.getElementById('historyList'),
            document.getElementById('historyListDesktop')
        ].filter(Boolean);
        this.angleMode = 'DEG';
        this.memory = 0;
        this.ans = 0;
        this.history = [];
        this.justEvaluated = false;
        this.previewTimer = null;

        this.loadState();
        this.syncModeUI();
        this.syncMemoryUI();
        this.bindInput();
        this.bindModal();
        this.preserveCursorOnButtons();
        this.updateHistoryDisplay();
        this.expressionInput.focus();
    }

    loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem('sciCalcState') || '{}');
            if (saved.angleMode === 'DEG' || saved.angleMode === 'RAD') this.angleMode = saved.angleMode;
            if (Number.isFinite(saved.memory)) this.memory = saved.memory;
            if (Number.isFinite(saved.ans)) this.ans = saved.ans;
            if (Array.isArray(saved.history)) this.history = saved.history.slice(0, 50);
        } catch (error) {
            // Ignore invalid local state.
        }
    }

    saveState() {
        try {
            localStorage.setItem('sciCalcState', JSON.stringify({
                angleMode: this.angleMode,
                memory: this.memory,
                ans: this.ans,
                history: this.history.slice(0, 50)
            }));
        } catch (error) {
            // Ignore storage quota errors.
        }
    }

    bindInput() {
        this.expressionInput.addEventListener('input', () => {
            this.justEvaluated = false;
            this.clearError();
            clearTimeout(this.previewTimer);
            this.previewTimer = setTimeout(() => this.preview(), 120);
        });
        this.expressionInput.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === '=') {
                event.preventDefault();
                this.compute();
            } else if (event.key === 'Escape') {
                this.clear();
                this.closeHistory();
            }
        });
    }

    preserveCursorOnButtons() {
        document.querySelectorAll('.scientific-calculator button').forEach(button => {
            button.addEventListener('mousedown', event => event.preventDefault());
        });
    }

    insertAtCursor(text, caretOffset) {
        const input = this.expressionInput;
        let start = input.selectionStart ?? input.value.length;
        let end = input.selectionEnd ?? start;
        const operator = /^[+\-×÷*/^%!]/.test(text);

        if (this.justEvaluated && !operator) {
            input.value = '';
            start = 0;
            end = 0;
        } else if (this.justEvaluated) {
            start = input.value.length;
            end = start;
        }

        input.setRangeText(text, start, end, 'end');
        const caret = start + (caretOffset === undefined ? text.length : caretOffset);
        input.setSelectionRange(caret, caret);
        input.focus();
        this.justEvaluated = false;
        input.dispatchEvent(new Event('input', {bubbles: true}));
    }

    insertToken(token) {
        this.insertAtCursor(token);
    }

    appendNumber(number) {
        this.insertAtCursor(String(number));
    }

    chooseOperation(operation) {
        const symbols = {'×': '×', '÷': '÷', '-': '−', '+': '+', '^': '^', '%': '%'};
        this.insertAtCursor(symbols[operation] || operation);
    }

    calculateFunction(func) {
        const input = this.expressionInput;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? start;
        const selected = input.value.slice(start, end);
        const names = {sqrt: '√', sin: 'sin', cos: 'cos', tan: 'tan', asin: 'asin', acos: 'acos', atan: 'atan', log: 'log', ln: 'ln'};

        if (func === 'factorial') {
            this.wrapSelection('(', ')!', '!');
        } else if (func === 'square') {
            this.wrapSelection('(', ')^2', '^2');
        } else if (func === 'reciprocal') {
            this.wrapSelection('1/(', ')', '1/(');
        } else if (func === 'pow10') {
            this.wrapSelection('10^(', ')', '10^(');
        } else if (func === 'exp') {
            this.wrapSelection('e^(', ')', 'e^(');
        } else {
            const name = names[func] || func;
            if (selected) {
                input.setRangeText(name + '(' + selected + ')', start, end, 'end');
                input.dispatchEvent(new Event('input', {bubbles: true}));
                input.focus();
            } else {
                this.insertAtCursor(name + '(');
            }
        }
    }

    wrapSelection(prefix, suffix, emptyInsertion) {
        const input = this.expressionInput;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? start;
        const selected = input.value.slice(start, end);
        if (!selected) {
            this.insertAtCursor(emptyInsertion);
            return;
        }
        input.setRangeText(prefix + selected + suffix, start, end, 'end');
        input.dispatchEvent(new Event('input', {bubbles: true}));
        input.focus();
    }

    insertConstant(value) {
        this.insertAtCursor(Math.abs(value - Math.PI) < 1e-12 ? 'π' : 'e');
    }

    toggleSign() {
        const input = this.expressionInput;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? start;
        const selected = input.value.slice(start, end);
        if (selected) {
            input.setRangeText('-(' + selected + ')', start, end, 'end');
        } else if (input.value) {
            input.value = '-(' + input.value + ')';
            input.setSelectionRange(input.value.length, input.value.length);
        } else {
            input.value = '-';
            input.setSelectionRange(1, 1);
        }
        input.dispatchEvent(new Event('input', {bubbles: true}));
        input.focus();
    }

    delete() {
        const input = this.expressionInput;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        if (start !== end) input.setRangeText('', start, end, 'end');
        else if (start > 0) input.setRangeText('', start - 1, start, 'end');
        input.dispatchEvent(new Event('input', {bubbles: true}));
        input.focus();
    }

    clear() {
        clearTimeout(this.previewTimer);
        this.expressionInput.value = '';
        this.previousOperandEl.textContent = '';
        this.currentOperandEl.textContent = '0';
        this.justEvaluated = false;
        this.clearError();
        this.expressionInput.focus();
    }

    parse(expression) {
        return new ExpressionParser(expression, {
            angleMode: this.angleMode,
            ans: this.ans
        }).evaluate();
    }

    preview() {
        const expression = this.expressionInput.value.trim();
        if (!expression) {
            this.previousOperandEl.textContent = '';
            this.currentOperandEl.textContent = '0';
            return;
        }
        try {
            const result = this.parse(expression);
            this.currentOperandEl.textContent = '≈ ' + this.formatResult(result);
        } catch (error) {
            // Incomplete input is expected while typing.
        }
    }

    compute() {
        clearTimeout(this.previewTimer);
        const expression = this.expressionInput.value.trim();
        try {
            const result = this.parse(expression);
            const formatted = this.formatResult(result);
            this.ans = result;
            this.addToHistory(expression, result);
            this.previousOperandEl.textContent = expression + ' =';
            this.currentOperandEl.textContent = formatted;
            this.expressionInput.value = formatted;
            this.expressionInput.setSelectionRange(formatted.length, formatted.length);
            this.expressionInput.focus();
            this.justEvaluated = true;
            this.clearError();
            this.saveState();
        } catch (error) {
            this.showError(error.message);
        }
    }

    currentValue() {
        try {
            return this.parse(this.expressionInput.value);
        } catch (error) {
            return this.ans;
        }
    }

    toggleMode() {
        this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
        this.syncModeUI();
        this.preview();
        this.saveState();
    }

    syncModeUI() {
        if (this.angleModeEl) this.angleModeEl.textContent = this.angleMode;
        if (this.angleModeBtn) {
            this.angleModeBtn.textContent = this.angleMode;
            this.angleModeBtn.setAttribute('aria-pressed', String(this.angleMode === 'RAD'));
        }
    }

    clearMemory() {
        this.memory = 0;
        this.syncMemoryUI();
        this.saveState();
    }

    recallMemory() {
        this.insertAtCursor(this.formatResult(this.memory));
    }

    addToMemory() {
        this.memory += this.currentValue();
        this.syncMemoryUI();
        this.saveState();
    }

    subtractFromMemory() {
        this.memory -= this.currentValue();
        this.syncMemoryUI();
        this.saveState();
    }

    syncMemoryUI() {
        if (!this.memoryBadgeEl) return;
        this.memoryBadgeEl.hidden = this.memory === 0;
        this.memoryBadgeEl.title = 'Memory: ' + this.formatResult(this.memory);
    }

    formatResult(number) {
        if (!Number.isFinite(number)) return 'Error';
        if (Object.is(number, -0) || number === 0) return '0';
        const absolute = Math.abs(number);
        if (absolute >= 1e12 || absolute < 1e-9) {
            return number.toExponential(10).replace(/\.?0+e/i, 'e');
        }
        return String(Number(number.toPrecision(12)));
    }

    showError(message) {
        this.errorEl.textContent = message;
        this.errorEl.hidden = false;
        this.currentOperandEl.textContent = 'Error';
    }

    clearError() {
        this.errorEl.textContent = '';
        this.errorEl.hidden = true;
    }

    addToHistory(expression, result) {
        this.history.unshift({
            calculation: expression,
            result,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
        });
        this.history = this.history.slice(0, 50);
        this.updateHistoryDisplay();
        this.saveState();
    }

    updateHistoryDisplay() {
        const html = this.history.length ? this.history.map((item, index) =>
            '<button type="button" class="sci-history-item" data-index="' + index + '">' +
            '<span class="sci-history-expr">' + escapeHtml(item.calculation) + '</span>' +
            '<span class="sci-history-eq">= ' + escapeHtml(this.formatResult(item.result)) + '</span>' +
            '<span class="sci-history-time">' + escapeHtml(item.time) + '</span></button>'
        ).join('') : '<p class="sci-history-empty">No calculations yet</p>';

        this.historyListEls.forEach(element => {
            element.innerHTML = html;
            element.querySelectorAll('.sci-history-item').forEach(button => {
                button.addEventListener('click', () => this.useHistoryResult(Number(button.dataset.index)));
            });
        });
    }

    useHistoryResult(index) {
        const item = this.history[index];
        if (!item) return;
        const value = this.formatResult(item.result);
        this.expressionInput.value = value;
        this.currentOperandEl.textContent = value;
        this.previousOperandEl.textContent = item.calculation + ' =';
        this.expressionInput.setSelectionRange(value.length, value.length);
        this.justEvaluated = true;
        this.closeHistory();
        this.expressionInput.focus();
    }

    clearHistory() {
        if (this.history.length && confirm('Clear all calculation history?')) {
            this.history = [];
            this.updateHistoryDisplay();
            this.saveState();
        }
    }

    toggleHistory() {
        const open = this.historyModalEl.hidden;
        this.historyModalEl.hidden = !open;
        document.body.classList.toggle('sci-modal-open', open);
        if (open) this.updateHistoryDisplay();
    }

    closeHistory() {
        this.historyModalEl.hidden = true;
        document.body.classList.remove('sci-modal-open');
    }

    bindModal() {
        this.historyModalEl.addEventListener('click', event => {
            if (event.target === this.historyModalEl) this.closeHistory();
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

let sciCalc;
document.addEventListener('DOMContentLoaded', () => {
    sciCalc = new ScientificCalculator();
});
