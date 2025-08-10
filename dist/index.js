(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ScmSlangRunner = {}));
})(this, (function (exports) { 'use strict';

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    /**
     * Generic Conductor Error.
     */
    class ConductorError extends Error {
        constructor(message) {
            super(message);
            this.name = "ConductorError";
            this.errorType = "__unknown" /* ErrorType.UNKNOWN */;
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    /**
     * Conductor internal error, probably caused by developer oversight.
     */
    class ConductorInternalError extends ConductorError {
        constructor(message) {
            super(message);
            this.name = "ConductorInternalError";
            this.errorType = "__internal" /* ErrorType.INTERNAL */;
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    /**
     * Generic evaluation error, caused by a problem in user code.
     */
    class EvaluatorError extends ConductorError {
        constructor(message, line, column, fileName) {
            const location = line !== undefined
                ? `${fileName ? fileName + ":" : ""}${line}${column !== undefined ? ":" + column : ""}: `
                : "";
            super(`${location}${message}`);
            this.name = "EvaluatorError";
            this.errorType = "__evaluator" /* ErrorType.EVALUATOR */;
            this.rawMessage = message;
            this.line = line;
            this.column = column;
            this.fileName = fileName;
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    /**
     * Evaluator type error - the user code is not well typed or provides values of incorrect type to external functions.
     */
    class EvaluatorTypeError extends EvaluatorError {
        constructor(message, expected, actual, line, column, fileName) {
            super(`${message} (expected ${expected}, got ${actual})`, line, column, fileName);
            this.name = "EvaluatorTypeError";
            this.errorType = "__evaluator_type" /* ErrorType.EVALUATOR_TYPE */;
            this.rawMessage = message;
            this.expected = expected;
            this.actual = actual;
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    class BasicEvaluator {
        async startEvaluator(entryPoint) {
            const initialChunk = await this.conductor.requestFile(entryPoint);
            if (!initialChunk)
                throw new ConductorInternalError("Cannot load entrypoint file");
            await this.evaluateFile(entryPoint, initialChunk);
            while (true) {
                const chunk = await this.conductor.requestChunk();
                await this.evaluateChunk(chunk);
            }
        }
        /**
         * Evaluates a file.
         * @param fileName The name of the file to be evaluated.
         * @param fileContent The content of the file to be evaluated.
         * @returns A promise that resolves when the evaluation is complete.
         */
        async evaluateFile(fileName, fileContent) {
            return this.evaluateChunk(fileContent);
        }
        constructor(conductor) {
            this.conductor = conductor;
        }
    }

    /**
     * Node types of the abstract syntax tree of the Scheme Language.
     * We aim to be as simple as possible, and only represent the bare minimum
     * of Scheme syntax.
     *
     * Syntatic sugar such as "cond" or "let" will be left in another file,
     * and will be translated into the bare minimum of Scheme syntax, for now
     * with a transformer visitor, and perhaps later with a macro system.
     */
    /**
     * The namespace for all the atomic node types.
     */
    var Atomic;
    (function (Atomic) {
        // Scheme chapter 1
        /**
         * A node that represents a sequence of expressions.
         * Also introduces a new scope.
         * The last expression is the return value of the sequence.
         */
        class Sequence {
            constructor(location, expressions) {
                this.location = location;
                this.expressions = expressions;
            }
            accept(visitor) {
                return visitor.visitSequence(this);
            }
            equals(other) {
                if (other instanceof Sequence) {
                    if (this.expressions.length !== other.expressions.length) {
                        return false;
                    }
                    for (let i = 0; i < this.expressions.length; i++) {
                        if (!this.expressions[i].equals(other.expressions[i])) {
                            return false;
                        }
                    }
                    return true;
                }
                return false;
            }
        }
        Atomic.Sequence = Sequence;
        /**
         * A node that represents a Scheme number.
         * TODO: Support the Scheme number tower.
         */
        class NumericLiteral {
            constructor(location, value) {
                this.location = location;
                this.value = value;
            }
            accept(visitor) {
                return visitor.visitNumericLiteral(this);
            }
            equals(other) {
                if (other instanceof NumericLiteral) {
                    return this.value === other.value;
                }
                return false;
            }
        }
        Atomic.NumericLiteral = NumericLiteral;
        /**
         * A node that represents a Scheme boolean.
         */
        class BooleanLiteral {
            constructor(location, value) {
                this.location = location;
                this.value = value;
            }
            accept(visitor) {
                return visitor.visitBooleanLiteral(this);
            }
            equals(other) {
                if (other instanceof BooleanLiteral) {
                    return this.value === other.value;
                }
                return false;
            }
        }
        Atomic.BooleanLiteral = BooleanLiteral;
        /**
         * A node that represents a Scheme string.
         */
        class StringLiteral {
            constructor(location, value) {
                this.location = location;
                this.value = value;
            }
            accept(visitor) {
                return visitor.visitStringLiteral(this);
            }
            equals(other) {
                if (other instanceof StringLiteral) {
                    return this.value === other.value;
                }
                return false;
            }
        }
        Atomic.StringLiteral = StringLiteral;
        /**
         * A node that represents a Scheme complex number.
         */
        class ComplexLiteral {
            constructor(location, value) {
                this.location = location;
                this.value = value;
            }
            accept(visitor) {
                return visitor.visitComplexLiteral(this);
            }
            equals(other) {
                if (other instanceof ComplexLiteral) {
                    return this.value === other.value;
                }
                return false;
            }
        }
        Atomic.ComplexLiteral = ComplexLiteral;
        /**
         * A node representing a Scheme lambda expression.
         * TODO: Support rest arguments.
         */
        class Lambda {
            constructor(location, body, params, rest = undefined) {
                this.location = location;
                this.params = params;
                this.rest = rest;
                this.body = body;
            }
            accept(visitor) {
                return visitor.visitLambda(this);
            }
            equals(other) {
                if (other instanceof Lambda) {
                    if (this.params.length !== other.params.length) {
                        return false;
                    }
                    for (let i = 0; i < this.params.length; i++) {
                        if (!this.params[i].equals(other.params[i])) {
                            return false;
                        }
                    }
                    if (this.rest && other.rest) {
                        if (!this.rest.equals(other.rest)) {
                            return false;
                        }
                    }
                    else if (this.rest || other.rest) {
                        return false;
                    }
                    return this.body.equals(other.body);
                }
                return false;
            }
        }
        Atomic.Lambda = Lambda;
        /**
         * A node representing a Scheme identifier.
         */
        class Identifier {
            constructor(location, name) {
                this.location = location;
                this.name = name;
            }
            accept(visitor) {
                return visitor.visitIdentifier(this);
            }
            equals(other) {
                if (other instanceof Identifier) {
                    return this.name === other.name;
                }
                return false;
            }
        }
        Atomic.Identifier = Identifier;
        /**
         * A node representing a Scheme variable definition.
         * Returns nil.
         */
        class Definition {
            constructor(location, name, value) {
                this.location = location;
                this.name = name;
                this.value = value;
            }
            accept(visitor) {
                return visitor.visitDefinition(this);
            }
            equals(other) {
                if (other instanceof Definition) {
                    return this.name.equals(other.name) && this.value.equals(other.value);
                }
                return false;
            }
        }
        Atomic.Definition = Definition;
        /**
         * A node representing a Scheme function application.
         */
        class Application {
            constructor(location, operator, operands) {
                this.location = location;
                this.operator = operator;
                this.operands = operands;
            }
            accept(visitor) {
                return visitor.visitApplication(this);
            }
            equals(other) {
                if (other instanceof Application) {
                    if (!this.operator.equals(other.operator)) {
                        return false;
                    }
                    if (this.operands.length !== other.operands.length) {
                        return false;
                    }
                    for (let i = 0; i < this.operands.length; i++) {
                        if (!this.operands[i].equals(other.operands[i])) {
                            return false;
                        }
                    }
                    return true;
                }
                return false;
            }
        }
        Atomic.Application = Application;
        /**
         * A node representing a Scheme conditional expression.
         */
        class Conditional {
            constructor(location, test, consequent, alternate) {
                this.location = location;
                this.test = test;
                this.consequent = consequent;
                this.alternate = alternate;
            }
            accept(visitor) {
                return visitor.visitConditional(this);
            }
            equals(other) {
                if (other instanceof Conditional) {
                    return (this.test.equals(other.test) &&
                        this.consequent.equals(other.consequent) &&
                        this.alternate.equals(other.alternate));
                }
                return false;
            }
        }
        Atomic.Conditional = Conditional;
        // Scheme chapter 2
        /**
         * A node representing a Scheme pair.
         */
        class Pair {
            constructor(location, car, cdr) {
                this.location = location;
                this.car = car;
                this.cdr = cdr;
            }
            accept(visitor) {
                return visitor.visitPair(this);
            }
            equals(other) {
                if (other instanceof Pair) {
                    return this.car.equals(other.car) && this.cdr.equals(other.cdr);
                }
                return false;
            }
        }
        Atomic.Pair = Pair;
        /**
         * A node representing nil, an empty scheme list.
         */
        class Nil {
            constructor(location) {
                this.location = location;
            }
            accept(visitor) {
                return visitor.visitNil(this);
            }
            equals(other) {
                return other instanceof Nil;
            }
        }
        Atomic.Nil = Nil;
        /**
         * A node representing a Scheme symbol.
         */
        class Symbol {
            constructor(location, value) {
                this.location = location;
                this.value = value;
            }
            accept(visitor) {
                return visitor.visitSymbol(this);
            }
            equals(other) {
                if (other instanceof Symbol) {
                    return this.value === other.value;
                }
                return false;
            }
        }
        Atomic.Symbol = Symbol;
        /**
         * A node representing a Scheme marker for unquote_splicing.
         * This will be evaluated at runtime.
         */
        class SpliceMarker {
            constructor(location, value) {
                this.location = location;
                this.value = value;
            }
            accept(visitor) {
                return visitor.visitSpliceMarker(this);
            }
            equals(other) {
                if (other instanceof SpliceMarker) {
                    return this.value.equals(other.value);
                }
                return false;
            }
        }
        Atomic.SpliceMarker = SpliceMarker;
        // Scheme chapter 3
        /**
         * A node representing a Scheme variable reassignment.
         * Only supposed to be used on a variable that has been defined.
         * Returns nil.
         */
        class Reassignment {
            constructor(location, name, value) {
                this.location = location;
                this.name = name;
                this.value = value;
            }
            accept(visitor) {
                return visitor.visitReassignment(this);
            }
            equals(other) {
                if (other instanceof Reassignment) {
                    return this.name.equals(other.name) && this.value.equals(other.value);
                }
                return false;
            }
        }
        Atomic.Reassignment = Reassignment;
        // scm-slang specific
        /**
         * A node representing an import statement.
         * syntax: (import <source> ( <identifier>* ))
         * Returns nil.
         */
        class Import {
            constructor(location, source, identifiers) {
                this.location = location;
                this.source = source;
                this.identifiers = identifiers;
            }
            accept(visitor) {
                return visitor.visitImport(this);
            }
            equals(other) {
                if (other instanceof Import) {
                    if (!this.source.equals(other.source)) {
                        return false;
                    }
                    if (this.identifiers.length !== other.identifiers.length) {
                        return false;
                    }
                    for (let i = 0; i < this.identifiers.length; i++) {
                        if (!this.identifiers[i].equals(other.identifiers[i])) {
                            return false;
                        }
                    }
                    return true;
                }
                return false;
            }
        }
        Atomic.Import = Import;
        /**
         * A node representing an export statement.
         * syntax: (export ( <definition> ))
         * Returns nil.
         */
        class Export {
            constructor(location, definition) {
                this.location = location;
                this.definition = definition;
            }
            accept(visitor) {
                return visitor.visitExport(this);
            }
            equals(other) {
                if (other instanceof Export) {
                    return this.definition.equals(other.definition);
                }
                return false;
            }
        }
        Atomic.Export = Export;
        /**
         * A node representing a Scheme Vector.
         */
        class Vector {
            constructor(location, elements) {
                this.location = location;
                this.elements = elements;
            }
            accept(visitor) {
                return visitor.visitVector(this);
            }
            equals(other) {
                if (other instanceof Vector) {
                    if (this.elements.length !== other.elements.length) {
                        return false;
                    }
                    for (let i = 0; i < this.elements.length; i++) {
                        if (!this.elements[i].equals(other.elements[i])) {
                            return false;
                        }
                    }
                    return true;
                }
                return false;
            }
        }
        Atomic.Vector = Vector;
        /**
         * A node representing a Scheme define-syntax expression.
         */
        class DefineSyntax {
            constructor(location, name, transformer) {
                this.location = location;
                this.name = name;
                this.transformer = transformer;
            }
            accept(visitor) {
                return visitor.visitDefineSyntax(this);
            }
            equals(other) {
                if (other instanceof DefineSyntax) {
                    return (this.name.equals(other.name) &&
                        this.transformer.equals(other.transformer));
                }
                return false;
            }
        }
        Atomic.DefineSyntax = DefineSyntax;
        /**
         * A node representing a Scheme syntax-rules expression.
         */
        class SyntaxRules {
            constructor(location, literals, rules) {
                this.location = location;
                this.literals = literals;
                this.rules = rules;
            }
            accept(visitor) {
                return visitor.visitSyntaxRules(this);
            }
            equals(other) {
                if (other instanceof SyntaxRules) {
                    if (this.literals.length !== other.literals.length) {
                        return false;
                    }
                    for (let i = 0; i < this.literals.length; i++) {
                        if (!this.literals[i].equals(other.literals[i])) {
                            return false;
                        }
                    }
                    if (this.rules.length !== other.rules.length) {
                        return false;
                    }
                    for (let i = 0; i < this.rules.length; i++) {
                        if (!this.rules[i][0].equals(other.rules[i][0]) ||
                            !this.rules[i][1].equals(other.rules[i][1])) {
                            return false;
                        }
                    }
                    return true;
                }
                return false;
            }
        }
        Atomic.SyntaxRules = SyntaxRules;
    })(Atomic || (Atomic = {}));
    /**
     * The namespace for all the syntactic sugar node types.
     * Will be transformed into the bare minimum of Scheme syntax.
     * Eventually, we won't need this namespace, as all the syntactic sugar
     * will be converted by a macro system.
     */
    var Extended;
    (function (Extended) {
        // Scheme chapter 1
        /**
         * A node representing a function definition.
         */
        class FunctionDefinition {
            constructor(location, name, body, params, rest = undefined) {
                this.location = location;
                this.name = name;
                this.body = body;
                this.params = params;
                this.rest = rest;
            }
            accept(visitor) {
                return visitor.visitFunctionDefinition(this);
            }
            equals(other) {
                if (other instanceof FunctionDefinition) {
                    if (this.params.length !== other.params.length) {
                        return false;
                    }
                    for (let i = 0; i < this.params.length; i++) {
                        if (!this.params[i].equals(other.params[i])) {
                            return false;
                        }
                    }
                    if (this.rest && other.rest) {
                        if (!this.rest.equals(other.rest)) {
                            return false;
                        }
                    }
                    else if (this.rest || other.rest) {
                        return false;
                    }
                    return this.body.equals(other.body);
                }
                return false;
            }
        }
        Extended.FunctionDefinition = FunctionDefinition;
        /**
         * A node representing a Scheme let expression.
         */
        class Let {
            constructor(location, identifiers, values, body) {
                this.location = location;
                this.identifiers = identifiers;
                this.values = values;
                this.body = body;
            }
            accept(visitor) {
                return visitor.visitLet(this);
            }
            equals(other) {
                if (other instanceof Let) {
                    if (this.identifiers.length !== other.identifiers.length) {
                        return false;
                    }
                    for (let i = 0; i < this.identifiers.length; i++) {
                        if (!this.identifiers[i].equals(other.identifiers[i])) {
                            return false;
                        }
                    }
                    if (this.values.length !== other.values.length) {
                        return false;
                    }
                    for (let i = 0; i < this.values.length; i++) {
                        if (!this.values[i].equals(other.values[i])) {
                            return false;
                        }
                    }
                    return this.body.equals(other.body);
                }
                return false;
            }
        }
        Extended.Let = Let;
        /**
         * A node representing a Scheme cond expression.
         * MAY return nil.
         */
        class Cond {
            constructor(location, predicates, consequents, catchall) {
                this.location = location;
                this.predicates = predicates;
                this.consequents = consequents;
                this.catchall = catchall;
            }
            accept(visitor) {
                return visitor.visitCond(this);
            }
            equals(other) {
                if (other instanceof Cond) {
                    if (this.predicates.length !== other.predicates.length) {
                        return false;
                    }
                    for (let i = 0; i < this.predicates.length; i++) {
                        if (!this.predicates[i].equals(other.predicates[i])) {
                            return false;
                        }
                    }
                    if (this.consequents.length !== other.consequents.length) {
                        return false;
                    }
                    for (let i = 0; i < this.consequents.length; i++) {
                        if (!this.consequents[i].equals(other.consequents[i])) {
                            return false;
                        }
                    }
                    if (this.catchall && other.catchall) {
                        return this.catchall.equals(other.catchall);
                    }
                    else if (this.catchall || other.catchall) {
                        return false;
                    }
                    return true;
                }
                return false;
            }
        }
        Extended.Cond = Cond;
        // Scheme chapter 2
        /**
         * A node representing a Scheme list or dotted list.
         */
        class List {
            constructor(location, elements, terminator = undefined) {
                this.location = location;
                this.elements = elements;
                this.terminator = terminator;
            }
            accept(visitor) {
                return visitor.visitList(this);
            }
            equals(other) {
                if (other instanceof List) {
                    if (this.elements.length !== other.elements.length) {
                        return false;
                    }
                    for (let i = 0; i < this.elements.length; i++) {
                        if (!this.elements[i].equals(other.elements[i])) {
                            return false;
                        }
                    }
                    if (this.terminator && other.terminator) {
                        return this.terminator.equals(other.terminator);
                    }
                    else if (this.terminator || other.terminator) {
                        return false;
                    }
                    return true;
                }
                return false;
            }
        }
        Extended.List = List;
        // Scheme chapter 3
        /**
         * A node representing a Scheme begin expression.
         * Returns the last expression.
         * syntax: (begin <expression>*)
         */
        class Begin {
            constructor(location, expressions) {
                this.location = location;
                this.expressions = expressions;
            }
            accept(visitor) {
                return visitor.visitBegin(this);
            }
            equals(other) {
                if (other instanceof Begin) {
                    if (this.expressions.length !== other.expressions.length) {
                        return false;
                    }
                    for (let i = 0; i < this.expressions.length; i++) {
                        if (!this.expressions[i].equals(other.expressions[i])) {
                            return false;
                        }
                    }
                    return true;
                }
                return false;
            }
        }
        Extended.Begin = Begin;
        /**
         * A node representing a Scheme delay expression.
         * Returns a promise.
         * syntax: (delay <expression>)
         */
        class Delay {
            constructor(location, expression) {
                this.location = location;
                this.expression = expression;
            }
            accept(visitor) {
                return visitor.visitDelay(this);
            }
            equals(other) {
                if (other instanceof Delay) {
                    return this.expression.equals(other.expression);
                }
                return false;
            }
        }
        Extended.Delay = Delay;
    })(Extended || (Extended = {}));

    // A data structure representing the span of the scheme node.
    class Location {
        constructor(start, end) {
            this.start = start;
            this.end = end;
        }
        merge(other) {
            return new Location(this.start, other.end);
        }
    }
    // A data structure representing a particular position of a token.
    class Position {
        constructor(line, column) {
            this.line = line;
            this.column = column;
        }
    }

    function parseSchemeSimple(code) {
        const tokens = tokenize(code);
        const parser = new SimpleSchemeParser(tokens);
        return parser.parse();
    }
    function tokenize(code) {
        const tokens = [];
        let current = 0;
        let line = 1;
        let column = 1;
        while (current < code.length) {
            const char = code[current];
            if (char === '(' || char === '[') {
                tokens.push({ type: 'LPAREN', value: char, line, column });
                current++;
                column++;
            }
            else if (char === ')' || char === ']') {
                tokens.push({ type: 'RPAREN', value: char, line, column });
                current++;
                column++;
            }
            else if (char === '\'') {
                tokens.push({ type: 'QUOTE', value: char, line, column });
                current++;
                column++;
            }
            else if (isWhitespace(char)) {
                if (char === '\n') {
                    line++;
                    column = 1;
                }
                else {
                    column++;
                }
                current++;
            }
            else if (char === ';') {
                // Skip comments
                while (current < code.length && code[current] !== '\n') {
                    current++;
                }
            }
            else if (char === '"') {
                // String literal
                const startColumn = column;
                current++;
                column++;
                let value = '';
                while (current < code.length && code[current] !== '"') {
                    if (code[current] === '\\' && current + 1 < code.length) {
                        current++;
                        column++;
                        value += code[current];
                    }
                    else {
                        value += code[current];
                    }
                    current++;
                    column++;
                }
                if (current < code.length) {
                    current++;
                    column++;
                }
                tokens.push({ type: 'STRING', value, line, column: startColumn });
            }
            else if (isDigit(char) || (char === '+' || char === '-') && isDigit(code[current + 1])) {
                // Number literal (including complex numbers)
                const startColumn = column;
                let value = '';
                // Handle potential complex numbers or signed numbers
                if (char === '+' || char === '-') {
                    value += char;
                    current++;
                    column++;
                }
                // Read number part
                while (current < code.length && (isDigit(code[current]) || code[current] === '.' || code[current] === 'e' || code[current] === 'E' || code[current] === '+' || code[current] === '-')) {
                    value += code[current];
                    current++;
                    column++;
                }
                // Check for complex number suffix 'i' or 'I'
                if (current < code.length && (code[current] === 'i' || code[current] === 'I')) {
                    value += code[current];
                    current++;
                    column++;
                    tokens.push({ type: 'COMPLEX', value, line, column: startColumn });
                }
                else {
                    tokens.push({ type: 'NUMBER', value, line, column: startColumn });
                }
            }
            else if (char === '#') {
                // Handle # prefixed tokens
                const startColumn = column;
                current++;
                column++;
                let value = '#';
                while (current < code.length && isIdentifierPart(code[current])) {
                    value += code[current];
                    current++;
                    column++;
                }
                // Check for special keywords
                if (value === '#t' || value === '#true') {
                    tokens.push({ type: 'BOOLEAN', value: 'true', line, column: startColumn });
                }
                else if (value === '#f' || value === '#false') {
                    tokens.push({ type: 'BOOLEAN', value: 'false', line, column: startColumn });
                }
                else {
                    tokens.push({ type: 'IDENTIFIER', value, line, column: startColumn });
                }
            }
            else if (isIdentifierStart(char)) {
                // Identifier or keyword
                const startColumn = column;
                let value = '';
                while (current < code.length && isIdentifierPart(code[current])) {
                    value += code[current];
                    current++;
                    column++;
                }
                tokens.push({ type: 'IDENTIFIER', value, line, column: startColumn });
            }
            else {
                // Unknown character
                current++;
                column++;
            }
        }
        tokens.push({ type: 'EOF', value: '', line, column });
        return tokens;
    }
    function isWhitespace(char) {
        return /\s/.test(char);
    }
    function isDigit(char) {
        return /\d/.test(char);
    }
    function isIdentifierStart(char) {
        return /[a-zA-Z_+\-*/=<>!?]/.test(char);
    }
    function isIdentifierPart(char) {
        return /[a-zA-Z0-9_+\-*/=<>!?]/.test(char);
    }
    class SimpleSchemeParser {
        constructor(tokens) {
            this.current = 0;
            this.tokens = tokens;
        }
        parse() {
            const expressions = [];
            while (!this.isAtEnd()) {
                const expr = this.parseExpression();
                if (expr) {
                    expressions.push(expr);
                }
            }
            return expressions;
        }
        parseExpression() {
            const token = this.peek();
            if (token.type === 'NUMBER') {
                return this.parseNumber();
            }
            else if (token.type === 'COMPLEX') {
                return this.parseComplex();
            }
            else if (token.type === 'STRING') {
                return this.parseString();
            }
            else if (token.type === 'BOOLEAN') {
                return this.parseBoolean();
            }
            else if (token.type === 'IDENTIFIER') {
                return this.parseIdentifier();
            }
            else if (token.type === 'LPAREN') {
                return this.parseList();
            }
            else if (token.type === 'QUOTE') {
                return this.parseQuote();
            }
            else {
                this.advance(); // Skip unknown tokens
                return null;
            }
        }
        parseNumber() {
            const token = this.advance();
            const location = this.createLocation(token);
            return new Atomic.NumericLiteral(location, token.value);
        }
        parseComplex() {
            const token = this.advance();
            const location = this.createLocation(token);
            return new Atomic.ComplexLiteral(location, token.value);
        }
        parseString() {
            const token = this.advance();
            const location = this.createLocation(token);
            return new Atomic.StringLiteral(location, token.value);
        }
        parseBoolean() {
            const token = this.advance();
            const location = this.createLocation(token);
            return new Atomic.BooleanLiteral(location, token.value === 'true');
        }
        parseIdentifier() {
            const token = this.advance();
            const location = this.createLocation(token);
            return new Atomic.Identifier(location, token.value);
        }
        parseList() {
            const openToken = this.advance(); // Consume '('
            const location = this.createLocation(openToken);
            const elements = [];
            while (!this.isAtEnd() && this.peek().type !== 'RPAREN') {
                const expr = this.parseExpression();
                if (expr) {
                    elements.push(expr);
                }
            }
            if (this.peek().type === 'RPAREN') {
                this.advance(); // Consume ')'
            }
            if (elements.length === 0) {
                return new Atomic.Nil(location);
            }
            // Check for special forms
            if (elements.length > 0 && elements[0] instanceof Atomic.Identifier) {
                const first = elements[0];
                if (first.name === 'define') {
                    return this.parseDefine(elements, location);
                }
                else if (first.name === 'lambda') {
                    return this.parseLambda(elements, location);
                }
                else if (first.name === 'if') {
                    return this.parseConditional(elements, location);
                }
                else if (first.name === 'let') {
                    return this.parseLet(elements, location);
                }
                else if (first.name === 'begin') {
                    return this.parseBegin(elements, location);
                }
                else if (first.name === 'cond') {
                    return this.parseCond(elements, location);
                }
            }
            // Check if this is a parameter list (single element that's not a special form)
            if (elements.length === 1 && elements[0] instanceof Atomic.Identifier) {
                // This could be a parameter list like (x) in lambda
                return new Extended.List(location, elements);
            }
            // Regular function application
            if (elements.length > 0) {
                const operator = elements[0];
                const operands = elements.slice(1);
                return new Atomic.Application(location, operator, operands);
            }
            return new Extended.List(location, elements);
        }
        parseDefine(elements, location) {
            if (elements.length !== 3) {
                throw new Error('define requires exactly 2 arguments');
            }
            const name = elements[1];
            const value = elements[2];
            if (!(name instanceof Atomic.Identifier)) {
                throw new Error('define name must be an identifier');
            }
            return new Atomic.Definition(location, name, value);
        }
        parseLambda(elements, location) {
            if (elements.length < 3) {
                throw new Error('lambda requires at least 2 arguments');
            }
            const paramsExpr = elements[1];
            const body = elements[2];
            let params = [];
            if (paramsExpr instanceof Extended.List) {
                // Handle parameter list like (x y z)
                params = paramsExpr.elements.filter(e => e instanceof Atomic.Identifier);
            }
            else if (paramsExpr instanceof Atomic.Identifier) {
                // Handle single parameter like x
                params = [paramsExpr];
            }
            else if (paramsExpr instanceof Atomic.Nil) {
                // Handle empty parameter list like ()
                params = [];
            }
            else {
                throw new Error('lambda parameters must be identifiers');
            }
            return new Atomic.Lambda(location, body, params);
        }
        parseConditional(elements, location) {
            if (elements.length !== 4) {
                throw new Error('if requires exactly 3 arguments');
            }
            const test = elements[1];
            const consequent = elements[2];
            const alternate = elements[3];
            return new Atomic.Conditional(location, test, consequent, alternate);
        }
        parseLet(elements, location) {
            if (elements.length < 3) {
                throw new Error('let requires at least 2 arguments');
            }
            const bindingsExpr = elements[1];
            const body = elements[2];
            let identifiers = [];
            let values = [];
            if (bindingsExpr instanceof Extended.List) {
                for (const binding of bindingsExpr.elements) {
                    if (binding instanceof Extended.List && binding.elements.length === 2) {
                        const id = binding.elements[0];
                        const val = binding.elements[1];
                        if (id instanceof Atomic.Identifier) {
                            identifiers.push(id);
                            values.push(val);
                        }
                    }
                }
            }
            return new Extended.Let(location, identifiers, values, body);
        }
        parseBegin(elements, location) {
            const expressions = elements.slice(1);
            return new Extended.Begin(location, expressions);
        }
        parseCond(elements, location) {
            const clauses = elements.slice(1);
            const predicates = [];
            const consequents = [];
            let catchall;
            for (const clause of clauses) {
                if (clause instanceof Extended.List && clause.elements.length >= 2) {
                    const predicate = clause.elements[0];
                    const consequent = clause.elements[1];
                    if (predicate instanceof Atomic.Identifier && predicate.name === 'else') {
                        catchall = consequent;
                    }
                    else {
                        predicates.push(predicate);
                        consequents.push(consequent);
                    }
                }
            }
            return new Extended.Cond(location, predicates, consequents, catchall);
        }
        parseQuote() {
            this.advance(); // Consume quote
            const quoted = this.parseExpression();
            if (!quoted) {
                throw new Error('quote requires an expression');
            }
            return quoted; // Return the quoted expression directly
        }
        createLocation(token) {
            const start = new Position(token.line, token.column);
            const end = new Position(token.line, token.column + token.value.length);
            return new Location(start, end);
        }
        advance() {
            if (!this.isAtEnd()) {
                this.current++;
            }
            return this.previous();
        }
        peek() {
            return this.tokens[this.current];
        }
        previous() {
            return this.tokens[this.current - 1];
        }
        isAtEnd() {
            return this.peek().type === 'EOF';
        }
    }

    // stack.ts
    class Stack {
        constructor() {
            this.items = [];
        }
        push(...items) {
            this.items.push(...items);
        }
        pop() {
            return this.items.pop();
        }
        peek() {
            return this.items[this.items.length - 1];
        }
        isEmpty() {
            return this.items.length === 0;
        }
        size() {
            return this.items.length;
        }
        clear() {
            this.items = [];
        }
        getStack() {
            return [...this.items];
        }
    }
    //Checking
    const s = new Stack();
    s.push(1, 2, 3);
    console.log(s.pop()); // 3
    console.log(s.peek()); // 2
    console.log(s.toString());

    class Control extends Stack {
        constructor(program) {
            super();
            this.numEnvDependentItems = 0;
            // Load program into control stack
            if (program) {
                if (Array.isArray(program)) {
                    // If it's an array of expressions, create a sequence
                    const seq = {
                        type: 'StatementSequence',
                        body: program,
                        location: program[0]?.location || { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
                    };
                    this.push(seq);
                }
                else {
                    this.push(program);
                }
            }
        }
        canAvoidEnvInstr() {
            return this.numEnvDependentItems === 0;
        }
        // For testing purposes
        getNumEnvDependentItems() {
            return this.numEnvDependentItems;
        }
        pop() {
            const item = super.pop();
            if (item !== undefined && this.isEnvDependent(item)) {
                this.numEnvDependentItems--;
            }
            return item;
        }
        push(...items) {
            const itemsNew = Control.simplifyBlocksWithoutDeclarations(...items);
            itemsNew.forEach((item) => {
                if (this.isEnvDependent(item)) {
                    this.numEnvDependentItems++;
                }
            });
            super.push(...itemsNew);
        }
        isEnvDependent(item) {
            return item.isEnvDependent === true;
        }
        /**
         * Before pushing block statements on the control stack, we check if the block statement has any declarations.
         * If not, the block is converted to a StatementSequence.
         * @param items The items being pushed on the control.
         * @returns The same set of control items, but with block statements without declarations converted to StatementSequences.
         */
        static simplifyBlocksWithoutDeclarations(...items) {
            const itemsNew = [];
            items.forEach(item => {
                // For Scheme, we don't have block statements like Python, so we just pass through
                itemsNew.push(item);
            });
            return itemsNew;
        }
        copy() {
            const newControl = new Control();
            const stackCopy = super.getStack();
            newControl.push(...stackCopy);
            return newControl;
        }
    }

    class Stash {
        constructor() {
            this.values = [];
        }
        push(value) {
            this.values.push(value);
        }
        pop() {
            return this.values.pop();
        }
        peek() {
            return this.values[this.values.length - 1];
        }
        size() {
            return this.values.length;
        }
        clear() {
            this.values = [];
        }
        getValues() {
            return [...this.values];
        }
    }

    function createEnvironment(name, parent = null) {
        return {
            parent,
            frame: new Map(),
            name,
            get(name) {
                if (this.frame.has(name)) {
                    return this.frame.get(name);
                }
                if (this.parent) {
                    return this.parent.get(name);
                }
                throw new Error(`Undefined variable: ${name}`);
            },
            set(name, value) {
                if (this.frame.has(name)) {
                    this.frame.set(name, value);
                    return;
                }
                if (this.parent) {
                    this.parent.set(name, value);
                    return;
                }
                throw new Error(`Cannot set undefined variable: ${name}`);
            },
            define(name, value) {
                this.frame.set(name, value);
            },
            has(name) {
                if (this.frame.has(name)) {
                    return true;
                }
                if (this.parent) {
                    return this.parent.has(name);
                }
                return false;
            },
            clone() {
                const clonedFrame = new Map(this.frame);
                const clonedParent = this.parent ? this.parent.clone() : null;
                const clonedEnv = createEnvironment(this.name, clonedParent);
                clonedEnv.frame = clonedFrame;
                return clonedEnv;
            }
        };
    }
    function createProgramEnvironment() {
        return createEnvironment('program');
    }
    function createBlockEnvironment(parent) {
        return createEnvironment('block', parent);
    }

    var InstrType;
    (function (InstrType) {
        InstrType["RESET"] = "Reset";
        InstrType["WHILE"] = "While";
        InstrType["FOR"] = "For";
        InstrType["ASSIGNMENT"] = "Assignment";
        InstrType["APPLICATION"] = "Application";
        InstrType["UNARY_OP"] = "UnaryOperation";
        InstrType["BINARY_OP"] = "BinaryOperation";
        InstrType["BOOL_OP"] = "BoolOperation";
        InstrType["COMPARE"] = "Compare";
        InstrType["CALL"] = "Call";
        InstrType["RETURN"] = "Return";
        InstrType["BREAK"] = "Break";
        InstrType["CONTINUE"] = "Continue";
        InstrType["IF"] = "If";
        InstrType["FUNCTION_DEF"] = "FunctionDef";
        InstrType["LAMBDA"] = "Lambda";
        InstrType["MULTI_LAMBDA"] = "MultiLambda";
        InstrType["GROUPING"] = "Grouping";
        InstrType["LITERAL"] = "Literal";
        InstrType["VARIABLE"] = "Variable";
        InstrType["TERNARY"] = "Ternary";
        InstrType["PASS"] = "Pass";
        InstrType["ASSERT"] = "Assert";
        InstrType["IMPORT"] = "Import";
        InstrType["GLOBAL"] = "Global";
        InstrType["NONLOCAL"] = "NonLocal";
        InstrType["Program"] = "Program";
        InstrType["BRANCH"] = "Branch";
        InstrType["POP"] = "Pop";
        InstrType["ENVIRONMENT"] = "environment";
        InstrType["MARKER"] = "marker";
        // Scheme-specific instructions
        InstrType["DEFINE"] = "Define";
        InstrType["SET"] = "Set";
        InstrType["COND"] = "Cond";
        InstrType["LET"] = "Let";
        InstrType["BEGIN"] = "Begin";
        InstrType["DELAY"] = "Delay";
        InstrType["PAIR"] = "Pair";
        InstrType["LIST"] = "List";
        InstrType["VECTOR"] = "Vector";
        InstrType["SYMBOL"] = "Symbol";
        InstrType["NIL"] = "Nil";
        InstrType["CAR"] = "Car";
        InstrType["CDR"] = "Cdr";
        InstrType["CONS"] = "Cons";
    })(InstrType || (InstrType = {}));

    // instrCreator.ts
    function createDefineInstr(name, value) {
        return {
            instrType: InstrType.DEFINE,
            srcNode: value,
            name,
            value
        };
    }
    function createSetInstr(name, value) {
        return {
            instrType: InstrType.SET,
            srcNode: value,
            name,
            value
        };
    }
    function createCondInstr(predicates, consequents, catchall) {
        return {
            instrType: InstrType.COND,
            srcNode: predicates[0] || consequents[0],
            predicates,
            consequents,
            catchall
        };
    }
    function createLetInstr(identifiers, values, body) {
        return {
            instrType: InstrType.LET,
            srcNode: body,
            identifiers,
            values,
            body
        };
    }
    function createBeginInstr(expressions) {
        return {
            instrType: InstrType.BEGIN,
            srcNode: expressions[0] || expressions[expressions.length - 1],
            expressions
        };
    }
    function createDelayInstr(expression) {
        return {
            instrType: InstrType.DELAY,
            srcNode: expression,
            expression
        };
    }
    function createPairInstr(car, cdr) {
        return {
            instrType: InstrType.PAIR,
            srcNode: car,
            car,
            cdr
        };
    }
    function createListInstr(elements, terminator) {
        return {
            instrType: InstrType.LIST,
            srcNode: elements[0] || terminator,
            elements,
            terminator
        };
    }
    function createVectorInstr(elements) {
        return {
            instrType: InstrType.VECTOR,
            srcNode: elements[0],
            elements
        };
    }
    function createAppInstr(numOfArgs, srcNode) {
        return {
            instrType: InstrType.APPLICATION,
            srcNode,
            numOfArgs
        };
    }
    function createBranchInstr(consequent, alternate) {
        return {
            instrType: InstrType.BRANCH,
            srcNode: consequent,
            consequent,
            alternate
        };
    }

    // Complex number implementation for Scheme
    // Based on py-slang PyComplexNumber
    class SchemeComplexNumber {
        constructor(real, imag) {
            this.real = real;
            this.imag = imag;
        }
        static fromNumber(value) {
            return new SchemeComplexNumber(value, 0);
        }
        static fromString(str) {
            // Handle Scheme complex number syntax: 3+4i, 1-2i, 5i
            if (!/[iI]/.test(str)) {
                const realVal = Number(str);
                if (isNaN(realVal)) {
                    throw new Error(`Invalid complex string: ${str}`);
                }
                return new SchemeComplexNumber(realVal, 0);
            }
            const lower = str.toLowerCase();
            if (lower.endsWith('i')) {
                const numericPart = str.substring(0, str.length - 1);
                // Handle purely imaginary: i, +i, -i
                if (numericPart === '' || numericPart === '+') {
                    return new SchemeComplexNumber(0, 1);
                }
                else if (numericPart === '-') {
                    return new SchemeComplexNumber(0, -1);
                }
                // Check if it's purely imaginary: 5i
                const imagVal = Number(numericPart);
                if (!isNaN(imagVal)) {
                    return new SchemeComplexNumber(0, imagVal);
                }
                // Handle complex with both real and imaginary parts: 3+4i, 1-2i
                const match = numericPart.match(/^([\+\-]?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)([\+\-]\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)$/);
                if (match) {
                    const realPart = Number(match[1]);
                    const imagPart = Number(match[2]);
                    return new SchemeComplexNumber(realPart, imagPart);
                }
            }
            throw new Error(`Invalid complex string: ${str}`);
        }
        static fromValue(value) {
            if (value instanceof SchemeComplexNumber) {
                return value;
            }
            else if (typeof value === 'number') {
                return SchemeComplexNumber.fromNumber(value);
            }
            else if (typeof value === 'string') {
                return SchemeComplexNumber.fromString(value);
            }
            else {
                throw new Error(`Cannot convert ${typeof value} to complex number`);
            }
        }
        // Arithmetic operations
        add(other) {
            return new SchemeComplexNumber(this.real + other.real, this.imag + other.imag);
        }
        sub(other) {
            return new SchemeComplexNumber(this.real - other.real, this.imag - other.imag);
        }
        mul(other) {
            // (a + bi) * (c + di) = (ac - bd) + (ad + bc)i
            const real = this.real * other.real - this.imag * other.imag;
            const imag = this.real * other.imag + this.imag * other.real;
            return new SchemeComplexNumber(real, imag);
        }
        div(other) {
            // (a + bi) / (c + di) = ((ac + bd) + (bc - ad)i) / (c² + d²)
            const denominator = other.real * other.real + other.imag * other.imag;
            if (denominator === 0) {
                throw new Error('Division by zero');
            }
            const real = (this.real * other.real + this.imag * other.imag) / denominator;
            const imag = (this.imag * other.real - this.real * other.imag) / denominator;
            return new SchemeComplexNumber(real, imag);
        }
        negate() {
            return new SchemeComplexNumber(-this.real, -this.imag);
        }
        // Comparison (only for equality)
        equals(other) {
            return this.real === other.real && this.imag === other.imag;
        }
        // Magnitude
        abs() {
            return Math.sqrt(this.real * this.real + this.imag * this.imag);
        }
        // String representation
        toString() {
            if (this.imag === 0) {
                return this.real.toString();
            }
            else if (this.real === 0) {
                if (this.imag === 1)
                    return 'i';
                if (this.imag === -1)
                    return '-i';
                return `${this.imag}i`;
            }
            else {
                const imagPart = this.imag === 1 ? 'i' :
                    this.imag === -1 ? '-i' :
                        this.imag > 0 ? `+${this.imag}i` : `${this.imag}i`;
                return `${this.real}${imagPart}`;
            }
        }
        // Convert to JavaScript number (only if purely real)
        toNumber() {
            if (this.imag !== 0) {
                throw new Error('Cannot convert complex number with imaginary part to real number');
            }
            return this.real;
        }
    }

    // Helper functions for numeric operations
    function isNumericValue(value) {
        return value.type === 'number' || value.type === 'complex';
    }
    function toComplexNumber(value) {
        if (value.type === 'number') {
            return SchemeComplexNumber.fromNumber(value.value);
        }
        else if (value.type === 'complex') {
            return value.value;
        }
        else {
            throw new Error(`Cannot convert ${value.type} to complex number`);
        }
    }
    function complexValueToResult(complex) {
        // If purely real, return as number
        if (complex.imag === 0) {
            return { type: 'number', value: complex.real };
        }
        return { type: 'complex', value: complex };
    }
    const primitives = {
        // Arithmetic operations
        '+': (...args) => {
            if (args.length === 0)
                return { type: 'number', value: 0 };
            // Check if all args are numeric (number or complex)
            if (!args.every(isNumericValue)) {
                throw new Error('+ requires numeric arguments');
            }
            // Convert all to complex and add
            const complexNumbers = args.map(toComplexNumber);
            const result = complexNumbers.reduce((acc, curr) => acc.add(curr), SchemeComplexNumber.fromNumber(0));
            return complexValueToResult(result);
        },
        '*': (...args) => {
            if (args.length === 0)
                return { type: 'number', value: 1 };
            if (!args.every(isNumericValue)) {
                throw new Error('* requires numeric arguments');
            }
            const complexNumbers = args.map(toComplexNumber);
            const result = complexNumbers.reduce((acc, curr) => acc.mul(curr), SchemeComplexNumber.fromNumber(1));
            return complexValueToResult(result);
        },
        '-': (...args) => {
            if (args.length === 0)
                throw new Error('Subtraction requires at least one argument');
            if (!args.every(isNumericValue)) {
                throw new Error('- requires numeric arguments');
            }
            const complexNumbers = args.map(toComplexNumber);
            const result = args.length === 1
                ? complexNumbers[0].negate()
                : complexNumbers.reduce((acc, curr) => acc.sub(curr));
            return complexValueToResult(result);
        },
        '/': (...args) => {
            if (args.length === 0)
                throw new Error('Division requires at least one argument');
            if (!args.every(isNumericValue)) {
                throw new Error('/ requires numeric arguments');
            }
            const complexNumbers = args.map(toComplexNumber);
            const result = args.length === 1
                ? SchemeComplexNumber.fromNumber(1).div(complexNumbers[0])
                : complexNumbers.reduce((acc, curr) => acc.div(curr));
            return complexValueToResult(result);
        },
        // Comparison operations
        '=': (a, b) => {
            if (a.type !== b.type)
                return { type: 'boolean', value: false };
            if (a.type === 'number' && b.type === 'number') {
                return { type: 'boolean', value: a.value === b.value };
            }
            if (a.type === 'string' && b.type === 'string') {
                return { type: 'boolean', value: a.value === b.value };
            }
            if (a.type === 'boolean' && b.type === 'boolean') {
                return { type: 'boolean', value: a.value === b.value };
            }
            return { type: 'boolean', value: false };
        },
        '>': (a, b) => {
            if (a.type !== 'number' || b.type !== 'number') {
                throw new Error('> requires numbers');
            }
            return { type: 'boolean', value: a.value > b.value };
        },
        '<': (a, b) => {
            if (a.type !== 'number' || b.type !== 'number') {
                throw new Error('< requires numbers');
            }
            return { type: 'boolean', value: a.value < b.value };
        },
        '>=': (a, b) => {
            if (a.type !== 'number' || b.type !== 'number') {
                throw new Error('>= requires numbers');
            }
            return { type: 'boolean', value: a.value >= b.value };
        },
        '<=': (a, b) => {
            if (a.type !== 'number' || b.type !== 'number') {
                throw new Error('<= requires numbers');
            }
            return { type: 'boolean', value: a.value <= b.value };
        },
        // Logical operations
        'not': (x) => {
            if (x.type === 'boolean') {
                return { type: 'boolean', value: !x.value };
            }
            return { type: 'boolean', value: false };
        },
        'and': (...args) => {
            for (const arg of args) {
                if (arg.type === 'boolean' && !arg.value) {
                    return { type: 'boolean', value: false };
                }
            }
            return { type: 'boolean', value: true };
        },
        'or': (...args) => {
            for (const arg of args) {
                if (arg.type === 'boolean' && arg.value) {
                    return { type: 'boolean', value: true };
                }
            }
            return { type: 'boolean', value: false };
        },
        // List operations
        'cons': (car, cdr) => {
            return { type: 'pair', car, cdr };
        },
        'car': (pair) => {
            if (pair.type !== 'pair') {
                throw new Error('car requires a pair');
            }
            return pair.car;
        },
        'cdr': (pair) => {
            if (pair.type !== 'pair') {
                throw new Error('cdr requires a pair');
            }
            return pair.cdr;
        },
        'list': (...args) => {
            return { type: 'list', elements: args };
        },
        // Type predicates
        'null?': (value) => {
            return { type: 'boolean', value: value.type === 'nil' };
        },
        'pair?': (value) => {
            return { type: 'boolean', value: value.type === 'pair' };
        },
        'list?': (value) => {
            return { type: 'boolean', value: value.type === 'list' };
        },
        'number?': (value) => {
            return { type: 'boolean', value: value.type === 'number' };
        },
        'string?': (value) => {
            return { type: 'boolean', value: value.type === 'string' };
        },
        'boolean?': (value) => {
            return { type: 'boolean', value: value.type === 'boolean' };
        },
        'symbol?': (value) => {
            return { type: 'boolean', value: value.type === 'symbol' };
        }
    };

    function evaluate(code, program, context) {
        try {
            // Initialize
            context.runtime.isRunning = true;
            context.stash = new Stash();
            context.control = new Control();
            // Initialize environment with primitives
            Object.entries(primitives).forEach(([name, func]) => {
                context.environment.define(name, { type: 'primitive', name, func });
            });
            // Push expressions in reverse order
            for (let i = program.length - 1; i >= 0; i--) {
                context.control.push(program[i]);
            }
            // Run CSE machine using the existing function
            const result = runCSEMachine(code, context, context.control, context.stash);
            return result;
        }
        catch (error) {
            return { type: 'error', message: error.message };
        }
    }
    function runCSEMachine(code, context, control, stash) {
        while (!control.isEmpty() && context.runtime.isRunning) {
            const item = control.pop();
            if (!item)
                break;
            evaluateControlItem(item, context, control, stash);
        }
        const result = stash.pop();
        return result || { type: 'nil' };
    }
    function evaluateControlItem(item, context, control, stash) {
        if (isInstr(item)) {
            evaluateInstruction(item, context, control, stash);
        }
        else if (isStatementSequence(item)) {
            // Handle StatementSequence by pushing all expressions in reverse order
            const seq = item;
            for (let i = seq.body.length - 1; i >= 0; i--) {
                control.push(seq.body[i]);
            }
        }
        else {
            evaluateExpression(item, context, control, stash);
        }
    }
    function isStatementSequence(item) {
        return 'type' in item && item.type === 'StatementSequence';
    }
    function isInstr(item) {
        return 'instrType' in item;
    }
    function evaluateExpression(expr, context, control, stash) {
        if (expr instanceof Atomic.NumericLiteral) {
            stash.push({ type: 'number', value: parseFloat(expr.value) });
        }
        else if (expr instanceof Atomic.ComplexLiteral) {
            try {
                const complexNumber = SchemeComplexNumber.fromString(expr.value);
                stash.push({ type: 'complex', value: complexNumber });
            }
            catch (error) {
                stash.push({ type: 'error', message: `Invalid complex number: ${error.message}` });
            }
        }
        else if (expr instanceof Atomic.BooleanLiteral) {
            stash.push({ type: 'boolean', value: expr.value });
        }
        else if (expr instanceof Atomic.StringLiteral) {
            stash.push({ type: 'string', value: expr.value });
        }
        else if (expr instanceof Atomic.Symbol) {
            stash.push({ type: 'symbol', value: expr.value });
        }
        else if (expr instanceof Atomic.Nil) {
            stash.push({ type: 'nil' });
        }
        else if (expr instanceof Atomic.Identifier) {
            const value = context.environment.get(expr.name);
            stash.push(value);
        }
        else if (expr instanceof Atomic.Definition) {
            // Push the value to be evaluated, then the define instruction
            control.push(expr.value);
            control.push(createDefineInstr(expr.name.name, expr.value));
        }
        else if (expr instanceof Atomic.Reassignment) {
            // Push the value to be evaluated, then the set instruction
            control.push(expr.value);
            control.push(createSetInstr(expr.name.name, expr.value));
        }
        else if (expr instanceof Atomic.Application) {
            // Push the application instruction first (so it's executed last)
            control.push(createAppInstr(expr.operands.length, expr));
            // Push the operator (so it's evaluated before the instruction)
            control.push(expr.operator);
            // Push operands in reverse order (so they are evaluated left-to-right)
            for (let i = expr.operands.length - 1; i >= 0; i--) {
                control.push(expr.operands[i]);
            }
        }
        else if (expr instanceof Atomic.Conditional) {
            // Push test, consequent, alternate, then branch instruction
            control.push(expr.test);
            control.push(expr.consequent);
            control.push(expr.alternate);
            control.push(createBranchInstr(expr.consequent, expr.alternate));
        }
        else if (expr instanceof Atomic.Lambda) {
            // Create closure
            const closure = {
                type: 'closure',
                params: expr.params.map(p => p.name),
                body: [expr.body],
                env: context.environment
            };
            stash.push(closure);
        }
        else if (expr instanceof Atomic.Pair) {
            // Push car and cdr to be evaluated, then pair instruction
            control.push(expr.car);
            control.push(expr.cdr);
            control.push(createPairInstr(expr.car, expr.cdr));
        }
        else if (expr instanceof Extended.List) {
            // Push elements to be evaluated, then list instruction
            for (let i = expr.elements.length - 1; i >= 0; i--) {
                control.push(expr.elements[i]);
            }
            control.push(createListInstr(expr.elements, expr.terminator));
        }
        else if (expr instanceof Atomic.Vector) {
            // Push elements to be evaluated, then vector instruction
            for (let i = expr.elements.length - 1; i >= 0; i--) {
                control.push(expr.elements[i]);
            }
            control.push(createVectorInstr(expr.elements));
        }
        else if (expr instanceof Extended.Begin) {
            // Push expressions to be evaluated, then begin instruction
            for (let i = expr.expressions.length - 1; i >= 0; i--) {
                control.push(expr.expressions[i]);
            }
            control.push(createBeginInstr(expr.expressions));
        }
        else if (expr instanceof Extended.Let) {
            // Push values, then let instruction
            for (let i = expr.values.length - 1; i >= 0; i--) {
                control.push(expr.values[i]);
            }
            control.push(createLetInstr(expr.identifiers.map(id => id.name), expr.values, expr.body));
        }
        else if (expr instanceof Extended.Cond) {
            // Push predicates and consequents, then cond instruction
            for (let i = expr.predicates.length - 1; i >= 0; i--) {
                control.push(expr.predicates[i]);
                control.push(expr.consequents[i]);
            }
            if (expr.catchall) {
                control.push(expr.catchall);
            }
            control.push(createCondInstr(expr.predicates, expr.consequents, expr.catchall));
        }
        else if (expr instanceof Extended.Delay) {
            // Push expression to be evaluated, then delay instruction
            control.push(expr.expression);
            control.push(createDelayInstr(expr.expression));
        }
        else {
            throw new Error(`Unsupported expression type: ${expr.constructor.name}`);
        }
    }
    function evaluateInstruction(instruction, context, control, stash) {
        switch (instruction.instrType) {
            case InstrType.DEFINE: {
                const value = stash.pop();
                if (!value)
                    throw new Error('No value to define');
                const defineInstr = instruction;
                context.environment.define(defineInstr.name, value);
                // Push void value to indicate successful definition
                stash.push({ type: 'void' });
                break;
            }
            case InstrType.SET: {
                const value = stash.pop();
                if (!value)
                    throw new Error('No value to set');
                const setInstr = instruction;
                context.environment.set(setInstr.name, value);
                break;
            }
            case InstrType.APPLICATION: {
                const appInstr = instruction;
                const operator = stash.pop();
                if (!operator)
                    throw new Error('No operator for application');
                const args = [];
                for (let i = 0; i < appInstr.numOfArgs; i++) {
                    const arg = stash.pop();
                    if (arg)
                        args.unshift(arg);
                }
                if (operator.type === 'closure') {
                    // Apply closure
                    const newEnv = createBlockEnvironment(operator.env);
                    for (let i = 0; i < operator.params.length; i++) {
                        newEnv.define(operator.params[i], args[i] || { type: 'nil' });
                    }
                    context.environment = newEnv;
                    control.push(...operator.body);
                }
                else if (operator.type === 'primitive') {
                    // Apply primitive function
                    try {
                        const result = operator.func(...args);
                        stash.push(result);
                    }
                    catch (error) {
                        stash.push({ type: 'error', message: error.message });
                    }
                }
                else {
                    stash.push({ type: 'error', message: `Cannot apply non-function: ${operator.type}` });
                }
                break;
            }
            case InstrType.BRANCH: {
                const test = stash.pop();
                if (!test)
                    throw new Error('No test value for branch');
                const branchInstr = instruction;
                if (test.type === 'boolean' && test.value) {
                    control.push(branchInstr.consequent);
                }
                else if (branchInstr.alternate) {
                    control.push(branchInstr.alternate);
                }
                break;
            }
            case InstrType.PAIR: {
                const cdr = stash.pop();
                const car = stash.pop();
                if (!car || !cdr)
                    throw new Error('Missing car or cdr for pair');
                stash.push({ type: 'pair', car, cdr });
                break;
            }
            case InstrType.LIST: {
                const listInstr = instruction;
                const elements = [];
                for (let i = 0; i < listInstr.elements.length; i++) {
                    const element = stash.pop();
                    if (element)
                        elements.unshift(element);
                }
                stash.push({ type: 'list', elements });
                break;
            }
            case InstrType.VECTOR: {
                const vectorInstr = instruction;
                const elements = [];
                for (let i = 0; i < vectorInstr.elements.length; i++) {
                    const element = stash.pop();
                    if (element)
                        elements.unshift(element);
                }
                stash.push({ type: 'vector', elements });
                break;
            }
            case InstrType.BEGIN: {
                // Begin evaluates all expressions and returns the last one
                const beginInstr = instruction;
                const expressions = beginInstr.expressions;
                if (expressions.length === 0) {
                    stash.push({ type: 'nil' });
                }
                else if (expressions.length === 1) {
                    control.push(expressions[0]);
                }
                else {
                    // Push all expressions to be evaluated
                    for (let i = expressions.length - 1; i >= 0; i--) {
                        control.push(expressions[i]);
                    }
                }
                break;
            }
            case InstrType.LET: {
                // Let creates a new environment with bindings
                const letInstr = instruction;
                const values = [];
                for (let i = 0; i < letInstr.values.length; i++) {
                    const value = stash.pop();
                    if (value)
                        values.unshift(value);
                }
                const newEnv = createBlockEnvironment(context.environment);
                for (let i = 0; i < letInstr.identifiers.length; i++) {
                    newEnv.define(letInstr.identifiers[i], values[i] || { type: 'nil' });
                }
                context.environment = newEnv;
                control.push(letInstr.body);
                break;
            }
            case InstrType.COND: {
                // Cond evaluates predicates and consequents
                const condInstr = instruction;
                const predicates = condInstr.predicates;
                const consequents = condInstr.consequents;
                if (predicates.length === 0) {
                    if (condInstr.catchall) {
                        control.push(condInstr.catchall);
                    }
                    else {
                        stash.push({ type: 'nil' });
                    }
                }
                else {
                    // Push first predicate and consequent
                    control.push(predicates[0]);
                    control.push(consequents[0]);
                    // Push remaining predicates and consequents
                    for (let i = 1; i < predicates.length; i++) {
                        control.push(predicates[i]);
                        control.push(consequents[i]);
                    }
                    if (condInstr.catchall) {
                        control.push(condInstr.catchall);
                    }
                }
                break;
            }
            default:
                throw new Error(`Unsupported instruction type: ${instruction.instrType}`);
        }
    }

    class SchemeEvaluator extends BasicEvaluator {
        constructor(conductor) {
            super(conductor);
            this.environment = createProgramEnvironment();
            this.context = {
                control: new Control(),
                stash: new Stash(),
                environment: this.environment,
                runtime: {
                    isRunning: true
                }
            };
        }
        async evaluateChunk(chunk) {
            try {
                // Parse the Scheme code using simple parser
                const expressions = parseSchemeSimple(chunk);
                // Reset context but keep the same environment
                this.context.control = new Control();
                this.context.stash = new Stash();
                this.context.environment = this.environment; // Use persisted environment
                this.context.runtime.isRunning = true;
                // Evaluate the expressions
                const result = evaluate(chunk, expressions, this.context);
                // Send output to the conductor
                if (result.type === 'error') {
                    const conductorError = new ConductorError(result.message);
                    this.conductor.sendError(conductorError);
                }
                else {
                    // Send the result as output
                    this.conductor.sendOutput(this.valueToString(result));
                }
            }
            catch (error) {
                const conductorError = new ConductorError(error.message);
                this.conductor.sendError(conductorError);
            }
        }
        valueToString(value) {
            if (value.type === 'number') {
                return value.value.toString();
            }
            else if (value.type === 'complex') {
                return value.value.toString();
            }
            else if (value.type === 'string') {
                return value.value;
            }
            else if (value.type === 'boolean') {
                return value.value ? '#t' : '#f';
            }
            else if (value.type === 'symbol') {
                return value.value;
            }
            else if (value.type === 'nil') {
                return '()';
            }
            else if (value.type === 'void') {
                return ''; // Return empty string for void values (define statements)
            }
            else if (value.type === 'pair') {
                return `(${this.valueToString(value.car)} . ${this.valueToString(value.cdr)})`;
            }
            else if (value.type === 'list') {
                return `(${value.elements.map((el) => this.valueToString(el)).join(' ')})`;
            }
            else if (value.type === 'vector') {
                return `#(${value.elements.map((el) => this.valueToString(el)).join(' ')})`;
            }
            else if (value.type === 'closure') {
                return `#<procedure>`;
            }
            else if (value.type === 'primitive') {
                return `#<primitive:${value.name}>`;
            }
            else if (value.type === 'error') {
                return `Error: ${value.message}`;
            }
            else {
                return String(value);
            }
        }
    }

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol, Iterator */


    function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
        function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
        var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
        var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
        var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
        var _, done = false;
        for (var i = decorators.length - 1; i >= 0; i--) {
            var context = {};
            for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
            for (var p in contextIn.access) context.access[p] = contextIn.access[p];
            context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
            var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
            if (kind === "accessor") {
                if (result === void 0) continue;
                if (result === null || typeof result !== "object") throw new TypeError("Object expected");
                if (_ = accept(result.get)) descriptor.get = _;
                if (_ = accept(result.set)) descriptor.set = _;
                if (_ = accept(result.init)) initializers.unshift(_);
            }
            else if (_ = accept(result)) {
                if (kind === "field") initializers.unshift(_);
                else descriptor[key] = _;
            }
        }
        if (target) Object.defineProperty(target, contextIn.name, descriptor);
        done = true;
    }
    function __runInitializers(thisArg, initializers, value) {
        var useValue = arguments.length > 2;
        for (var i = 0; i < initializers.length; i++) {
            value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
        }
        return useValue ? value : void 0;
    }
    function __setFunctionName(f, name, prefix) {
        if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
        return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
    }
    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    /**
     * Imports an external plugin from a given location.
     * @param location Where to find the external plugin.
     * @returns A promise resolving to the imported plugin.
     */
    async function importExternalPlugin(location) {
        const plugin = (await import(/* webpackIgnore: true */ location)).plugin;
        // TODO: verify it is actually a plugin
        return plugin;
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    /**
     * Imports an external module from a given location.
     * @param location Where to find the external module.
     * @returns A promise resolving to the imported module.
     */
    async function importExternalModule(location) {
        const plugin = await importExternalPlugin(location);
        // TODO: additional verification it is a module
        return plugin;
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    class Channel {
        send(message, transfer) {
            this.__verifyAlive();
            this.__port.postMessage(message, transfer ?? []);
        }
        subscribe(subscriber) {
            this.__verifyAlive();
            this.__subscribers.add(subscriber);
            if (this.__waitingMessages) {
                for (const data of this.__waitingMessages) {
                    subscriber(data);
                }
                delete this.__waitingMessages;
            }
        }
        unsubscribe(subscriber) {
            this.__verifyAlive();
            this.__subscribers.delete(subscriber);
        }
        close() {
            this.__verifyAlive();
            this.__isAlive = false;
            this.__port?.close();
        }
        /**
         * Check if this Channel is allowed to be used.
         * @throws Throws an error if the Channel has been closed.
         */
        __verifyAlive() {
            if (!this.__isAlive)
                throw new ConductorInternalError(`Channel ${this.name} has been closed`);
        }
        /**
         * Dispatch some data to subscribers.
         * @param data The data to be dispatched to subscribers.
         */
        __dispatch(data) {
            this.__verifyAlive();
            if (this.__waitingMessages) {
                this.__waitingMessages.push(data);
            }
            else {
                for (const subscriber of this.__subscribers) {
                    subscriber(data);
                }
            }
        }
        /**
         * Listens to the port's message event, and starts the port.
         * Messages will be buffered until the first subscriber listens to the Channel.
         * @param port The MessagePort to listen to.
         */
        listenToPort(port) {
            port.addEventListener("message", e => this.__dispatch(e.data));
            port.start();
        }
        /**
         * Replaces the underlying MessagePort of this Channel and closes it, and starts the new port.
         * @param port The new port to use.
         */
        replacePort(port) {
            this.__verifyAlive();
            this.__port?.close();
            this.__port = port;
            this.listenToPort(port);
        }
        constructor(name, port) {
            /** The callbacks subscribed to this Channel. */
            this.__subscribers = new Set(); // TODO: use WeakRef? but callbacks tend to be thrown away and leaking is better than incorrect behaviour
            /** Is the Channel allowed to be used? */
            this.__isAlive = true;
            this.__waitingMessages = [];
            this.name = name;
            this.replacePort(port);
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    /**
     * A stack-based queue implementation.
     * `push` and `pop` run in amortized constant time.
     */
    class Queue {
        constructor() {
            /** The output stack. */
            this.__s1 = [];
            /** The input stack. */
            this.__s2 = [];
        }
        /**
         * Adds an item to the queue.
         * @param item The item to be added to the queue.
         */
        push(item) {
            this.__s2.push(item);
        }
        /**
         * Removes an item from the queue.
         * @returns The item removed from the queue.
         * @throws If the queue is empty.
         */
        pop() {
            if (this.__s1.length === 0) {
                if (this.__s2.length === 0)
                    throw new Error("queue is empty");
                let temp = this.__s1;
                this.__s1 = this.__s2.reverse();
                this.__s2 = temp;
            }
            return this.__s1.pop(); // as the length is nonzero
        }
        /**
         * The length of the queue.
         */
        get length() {
            return this.__s1.length + this.__s2.length;
        }
        /**
         * Makes a copy of the queue.
         * @returns A copy of the queue.
         */
        clone() {
            const newQueue = new Queue();
            newQueue.__s1 = [...this.__s1];
            newQueue.__s2 = [...this.__s2];
            return newQueue;
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    class MessageQueue {
        push(item) {
            if (this.__promiseQueue.length !== 0)
                this.__promiseQueue.pop()(item);
            else
                this.__inputQueue.push(item);
        }
        async pop() {
            if (this.__inputQueue.length !== 0)
                return this.__inputQueue.pop();
            return new Promise((resolve, _reject) => {
                this.__promiseQueue.push(resolve);
            });
        }
        tryPop() {
            if (this.__inputQueue.length !== 0)
                return this.__inputQueue.pop();
            return undefined;
        }
        constructor() {
            this.__inputQueue = new Queue();
            this.__promiseQueue = new Queue();
            this.push = this.push.bind(this);
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    class ChannelQueue {
        async receive() {
            return this.__messageQueue.pop();
        }
        tryReceive() {
            return this.__messageQueue.tryPop();
        }
        send(message, transfer) {
            this.__channel.send(message, transfer);
        }
        close() {
            this.__channel.unsubscribe(this.__messageQueue.push);
        }
        constructor(channel) {
            this.__messageQueue = new MessageQueue();
            this.name = channel.name;
            this.__channel = channel;
            this.__channel.subscribe(this.__messageQueue.push);
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    class Conduit {
        __negotiateChannel(channelName) {
            const { port1, port2 } = new MessageChannel();
            const channel = new Channel(channelName, port1);
            this.__link.postMessage([channelName, port2], [port2]); // TODO: update communication protocol?
            this.__channels.set(channelName, channel);
        }
        __verifyAlive() {
            if (!this.__alive)
                throw new ConductorInternalError("Conduit already terminated");
        }
        registerPlugin(pluginClass, ...arg) {
            this.__verifyAlive();
            const attachedChannels = [];
            for (const channelName of pluginClass.channelAttach) {
                if (!this.__channels.has(channelName))
                    this.__negotiateChannel(channelName);
                attachedChannels.push(this.__channels.get(channelName)); // as the Channel has been negotiated
            }
            const plugin = new pluginClass(this, attachedChannels, ...arg);
            if (plugin.name !== undefined) {
                if (this.__pluginMap.has(plugin.name))
                    throw new ConductorInternalError(`Plugin ${plugin.name} already registered`);
                this.__pluginMap.set(plugin.name, plugin);
            }
            this.__plugins.push(plugin);
            return plugin;
        }
        unregisterPlugin(plugin) {
            this.__verifyAlive();
            let p = 0;
            for (let i = 0; i < this.__plugins.length; ++i) {
                if (this.__plugins[p] === plugin)
                    ++p;
                this.__plugins[i] = this.__plugins[i + p];
            }
            for (let i = this.__plugins.length - 1, e = this.__plugins.length - p; i >= e; --i) {
                delete this.__plugins[i];
            }
            if (plugin.name) {
                this.__pluginMap.delete(plugin.name);
            }
            plugin.destroy?.();
        }
        lookupPlugin(pluginName) {
            this.__verifyAlive();
            if (!this.__pluginMap.has(pluginName))
                throw new ConductorInternalError(`Plugin ${pluginName} not registered`);
            return this.__pluginMap.get(pluginName); // as the map has been checked
        }
        terminate() {
            this.__verifyAlive();
            for (const plugin of this.__plugins) {
                //this.unregisterPlugin(plugin);
                plugin.destroy?.();
            }
            this.__link.terminate?.();
            this.__alive = false;
        }
        __handlePort(data) {
            const [channelName, port] = data;
            if (this.__channels.has(channelName)) { // uh-oh, we already have a port for this channel
                const channel = this.__channels.get(channelName); // as the map has been checked
                if (this.__parent) { // extract the data and discard the messageport; child's Channel will close it
                    channel.listenToPort(port);
                }
                else { // replace our messageport; Channel will close it
                    channel.replacePort(port);
                }
            }
            else { // register the new channel
                const channel = new Channel(channelName, port);
                this.__channels.set(channelName, channel);
            }
        }
        constructor(link, parent = false) {
            this.__alive = true;
            this.__channels = new Map();
            this.__pluginMap = new Map();
            this.__plugins = [];
            this.__link = link;
            link.addEventListener("message", e => this.__handlePort(e.data));
            this.__parent = parent;
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    class RpcCallMessage {
        constructor(fn, args, invokeId) {
            this.type = 0 /* RpcMessageType.CALL */;
            this.data = { fn, args, invokeId };
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    class RpcErrorMessage {
        constructor(invokeId, err) {
            this.type = 2 /* RpcMessageType.RETURN_ERR */;
            this.data = { invokeId, err };
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    class RpcReturnMessage {
        constructor(invokeId, res) {
            this.type = 1 /* RpcMessageType.RETURN */;
            this.data = { invokeId, res };
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    function makeRpc(channel, self) {
        const waiting = [];
        let invocations = 0;
        const otherCallbacks = {};
        channel.subscribe(async (rpcMessage) => {
            switch (rpcMessage.type) {
                case 0 /* RpcMessageType.CALL */:
                    {
                        const { fn, args, invokeId } = rpcMessage.data;
                        try {
                            // @ts-expect-error
                            const res = await self[fn](...args);
                            if (invokeId > 0)
                                channel.send(new RpcReturnMessage(invokeId, res));
                        }
                        catch (err) {
                            if (invokeId > 0)
                                channel.send(new RpcErrorMessage(invokeId, err));
                        }
                        break;
                    }
                case 1 /* RpcMessageType.RETURN */:
                    {
                        const { invokeId, res } = rpcMessage.data;
                        waiting[invokeId]?.[0]?.(res);
                        delete waiting[invokeId];
                        break;
                    }
                case 2 /* RpcMessageType.RETURN_ERR */:
                    {
                        const { invokeId, err } = rpcMessage.data;
                        waiting[invokeId]?.[1]?.(err);
                        delete waiting[invokeId];
                        break;
                    }
            }
        });
        return new Proxy(otherCallbacks, {
            get(target, p, receiver) {
                const cb = Reflect.get(target, p, receiver);
                if (cb)
                    return cb;
                const newCallback = typeof p === "string" && p.charAt(0) === "$"
                    ? (...args) => {
                        channel.send(new RpcCallMessage(p, args, 0));
                    }
                    : (...args) => {
                        const invokeId = ++invocations;
                        channel.send(new RpcCallMessage(p, args, invokeId));
                        return new Promise((resolve, reject) => {
                            waiting[invokeId] = [resolve, reject];
                        });
                    };
                Reflect.set(target, p, newCallback, receiver);
                return newCallback;
            },
        });
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    /**
     * Typechecking utility decorator.
     * It is recommended that usage of this decorator is removed
     * before or during the build process, as some tools
     * (e.g. terser) do not have good support for class decorators.
     * @param _pluginClass The Class to be typechecked.
     */
    function checkIsPluginClass(_pluginClass) {
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    exports.DataType = void 0;
    (function (DataType) {
        /** The return type of functions with no returned value. As a convention, the associated JS value is undefined. */
        DataType[DataType["VOID"] = 0] = "VOID";
        /** A Boolean value. */
        DataType[DataType["BOOLEAN"] = 1] = "BOOLEAN";
        /** A numerical value. */
        DataType[DataType["NUMBER"] = 2] = "NUMBER";
        /** An immutable string of characters. */
        DataType[DataType["CONST_STRING"] = 3] = "CONST_STRING";
        /** The empty list. As a convention, the associated JS value is null. */
        DataType[DataType["EMPTY_LIST"] = 4] = "EMPTY_LIST";
        /** A pair of values. Reference type. */
        DataType[DataType["PAIR"] = 5] = "PAIR";
        /** An array of values of a single type. Reference type. */
        DataType[DataType["ARRAY"] = 6] = "ARRAY";
        /** A value that can be called with fixed arity. Reference type. */
        DataType[DataType["CLOSURE"] = 7] = "CLOSURE";
        /** An opaque value that cannot be manipulated from user code. */
        DataType[DataType["OPAQUE"] = 8] = "OPAQUE";
        /** A list (either a pair or the empty list). */
        DataType[DataType["LIST"] = 9] = "LIST";
    })(exports.DataType || (exports.DataType = {}));

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    class AbortServiceMessage {
        constructor(minVersion) {
            this.type = 1 /* ServiceMessageType.ABORT */;
            this.data = { minVersion: minVersion };
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    class EntryServiceMessage {
        constructor(entryPoint) {
            this.type = 2 /* ServiceMessageType.ENTRY */;
            this.data = entryPoint;
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    class HelloServiceMessage {
        constructor() {
            this.type = 0 /* ServiceMessageType.HELLO */;
            this.data = { version: 0 /* Constant.PROTOCOL_VERSION */ };
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    class PluginServiceMessage {
        constructor(pluginName) {
            this.type = 3 /* ServiceMessageType.PLUGIN */;
            this.data = pluginName;
        }
    }

    // This file is adapted from:
    // https://github.com/source-academy/conductor
    // Original author(s): Source Academy Team
    let RunnerPlugin = (() => {
        let _classDecorators = [checkIsPluginClass];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        _classThis = class {
            requestFile(fileName) {
                return this.__fileRpc.requestFile(fileName);
            }
            async requestChunk() {
                return (await this.__chunkQueue.receive()).chunk;
            }
            async requestInput() {
                const { message } = await this.__ioQueue.receive();
                return message;
            }
            tryRequestInput() {
                const out = this.__ioQueue.tryReceive();
                return out?.message;
            }
            sendOutput(message) {
                this.__ioQueue.send({ message });
            }
            sendError(error) {
                this.__errorChannel.send({ error });
            }
            updateStatus(status, isActive) {
                this.__statusChannel.send({ status, isActive });
            }
            hostLoadPlugin(pluginName) {
                this.__serviceChannel.send(new PluginServiceMessage(pluginName));
            }
            registerPlugin(pluginClass, ...arg) {
                return this.__conduit.registerPlugin(pluginClass, ...arg);
            }
            unregisterPlugin(plugin) {
                this.__conduit.unregisterPlugin(plugin);
            }
            registerModule(moduleClass) {
                if (!this.__isCompatibleWithModules)
                    throw new ConductorInternalError("Evaluator has no data interface");
                return this.registerPlugin(moduleClass, this.__evaluator);
            }
            unregisterModule(module) {
                this.unregisterPlugin(module);
            }
            async importAndRegisterExternalPlugin(location, ...arg) {
                const pluginClass = await importExternalPlugin(location);
                return this.registerPlugin(pluginClass, ...arg);
            }
            async importAndRegisterExternalModule(location) {
                const moduleClass = await importExternalModule(location);
                return this.registerModule(moduleClass);
            }
            constructor(conduit, [fileChannel, chunkChannel, serviceChannel, ioChannel, errorChannel, statusChannel], evaluatorClass) {
                this.name = "__runner_main" /* InternalPluginName.RUNNER_MAIN */;
                // @ts-expect-error TODO: figure proper way to typecheck this
                this.__serviceHandlers = new Map([
                    [0 /* ServiceMessageType.HELLO */, function helloServiceHandler(message) {
                            if (message.data.version < 0 /* Constant.PROTOCOL_MIN_VERSION */) {
                                this.__serviceChannel.send(new AbortServiceMessage(0 /* Constant.PROTOCOL_MIN_VERSION */));
                                console.error(`Host's protocol version (${message.data.version}) must be at least ${0 /* Constant.PROTOCOL_MIN_VERSION */}`);
                            }
                            else {
                                console.log(`Host is using protocol version ${message.data.version}`);
                            }
                        }],
                    [1 /* ServiceMessageType.ABORT */, function abortServiceHandler(message) {
                            console.error(`Host expects at least protocol version ${message.data.minVersion}, but we are on version ${0 /* Constant.PROTOCOL_VERSION */}`);
                            this.__conduit.terminate();
                        }],
                    [2 /* ServiceMessageType.ENTRY */, function entryServiceHandler(message) {
                            this.__evaluator.startEvaluator(message.data);
                        }]
                ]);
                this.__conduit = conduit;
                this.__fileRpc = makeRpc(fileChannel, {});
                this.__chunkQueue = new ChannelQueue(chunkChannel);
                this.__serviceChannel = serviceChannel;
                this.__ioQueue = new ChannelQueue(ioChannel);
                this.__errorChannel = errorChannel;
                this.__statusChannel = statusChannel;
                // Use SchemeEvaluator instead of BasicEvaluator
                this.__evaluator = new SchemeEvaluator(this);
                this.__isCompatibleWithModules = false;
                this.__serviceChannel.send(new HelloServiceMessage());
                this.__serviceChannel.subscribe((message) => {
                    const handler = this.__serviceHandlers.get(message.type);
                    if (handler) {
                        handler.call(this, message);
                    }
                });
            }
        };
        __setFunctionName(_classThis, "RunnerPlugin");
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })();
        _classThis.channelAttach = ["__file_rpc" /* InternalChannelName.FILE */, "__chunk" /* InternalChannelName.CHUNK */, "__service" /* InternalChannelName.SERVICE */, "__stdio" /* InternalChannelName.STANDARD_IO */, "__error" /* InternalChannelName.ERROR */, "__status" /* InternalChannelName.STATUS */];
        (() => {
            __runInitializers(_classThis, _classExtraInitializers);
        })();
        return _classThis;
    })();

    /**
     * Initialise this runner with the evaluator to be used.
     * @param evaluatorClass The Evaluator to be used on this runner.
     * @param link The underlying communication link.
     * @returns The initialised `runnerPlugin` and `conduit`.
     */
    function initialise(evaluatorClass, link = (typeof self !== 'undefined' ? self : typeof global !== 'undefined' ? global : {
        addEventListener: () => { },
        postMessage: () => { },
        onmessage: null
    })) {
        const conduit = new Conduit(link, false);
        const runnerPlugin = conduit.registerPlugin(RunnerPlugin, evaluatorClass);
        return { runnerPlugin, conduit };
    }

    // Simple AST walker to replace acorn-walk
    function walkFull(ast, visitor) {
        visitor(ast);
        // Walk through all properties that might contain nodes
        for (const key in ast) {
            const value = ast[key];
            if (value && typeof value === 'object') {
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        if (item && typeof item === 'object' && item.type) {
                            walkFull(item, visitor);
                        }
                    });
                }
                else if (value.type) {
                    walkFull(value, visitor);
                }
            }
        }
    }
    // A function to modify all names in the estree program.
    // Prevents any name collisions with JS keywords and invalid characters.
    function estreeEncode(ast) {
        walkFull(ast, (node) => {
            if (node.encoded === true) {
                return;
            }
            if (node.type === "Identifier") {
                node.name = encode(node.name);
                // ensures the conversion is only done once
                node.encoded = true;
            }
        });
        walkFull(ast, (node) => {
            node.encoded = undefined;
        });
        return ast;
    }
    function estreeDecode(ast) {
        walkFull(ast, (node) => {
            if (node.decoded === true) {
                return;
            }
            if (node.type === "Identifier") {
                node.name = decode(node.name);
                // ensures the conversion is only done once
                node.decoded = true;
            }
        });
        walkFull(ast, (node) => {
            node.decoded = undefined;
        });
        return ast;
    }

    function unparse(node) {
        //if ((node as any)?.hidden) return "";
        switch (node.type) {
            case "Identifier":
                return node.name;
            case "Literal":
                return node.raw;
            case "CallExpression":
                const callee = unparse(node.callee);
                const args = node.arguments.map(unparse).join(" ");
                return `(${callee} ${args})`;
            case "ArrayExpression":
                const elements = node.elements.map(s => unparse(s)).join(" ");
                return `(vector ${elements})`;
            case "ArrowFunctionExpression":
                const params = node.params.map(unparse).join(" ");
                const body = unparse(node.body);
                return `(lambda (${params}) ${body})`;
            case "RestElement":
                return `. ${unparse(node.argument)}`;
            case "BlockStatement":
                const statements = node.body.map(unparse).join(" ");
                return `(begin ${statements})`;
            case "ReturnStatement":
                const argument = unparse(node.argument);
                return argument;
            case "VariableDeclaration":
                const id = unparse(node.declarations[0].id);
                const init = unparse(node.declarations[0].init);
                return `(define ${id} ${init})`;
            case "ExpressionStatement":
                return unparse(node.expression);
            case "AssignmentExpression":
                const left = unparse(node.left);
                const right = unparse(node.right);
                return `(set! ${left} ${right})`;
            case "ConditionalExpression":
                const test = unparse(node.test);
                const consequent = unparse(node.consequent);
                const alternate = unparse(node.alternate);
                return `(if ${test} ${consequent} ${alternate})`;
            case "Program":
                return node.body.map(unparse).join("\n");
            case "ImportDeclaration":
                const identifiers = node.specifiers.map(unparse).join(" ");
                const source = unparse(node.source);
                return `(import (${source} ${identifiers}))`;
            case "ExportNamedDeclaration":
                const definition = unparse(node.declaration);
                return `(export ${definition})`;
            default:
                throw new Error(`Unparsing for node type ${node.type} not implemented`);
        }
    }

    class LexerError extends SyntaxError {
        constructor(message, line, col) {
            super(message);
            this.loc = {
                line: line,
                column: col,
            };
        }
        toString() {
            return this.message;
        }
    }
    class UnexpectedCharacterError extends LexerError {
        constructor(line, col, char) {
            super(`Unexpected character \'${char}\' (${line}:${col})`, line, col);
            this.char = char;
            this.name = "UnexpectedCharacterError";
        }
    }
    let UnexpectedEOFError$1 = class UnexpectedEOFError extends LexerError {
        constructor(line, col) {
            super(`Unexpected EOF (${line}:${col})`, line, col);
            this.name = "UnexpectedEOFError";
        }
    };

    var lexerError = /*#__PURE__*/Object.freeze({
        __proto__: null,
        LexerError: LexerError,
        UnexpectedCharacterError: UnexpectedCharacterError,
        UnexpectedEOFError: UnexpectedEOFError$1
    });

    // The core library of scm-slang,
    // different from the base library,
    // this library contains all methods required
    // for the language to function properly.
    // define here the functions used to check and split the number into its parts
    var NumberType;
    (function (NumberType) {
        NumberType[NumberType["INTEGER"] = 1] = "INTEGER";
        NumberType[NumberType["RATIONAL"] = 2] = "RATIONAL";
        NumberType[NumberType["REAL"] = 3] = "REAL";
        NumberType[NumberType["COMPLEX"] = 4] = "COMPLEX";
    })(NumberType || (NumberType = {}));
    class Match {
        constructor(result) {
            this.result = result;
        }
    }
    class IntegerMatch extends Match {
        constructor(result, value) {
            super(result);
            this.result = result;
            this.value = value;
        }
        isSigned() {
            return this.result
                ? this.value[0] === "+" || this.value[0] === "-"
                : false;
        }
        build() {
            return SchemeInteger.build(this.value);
        }
    }
    class RationalMatch extends Match {
        constructor(result, numerator, denominator) {
            super(result);
            this.result = result;
            this.numerator = numerator;
            this.denominator = denominator;
        }
        build() {
            return SchemeRational.build(this.numerator, this.denominator);
        }
    }
    class RealMatch extends Match {
        constructor(result, integer, decimal, exponent) {
            super(result);
            this.result = result;
            this.integer = integer;
            this.decimal = decimal;
            this.exponent = exponent;
        }
        build() {
            if (this.integer?.includes("inf")) {
                return this.integer.includes("-")
                    ? SchemeReal.NEG_INFINITY
                    : SchemeReal.INFINITY;
            }
            if (this.integer?.includes("nan")) {
                return SchemeReal.NAN;
            }
            // recursively build the exponent
            let exponent = (this.exponent ? this.exponent.build() : SchemeReal.INEXACT_ZERO).coerce();
            // we are assured that either part exists
            let value = Number((this.integer ? this.integer : "0") +
                "." +
                (this.decimal ? this.decimal : "0"));
            // apply the exponent
            value *= Math.pow(10, exponent);
            return SchemeReal.build(value);
        }
    }
    class ComplexMatch extends Match {
        constructor(result, real, sign, imaginary) {
            super(result);
            this.result = result;
            this.real = real;
            this.sign = sign;
            this.imaginary = imaginary;
        }
        build() {
            const real = this.real
                ? this.real.build()
                : SchemeInteger.EXACT_ZERO;
            const imaginary = this.imaginary.build();
            if (this.sign && this.sign === "-") {
                return SchemeComplex.build(real, imaginary.negate());
            }
            return SchemeComplex.build(real, imaginary);
        }
    }
    // these are used to determine the type of the number and to separate it into its parts as well
    function isInteger(value) {
        // <integer> = [+-]?<digit>+
        // check if the value is an integer. if it is, return true and the value.
        // if not, return false and an empty array.
        const integerRegex = new RegExp(`^([+-]?)(\\d+)$`);
        const match = integerRegex.exec(value);
        if (match) {
            return new IntegerMatch(true, match[0]);
        }
        return new IntegerMatch(false);
    }
    function isRational(value) {
        // <rational> = <integer>/<integer>
        // both sides of the rational should parse as integers
        // we can split the rational into two parts and check if both are integers
        // make sure there is a /
        const count = (value.match(/\//g) || []).length;
        if (count !== 1) {
            return new RationalMatch(false);
        }
        const parts = value.split("/");
        if (parts.length !== 2) {
            return new RationalMatch(false);
        }
        const [numerator, denominator] = parts;
        const numeratorMatch = isInteger(numerator);
        const denominatorMatch = isInteger(denominator);
        if (!(numeratorMatch.result && denominatorMatch.result)) {
            return new RationalMatch(false);
        }
        return new RationalMatch(true, numerator, denominator);
    }
    function isReal(value) {
        // <real> = <basic> | <extended>
        // <basic>: [+-]?a.b | [+-]?a | [+-]?.b | [+-]?a.
        // <extended>: <basic>[eE]<integer | rational | real>
        // where a = <digit>+ | inf | nan
        //       b = <digit>+
        //
        // keep in mind that the value matches an integer too! but
        // by the point of time this is called, we have already checked for an integer
        function checkBasicReal(value) {
            // checks if the value is one of the 4 forms of special numbers
            function isSpecialNumber(value) {
                return (value === "+inf.0" ||
                    value === "-inf.0" ||
                    value === "+nan.0" ||
                    value === "-nan.0");
            }
            // check if the value is a special number
            if (isSpecialNumber(value)) {
                return new RealMatch(true, value);
            }
            // check for the presence of a dot
            const count = (value.match(/\./g) || []).length;
            if (count > 1) {
                return new RealMatch(false);
            }
            if (count === 0) {
                const result = isInteger(value);
                return new RealMatch(result.result, result.value);
            }
            // check for a basic real number
            const [integerPart, decimalPart] = value.split(".");
            const integerMatch = isInteger(integerPart);
            const decimalMatch = isInteger(decimalPart);
            const properInteger = integerMatch.result || integerPart === "";
            const properDecimal = decimalMatch.result || decimalPart === "";
            // if the integer part is just a sign, the decimal part should be non-empty
            if (integerPart === "+" || integerPart === "-") {
                if (decimalPart === "") {
                    return new RealMatch(false);
                }
                return new RealMatch(true, `${integerPart}0`, value);
            }
            // at least one of the parts should be non-empty
            if (!((integerMatch.result && properDecimal) ||
                (properInteger && decimalMatch.result))) {
                return new RealMatch(false);
            }
            // if there is a decimal match, there should have no sign
            if (decimalMatch.result && decimalMatch.isSigned()) {
                return new RealMatch(false);
            }
            return new RealMatch(true, integerMatch.value, decimalMatch.value);
        }
        function checkExtendedReal(value) {
            // split the value into two parts by e/E
            const first_e_index = value.indexOf("e");
            const first_E_index = value.indexOf("E");
            if (first_e_index === -1 && first_E_index === -1) {
                return new RealMatch(false);
            }
            const exponentIndex = first_e_index === -1 ? first_E_index : first_e_index;
            const basicRealPart = value.substring(0, exponentIndex);
            const exponentPart = value.substring(exponentIndex + 1);
            // both should not be empty
            if (basicRealPart === "" || exponentPart == "") {
                return new RealMatch(false);
            }
            // parse each part
            const basicRealMatch = checkBasicReal(basicRealPart);
            if (!basicRealMatch.result) {
                return new RealMatch(false);
            }
            // match the exponent part across types up to real
            const exponentMatch = universalMatch(exponentPart, NumberType.REAL);
            if (!exponentMatch.result) {
                return new RealMatch(false);
            }
            return new RealMatch(true, basicRealMatch.integer, basicRealMatch.decimal, exponentMatch);
        }
        // check for the presence of e/E
        const count = (value.match(/[eE]/g) || []).length;
        if (count === 0) {
            // check for a basic real number
            return checkBasicReal(value);
        }
        // check for an extended real number
        return checkExtendedReal(value);
    }
    function isComplex(value) {
        // <basic-num> = <integer> | <rational> | <real>
        // <complex> = <basic-num>[+-]<basic-num>i
        // check if the value is a complex number. if it is, return true and the value.
        // if not, return a failed match.
        const count = (value.match(/i/g) || []).length;
        if (count < 1) {
            return new ComplexMatch(false);
        }
        if (value[value.length - 1] !== "i") {
            return new ComplexMatch(false);
        }
        // find the first + or - that is not at the start of the string
        // this is the split point
        const splitPoint = value.search(/(?<!^)[+-]/);
        // if no such point was found,
        if (splitPoint === -1) {
            // the value may be purely imaginary
            let imaginaryPart = value.slice(0, -1);
            const imaginaryMatch = universalMatch(imaginaryPart, NumberType.REAL);
            if (imaginaryMatch.result) {
                return new ComplexMatch(true, undefined, undefined, imaginaryMatch);
            }
            return new ComplexMatch(false);
        }
        const realPart = value.slice(0, splitPoint);
        let imaginaryPart = value.slice(splitPoint + 1, -1);
        // if imaginaryPart doesn't start with a sign, add one
        // this lets us properly parse expressions such as 1+inf.0i
        // even if the + belongs to the complex number
        if (imaginaryPart[0] !== "+" && imaginaryPart[0] !== "-") {
            imaginaryPart = "+" + imaginaryPart;
        }
        const realMatch = universalMatch(realPart, NumberType.REAL);
        const imaginaryMatch = universalMatch(imaginaryPart, NumberType.REAL);
        if (!(realMatch.result && imaginaryMatch.result)) {
            return new ComplexMatch(false);
        }
        return new ComplexMatch(true, realMatch, value[splitPoint], imaginaryMatch);
    }
    // tests the value across all possible types
    // only limited by the finalWillingType of
    function universalMatch(value, finalWillingType) {
        const integerMatch = isInteger(value);
        if (integerMatch.result && finalWillingType >= NumberType.INTEGER) {
            return integerMatch;
        }
        const rationalMatch = isRational(value);
        if (rationalMatch.result && finalWillingType >= NumberType.RATIONAL) {
            return rationalMatch;
        }
        const realMatch = isReal(value);
        if (realMatch.result && finalWillingType >= NumberType.REAL) {
            return realMatch;
        }
        const complexMatch = isComplex(value);
        if (complexMatch.result && finalWillingType >= NumberType.COMPLEX) {
            return complexMatch;
        }
        return new IntegerMatch(false);
    }
    // for the lexer.
    function stringIsSchemeNumber(value) {
        const match = universalMatch(value, NumberType.COMPLEX);
        return match.result;
    }
    class SchemeInteger {
        constructor(value) {
            this.numberType = NumberType.INTEGER;
            this.value = value;
        }
        // Factory method for creating a new SchemeInteger instance.
        // Force prevents automatic downcasting to a lower type.
        static build(value, _force = false) {
            const val = BigInt(value);
            if (val === 0n) {
                return SchemeInteger.EXACT_ZERO;
            }
            return new SchemeInteger(val);
        }
        promote(nType) {
            switch (nType) {
                case NumberType.INTEGER:
                    return this;
                case NumberType.RATIONAL:
                    return SchemeRational.build(this.value, 1n, true);
                case NumberType.REAL:
                    return SchemeReal.build(this.coerce(), true);
                case NumberType.COMPLEX:
                    return SchemeComplex.build(this, SchemeInteger.EXACT_ZERO, true);
            }
        }
        equals(other) {
            return other instanceof SchemeInteger && this.value === other.value;
        }
        greaterThan(other) {
            return this.value > other.value;
        }
        negate() {
            if (this === SchemeInteger.EXACT_ZERO) {
                return this;
            }
            return SchemeInteger.build(-this.value);
        }
        multiplicativeInverse() {
            if (this === SchemeInteger.EXACT_ZERO) {
                throw new Error("Division by zero");
            }
            return SchemeRational.build(1n, this.value, false);
        }
        add(other) {
            return SchemeInteger.build(this.value + other.value);
        }
        multiply(other) {
            return SchemeInteger.build(this.value * other.value);
        }
        getBigInt() {
            return this.value;
        }
        coerce() {
            if (this.value > Number.MAX_SAFE_INTEGER) {
                return Infinity;
            }
            if (this.value < Number.MIN_SAFE_INTEGER) {
                return -Infinity;
            }
            return Number(this.value);
        }
        toString() {
            return this.value.toString();
        }
    }
    SchemeInteger.EXACT_ZERO = new SchemeInteger(0n);
    class SchemeRational {
        constructor(numerator, denominator) {
            this.numberType = NumberType.RATIONAL;
            this.numerator = numerator;
            this.denominator = denominator;
        }
        // Builds a rational number.
        // Force prevents automatic downcasting to a lower type.
        static build(numerator, denominator, force = false) {
            return SchemeRational.simplify(BigInt(numerator), BigInt(denominator), force);
        }
        static simplify(numerator, denominator, force = false) {
            const gcd = (a, b) => {
                if (b === 0n) {
                    return a;
                }
                return gcd(b, a.valueOf() % b.valueOf());
            };
            const divisor = gcd(numerator, denominator);
            const numeratorSign = numerator < 0n ? -1n : 1n;
            const denominatorSign = denominator < 0n ? -1n : 1n;
            // determine the sign of the result
            const sign = numeratorSign * denominatorSign;
            // remove the sign from the numerator and denominator
            numerator = numerator * numeratorSign;
            denominator = denominator * denominatorSign;
            // if the denominator is 1, we can return an integer
            if (denominator === 1n && !force) {
                return SchemeInteger.build(sign * numerator);
            }
            return new SchemeRational((sign * numerator) / divisor, denominator / divisor);
        }
        getNumerator() {
            return this.numerator;
        }
        getDenominator() {
            return this.denominator;
        }
        promote(nType) {
            switch (nType) {
                case NumberType.RATIONAL:
                    return this;
                case NumberType.REAL:
                    return SchemeReal.build(this.coerce(), true);
                case NumberType.COMPLEX:
                    return SchemeComplex.build(this, SchemeInteger.EXACT_ZERO, true);
                default:
                    throw new Error("Unable to demote rational");
            }
        }
        equals(other) {
            return (other instanceof SchemeRational &&
                this.numerator === other.numerator &&
                this.denominator === other.denominator);
        }
        greaterThan(other) {
            return (this.numerator * other.denominator > other.numerator * this.denominator);
        }
        negate() {
            return SchemeRational.build(-this.numerator, this.denominator);
        }
        multiplicativeInverse() {
            if (this.numerator === 0n) {
                throw new Error("Division by zero");
            }
            return SchemeRational.build(this.denominator, this.numerator);
        }
        add(other) {
            const newNumerator = this.numerator * other.denominator + other.numerator * this.denominator;
            const newDenominator = this.denominator * other.denominator;
            return SchemeRational.build(newNumerator, newDenominator);
        }
        multiply(other) {
            const newNumerator = this.numerator * other.numerator;
            const newDenominator = this.denominator * other.denominator;
            return SchemeRational.build(newNumerator, newDenominator);
        }
        coerce() {
            const workingNumerator = this.numerator < 0n ? -this.numerator : this.numerator;
            let converterDenominator = this.denominator;
            // we can take the whole part directly
            const wholePart = Number(workingNumerator / converterDenominator);
            if (wholePart > Number.MAX_VALUE) {
                return this.numerator < 0n ? -Infinity : Infinity;
            }
            // remainder should be lossily converted below safe levels
            let remainder = workingNumerator % converterDenominator;
            // we lossily convert both values below safe number thresholds
            while (remainder > Number.MAX_SAFE_INTEGER ||
                converterDenominator > Number.MAX_SAFE_INTEGER) {
                remainder = remainder / 2n;
                converterDenominator = converterDenominator / 2n;
            }
            // coerce the now safe parts into a remainder number
            const remainderPart = Number(remainder) / Number(converterDenominator);
            return this.numerator < 0n
                ? -(wholePart + remainderPart)
                : wholePart + remainderPart;
        }
        toString() {
            return `${this.numerator}/${this.denominator}`;
        }
    }
    // it is allowable to represent the Real number using
    // float/double representation, and so we shall do that.
    // the current schemeReal implementation is fully based
    // on JavaScript numbers.
    class SchemeReal {
        static build(value, _force = false) {
            if (value === Infinity) {
                return SchemeReal.INFINITY;
            }
            else if (value === -Infinity) {
                return SchemeReal.NEG_INFINITY;
            }
            else if (isNaN(value)) {
                return SchemeReal.NAN;
            }
            else if (value === 0) {
                return SchemeReal.INEXACT_ZERO;
            }
            else if (value === -0) {
                return SchemeReal.INEXACT_NEG_ZERO;
            }
            return new SchemeReal(value);
        }
        constructor(value) {
            this.numberType = NumberType.REAL;
            this.value = value;
        }
        promote(nType) {
            switch (nType) {
                case NumberType.REAL:
                    return this;
                case NumberType.COMPLEX:
                    return SchemeComplex.build(this, SchemeInteger.EXACT_ZERO, true);
                default:
                    throw new Error("Unable to demote real");
            }
        }
        equals(other) {
            return other instanceof SchemeReal && this.value === other.value;
        }
        greaterThan(other) {
            return this.value > other.value;
        }
        negate() {
            return SchemeReal.build(-this.value);
        }
        multiplicativeInverse() {
            if (this === SchemeReal.INEXACT_ZERO ||
                this === SchemeReal.INEXACT_NEG_ZERO) {
                throw new Error("Division by zero");
            }
            return SchemeReal.build(1 / this.value);
        }
        add(other) {
            return SchemeReal.build(this.value + other.value);
        }
        multiply(other) {
            return SchemeReal.build(this.value * other.value);
        }
        coerce() {
            return this.value;
        }
        toString() {
            if (this === SchemeReal.INFINITY) {
                return "+inf.0";
            }
            if (this === SchemeReal.NEG_INFINITY) {
                return "-inf.0";
            }
            if (this === SchemeReal.NAN) {
                return "+nan.0";
            }
            return this.value.toString();
        }
    }
    SchemeReal.INEXACT_ZERO = new SchemeReal(0);
    SchemeReal.INEXACT_NEG_ZERO = new SchemeReal(-0);
    SchemeReal.INFINITY = new SchemeReal(Infinity);
    SchemeReal.NEG_INFINITY = new SchemeReal(-Infinity);
    SchemeReal.NAN = new SchemeReal(NaN);
    class SchemeComplex {
        static build(real, imaginary, force = false) {
            return SchemeComplex.simplify(new SchemeComplex(real, imaginary), force);
        }
        constructor(real, imaginary) {
            this.numberType = NumberType.COMPLEX;
            this.real = real;
            this.imaginary = imaginary;
        }
        static simplify(complex, force) {
            if (!force && atomic_equals(complex.imaginary, SchemeInteger.EXACT_ZERO)) {
                return complex.real;
            }
            return complex;
        }
        promote(nType) {
            switch (nType) {
                case NumberType.COMPLEX:
                    return this;
                default:
                    throw new Error("Unable to demote complex");
            }
        }
        negate() {
            return SchemeComplex.build(this.real.negate(), this.imaginary.negate());
        }
        equals(other) {
            return (atomic_equals(this.real, other.real) &&
                atomic_equals(this.imaginary, other.imaginary));
        }
        greaterThan(other) {
            return (atomic_greater_than(this.real, other.real) &&
                atomic_greater_than(this.imaginary, other.imaginary));
        }
        multiplicativeInverse() {
            // inverse of a + bi = a - bi / a^2 + b^2
            // in this case, we use a / a^2 + b^2 and -b / a^2 + b^2 as the new values required
            const denominator = atomic_add(atomic_multiply(this.real, this.real), atomic_multiply(this.imaginary, this.imaginary));
            return SchemeComplex.build(atomic_multiply(denominator.multiplicativeInverse(), this.real), atomic_multiply(denominator.multiplicativeInverse(), this.imaginary.negate()));
        }
        add(other) {
            return SchemeComplex.build(atomic_add(this.real, other.real), atomic_add(this.imaginary, other.imaginary));
        }
        multiply(other) {
            // (a + bi) * (c + di) = (ac - bd) + (ad + bc)i
            const realPart = atomic_subtract(atomic_multiply(this.real, other.real), atomic_multiply(this.imaginary, other.imaginary));
            const imaginaryPart = atomic_add(atomic_multiply(this.real, other.imaginary), atomic_multiply(this.imaginary, other.real));
            return SchemeComplex.build(realPart, imaginaryPart);
        }
        getReal() {
            return this.real;
        }
        getImaginary() {
            return this.imaginary;
        }
        coerce() {
            throw new Error("Cannot coerce a complex number to a javascript number");
        }
        toPolar() {
            // force both the real and imaginary parts to be inexact
            const real = this.real.promote(NumberType.REAL);
            const imaginary = this.imaginary.promote(NumberType.REAL);
            // schemeReals can be reasoned with using the same logic as javascript numbers
            // r = sqrt(a^2 + b^2)
            const magnitude = SchemeReal.build(Math.sqrt(real.coerce() * real.coerce() + imaginary.coerce() * imaginary.coerce()));
            // theta = atan(b / a)
            const angle = SchemeReal.build(Math.atan2(imaginary.coerce(), real.coerce()));
            return SchemePolar.build(magnitude, angle);
        }
        toString() {
            return `${this.real}+${this.imaginary}i`;
        }
    }
    // an alternative form of the complex number.
    // only used in intermediate steps, will be converted back at the end of the operation.
    // current scm-slang will force any polar complex numbers to be made
    // inexact, hence we opt to limit the use of polar form as much as possible.
    class SchemePolar {
        constructor(magnitude, angle) {
            this.magnitude = magnitude;
            this.angle = angle;
        }
        static build(magnitude, angle) {
            return new SchemePolar(magnitude, angle);
        }
        // converts the polar number back to a cartesian complex number
        toCartesian() {
            // a + bi = r * cos(theta) + r * sin(theta)i
            // a = r * cos(theta)
            // b = r * sin(theta)
            const real = SchemeReal.build(this.magnitude.coerce() * Math.cos(this.angle.coerce()));
            const imaginary = SchemeReal.build(this.magnitude.coerce() * Math.sin(this.angle.coerce()));
            return SchemeComplex.build(real, imaginary);
        }
    }
    // the functions below are used to perform operations on numbers
    function simplify(a) {
        switch (a.numberType) {
            case NumberType.INTEGER:
                return a;
            case NumberType.RATIONAL:
                return a.getDenominator() === 1n
                    ? SchemeInteger.build(a.getNumerator())
                    : a;
            case NumberType.REAL:
                return a;
            case NumberType.COMPLEX:
                // safe to cast as simplify never promotes a number
                return SchemeComplex.build(simplify(a.getReal()), simplify(a.getImaginary()));
        }
    }
    /**
     * This function takes two numbers and brings them to the same level.
     */
    function equalify(a, b) {
        if (a.numberType > b.numberType) {
            return [a, b.promote(a.numberType)];
        }
        else if (a.numberType < b.numberType) {
            return [a.promote(b.numberType), b];
        }
        return [a, b];
    }
    function atomic_negate(a) {
        return a.negate();
    }
    function atomic_equals(a, b) {
        const [newA, newB] = equalify(a, b);
        // safe to cast as we are assured they are of the same type
        return newA.equals(newB);
    }
    function atomic_greater_than(a, b) {
        const [newA, newB] = equalify(a, b);
        // safe to cast as we are assured they are of the same type
        return newA.greaterThan(newB);
    }
    function atomic_add(a, b) {
        const [newA, newB] = equalify(a, b);
        // safe to cast as we are assured they are of the same type
        return simplify(newA.add(newB));
    }
    function atomic_multiply(a, b) {
        const [newA, newB] = equalify(a, b);
        // safe to cast as we are assured they are of the same type
        return simplify(newA.multiply(newB));
    }
    function atomic_subtract(a, b) {
        return atomic_add(a, atomic_negate(b));
    }
    /**
     * Important constants
     */
    SchemeReal.build(Math.PI);
    SchemeReal.build(Math.E);
    SchemeReal.build(Math.SQRT2);
    SchemeReal.build(Math.LN2);
    SchemeReal.build(Math.LN10);
    SchemeReal.build(Math.LOG2E);
    SchemeReal.build(Math.LOG10E);
    SchemeReal.build(Math.SQRT1_2);

    // Adapted from https://craftinginterpreters.com/scanning.html
    // Adapted for Scheme use
    var TokenType;
    (function (TokenType) {
        // + - * / % ^ ! = < > & | ~ etc are recognized as IDENTIFIERS
        // S-expression syntax
        TokenType[TokenType["LEFT_PAREN"] = 0] = "LEFT_PAREN";
        TokenType[TokenType["RIGHT_PAREN"] = 1] = "RIGHT_PAREN";
        TokenType[TokenType["LEFT_BRACKET"] = 2] = "LEFT_BRACKET";
        TokenType[TokenType["RIGHT_BRACKET"] = 3] = "RIGHT_BRACKET";
        TokenType[TokenType["DOT"] = 4] = "DOT";
        // Datum comments
        TokenType[TokenType["HASH_SEMICOLON"] = 5] = "HASH_SEMICOLON";
        // Atoms: Literals or Identifiers
        TokenType[TokenType["IDENTIFIER"] = 6] = "IDENTIFIER";
        TokenType[TokenType["NUMBER"] = 7] = "NUMBER";
        TokenType[TokenType["BOOLEAN"] = 8] = "BOOLEAN";
        TokenType[TokenType["STRING"] = 9] = "STRING";
        // SICP Chapter 1
        TokenType[TokenType["IF"] = 10] = "IF";
        TokenType[TokenType["LET"] = 11] = "LET";
        TokenType[TokenType["COND"] = 12] = "COND";
        TokenType[TokenType["ELSE"] = 13] = "ELSE";
        TokenType[TokenType["DEFINE"] = 14] = "DEFINE";
        TokenType[TokenType["LAMBDA"] = 15] = "LAMBDA";
        // SICP Chapter 2
        TokenType[TokenType["APOSTROPHE"] = 16] = "APOSTROPHE";
        TokenType[TokenType["BACKTICK"] = 17] = "BACKTICK";
        TokenType[TokenType["COMMA"] = 18] = "COMMA";
        TokenType[TokenType["COMMA_AT"] = 19] = "COMMA_AT";
        TokenType[TokenType["QUOTE"] = 20] = "QUOTE";
        TokenType[TokenType["QUASIQUOTE"] = 21] = "QUASIQUOTE";
        TokenType[TokenType["UNQUOTE"] = 22] = "UNQUOTE";
        TokenType[TokenType["UNQUOTE_SPLICING"] = 23] = "UNQUOTE_SPLICING";
        // SICP Chapter 3
        TokenType[TokenType["SET"] = 24] = "SET";
        TokenType[TokenType["BEGIN"] = 25] = "BEGIN";
        TokenType[TokenType["DELAY"] = 26] = "DELAY";
        // Other important keywords
        TokenType[TokenType["IMPORT"] = 27] = "IMPORT";
        TokenType[TokenType["EXPORT"] = 28] = "EXPORT";
        // keywords associated with macros
        TokenType[TokenType["DEFINE_SYNTAX"] = 29] = "DEFINE_SYNTAX";
        TokenType[TokenType["SYNTAX_RULES"] = 30] = "SYNTAX_RULES";
        // Not in scope at the moment
        TokenType[TokenType["HASH_VECTOR"] = 31] = "HASH_VECTOR";
        TokenType[TokenType["VECTOR"] = 32] = "VECTOR";
        // turning vector into a procedure call is better
        TokenType[TokenType["EOF"] = 33] = "EOF";
    })(TokenType || (TokenType = {}));

    function extractLine(source, pos) {
        let lines = source.split("\n");
        return lines[pos.line - 1];
    }
    function showPoint(pos) {
        return "^".padStart(pos.column, " ");
    }
    class ParserError extends SyntaxError {
        constructor(message, pos) {
            super(`Syntax error at (${pos.line}:${pos.column})\n${message}`);
            this.loc = pos;
        }
        toString() {
            return this.message;
        }
    }
    class GenericSyntaxError extends ParserError {
        constructor(source, pos) {
            super(extractLine(source, pos) + "\n" + showPoint(pos), pos);
            this.name = "GenericSyntaxError";
        }
    }
    class ParenthesisMismatchError extends ParserError {
        constructor(source, pos) {
            super(extractLine(source, pos) +
                "\n" +
                showPoint(pos) +
                "\n" +
                "Mismatched parenthesis", pos);
            this.name = "ParenthesisMismatchError";
        }
    }
    class UnexpectedEOFError extends ParserError {
        constructor(source, pos) {
            super(extractLine(source, pos) + "\n" + "Unexpected EOF", pos);
            this.name = "UnexpectedEOFError";
        }
    }
    class UnexpectedFormError extends ParserError {
        constructor(source, pos, form) {
            super(extractLine(source, pos) +
                "\n" +
                showPoint(pos) +
                "\n" +
                `Unexpected \'${form}\'`, pos);
            this.form = form;
            this.name = "UnexpectedTokenError";
        }
    }
    class ExpectedFormError extends ParserError {
        constructor(source, pos, form, expected) {
            super(extractLine(source, pos) +
                "\n" +
                showPoint(pos) +
                "\n" +
                `Expected \'${expected}\' but got \'${form}\'`, pos);
            this.form = form;
            this.expected = expected;
            this.name = "ExpectedTokenError";
        }
    }
    class MissingFormError extends ParserError {
        constructor(source, pos, expected) {
            super(extractLine(source, pos) +
                "\n" +
                showPoint(pos) +
                "\n" +
                `Expected \'${expected}\'`, pos);
            this.expected = expected;
            this.name = "MissingTokenError";
        }
    }
    class DisallowedTokenError extends ParserError {
        constructor(source, pos, token, chapter) {
            super(extractLine(source, pos) +
                "\n" +
                showPoint(pos) +
                "\n" +
                `Syntax \'${token}\' not allowed at Scheme \xa7${chapter}`, pos);
            this.token = token;
            this.name = "DisallowedTokenError";
        }
    }
    class UnsupportedTokenError extends ParserError {
        constructor(source, pos, token) {
            super(extractLine(source, pos) +
                "\n" +
                showPoint(pos) +
                "\n" +
                `Syntax \'${token}\' not supported yet`, pos);
            this.token = token;
            this.name = "UnsupportedTokenError";
        }
    }

    var parserError = /*#__PURE__*/Object.freeze({
        __proto__: null,
        DisallowedTokenError: DisallowedTokenError,
        ExpectedFormError: ExpectedFormError,
        GenericSyntaxError: GenericSyntaxError,
        MissingFormError: MissingFormError,
        ParenthesisMismatchError: ParenthesisMismatchError,
        ParserError: ParserError,
        UnexpectedEOFError: UnexpectedEOFError,
        UnexpectedFormError: UnexpectedFormError,
        UnsupportedTokenError: UnsupportedTokenError
    });

    class Group {
        constructor(elements) {
            this.elements = elements;
            this.location = new Location(this.firstPos(), this.lastPos());
        }
        /**
         * A constructor function for a group that enforces group invariants.
         */
        static build(elements) {
            // helper function to check if the parentheses match.
            function matchingParentheses(lParen, rParen) {
                return ((lParen.type === TokenType.LEFT_PAREN &&
                    rParen.type === TokenType.RIGHT_PAREN) ||
                    (lParen.type === TokenType.LEFT_BRACKET &&
                        rParen.type === TokenType.RIGHT_BRACKET));
            }
            // helper function to check if the token is a data type.
            function isDataType(token) {
                return (token.type === TokenType.IDENTIFIER ||
                    token.type === TokenType.NUMBER ||
                    token.type === TokenType.STRING ||
                    token.type === TokenType.BOOLEAN);
            }
            // helper function to determine if the token is an affector type.
            // (and the affector type should be the short version).
            function isShortAffector(token) {
                return (token.type === TokenType.APOSTROPHE ||
                    token.type === TokenType.BACKTICK ||
                    token.type === TokenType.HASH_VECTOR ||
                    token.type === TokenType.COMMA ||
                    token.type === TokenType.COMMA_AT);
            }
            // Illegal empty group.
            if (elements.length === 0) {
                // This should never happen.
                // If it does its the implementor's fault.
                throw new Error("Illegal empty group. This should never happen.");
            }
            // If the group is not parenthesized, the first case contains only one element.
            if (elements.length === 1) {
                const onlyElement = elements[0];
                if (isGroup(onlyElement)) {
                    // Return the inner group.
                    // Avoid nested groups that are a product of the grouping generation in the parser.
                    // Ensures the single internal element is not a group.
                    return onlyElement;
                }
                // Ensure the single element is a data type by validating its token type.
                if (!isDataType(onlyElement)) {
                    // This should never happen.
                    // If it does its the implementor's fault.
                    throw new ExpectedFormError("", onlyElement.pos, onlyElement, "<data>");
                }
                return new Group(elements);
            }
            // If the group is not parenthesized, the remaining case contains two elements.
            if (elements.length === 2) {
                const firstElement = elements[0];
                // Ensure the first element is an affector type and
                if (isToken(firstElement) && isShortAffector(firstElement)) {
                    return new Group(elements);
                }
                // If all else fails, use the most generic case below.
            }
            // If the group is parenthesized, the parentheses must match.
            const firstElement = elements[0];
            const lastElement = elements[elements.length - 1];
            if (isToken(firstElement) &&
                isToken(lastElement) &&
                matchingParentheses(firstElement, lastElement)) {
                return new Group(elements);
            }
            // This should never happen.
            const wrongGroup = new Group(elements);
            throw new ExpectedFormError("", wrongGroup.location.start, wrongGroup, "matching parentheses");
        }
        // Get the first element of the group.
        first() {
            return this.elements[0];
        }
        // Get the first token of the group.
        firstToken() {
            const firstElement = this.first();
            if (isToken(firstElement)) {
                return firstElement;
            }
            else {
                return firstElement.firstToken();
            }
        }
        // Get the starting position of the first element of the group.
        firstPos() {
            return this.firstToken().pos;
        }
        // Get the last element of the group.
        last() {
            return this.elements[this.elements.length - 1];
        }
        lastToken() {
            const lastElement = this.last();
            if (isToken(lastElement)) {
                return lastElement;
            }
            else {
                return lastElement.lastToken();
            }
        }
        // Get the ending position of the last element of the group.
        lastPos() {
            return this.lastToken().pos;
        }
        /**
         * Check if the current group is parenthesized.
         */
        isParenthesized() {
            const firstElement = this.first();
            // Because of the validation performed by the factory function,
            // we can assume that as long as the first element is a paranthesis,
            // the last element is also the corresponding paranthesis.
            return (isToken(firstElement) &&
                (firstElement.type === TokenType.LEFT_PAREN ||
                    firstElement.type === TokenType.LEFT_BRACKET));
        }
        /**
         * Using the invariants, we can determine if a group actually
         * represents a singular identifier.
         */
        isSingleIdentifier() {
            return !this.isParenthesized() && this.length() === 1;
        }
        /**
         * Get the internal elements of the group.
         * If the group is bounded by parentheses, the parentheses are excluded.
         * @returns All elements of the group excluding parentheses.
         */
        unwrap() {
            if (this.isParenthesized()) {
                return this.elements.slice(1, this.elements.length - 1);
            }
            return this.elements;
        }
        /**
         * Get the number of elements in the group.
         * Ignores parentheses.
         * @returns The number of elements in the group.
         */
        length() {
            return this.unwrap().length;
        }
        /**
         * @returns A string representation of the group
         */
        toString() {
            return this.elements.map(e => e.toString()).join(" ");
        }
    }

    function isToken(datum) {
        return datum instanceof Token;
    }
    function isGroup(datum) {
        return datum instanceof Group;
    }

    /**
     * A data structure representing a particular token.
     */
    class Token {
        constructor(type, lexeme, literal, start, end, line, col) {
            this.type = type;
            this.lexeme = lexeme;
            this.literal = literal;
            this.start = start;
            this.end = end;
            this.pos = new Position(line, col);
            this.endPos = new Position(line, col + lexeme.length - 1);
        }
        /**
         * Converts a token to another representation of itself.
         * Especially useful for quotation tokens.
         * @returns A converted token.
         */
        convertToken() {
            switch (this.type) {
                case TokenType.APOSTROPHE:
                    return new Token(TokenType.QUOTE, this.lexeme, this.literal, this.start, this.end, this.pos.line, this.pos.column);
                case TokenType.BACKTICK:
                    return new Token(TokenType.QUASIQUOTE, this.lexeme, this.literal, this.start, this.end, this.pos.line, this.pos.column);
                case TokenType.HASH_VECTOR:
                    return new Token(TokenType.VECTOR, this.lexeme, this.literal, this.start, this.end, this.pos.line, this.pos.column);
                case TokenType.COMMA:
                    return new Token(TokenType.UNQUOTE, this.lexeme, this.literal, this.start, this.end, this.pos.line, this.pos.column);
                case TokenType.COMMA_AT:
                    return new Token(TokenType.UNQUOTE_SPLICING, this.lexeme, this.literal, this.start, this.end, this.pos.line, this.pos.column);
                default:
                    return this;
            }
        }
        /**
         * For debugging.
         * @returns A string representation of the token.
         */
        toString() {
            return `${this.lexeme}`;
        }
    }

    // Thanks to Ken Jin (py-slang) for the great resource
    // https://craftinginterpreters.com/scanning.html
    // This tokenizer/lexer is a modified version, inspired by both the
    // tokenizer/lexer above as well as Ken Jin's py-slang tokenizer/lexer.
    // It has been adapted to be written in typescript for scheme.
    // Crafting Interpreters: https://craftinginterpreters.com/
    // py-slang: https://github.com/source-academy/py-slang
    // syntactic keywords in the scheme language
    let keywords = new Map([
        [".", TokenType.DOT],
        ["if", TokenType.IF],
        ["let", TokenType.LET],
        ["cond", TokenType.COND],
        ["else", TokenType.ELSE],
        ["set!", TokenType.SET],
        ["begin", TokenType.BEGIN],
        ["delay", TokenType.DELAY],
        ["quote", TokenType.QUOTE],
        ["export", TokenType.EXPORT],
        ["import", TokenType.IMPORT],
        ["define", TokenType.DEFINE],
        ["lambda", TokenType.LAMBDA],
        ["define-syntax", TokenType.DEFINE_SYNTAX],
        ["syntax-rules", TokenType.SYNTAX_RULES],
    ]);
    class SchemeLexer {
        constructor(source) {
            this.start = 0;
            this.current = 0;
            this.line = 1;
            this.col = 0;
            this.source = source;
            this.tokens = [];
        }
        isAtEnd() {
            return this.current >= this.source.length;
        }
        advance() {
            // get the next character
            this.col++;
            return this.source.charAt(this.current++);
        }
        jump() {
            // when you want to ignore a character
            this.start = this.current;
            this.col++;
            this.current++;
        }
        addToken(type, literal = null) {
            const text = this.source.substring(this.start, this.current);
            this.tokens.push(new Token(type, text, literal, this.start, this.current, this.line, this.col));
        }
        scanTokens() {
            while (!this.isAtEnd()) {
                this.start = this.current;
                this.scanToken();
            }
            this.tokens.push(new Token(TokenType.EOF, "", null, this.start, this.current, this.line, this.col));
            return this.tokens;
        }
        scanToken() {
            const c = this.advance();
            switch (c) {
                case "(":
                    this.addToken(TokenType.LEFT_PAREN);
                    break;
                case ")":
                    this.addToken(TokenType.RIGHT_PAREN);
                    break;
                case "[":
                    this.addToken(TokenType.LEFT_BRACKET);
                    break;
                case "]":
                    this.addToken(TokenType.RIGHT_BRACKET);
                    break;
                case "'":
                    this.addToken(TokenType.APOSTROPHE);
                    break;
                case "`":
                    this.addToken(TokenType.BACKTICK);
                    break;
                case ",":
                    if (this.match("@")) {
                        this.addToken(TokenType.COMMA_AT);
                        break;
                    }
                    this.addToken(TokenType.COMMA);
                    break;
                case "#":
                    // by itself, it is an error
                    if (this.match("t") || this.match("f")) {
                        this.booleanToken();
                    }
                    else if (this.match("|")) {
                        // a multiline comment
                        this.comment();
                    }
                    else if (this.match(";")) {
                        // a datum comment
                        this.addToken(TokenType.HASH_SEMICOLON);
                    }
                    else if (this.peek() === "(" || this.peek() === "[") {
                        // We keep the hash character and the parenthesis/bracket
                        // separate as our parentheses matching systems
                        // will suffer with 4 possible left grouping tokens!
                        // ensure that the next character is a vector
                        this.addToken(TokenType.HASH_VECTOR);
                    }
                    else {
                        // chars are not currently supported
                        throw new UnexpectedCharacterError(this.line, this.col, c);
                    }
                    break;
                case ";":
                    // a comment
                    while (this.peek() != "\n" && !this.isAtEnd())
                        this.advance();
                    break;
                // double character tokens not currently needed
                case " ":
                case "\r":
                case "\t":
                    // ignore whitespace
                    break;
                case "\n":
                    this.line++;
                    this.col = 0;
                    break;
                case '"':
                    this.stringToken();
                    break;
                case "|":
                    this.identifierTokenLoose();
                    break;
                default:
                    // Deviates slightly from the original lexer.
                    // Scheme allows for identifiers to start with a digit
                    // or include a specific set of symbols.
                    if (this.isDigit(c) ||
                        c === "-" ||
                        c === "+" ||
                        c === "." ||
                        c === "i" || // inf
                        c === "n" // nan
                    ) {
                        // may or may not be a number
                        this.identifierNumberToken();
                    }
                    else if (this.isValidIdentifier(c)) {
                        // filtered out the potential numbers
                        // these are definitely identifiers
                        this.identifierToken();
                    }
                    else {
                        throw new UnexpectedCharacterError(this.line, this.col, c);
                    }
                    break;
            }
        }
        comment() {
            while (!(this.peek() == "|" && this.peekNext() == "#") && !this.isAtEnd()) {
                if (this.peek() === "\n") {
                    this.line++;
                    this.col = 0;
                }
                this.advance();
            }
            if (this.isAtEnd()) {
                throw new UnexpectedEOFError$1(this.line, this.col);
            }
            this.jump();
            this.jump();
        }
        identifierToken() {
            while (this.isValidIdentifier(this.peek()))
                this.advance();
            this.addToken(this.checkKeyword());
        }
        identifierTokenLoose() {
            // this is a special case for identifiers
            // add the first |
            this.advance();
            while (this.peek() != "|" && !this.isAtEnd()) {
                if (this.peek() === "\n") {
                    this.line++;
                    this.col = 0;
                }
                this.advance();
            }
            if (this.isAtEnd()) {
                throw new UnexpectedEOFError$1(this.line, this.col);
            }
            // add the last |
            this.advance();
            this.addToken(this.checkKeyword());
        }
        identifierNumberToken() {
            // we first obtain the entire identifier
            while (this.isValidIdentifier(this.peek())) {
                this.advance();
            }
            const lexeme = this.source.substring(this.start, this.current);
            if (stringIsSchemeNumber(lexeme)) {
                this.addToken(TokenType.NUMBER, lexeme);
                return;
            }
            this.addToken(this.checkKeyword());
        }
        checkKeyword() {
            var text = this.source.substring(this.start, this.current);
            if (keywords.has(text)) {
                return keywords.get(text);
            }
            return TokenType.IDENTIFIER;
        }
        stringToken() {
            while (this.peek() != '"' && !this.isAtEnd()) {
                if (this.peek() === "\n") {
                    this.line++;
                    this.col = 0;
                }
                this.advance();
            }
            if (this.isAtEnd()) {
                throw new UnexpectedEOFError$1(this.line, this.col);
            }
            // closing "
            this.advance();
            // trim the surrounding quotes
            const value = this.source.substring(this.start + 1, this.current - 1);
            this.addToken(TokenType.STRING, value);
        }
        booleanToken() {
            this.addToken(TokenType.BOOLEAN, this.peekPrev() === "t" ? true : false);
        }
        match(expected) {
            if (this.isAtEnd())
                return false;
            if (this.source.charAt(this.current) != expected)
                return false;
            this.current++;
            return true;
        }
        peek() {
            if (this.isAtEnd())
                return "\0";
            return this.source.charAt(this.current);
        }
        peekNext() {
            if (this.current + 1 >= this.source.length)
                return "\0";
            return this.source.charAt(this.current + 1);
        }
        peekPrev() {
            if (this.current - 1 < 0)
                return "\0";
            return this.source.charAt(this.current - 1);
        }
        isDigit(c) {
            return c >= "0" && c <= "9";
        }
        isSpecialSyntax(c) {
            return (c === "(" || c === ")" || c === "[" || c === "]" || c === ";" || c === "|");
        }
        isValidIdentifier(c) {
            return !this.isWhitespace(c) && !this.isSpecialSyntax(c);
        }
        isWhitespace(c) {
            return c === " " || c === "\0" || c === "\n" || c === "\r" || c === "\t";
        }
    }

    // The chapters of the parser.
    const BASIC_CHAPTER = 1;
    const QUOTING_CHAPTER = 2;
    const VECTOR_CHAPTER = 3;
    const MUTABLE_CHAPTER = 3;
    const MACRO_CHAPTER = 5;

    /**
     * An enum representing the current quoting mode of the parser.
     */
    var QuoteMode;
    (function (QuoteMode) {
        QuoteMode[QuoteMode["NONE"] = 0] = "NONE";
        QuoteMode[QuoteMode["QUOTE"] = 1] = "QUOTE";
        QuoteMode[QuoteMode["QUASIQUOTE"] = 2] = "QUASIQUOTE";
    })(QuoteMode || (QuoteMode = {}));
    class SchemeParser {
        constructor(source, tokens, chapter = Infinity) {
            this.current = 0;
            this.quoteMode = QuoteMode.NONE;
            this.source = source;
            this.tokens = tokens;
            this.chapter = chapter;
        }
        advance() {
            if (!this.isAtEnd())
                this.current++;
            return this.previous();
        }
        isAtEnd() {
            return this.current >= this.tokens.length;
        }
        previous() {
            return this.tokens[this.current - 1];
        }
        peek() {
            return this.tokens[this.current];
        }
        validateChapter(c, chapter) {
            if (this.chapter < chapter) {
                throw new DisallowedTokenError(this.source, c.pos, c, this.chapter);
            }
        }
        /**
         * Returns the location of a token.
         * @param token A token.
         * @returns The location of the token.
         */
        toLocation(token) {
            return new Location(token.pos, token.endPos);
        }
        /**
         * Helper function used to destructure a list into its elements and terminator.
         * An optional verifier is used if there are restrictions on the elements of the list.
         */
        destructureList(list, verifier = (_x) => { }) {
            // check if the list is an empty list
            if (list.length === 0) {
                return [[], undefined];
            }
            // check if the list is a list of length 1
            if (list.length === 1) {
                verifier(list[0]);
                return [[this.parseExpression(list[0])], undefined];
            }
            // we now know that the list is at least of length 2
            // check for a dotted list
            // it is if the second last element is a dot
            const potentialDot = list.at(-2);
            if (isToken(potentialDot) && potentialDot.type === TokenType.DOT) {
                const cdrElement = list.at(-1);
                const listElements = list.slice(0, -2);
                verifier(cdrElement);
                listElements.forEach(verifier);
                return [
                    listElements.map(this.parseExpression.bind(this)),
                    this.parseExpression(cdrElement),
                ];
            }
            // we now know that it is a proper list
            const listElements = list;
            listElements.forEach(verifier);
            return [listElements.map(this.parseExpression.bind(this)), undefined];
        }
        /**
         * Returns a group of associated tokens.
         * Tokens are grouped by level of parentheses.
         *
         * @param openparen The opening parenthesis, if one exists.
         * @returns A group of tokens or groups of tokens.
         */
        grouping(openparen) {
            const elements = [];
            let inList = false;
            if (openparen) {
                inList = true;
                elements.push(openparen);
            }
            do {
                let c = this.advance();
                switch (c.type) {
                    case TokenType.LEFT_PAREN:
                    case TokenType.LEFT_BRACKET:
                        // the next group is not empty, especially because it
                        // has an open parenthesis
                        const innerGroup = this.grouping(c);
                        elements.push(innerGroup);
                        break;
                    case TokenType.RIGHT_PAREN:
                    case TokenType.RIGHT_BRACKET:
                        if (!inList) {
                            throw new UnexpectedFormError(this.source, c.pos, c);
                        }
                        // add the parenthesis to the current group
                        elements.push(c);
                        inList = false;
                        break;
                    case TokenType.APOSTROPHE: // Quoting syntax (short form)
                    case TokenType.BACKTICK:
                    case TokenType.COMMA:
                    case TokenType.COMMA_AT:
                    case TokenType.HASH_VECTOR: // Vector syntax
                        // these cases modify only the next element
                        // so we group up the next element and use this
                        // token on it
                        let nextGrouping;
                        do {
                            nextGrouping = this.grouping();
                        } while (!nextGrouping);
                        elements.push(this.affect(c, nextGrouping));
                        break;
                    case TokenType.QUOTE: // Quoting syntax
                    case TokenType.QUASIQUOTE:
                    case TokenType.UNQUOTE:
                    case TokenType.UNQUOTE_SPLICING:
                    case TokenType.IDENTIFIER: // Atomics
                    case TokenType.NUMBER:
                    case TokenType.BOOLEAN:
                    case TokenType.STRING:
                    case TokenType.DOT:
                    case TokenType.DEFINE: // Chapter 1
                    case TokenType.IF:
                    case TokenType.ELSE:
                    case TokenType.COND:
                    case TokenType.LAMBDA:
                    case TokenType.LET:
                    case TokenType.SET: // Chapter 3
                    case TokenType.BEGIN:
                    case TokenType.DELAY:
                    case TokenType.IMPORT:
                    case TokenType.EXPORT:
                    case TokenType.DEFINE_SYNTAX:
                    case TokenType.SYNTAX_RULES: // Chapter 4
                        elements.push(c);
                        break;
                    case TokenType.HASH_SEMICOLON:
                        // a datum comment
                        // get the next NON-EMPTY grouping
                        // and ignore it
                        while (!this.grouping()) { }
                        break;
                    case TokenType.EOF:
                        // We should be unable to reach this point at top level as parse()
                        // should prevent the grouping of the singular EOF token.
                        // However, with any element that ranges beyond the end of the
                        // file without its corresponding delemiter, we can reach this point.
                        throw new UnexpectedEOFError(this.source, c.pos);
                    default:
                        throw new UnexpectedFormError(this.source, c.pos, c);
                }
            } while (inList);
            if (elements.length === 0) {
                return;
            }
            try {
                return Group.build(elements);
            }
            catch (e) {
                if (e instanceof ExpectedFormError) {
                    throw new ExpectedFormError(this.source, e.loc, e.form, e.expected);
                }
                throw e;
            }
        }
        /**
         * Groups an affector token with its target.
         */
        affect(affector, target) {
            return Group.build([affector, target]);
        }
        /**
         * Parse an expression.
         * @param expr A token or a group of tokens.
         * @returns
         */
        parseExpression(expr) {
            // Discern the type of expression
            if (isToken(expr)) {
                return this.parseToken(expr);
            }
            // We now know it is a group
            // Due to group invariants we can determine if it represents a
            // single token instead
            if (expr.isSingleIdentifier()) {
                return this.parseToken(expr.unwrap()[0]);
            }
            return this.parseGroup(expr);
        }
        parseToken(token) {
            switch (token.type) {
                case TokenType.IDENTIFIER:
                    return this.quoteMode === QuoteMode.NONE
                        ? new Atomic.Identifier(this.toLocation(token), token.lexeme)
                        : new Atomic.Symbol(this.toLocation(token), token.lexeme);
                // all of these are self evaluating, and so can be left alone regardless of quote mode
                case TokenType.NUMBER:
                    return new Atomic.NumericLiteral(this.toLocation(token), token.literal);
                case TokenType.BOOLEAN:
                    return new Atomic.BooleanLiteral(this.toLocation(token), token.literal);
                case TokenType.STRING:
                    return new Atomic.StringLiteral(this.toLocation(token), token.literal);
                default:
                    // if in a quoting context, or when dealing with the macro chapter,
                    // any keyword is instead treated as a symbol
                    if (this.quoteMode !== QuoteMode.NONE ||
                        this.chapter >= MACRO_CHAPTER) {
                        return new Atomic.Symbol(this.toLocation(token), token.lexeme);
                    }
                    throw new UnexpectedFormError(this.source, token.pos, token);
            }
        }
        parseGroup(group) {
            // No need to check if group represents a single token as well
            if (!group.isParenthesized()) {
                // The only case left is the unparenthesized case
                // of a single affector token and a target group
                // Form: <affector token> <group>
                return this.parseAffectorGroup(group);
            }
            // Now we have fallen through to the generic group
            // case - a parenthesized group of tokens.
            switch (this.quoteMode) {
                case QuoteMode.NONE:
                    return this.parseNormalGroup(group);
                case QuoteMode.QUOTE:
                case QuoteMode.QUASIQUOTE:
                    return this.parseQuotedGroup(group);
            }
        }
        /**
         * Parse a group of tokens affected by an affector.
         * Important case as affector changes quotation mode.
         *
         * @param group A group of tokens, verified to be an affector and a target.
         * @returns An expression.
         */
        parseAffectorGroup(group) {
            const [affector, target] = group.unwrap();
            // Safe to cast affector due to group invariants
            switch (affector.type) {
                case TokenType.APOSTROPHE:
                case TokenType.QUOTE:
                    this.validateChapter(affector, QUOTING_CHAPTER);
                    if (this.quoteMode !== QuoteMode.NONE) {
                        const innerGroup = this.parseExpression(target);
                        const newSymbol = new Atomic.Symbol(this.toLocation(affector), "quote");
                        const newLocation = newSymbol.location.merge(innerGroup.location);
                        // wrap the entire expression in a list
                        return new Extended.List(newLocation, [newSymbol, innerGroup]);
                    }
                    this.quoteMode = QuoteMode.QUOTE;
                    const quotedExpression = this.parseExpression(target);
                    this.quoteMode = QuoteMode.NONE;
                    return quotedExpression;
                case TokenType.BACKTICK:
                case TokenType.QUASIQUOTE:
                    this.validateChapter(affector, QUOTING_CHAPTER);
                    if (this.quoteMode !== QuoteMode.NONE) {
                        const innerGroup = this.parseExpression(target);
                        const newSymbol = new Atomic.Symbol(this.toLocation(affector), "quasiquote");
                        const newLocation = newSymbol.location.merge(innerGroup.location);
                        // wrap the entire expression in a list
                        return new Extended.List(newLocation, [newSymbol, innerGroup]);
                    }
                    this.quoteMode = QuoteMode.QUASIQUOTE;
                    const quasiquotedExpression = this.parseExpression(target);
                    this.quoteMode = QuoteMode.NONE;
                    return quasiquotedExpression;
                case TokenType.COMMA:
                case TokenType.UNQUOTE:
                    this.validateChapter(affector, QUOTING_CHAPTER);
                    let preUnquoteMode = this.quoteMode;
                    if (preUnquoteMode === QuoteMode.NONE) {
                        throw new UnsupportedTokenError(this.source, affector.pos, affector);
                    }
                    if (preUnquoteMode === QuoteMode.QUOTE) {
                        const innerGroup = this.parseExpression(target);
                        const newSymbol = new Atomic.Symbol(this.toLocation(affector), "unquote");
                        const newLocation = newSymbol.location.merge(innerGroup.location);
                        // wrap the entire expression in a list
                        return new Extended.List(newLocation, [newSymbol, innerGroup]);
                    }
                    this.quoteMode = QuoteMode.NONE;
                    const unquotedExpression = this.parseExpression(target);
                    this.quoteMode = preUnquoteMode;
                    return unquotedExpression;
                case TokenType.COMMA_AT:
                case TokenType.UNQUOTE_SPLICING:
                    this.validateChapter(affector, QUOTING_CHAPTER);
                    let preUnquoteSplicingMode = this.quoteMode;
                    if (preUnquoteSplicingMode === QuoteMode.NONE) {
                        throw new UnexpectedFormError(this.source, affector.pos, affector);
                    }
                    if (preUnquoteSplicingMode === QuoteMode.QUOTE) {
                        const innerGroup = this.parseExpression(target);
                        const newSymbol = new Atomic.Symbol(this.toLocation(affector), "unquote-splicing");
                        const newLocation = newSymbol.location.merge(innerGroup.location);
                        // wrap the entire expression in a list
                        return new Extended.List(newLocation, [newSymbol, innerGroup]);
                    }
                    this.quoteMode = QuoteMode.NONE;
                    const unquoteSplicedExpression = this.parseExpression(target);
                    this.quoteMode = preUnquoteSplicingMode;
                    const newLocation = this.toLocation(affector).merge(unquoteSplicedExpression.location);
                    return new Atomic.SpliceMarker(newLocation, unquoteSplicedExpression);
                case TokenType.HASH_VECTOR:
                    // vectors quote over all elements inside.
                    this.validateChapter(affector, VECTOR_CHAPTER);
                    let preVectorQuoteMode = this.quoteMode;
                    this.quoteMode = QuoteMode.QUOTE;
                    const vector = this.parseVector(group);
                    this.quoteMode = preVectorQuoteMode;
                    return vector;
                default:
                    throw new UnexpectedFormError(this.source, affector.pos, affector);
            }
        }
        parseNormalGroup(group) {
            // it is an error if the group is empty in a normal context
            if (group.length() === 0) {
                if (this.chapter >= MACRO_CHAPTER) {
                    // disable any verification for the empty group
                    // the CSET machine will verify its validity
                    return new Atomic.Nil(group.location);
                }
                throw new ExpectedFormError(this.source, group.location.start, group, "non-empty group");
            }
            // get the first element
            const firstElement = group.unwrap()[0];
            // If the first element is a token, it may be a keyword or a procedure call
            if (isToken(firstElement)) {
                switch (firstElement.type) {
                    // Scheme chapter 1
                    case TokenType.LAMBDA:
                        this.validateChapter(firstElement, BASIC_CHAPTER);
                        return this.parseLambda(group);
                    case TokenType.DEFINE:
                        this.validateChapter(firstElement, BASIC_CHAPTER);
                        return this.parseDefinition(group);
                    case TokenType.IF:
                        this.validateChapter(firstElement, BASIC_CHAPTER);
                        return this.parseConditional(group);
                    case TokenType.LET:
                        this.validateChapter(firstElement, BASIC_CHAPTER);
                        return this.parseLet(group);
                    case TokenType.COND:
                        this.validateChapter(firstElement, BASIC_CHAPTER);
                        return this.parseExtendedCond(group);
                    // Scheme chapter 2
                    case TokenType.QUOTE:
                    case TokenType.APOSTROPHE:
                    case TokenType.QUASIQUOTE:
                    case TokenType.BACKTICK:
                    case TokenType.UNQUOTE:
                    case TokenType.COMMA:
                    case TokenType.UNQUOTE_SPLICING:
                    case TokenType.COMMA_AT:
                        this.validateChapter(firstElement, QUOTING_CHAPTER);
                        // we can reuse the affector group method to control the quote mode
                        return this.parseAffectorGroup(group);
                    // Scheme chapter 3
                    case TokenType.BEGIN:
                        this.validateChapter(firstElement, MUTABLE_CHAPTER);
                        return this.parseBegin(group);
                    case TokenType.DELAY:
                        this.validateChapter(firstElement, MUTABLE_CHAPTER);
                        return this.parseDelay(group);
                    case TokenType.SET:
                        this.validateChapter(firstElement, MUTABLE_CHAPTER);
                        return this.parseSet(group);
                    // Scheme full (macros)
                    case TokenType.DEFINE_SYNTAX:
                        this.validateChapter(firstElement, MACRO_CHAPTER);
                        return this.parseDefineSyntax(group);
                    case TokenType.SYNTAX_RULES:
                        // should not be called outside of define-syntax!
                        throw new UnexpectedFormError(this.source, firstElement.pos, firstElement);
                    // Scm-slang misc
                    case TokenType.IMPORT:
                        this.validateChapter(firstElement, BASIC_CHAPTER);
                        return this.parseImport(group);
                    case TokenType.EXPORT:
                        this.validateChapter(firstElement, BASIC_CHAPTER);
                        return this.parseExport(group);
                    case TokenType.VECTOR:
                        this.validateChapter(firstElement, VECTOR_CHAPTER);
                        // same as above, this is an affector group
                        return this.parseAffectorGroup(group);
                    default:
                        // It's a procedure call
                        return this.parseApplication(group);
                }
            }
            // Form: (<group> <expr>*)
            // It's a procedure call
            return this.parseApplication(group);
        }
        /**
         * We are parsing a list/dotted list.
         */
        parseQuotedGroup(group) {
            // check if the group is an empty list
            if (group.length() === 0) {
                return new Atomic.Nil(group.location);
            }
            // check if the group is a list of length 1
            if (group.length() === 1) {
                const elem = [this.parseExpression(group.unwrap()[0])];
                return new Extended.List(group.location, elem);
            }
            // we now know that the group is at least of length 2
            const groupElements = group.unwrap();
            const [listElements, cdrElement] = this.destructureList(groupElements);
            return new Extended.List(group.location, listElements, cdrElement);
        }
        // _____________________CHAPTER 1_____________________
        /**
         * Parse a lambda expression.
         * @param group
         * @returns
         */
        parseLambda(group) {
            // Form: (lambda (<identifier>*) <body>+)
            //     | (lambda (<identifier>* . <rest-identifier>) <body>+)
            // ensure that the group has at least 3 elements
            if (group.length() < 3) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(lambda (<identifier>* . <rest-identifier>?) <body>+) | (lambda <rest-identifer> <body>+)");
            }
            const elements = group.unwrap();
            const formals = elements[1];
            const body = elements.slice(2);
            // Formals should be a group of identifiers or a single identifier
            let convertedFormals = [];
            // if a rest element is detected,
            let convertedRest = undefined;
            if (isToken(formals)) {
                if (formals.type !== TokenType.IDENTIFIER) {
                    throw new ExpectedFormError(this.source, formals.pos, formals, "<rest-identifier>");
                }
                convertedRest = new Atomic.Identifier(this.toLocation(formals), formals.lexeme);
            }
            else {
                // it is a group
                const formalsElements = formals.unwrap();
                [convertedFormals, convertedRest] = this.destructureList(formalsElements, 
                // pass in a verifier that checks if the elements are identifiers
                formal => {
                    if (!isToken(formal)) {
                        throw new ExpectedFormError(this.source, formal.pos, formal, "<identifier>");
                    }
                    if (formal.type !== TokenType.IDENTIFIER) {
                        throw new ExpectedFormError(this.source, formal.pos, formal, "<identifier>");
                    }
                });
            }
            // Body is treated as a group of expressions
            const convertedBody = body.map(this.parseExpression.bind(this));
            // assert that body is not empty
            if (convertedBody.length < 1) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(lambda ... <body>+)");
            }
            if (convertedBody.length === 1) {
                return new Atomic.Lambda(group.location, convertedBody[0], convertedFormals, convertedRest);
            }
            const newLocation = convertedBody
                .at(0)
                .location.merge(convertedBody.at(-1).location);
            const bodySequence = new Atomic.Sequence(newLocation, convertedBody);
            return new Atomic.Lambda(group.location, bodySequence, convertedFormals, convertedRest);
        }
        /**
         * Parse a define expression.
         * @param group
         * @returns
         */
        parseDefinition(group) {
            // Form: (define <identifier> <expr>)
            //     | (define (<identifier> <formals>) <body>)
            //     | (define (<identifier> <formals>) <body> <body>*)
            // ensure that the group has at least 3 elements
            if (group.length() < 3) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(define <identifier> <expr>) | (define (<identifier> <formals>) <body>+)");
            }
            const elements = group.unwrap();
            const identifier = elements[1];
            const expr = elements.slice(2);
            let convertedIdentifier;
            let convertedFormals = [];
            let convertedRest = undefined;
            let isFunctionDefinition = false;
            // Identifier may be a token or a group of identifiers
            if (isGroup(identifier)) {
                // its a function definition
                isFunctionDefinition = true;
                const identifierElements = identifier.unwrap();
                const functionName = identifierElements[0];
                const formals = identifierElements.splice(1);
                // verify that the first element is an identifier
                if (!isToken(functionName)) {
                    throw new ExpectedFormError(this.source, functionName.location.start, functionName, "<identifier>");
                }
                if (functionName.type !== TokenType.IDENTIFIER) {
                    throw new ExpectedFormError(this.source, functionName.pos, functionName, "<identifier>");
                }
                // convert the first element to an identifier
                convertedIdentifier = new Atomic.Identifier(this.toLocation(functionName), functionName.lexeme);
                // Formals should be a group of identifiers
                [convertedFormals, convertedRest] = this.destructureList(formals, formal => {
                    if (!isToken(formal)) {
                        throw new ExpectedFormError(this.source, formal.pos, formal, "<identifier>");
                    }
                    if (formal.type !== TokenType.IDENTIFIER) {
                        throw new ExpectedFormError(this.source, formal.pos, formal, "<identifier>");
                    }
                });
            }
            else if (identifier.type !== TokenType.IDENTIFIER) {
                throw new ExpectedFormError(this.source, identifier.pos, identifier, "<identifier>");
            }
            else {
                // its a normal definition
                convertedIdentifier = new Atomic.Identifier(this.toLocation(identifier), identifier.lexeme);
                isFunctionDefinition = false;
            }
            // expr cannot be empty
            if (expr.length < 1) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(define ... <body>+)");
            }
            if (isFunctionDefinition) {
                // Body is treated as a group of expressions
                const convertedBody = expr.map(this.parseExpression.bind(this));
                if (convertedBody.length === 1) {
                    return new Extended.FunctionDefinition(group.location, convertedIdentifier, convertedBody[0], convertedFormals, convertedRest);
                }
                const newLocation = convertedBody
                    .at(0)
                    .location.merge(convertedBody.at(-1).location);
                const bodySequence = new Atomic.Sequence(newLocation, convertedBody);
                return new Extended.FunctionDefinition(group.location, convertedIdentifier, bodySequence, convertedFormals, convertedRest);
            }
            // its a normal definition
            if (expr.length > 1) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(define <identifier> <expr>)");
            }
            // Expr is treated as a single expression
            const convertedExpr = this.parseExpression(expr[0]);
            return new Atomic.Definition(group.location, convertedIdentifier, convertedExpr);
        }
        /**
         * Parse a conditional expression.
         * @param group
         * @returns
         */
        parseConditional(group) {
            // Form: (if <pred> <cons> <alt>)
            //     | (if <pred> <cons>)
            // ensure that the group has 3 or 4 elements
            if (group.length() < 3 || group.length() > 4) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(if <pred> <cons> <alt>?)");
            }
            const elements = group.unwrap();
            const test = elements[1];
            const consequent = elements[2];
            const alternate = group.length() > 3 ? elements[3] : undefined;
            // Test is treated as a single expression
            const convertedTest = this.parseExpression(test);
            // Consequent is treated as a single expression
            const convertedConsequent = this.parseExpression(consequent);
            // Alternate is treated as a single expression
            const convertedAlternate = alternate
                ? this.parseExpression(alternate)
                : new Atomic.Identifier(group.location, "undefined");
            return new Atomic.Conditional(group.location, convertedTest, convertedConsequent, convertedAlternate);
        }
        /**
         * Parse an application expression.
         */
        parseApplication(group) {
            // Form: (<func> <args>*)
            // ensure that the group has at least 1 element
            if (group.length() < 1) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(<func> <args>*)");
            }
            const elements = group.unwrap();
            const operator = elements[0];
            const operands = elements.splice(1);
            // Operator is treated as a single expression
            const convertedOperator = this.parseExpression(operator);
            // Operands are treated as a group of expressions
            const convertedOperands = [];
            for (const operand of operands) {
                convertedOperands.push(this.parseExpression(operand));
            }
            return new Atomic.Application(group.location, convertedOperator, convertedOperands);
        }
        /**
         * Parse a let expression.
         * @param group
         * @returns
         */
        parseLet(group) {
            if (this.chapter >= MACRO_CHAPTER) {
                // disable any verification for the let expression
                const groupItems = group.unwrap().slice(1);
                groupItems.forEach(item => {
                    this.parseExpression(item);
                });
                return new Extended.Let(group.location, [], [], new Atomic.Identifier(group.location, "undefined"));
            }
            // Form: (let ((<identifier> <value>)*) <body>+)
            // ensure that the group has at least 3 elements
            if (group.length() < 3) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(let ((<identifier> <value>)*) <body>+)");
            }
            const elements = group.unwrap();
            const bindings = elements[1];
            const body = elements.slice(2);
            // Verify bindings is a group
            if (!isGroup(bindings)) {
                throw new ExpectedFormError(this.source, bindings.pos, bindings, "((<identifier> <value>)*)");
            }
            // Bindings are treated as a group of grouped identifiers and values
            const convertedIdentifiers = [];
            const convertedValues = [];
            const bindingElements = bindings.unwrap();
            for (const bindingElement of bindingElements) {
                // Verify bindingElement is a group of size 2
                if (!isGroup(bindingElement)) {
                    throw new ExpectedFormError(this.source, bindingElement.pos, bindingElement, "(<identifier> <value>)");
                }
                if (bindingElement.length() !== 2) {
                    throw new ExpectedFormError(this.source, bindingElement.location.start, bindingElement, "(<identifier> <value>)");
                }
                const [identifier, value] = bindingElement.unwrap();
                // Verify identifier is a token and an identifier
                if (!isToken(identifier)) {
                    throw new ExpectedFormError(this.source, identifier.location.start, identifier, "<identifier>");
                }
                if (identifier.type !== TokenType.IDENTIFIER) {
                    throw new ExpectedFormError(this.source, identifier.pos, identifier, "<identifier>");
                }
                convertedIdentifiers.push(new Atomic.Identifier(this.toLocation(identifier), identifier.lexeme));
                convertedValues.push(this.parseExpression(value));
            }
            // Body is treated as a group of expressions
            const convertedBody = body.map(this.parseExpression.bind(this));
            // assert that body is not empty
            if (convertedBody.length < 1) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(let ... <body>+)");
            }
            if (convertedBody.length === 1) {
                return new Extended.Let(group.location, convertedIdentifiers, convertedValues, convertedBody[0]);
            }
            const newLocation = convertedBody
                .at(0)
                .location.merge(convertedBody.at(-1).location);
            const bodySequence = new Atomic.Sequence(newLocation, convertedBody);
            return new Extended.Let(group.location, convertedIdentifiers, convertedValues, bodySequence);
        }
        /**
         * Parse an extended cond expression.
         * @param group
         * @returns
         */
        parseExtendedCond(group) {
            if (this.chapter >= MACRO_CHAPTER) {
                // disable any verification for the cond expression
                const groupItems = group.unwrap().slice(1);
                groupItems.forEach(item => {
                    this.parseExpression(item);
                });
                return new Extended.Cond(group.location, [], [], new Atomic.Identifier(group.location, "undefined"));
            }
            // Form: (cond (<pred> <body>)*)
            //     | (cond (<pred> <body>)* (else <val>))
            // ensure that the group has at least 2 elements
            if (group.length() < 2) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(cond (<pred> <body>*)* (else <val>)?)");
            }
            const elements = group.unwrap();
            const clauses = elements.splice(1);
            // safe to cast because of the check above
            const lastClause = clauses.pop();
            // Clauses are treated as a group of groups of expressions
            // Form: (<pred> <body>*)
            const convertedClauses = [];
            const convertedConsequents = [];
            for (const clause of clauses) {
                // Verify clause is a group with size no less than 1
                if (!isGroup(clause)) {
                    throw new ExpectedFormError(this.source, clause.pos, clause, "(<pred> <body>*)");
                }
                if (clause.length() < 1) {
                    throw new ExpectedFormError(this.source, clause.firstToken().pos, clause.firstToken(), "(<pred> <body>*)");
                }
                const [test, ...consequent] = clause.unwrap();
                // verify that test is NOT an else token
                if (isToken(test) && test.type === TokenType.ELSE) {
                    throw new ExpectedFormError(this.source, test.pos, test, "<predicate>");
                }
                // Test is treated as a single expression
                const convertedTest = this.parseExpression(test);
                // Consequent is treated as a group of expressions
                const consequentExpressions = consequent.map(this.parseExpression.bind(this));
                const consequentLocation = consequent.length < 1
                    ? convertedTest.location
                    : consequentExpressions
                        .at(0)
                        .location.merge(consequentExpressions.at(-1).location);
                // if consequent is empty, the test itself is treated
                // as the value returned.
                // if consequent is more than length one, there is a sequence.
                const convertedConsequent = consequent.length < 1
                    ? convertedTest
                    : consequent.length < 2
                        ? consequentExpressions[0]
                        : new Atomic.Sequence(consequentLocation, consequentExpressions);
                convertedClauses.push(convertedTest);
                convertedConsequents.push(convertedConsequent);
            }
            // Check last clause
            // Verify lastClause is a group with size at least 2
            if (!isGroup(lastClause)) {
                throw new ExpectedFormError(this.source, lastClause.pos, lastClause, "(<pred> <body>+) | (else <val>)");
            }
            if (lastClause.length() < 2) {
                throw new ExpectedFormError(this.source, lastClause.firstToken().pos, lastClause.firstToken(), "(<pred> <body>+) | (else <val>)");
            }
            const [test, ...consequent] = lastClause.unwrap();
            let isElse = false;
            // verify that test is an else token
            if (isToken(test) && test.type === TokenType.ELSE) {
                isElse = true;
                // verify that consequent is of length 1
                if (consequent.length !== 1) {
                    throw new ExpectedFormError(this.source, lastClause.location.start, lastClause, "(else <val>)");
                }
            }
            // verify that consequent is at least 1 expression
            if (consequent.length < 1) {
                throw new ExpectedFormError(this.source, lastClause.location.start, lastClause, "(<pred> <body>+)");
            }
            // Consequent is treated as a group of expressions
            const consequentExpressions = consequent.map(this.parseExpression.bind(this));
            const consequentLocation = consequentExpressions
                .at(0)
                .location.merge(consequentExpressions.at(-1).location);
            const lastConsequent = consequent.length === 1
                ? consequentExpressions[0]
                : new Atomic.Sequence(consequentLocation, consequentExpressions);
            if (isElse) {
                return new Extended.Cond(group.location, convertedClauses, convertedConsequents, lastConsequent);
            }
            // If the last clause is not an else clause, we treat it as a normal cond clause instead
            const lastTest = this.parseExpression(test);
            // Test
            convertedClauses.push(lastTest);
            convertedConsequents.push(lastConsequent);
            return new Extended.Cond(group.location, convertedClauses, convertedConsequents);
        }
        // _____________________CHAPTER 3_____________________
        /**
         * Parse a reassignment expression.
         * @param group
         * @returns
         */
        parseSet(group) {
            // Form: (set! <identifier> <expr>)
            // ensure that the group has 3 elements
            if (group.length() !== 3) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(set! <identifier> <expr>)");
            }
            const elements = group.unwrap();
            const identifier = elements[1];
            const expr = elements[2];
            // Identifier is treated as a single identifier
            if (isGroup(identifier)) {
                throw new ExpectedFormError(this.source, identifier.location.start, identifier, "<identifier>");
            }
            if (identifier.type !== TokenType.IDENTIFIER) {
                throw new ExpectedFormError(this.source, identifier.pos, identifier, "<identifier>");
            }
            const convertedIdentifier = new Atomic.Identifier(this.toLocation(identifier), identifier.lexeme);
            const convertedExpr = this.parseExpression(expr);
            return new Atomic.Reassignment(group.location, convertedIdentifier, convertedExpr);
        }
        /**
         * Parse a begin expression.
         * @param group
         * @returns
         */
        parseBegin(group) {
            // Form: (begin <body>+)
            // ensure that the group has 2 or more elements
            if (group.length() < 2) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(begin <body>+)");
            }
            const sequence = group.unwrap();
            const sequenceElements = sequence.slice(1);
            const convertedExpressions = [];
            for (const sequenceElement of sequenceElements) {
                convertedExpressions.push(this.parseExpression(sequenceElement));
            }
            return new Extended.Begin(group.location, convertedExpressions);
        }
        /**
         * Parse a delay expression.
         * @param group
         * @returns
         */
        parseDelay(group) {
            if (this.chapter >= MACRO_CHAPTER) {
                // disable any verification for the delay expression
                const groupItems = group.unwrap().slice(1);
                groupItems.forEach(item => {
                    this.parseExpression(item);
                });
                return new Extended.Delay(group.location, new Atomic.Identifier(group.location, "undefined"));
            }
            // Form: (delay <expr>)
            // ensure that the group has 2 elements
            if (group.length() !== 2) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(delay <expr>)");
            }
            const elements = group.unwrap();
            const expr = elements[1];
            // Expr is treated as a single expression
            const convertedExpr = this.parseExpression(expr);
            return new Extended.Delay(group.location, convertedExpr);
        }
        // _____________________CHAPTER 3_____________________
        /**
         * Parse a define-syntax expression.
         * @param group
         * @returns nothing, this is for verification only.
         */
        parseDefineSyntax(group) {
            // Form: (define-syntax <identifier> <transformer>)
            // ensure that the group has 3 elements
            if (group.length() !== 3) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(define-syntax <identifier> <transformer>)");
            }
            const elements = group.unwrap();
            const identifier = elements[1];
            const transformer = elements[2];
            // parse the identifier using quote mode
            // (to capture redefinitions of syntax)
            this.quoteMode = QuoteMode.QUOTE;
            const convertedIdentifier = this.parseExpression(identifier);
            this.quoteMode = QuoteMode.NONE;
            if (!(convertedIdentifier instanceof Atomic.Symbol)) {
                throw new ExpectedFormError(this.source, convertedIdentifier.location.start, identifier, "<identifier>");
            }
            // Transformer is treated as a group
            // it should be syntax-rules
            if (!isGroup(transformer)) {
                throw new ExpectedFormError(this.source, transformer.pos, transformer, "<transformer>");
            }
            if (transformer.length() < 2) {
                throw new ExpectedFormError(this.source, transformer.firstToken().pos, transformer, "(syntax-rules ...)");
            }
            const transformerToken = transformer.unwrap()[0];
            if (!isToken(transformer.unwrap()[0])) {
                throw new ExpectedFormError(this.source, transformer.firstToken().pos, transformerToken, "syntax-rules");
            }
            if (transformerToken.type !== TokenType.SYNTAX_RULES) {
                throw new ExpectedFormError(this.source, transformerToken.pos, transformerToken, "syntax-rules");
            }
            // parse the transformer
            const convertedTransformer = this.parseSyntaxRules(transformer);
            return new Atomic.DefineSyntax(group.location, convertedIdentifier, convertedTransformer);
        }
        /**
         * Helper function to verify the validity of a pattern.
         * @param pattern
         * @returns validity of the pattern
         */
        isValidPattern(pattern) {
            // a pattern is either a symbol, a literal or
            // a list (<pattern>+), (<pattern>+ . <pattern>), (<pattern>+ ... <pattern>*)
            // or (<pattern>+ ... <pattern>+ . <pattern>)
            if (pattern instanceof Extended.List) {
                // check if the list is a proper list
                const isProper = pattern.terminator === undefined;
                if (isProper) {
                    // scan to make sure that only one ellipsis is present
                    const ellipsisCount = pattern.elements.filter(item => item instanceof Atomic.Symbol && item.value === "...").length;
                    if (ellipsisCount > 1) {
                        return false;
                    }
                    const ellipsisIndex = pattern.elements.findIndex(item => item instanceof Atomic.Symbol && item.value === "...");
                    if (ellipsisIndex != -1) {
                        // check if the ellipsis is behind any other element
                        // (ie it's not the first element)
                        if (ellipsisIndex === 0) {
                            return false;
                        }
                    }
                    // recursively check the elements
                    for (const element of pattern.elements) {
                        if (!this.isValidPattern(element)) {
                            return false;
                        }
                    }
                    return true;
                }
                else {
                    // scan to make sure that only one ellipsis is present
                    const ellipsisCount = pattern.elements.filter(item => item instanceof Atomic.Symbol && item.value === "...").length;
                    if (ellipsisCount > 1) {
                        return false;
                    }
                    const ellipsisIndex = pattern.elements.findIndex(item => item instanceof Atomic.Symbol && item.value === "...");
                    if (ellipsisIndex != -1) {
                        // check if the ellipsis is behind any other element
                        // (ie it's not the first element)
                        if (ellipsisIndex === 0) {
                            return false;
                        }
                        // since this is an improper list, the ellipsis must not
                        // be the last element either
                        if (ellipsisIndex === pattern.elements.length - 1) {
                            return false;
                        }
                    }
                    // recursively check the elements
                    for (const element of pattern.elements) {
                        if (!this.isValidPattern(element)) {
                            return false;
                        }
                    }
                    return this.isValidPattern(pattern.terminator);
                }
            }
            else if (pattern instanceof Atomic.Symbol ||
                pattern instanceof Atomic.BooleanLiteral ||
                pattern instanceof Atomic.NumericLiteral ||
                pattern instanceof Atomic.StringLiteral ||
                pattern instanceof Atomic.Nil) {
                return true;
            }
            else {
                return false;
            }
        }
        /**
         * Helper function to verify the validity of a template.
         * @param template
         * @returns validity of the template
         */
        isValidTemplate(template) {
            // a template is either a symbol, a literal or
            // a list (<element>+), (<element>+ . <template>), (... <template>)
            // where <element> is a template optionally followed by ...
            if (template instanceof Extended.List) {
                // check if the list is a proper list
                const isProper = template.terminator === undefined;
                if (isProper) {
                    // should have at least 1 element
                    if (template.elements.length === 0) {
                        return false;
                    }
                    // (... <template>) case
                    if (template.elements.length === 2 &&
                        template.elements[0] instanceof Atomic.Symbol &&
                        template.elements[0].value === "...") {
                        return this.isValidTemplate(template.elements[1]);
                    }
                    let ellipsisWorksOnLastElement = false;
                    // check each element for validity except for ellipses.
                    // for those, check if they follow a valid template.
                    for (let i = 0; i < template.elements.length; i++) {
                        const element = template.elements[i];
                        if (element instanceof Atomic.Symbol && element.value === "...") {
                            if (ellipsisWorksOnLastElement) {
                                ellipsisWorksOnLastElement = false;
                                continue;
                            }
                            // either consecutive ellipses or the first element is an ellipsis
                            return false;
                        }
                        else {
                            if (!this.isValidTemplate(element)) {
                                return false;
                            }
                            ellipsisWorksOnLastElement = true;
                        }
                    }
                    return true;
                }
                else {
                    if (template.elements.length === 0) {
                        return false;
                    }
                    let ellipsisWorksOnLastElement = false;
                    // check each element for validity except for ellipses.
                    // for those, check if they follow a valid template.
                    for (let i = 0; i < template.elements.length; i++) {
                        const element = template.elements[i];
                        if (element instanceof Atomic.Symbol && element.value === "...") {
                            if (ellipsisWorksOnLastElement) {
                                ellipsisWorksOnLastElement = false;
                                continue;
                            }
                            // either consecutive ellipses or the first element is an ellipsis
                            return false;
                        }
                        else {
                            if (!this.isValidTemplate(element)) {
                                return false;
                            }
                            ellipsisWorksOnLastElement = true;
                        }
                    }
                    return this.isValidTemplate(template.terminator);
                }
            }
            else if (template instanceof Atomic.Symbol ||
                template instanceof Atomic.BooleanLiteral ||
                template instanceof Atomic.NumericLiteral ||
                template instanceof Atomic.StringLiteral ||
                template instanceof Atomic.Nil) {
                return true;
            }
            else {
                return false;
            }
        }
        /**
         * Parse a syntax-rules expression.
         * @param group
         * @returns nothing, this is for verification only.
         */
        parseSyntaxRules(group) {
            // syntax rules is of form
            // (syntax-rules (<literal>*) <syntax-rule>+)
            // where syntax-rule is of form
            // (<pattern> <template>)
            // ensure that the group has at least 3 elements
            if (group.length() < 3) {
                throw new ExpectedFormError(this.source, group.location.start, group, "(syntax-rules (<literal>*) <syntax-rule>+)");
            }
            const elements = group.unwrap();
            const literals = elements[1];
            const rules = elements.slice(2);
            const finalLiterals = [];
            // verify that literals is a group
            if (!isGroup(literals)) {
                throw new ExpectedFormError(this.source, literals.pos, literals, "(<literal>*)");
            }
            // parse each literal as a symbol
            this.quoteMode = QuoteMode.QUOTE;
            for (const literal of literals.unwrap()) {
                if (!isToken(literal)) {
                    throw new ExpectedFormError(this.source, literal.location.start, literal, "<literal>");
                }
                const convertedLiteral = this.parseExpression(literal);
                if (!(convertedLiteral instanceof Atomic.Symbol)) {
                    throw new ExpectedFormError(this.source, literal.pos, literal, "<literal>");
                }
                finalLiterals.push(convertedLiteral);
            }
            const finalRules = [];
            // each rule is a group of size 2
            for (const rule of rules) {
                if (!isGroup(rule)) {
                    throw new ExpectedFormError(this.source, rule.pos, rule, "(<pattern> <template>)");
                }
                if (rule.length() !== 2) {
                    throw new ExpectedFormError(this.source, rule.location.start, rule, "(<pattern> <template>)");
                }
                // verify the validity of the pattern and template
                const [pattern, template] = rule.unwrap();
                const convertedPattern = this.parseExpression(pattern);
                const convertedTemplate = this.parseExpression(template);
                if (!this.isValidPattern(convertedPattern)) {
                    throw new ExpectedFormError(this.source, convertedPattern.location.start, pattern, "<symbol> | <literal> | (<pattern>+) | (<pattern>+ ... <pattern>*) | (<pattern>+ ... <pattern>+ . <pattern>)");
                }
                if (!this.isValidTemplate(convertedTemplate)) {
                    throw new ExpectedFormError(this.source, convertedTemplate.location.start, template, "<symbol> | <literal> | (<element>+) | (<element>+ . <template>) | (... <template>)");
                }
                finalRules.push([convertedPattern, convertedTemplate]);
            }
            this.quoteMode = QuoteMode.NONE;
            return new Atomic.SyntaxRules(group.location, finalLiterals, finalRules);
        }
        // ___________________MISCELLANEOUS___________________
        /**
         * Parse an import expression.
         * @param group
         * @returns
         */
        parseImport(group) {
            // Form: (import "<source>" (<identifier>*))
            // ensure that the group has 3 elements
            if (group.length() !== 3) {
                throw new ExpectedFormError(this.source, group.firstToken().pos, group.firstToken(), '(import "<source>" (<identifier>*))');
            }
            const elements = group.unwrap();
            const source = elements[1];
            const identifiers = elements[2];
            // source is treated as a single string
            if (!isToken(source)) {
                throw new ExpectedFormError(this.source, source.location.start, source, '"<source>"');
            }
            if (source.type !== TokenType.STRING) {
                throw new ExpectedFormError(this.source, source.pos, source, '"<source>"');
            }
            // Identifiers are treated as a group of identifiers
            if (!isGroup(identifiers)) {
                throw new ExpectedFormError(this.source, identifiers.pos, identifiers, "(<identifier>*)");
            }
            const identifierElements = identifiers.unwrap();
            const convertedIdentifiers = [];
            for (const identifierElement of identifierElements) {
                if (!isToken(identifierElement)) {
                    throw new ExpectedFormError(this.source, identifierElement.location.start, identifierElement, "<identifier>");
                }
                if (identifierElement.type !== TokenType.IDENTIFIER) {
                    throw new ExpectedFormError(this.source, identifierElement.pos, identifierElement, "<identifier>");
                }
                convertedIdentifiers.push(new Atomic.Identifier(this.toLocation(identifierElement), identifierElement.lexeme));
            }
            const convertedSource = new Atomic.StringLiteral(this.toLocation(source), source.literal);
            return new Atomic.Import(group.location, convertedSource, convertedIdentifiers);
        }
        /**
         * Parse an export expression.
         * @param group
         * @returns
         */
        parseExport(group) {
            // Form: (export (<definition>))
            // ensure that the group has 2 elements
            if (group.length() !== 2) {
                throw new ExpectedFormError(this.source, group.firstToken().pos, group.firstToken(), "(export (<definition>))");
            }
            const elements = group.unwrap();
            const definition = elements[1];
            // assert that definition is a group
            if (!isGroup(definition)) {
                throw new ExpectedFormError(this.source, definition.pos, definition, "(<definition>)");
            }
            const convertedDefinition = this.parseExpression(definition);
            // assert that convertedDefinition is a definition
            if (!(convertedDefinition instanceof Atomic.Definition ||
                convertedDefinition instanceof Extended.FunctionDefinition)) {
                throw new ExpectedFormError(this.source, definition.location.start, definition, "(<definition>)");
            }
            return new Atomic.Export(group.location, convertedDefinition);
        }
        /**
         * Parses a vector expression
         */
        parseVector(group) {
            // Because of the group invariants, we can safely assume that the group
            // is strictly of size 2.
            // Additionally, we can safely assume that the second element is a group
            // because token HASH_VECTOR expects a parenthesis as the next immediate
            // token.
            const elements = group.unwrap()[1];
            // Vectors will be treated normally regardless of the quote mode.
            // but interior expressions will be affected by the mode.
            const convertedElements = elements
                .unwrap()
                .map(this.parseExpression.bind(this));
            return new Atomic.Vector(group.location, convertedElements);
        }
        // ___________________________________________________
        /** Parses a sequence of tokens into an AST.
         *
         * @param group A group of tokens.
         * @returns An AST.
         */
        parse(reparseAsSexpr = false) {
            if (reparseAsSexpr) {
                this.quoteMode = QuoteMode.QUOTE;
                this.current = 0;
            }
            // collect all top-level elements
            const topElements = [];
            while (!this.isAtEnd()) {
                if (this.peek().type === TokenType.EOF) {
                    break;
                }
                const currentElement = this.grouping();
                if (!currentElement) {
                    continue;
                }
                const convertedElement = this.parseExpression(currentElement);
                topElements.push(convertedElement);
            }
            // if we are in the macro chapter,
            // everything we have done so far was only to verify the program.
            // we return everything as an s-expression - that is, we quote the
            // entire program.
            if (this.chapter >= MACRO_CHAPTER && !reparseAsSexpr) {
                // so, redo the entire parsing, but now with the quote mode on.
                // we do need to remove the imports from the top level elements,
                // and append them here.
                // assumption - all imports are top level forms. We will hoist all imports to the top.
                // TODO: Figure out how to assert imports as top level forms.
                const importElements = topElements.filter(e => e instanceof Atomic.Import);
                const sexprElements = this.parse(true);
                // we remove all of the quoted imports from the sexprElements.
                // an import can be detected as a list
                // that is not empty
                // whose first element is a symbol
                // in which the name is "import".
                const restElements = sexprElements.filter(e => !(e instanceof Extended.List &&
                    e.elements &&
                    e.elements[0] instanceof Atomic.Symbol &&
                    e.elements[0].value === "import"));
                return [...importElements, ...restElements];
            }
            return topElements;
        }
    }

    /* Library for building ESTree nodes. */
    function makeProgram(body = []) {
        // generate a good location based on the start of the first element of the body
        // and its last, as long as the body is not empty
        const loc = body.length > 0
            ? {
                start: body[0].loc.start,
                end: body[body.length - 1].loc.end,
            }
            : {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 0 },
            };
        return {
            type: "Program",
            body,
            sourceType: "module",
            loc: loc,
        };
    }
    function makeDeclaration(kind, id, init, loc) {
        return {
            type: "VariableDeclaration",
            kind,
            declarations: [
                {
                    type: "VariableDeclarator",
                    id,
                    init,
                },
            ],
            loc: loc ? loc : id.loc,
        };
    }
    function makeIdentifier(name, loc) {
        return {
            type: "Identifier",
            name,
            loc,
        };
    }
    function makeLiteral(value, loc) {
        return {
            type: "Literal",
            value,
            raw: `"${value}"`,
            loc,
        };
    }
    function makeArrowFunctionExpression(params, body, loc) {
        return {
            type: "ArrowFunctionExpression",
            params,
            body,
            async: false,
            expression: body.type !== "BlockStatement",
            loc: loc ? loc : body.loc,
        };
    }
    function makeBlockStatement(body, loc) {
        return {
            type: "BlockStatement",
            body,
            loc: {
                    start: body[0].loc.start,
                    end: body[body.length - 1].loc.end,
                },
        };
    }
    function makeCallExpression(callee, args, loc) {
        return {
            type: "CallExpression",
            optional: false,
            callee,
            arguments: args,
            loc: loc
                ? loc
                : {
                    start: callee.loc.start,
                    end: args[args.length - 1].loc.end,
                },
        };
    }
    function makeConditionalExpression(test, consequent, alternate, loc) {
        return {
            type: "ConditionalExpression",
            test,
            consequent,
            alternate,
            loc: loc
                ? loc
                : {
                    start: test.loc.start,
                    end: alternate.loc.end,
                },
        };
    }
    function makeAssignmentExpression(left, right, loc) {
        return {
            type: "AssignmentExpression",
            operator: "=",
            left,
            right,
            loc: loc
                ? loc
                : {
                    start: left.loc.start,
                    end: right.loc.end,
                },
        };
    }
    function makeExpressionStatement(expression, loc) {
        return {
            type: "ExpressionStatement",
            expression,
            loc: loc ? loc : expression.loc,
        };
    }
    function makeReturnStatement(argument, loc) {
        return {
            type: "ReturnStatement",
            argument,
            loc: loc ? loc : argument.loc,
        };
    }
    function makeRestElement(argument, loc) {
        return {
            type: "RestElement",
            argument,
            loc: argument.loc,
        };
    }
    function makeArrayExpression(elements, loc) {
        return {
            type: "ArrayExpression",
            elements,
            loc: loc
                ? loc
                : {
                    start: elements[0].loc.start,
                    end: elements[elements.length - 1].loc.end,
                },
        };
    }
    function makeImportSpecifier(imported, local, loc) {
        return {
            type: "ImportSpecifier",
            imported,
            local,
            loc: loc ? loc : imported.loc,
        };
    }
    function makeImportDeclaration(specifiers, source, loc) {
        return {
            type: "ImportDeclaration",
            specifiers,
            source,
            attributes: [],
            loc: loc
                ? loc
                : {
                    start: specifiers[0].loc.start,
                    end: source.loc.end,
                },
        };
    }
    function makeExportNamedDeclaration(declaration, loc) {
        return {
            type: "ExportNamedDeclaration",
            specifiers: [],
            source: null,
            attributes: [],
            declaration,
            loc: loc ? loc : declaration.loc,
        };
    }

    /**
     * The final transpiler visitor.
     * Takes in expressions, yields es.Node[], so we can flatmap into a final program
     */
    // helper functions
    function isExpression(node) {
        return !node.type.includes("Statement") && !node.type.includes("Declaration");
    }
    function wrapInRest(param) {
        return makeRestElement(param);
    }
    function wrapInStatement(expression) {
        return makeExpressionStatement(expression);
    }
    function wrapInReturn(expression) {
        return makeReturnStatement(expression);
    }
    class Transpiler {
        static create() {
            return new Transpiler();
        }
        transpile(program) {
            // create an array of expressions
            const expressions = program.flatMap(e => e.accept(this));
            // then create an array of statements
            const statements = expressions.map(e => isExpression(e) ? wrapInStatement(e) : e);
            // then wrap the whole thing in a program
            return makeProgram(statements);
        }
        // Atomic AST
        // iife
        visitSequence(node) {
            const expressions = node.expressions.flatMap(e => e.accept(this));
            // wrap each expression into an expression statement if required
            const statements = expressions.map(e => isExpression(e) ? wrapInStatement(e) : e);
            // promote the last expression to a return statement
            const lastExpression = statements.at(-1);
            // if the last expression is not something that emits an expression,
            // the sequence should return undefined
            if (lastExpression.type !== "ExpressionStatement") {
                statements.push(
                // always remember that undefined is an identifier
                wrapInStatement(makeIdentifier("undefined", node.location)));
            }
            else {
                // if the last expression is an expression statement, we should promote it to a return statement
                statements[statements.length - 1] = wrapInReturn(lastExpression.expression);
            }
            // turn the statements into a block
            const body = makeBlockStatement(statements);
            // make the call expression
            const iife = makeCallExpression(makeArrowFunctionExpression([], body, node.location), [], node.location);
            // if other parts of the program want to optimize their code, eliminating
            // the iife sequence, they can see that this is a sequence with this flag
            iife.isSequence = true;
            return [iife];
        }
        // literals
        visitNumericLiteral(node) {
            // we need to wrap the number in a call to make-number
            const makeNumber = makeIdentifier("make_number", node.location);
            // we turn the number into a literal
            const number = makeLiteral(node.value, node.location);
            return [
                makeCallExpression(makeNumber, [number], node.location),
            ];
        }
        visitBooleanLiteral(node) {
            return [makeLiteral(node.value, node.location)];
        }
        visitStringLiteral(node) {
            return [makeLiteral(node.value, node.location)];
        }
        visitLambda(node) {
            const parameters = node.params.flatMap(p => p.accept(this));
            const [fnBody] = node.body.accept(this);
            // if the inner body is a sequence, we can optimize it by removing the sequence
            // and making the arrow function expression return the last expression
            // we left a flag in the sequence to indicate that it is an iife
            let finalBody = fnBody.isSequence
                ? // then we know that body is a sequence, stored as a call expression to an
                    // inner callee with an interior arrow function expression that takes no arguments
                    // let's steal that arrow function expression's body and use it as ours
                    fnBody.callee.body
                : fnBody;
            if (!node.rest) {
                return [
                    makeArrowFunctionExpression(parameters, finalBody, node.location),
                ];
            }
            // there is a rest parameter to deal with
            const [restParameter] = node.rest.accept(this);
            // wrap it in a restElement
            const restElement = wrapInRest(restParameter);
            parameters.push(restElement);
            // place an implicit vector-to-list conversion around the rest parameter
            // this is to ensure that the rest parameter is always a list
            const vectorToList = makeIdentifier("vector->list", node.location);
            // we make a call to it with the rest parameter as the argument
            const restParameterConversion = makeCallExpression(vectorToList, [restParameter], node.location);
            // then we reassign the rest parameter to the result of the call
            const restParameterAssignment = makeAssignmentExpression(restParameter, restParameterConversion, node.location);
            // then we inject it into the final body
            if (finalBody.type === "BlockStatement") {
                finalBody.body.unshift(wrapInStatement(restParameterAssignment));
                return [
                    makeArrowFunctionExpression(parameters, finalBody, node.location),
                ];
            }
            // otherwise, we need to wrap the final body in a block statement
            // and then inject the vectorToList call
            finalBody = makeBlockStatement([
                wrapInStatement(restParameterAssignment),
                wrapInReturn(finalBody),
            ]);
            return [
                makeArrowFunctionExpression(parameters, finalBody, node.location),
            ];
        }
        // identifiers
        visitIdentifier(node) {
            return [makeIdentifier(node.name, node.location)];
        }
        // make a verifier that prevents this from being part of an
        // expression context
        // turns into statement
        visitDefinition(node) {
            const [value] = node.value.accept(this);
            const [id] = node.name.accept(this);
            return [makeDeclaration("let", id, value, node.location)];
        }
        // expressions
        visitApplication(node) {
            const [operator] = node.operator.accept(this);
            const operands = node.operands.flatMap(o => o.accept(this));
            return [
                makeCallExpression(operator, operands, node.location),
            ];
        }
        visitConditional(node) {
            const [test] = node.test.accept(this);
            // scheme's truthiness is different from javascript's,
            // and so we must use a custom truthiness function truthy to evaluate the test
            const truthy = makeIdentifier("truthy", node.location);
            const schemeTest = makeCallExpression(truthy, [test], node.location);
            const [consequent] = node.consequent.accept(this);
            const [alternate] = node.alternate.accept(this);
            return [
                makeConditionalExpression(schemeTest, consequent, alternate, node.location),
            ];
        }
        // pair represented using cons call
        visitPair(node) {
            const [car] = node.car.accept(this);
            const [cdr] = node.cdr.accept(this);
            // construct the callee, cons, by hand
            const cons = makeIdentifier("cons", node.location);
            return [makeCallExpression(cons, [car, cdr], node.location)];
        }
        visitNil(node) {
            return [makeLiteral(null, node.location)];
        }
        // generate symbols with string->symbol call
        visitSymbol(node) {
            // take the string out of the symbol value
            const str = makeLiteral(node.value, node.location);
            const stringToSymbol = makeIdentifier("string->symbol", node.location);
            return [
                makeCallExpression(stringToSymbol, [str], node.location),
            ];
        }
        // we are assured that this marker will always exist within a list context.
        // leave a splice marker in the list that will be removed by a runtime
        // call to eval-splice on a list
        visitSpliceMarker(node) {
            const [expr] = node.value.accept(this);
            const makeSplice = makeIdentifier("make-splice", node.location);
            return [makeCallExpression(makeSplice, expr, node.location)];
        }
        // turns into expression that returns assigned value
        // maybe in the future we can make a setall! macro
        visitReassignment(node) {
            const [left] = node.name.accept(this);
            const [right] = node.value.accept(this);
            return [makeAssignmentExpression(left, right, node.location)];
        }
        // make a verifier that keeps these top level
        // and separate from nodes
        visitImport(node) {
            // first we make the importDeclaration
            const newIdentifiers = node.identifiers.flatMap(i => i.accept(this));
            const mappedIdentifierNames = newIdentifiers.map(i => {
                const copy = Object.assign({}, i);
                copy.name = "imported" + copy.name;
                return copy;
            });
            const makeSpecifiers = (importeds, locals) => importeds.map((imported, i) => 
            // safe to cast as we are assured all source locations are present
            makeImportSpecifier(imported, locals[i], imported.loc));
            const specifiers = makeSpecifiers(newIdentifiers, mappedIdentifierNames);
            const [source] = node.source.accept(this);
            const importDeclaration = makeImportDeclaration(specifiers, source, node.location);
            // then for each imported function, we define their proper
            // names with definitions
            const makeRedefinitions = (importeds, locals) => importeds.flatMap((imported, i) => makeDeclaration("let", imported, locals[i], 
            // we are assured that all source locations are present
            imported.loc));
            const redefinitions = makeRedefinitions(newIdentifiers, mappedIdentifierNames);
            return [importDeclaration, ...redefinitions];
        }
        visitExport(node) {
            const [newDefinition] = node.definition.accept(this);
            return [
                makeExportNamedDeclaration(newDefinition, node.location),
            ];
        }
        // turn into an array
        visitVector(node) {
            const newElements = node.elements.flatMap(e => e.accept(this));
            return [makeArrayExpression(newElements, node.location)];
        }
        // Extended AST
        // this is in the extended AST, but useful enough to keep.
        visitList(node) {
            const newElements = node.elements.flatMap(e => e.accept(this));
            const [newTerminator] = node.terminator
                ? node.terminator.accept(this)
                : [undefined];
            if (newTerminator) {
                // cons* or list* produces dotted lists
                // we prefer list* here as it explicitly describes the
                // construction of an improper list - the word LIST
                const dottedList = makeIdentifier("list*", node.location);
                return [
                    makeCallExpression(dottedList, [...newElements, newTerminator], node.location),
                ];
            }
            // a proper list
            const list = makeIdentifier("list", node.location);
            return [makeCallExpression(list, newElements, node.location)];
        }
        // if any of these are called, its an error. the simplifier
        // should be called first.
        visitFunctionDefinition(node) {
            throw new Error("The AST should be simplified!");
        }
        visitLet(node) {
            throw new Error("The AST should be simplified!");
        }
        visitCond(node) {
            throw new Error("The AST should be simplified!");
        }
        visitBegin(node) {
            throw new Error("The AST should be simplified!");
        }
        visitDelay(node) {
            throw new Error("The AST should be simplified!");
        }
        visitDefineSyntax(node) {
            throw new Error("This should not be called!");
        }
        visitSyntaxRules(node) {
            throw new Error("This should not be called!");
        }
        visitComplexLiteral(node) {
            // Convert complex literal to string representation for JavaScript
            return [makeLiteral(node.value, node.location)];
        }
    }

    /**
     * A visitor that transforms all "extended AST" nodes into "atomic AST" nodes.
     * Except for everything inside a quote, which is left alone.
     *
     * It also does double work by "flattening" begin nodes whenever possible, to allow definitions
     * to be visible outside the begin structure (since begins don't have their own scope).
     */
    // a function that takes an expression and returns an array of expressions
    // we will use this to "remove" the begin node whenever possible by returning its expressions
    // this is useful when the begin is in a sequence, to allow its side effects to be visible
    // outside the begin block
    function flattenBegin(ex) {
        if (!(ex instanceof Extended.Begin)) {
            return [ex];
        }
        const beginExpressions = ex.expressions;
        // these expressions may themselves contain begin nodes
        // that need to be flattened
        return beginExpressions.flatMap(flattenBegin);
    }
    class Simplifier {
        // Factory method for creating a new Simplifier instance.
        static create() {
            return new Simplifier();
        }
        simplify(node) {
            const flattenedExpressions = node.flatMap(flattenBegin);
            return flattenedExpressions.map(expression => expression.accept(this));
        }
        // Atomic AST
        visitSequence(node) {
            const location = node.location;
            const flattenedExpressions = node.expressions.flatMap(flattenBegin);
            const newExpressions = flattenedExpressions.map(expression => expression.accept(this));
            return new Atomic.Sequence(location, newExpressions);
        }
        visitNumericLiteral(node) {
            return node;
        }
        visitBooleanLiteral(node) {
            return node;
        }
        visitStringLiteral(node) {
            return node;
        }
        visitLambda(node) {
            const location = node.location;
            const params = node.params;
            const rest = node.rest;
            const newBody = node.body.accept(this);
            return new Atomic.Lambda(location, newBody, params, rest);
        }
        visitIdentifier(node) {
            return node;
        }
        visitDefinition(node) {
            const location = node.location;
            const name = node.name;
            const newValue = node.value.accept(this);
            return new Atomic.Definition(location, name, newValue);
        }
        visitApplication(node) {
            const location = node.location;
            const newOperator = node.operator.accept(this);
            const newOperands = node.operands.map(operand => operand.accept(this));
            return new Atomic.Application(location, newOperator, newOperands);
        }
        visitConditional(node) {
            const location = node.location;
            const newTest = node.test.accept(this);
            const newConsequent = node.consequent.accept(this);
            const newAlternate = node.alternate.accept(this);
            return new Atomic.Conditional(location, newTest, newConsequent, newAlternate);
        }
        visitPair(node) {
            const location = node.location;
            const newCar = node.car.accept(this);
            const newCdr = node.cdr.accept(this);
            return new Atomic.Pair(location, newCar, newCdr);
        }
        visitNil(node) {
            return node;
        }
        visitSymbol(node) {
            return node;
        }
        visitSpliceMarker(node) {
            const location = node.location;
            const newValue = node.value.accept(this);
            return new Atomic.SpliceMarker(location, newValue);
        }
        visitReassignment(node) {
            const location = node.location;
            const name = node.name;
            const newValue = node.value.accept(this);
            return new Atomic.Reassignment(location, name, newValue);
        }
        // Already in simplest form.
        visitImport(node) {
            return node;
        }
        visitExport(node) {
            const location = node.location;
            const newDefinition = node.definition.accept(this);
            return new Atomic.Export(location, newDefinition);
        }
        visitVector(node) {
            const location = node.location;
            // Simplify the elements of the vector
            const newElements = node.elements.map(element => element.accept(this));
            return new Atomic.Vector(location, newElements);
        }
        // Extended AST
        visitFunctionDefinition(node) {
            const location = node.location;
            const name = node.name;
            const params = node.params;
            const rest = node.rest;
            const newBody = node.body.accept(this);
            const newLambda = new Atomic.Lambda(location, newBody, params, rest);
            return new Atomic.Definition(location, name, newLambda);
        }
        visitLet(node) {
            const location = node.location;
            const identifiers = node.identifiers;
            const newValues = node.values.map(value => value.accept(this));
            const newBody = node.body.accept(this);
            const newLambda = new Atomic.Lambda(location, newBody, identifiers);
            return new Atomic.Application(location, newLambda, newValues);
        }
        visitCond(node) {
            const location = node.location;
            const newPredicates = node.predicates.map(predicate => predicate.accept(this));
            const newConsequents = node.consequents.map(consequent => consequent.accept(this));
            const newCatchall = node.catchall
                ? node.catchall.accept(this)
                : node.catchall;
            if (newPredicates.length == 0) {
                // Return catchall if there is no predicate
                return new Atomic.Conditional(location, new Atomic.BooleanLiteral(location, false), new Atomic.Nil(location), node.catchall ? newCatchall : new Atomic.Nil(location));
            }
            newPredicates.reverse();
            newConsequents.reverse();
            const lastLocation = newPredicates[0].location;
            let newConditional = newCatchall
                ? newCatchall
                : new Atomic.Nil(lastLocation);
            for (let i = 0; i < newPredicates.length; i++) {
                const predicate = newPredicates[i];
                const consequent = newConsequents[i];
                const predLocation = predicate.location;
                const consLocation = consequent.location;
                const newLocation = new Location(predLocation.start, consLocation.end);
                newConditional = new Atomic.Conditional(newLocation, predicate, consequent, newConditional);
            }
            return newConditional;
        }
        // we will keep list as it is useful in its current state.
        visitList(node) {
            const location = node.location;
            const newElements = node.elements.map(element => element.accept(this));
            const newTerminator = node.terminator
                ? node.terminator.accept(this)
                : undefined;
            return new Extended.List(location, newElements, newTerminator);
        }
        // these begins are not located at the top level, or in sequences,
        // so they have been left alone
        // they are used as ways to sequence expressions locally instead
        visitBegin(node) {
            const location = node.location;
            const flattenedExpressions = node.expressions.flatMap(flattenBegin);
            const newExpressions = flattenedExpressions.map(expression => expression.accept(this));
            return new Atomic.Sequence(location, newExpressions);
        }
        // we transform delay into a call expression of "make-promise"
        visitDelay(node) {
            const location = node.location;
            const newBody = node.expression.accept(this);
            const delayedLambda = new Atomic.Lambda(location, newBody, []);
            const makePromise = new Atomic.Identifier(location, "make-promise");
            return new Atomic.Application(location, makePromise, [delayedLambda]);
        }
        // these nodes are already in their simplest form
        visitDefineSyntax(node) {
            return node;
        }
        visitSyntaxRules(node) {
            return node;
        }
        visitComplexLiteral(node) {
            return node;
        }
    }

    /**
     * A visitor that evaluates all definitions in a Scheme AST.
     * If several redefinitions are made, they are converted to reassignments.
     * Required to play nice with JavaScript's scoping rules.
     */
    class Redefiner {
        // Factory method for creating a new Redefiner instance.
        static create() {
            return new Redefiner();
        }
        redefineScope(scope) {
            const names = new Set();
            const newScope = scope.map(expression => {
                if (expression instanceof Atomic.Definition) {
                    const exprName = expression.name.name;
                    if (names.has(exprName)) {
                        return new Atomic.Reassignment(expression.location, expression.name, expression.value);
                    }
                    names.add(exprName);
                }
                return expression;
            });
            return newScope;
        }
        redefine(nodes) {
            // recursivly redefine the scope of the nodes
            // then work directly on the new nodes
            const newNodes = nodes.map(node => node.accept(this));
            return this.redefineScope(newNodes);
        }
        // Atomic AST
        visitSequence(node) {
            const location = node.location;
            const newExpressions = node.expressions.map(expression => expression.accept(this));
            return new Atomic.Sequence(location, this.redefineScope(newExpressions));
        }
        visitNumericLiteral(node) {
            return node;
        }
        visitBooleanLiteral(node) {
            return node;
        }
        visitStringLiteral(node) {
            return node;
        }
        visitLambda(node) {
            const location = node.location;
            const params = node.params;
            const rest = node.rest;
            const newBody = node.body.accept(this);
            return new Atomic.Lambda(location, newBody, params, rest);
        }
        visitIdentifier(node) {
            return node;
        }
        visitDefinition(node) {
            const location = node.location;
            const name = node.name;
            const newValue = node.value.accept(this);
            return new Atomic.Definition(location, name, newValue);
        }
        visitApplication(node) {
            const location = node.location;
            const newOperator = node.operator.accept(this);
            const newOperands = node.operands.map(operand => operand.accept(this));
            return new Atomic.Application(location, newOperator, newOperands);
        }
        visitConditional(node) {
            const location = node.location;
            const newTest = node.test.accept(this);
            const newConsequent = node.consequent.accept(this);
            const newAlternate = node.alternate.accept(this);
            return new Atomic.Conditional(location, newTest, newConsequent, newAlternate);
        }
        visitPair(node) {
            const location = node.location;
            const newCar = node.car.accept(this);
            const newCdr = node.cdr.accept(this);
            return new Atomic.Pair(location, newCar, newCdr);
        }
        visitNil(node) {
            return node;
        }
        visitSymbol(node) {
            return node;
        }
        visitSpliceMarker(node) {
            const location = node.location;
            const newValue = node.value.accept(this);
            return new Atomic.SpliceMarker(location, newValue);
        }
        visitReassignment(node) {
            const location = node.location;
            const name = node.name;
            const newValue = node.value.accept(this);
            return new Atomic.Reassignment(location, name, newValue);
        }
        // Already in simplest form.
        visitImport(node) {
            return node;
        }
        visitExport(node) {
            const location = node.location;
            const newDefinition = node.definition.accept(this);
            return new Atomic.Export(location, newDefinition);
        }
        visitVector(node) {
            const location = node.location;
            // Simplify the elements of the vector
            const newElements = node.elements.map(element => element.accept(this));
            return new Atomic.Vector(location, newElements);
        }
        // Extended AST
        visitFunctionDefinition(node) {
            const location = node.location;
            const name = node.name;
            const params = node.params;
            const rest = node.rest;
            const newBody = node.body.accept(this);
            return new Extended.FunctionDefinition(location, name, newBody, params, rest);
        }
        visitLet(node) {
            const location = node.location;
            const identifiers = node.identifiers;
            const newValues = node.values.map(value => value.accept(this));
            const newBody = node.body.accept(this);
            return new Extended.Let(location, identifiers, newValues, newBody);
        }
        visitCond(node) {
            const location = node.location;
            const newPredicates = node.predicates.map(predicate => predicate.accept(this));
            const newConsequents = node.consequents.map(consequent => consequent.accept(this));
            const newCatchall = node.catchall
                ? node.catchall.accept(this)
                : node.catchall;
            return new Extended.Cond(location, newPredicates, newConsequents, newCatchall);
        }
        visitList(node) {
            const location = node.location;
            const newElements = node.elements.map(element => element.accept(this));
            const newTerminator = node.terminator
                ? node.terminator.accept(this)
                : undefined;
            return new Extended.List(location, newElements, newTerminator);
        }
        visitBegin(node) {
            const location = node.location;
            const newExpressions = node.expressions.map(expression => expression.accept(this));
            return new Extended.Begin(location, this.redefineScope(newExpressions));
        }
        visitDelay(node) {
            const location = node.location;
            const newBody = node.expression.accept(this);
            return new Extended.Delay(location, newBody);
        }
        // there are no redefinitions in the following nodes.
        visitDefineSyntax(node) {
            return node;
        }
        visitSyntaxRules(node) {
            return node;
        }
        visitComplexLiteral(node) {
            return node;
        }
    }

    /**
     * The main entry point of the scheme transpiler.
     */
    /**
     * wrap an s-expression in an eval call.
     */
    function wrapInEval(body) {
        const evalObj = new Atomic.Identifier(body.location, "eval");
        return new Atomic.Application(body.location, evalObj, [body]);
    }
    /**
     * wrap an s-expression in a begin statement.
     * since we want an s-expression as return,
     * begin is represented as a list of expressions starting with "begin".
     */
    function wrapInBegin(expressions) {
        // use the total location of the first and last expressions
        const dummyloc = expressions[0].location.merge(expressions[expressions.length - 1].location);
        const begin = new Atomic.Symbol(dummyloc, "begin");
        return new Extended.List(dummyloc, [begin, ...expressions]);
    }
    /**
     * Transpiles Scheme source code into an ESTree program.
     * @param source The Scheme source code
     * @param chapter The chapter of the Scheme language.
     *                If not provided, defaults to the latest version.
     * @returns
     */
    function schemeParse(source, chapter = Infinity, encode) {
        // Instantiate the lexer
        const lexer = new SchemeLexer(source);
        // Generate tokens
        const tokens = lexer.scanTokens();
        // Instantiate the parser
        const parser = new SchemeParser(source, tokens, chapter);
        // The Scheme AST is represented as an
        // array of expressions, which is all top-level expressions
        let finalAST;
        // Generate the first AST
        const firstAST = parser.parse();
        // We instantiate all the visitors
        const simplifier = Simplifier.create();
        const redefiner = Redefiner.create();
        const transpiler = Transpiler.create();
        if (chapter < MACRO_CHAPTER) {
            // Then we simplify the AST
            const simplifiedAST = simplifier.simplify(firstAST);
            // Then we redefine the AST
            const redefinedAST = redefiner.redefine(simplifiedAST);
            finalAST = redefinedAST;
        }
        else {
            // Then we prepare the AST for evaluation within the CSET machine.
            // Take the imports from the AST
            const macroASTImports = firstAST.filter(e => e instanceof Atomic.Import);
            const macroASTRest = firstAST.filter(e => !(e instanceof Atomic.Import));
            // On the rest elements,
            // 1. If empty, do nothing
            // 2. If 1 element, wrap in eval call
            // 3. If more than one element, sequence as one begin statement, then wrap in eval call
            const macroASTformattedRest = macroASTRest.length === 0
                ? []
                : macroASTRest.length === 1
                    ? [wrapInEval(macroASTRest[0])]
                    : [wrapInEval(wrapInBegin(macroASTRest))];
            // Concatenate the imports and the rest
            finalAST = [...macroASTImports, ...macroASTformattedRest];
        }
        // Finally we transpile the AST
        const program = transpiler.transpile(finalAST);
        return encode ? estreeEncode(program) : program;
    }

    // Import for internal use
    // Import js-base64 functions directly
    const b64Encode = (str) => btoa(unescape(encodeURIComponent(str)));
    const b64Decode = (str) => decodeURIComponent(escape(atob(str)));
    const JS_KEYWORDS = [
        "break",
        "case",
        "catch",
        "class",
        "const",
        "continue",
        "debugger",
        "default",
        "delete",
        "do",
        "else",
        "eval",
        "export",
        "extends",
        "false",
        "finally",
        "for",
        "function",
        "if",
        "import",
        "in",
        "instanceof",
        "new",
        "return",
        "super",
        "switch",
        "this",
        "throw",
        "true",
        "try",
        "typeof",
        "var",
        "void",
        "while",
        "with",
        "yield",
        "enum",
        "await",
        "implements",
        "package",
        "protected",
        "static",
        "interface",
        "private",
        "public",
    ];
    /**
     * Takes a Scheme identifier and encodes it to follow JS naming conventions.
     *
     * @param identifier An identifier name.
     * @returns An encoded identifier that follows JS naming conventions.
     */
    function encode(identifier) {
        if (JS_KEYWORDS.includes(identifier) || identifier.startsWith("$scheme_")) {
            return ("$scheme_" +
                b64Encode(identifier).replace(/([^a-zA-Z0-9_])/g, (match) => `\$${match.charCodeAt(0)}\$`));
        }
        else {
            return identifier.replace(/([^a-zA-Z0-9_])/g, (match) => `\$${match.charCodeAt(0)}\$`);
        }
    }
    /**
     * Takes a JS identifier and decodes it to follow Scheme naming conventions.
     *
     * @param identifier An encoded identifier name.
     * @returns A decoded identifier that follows Scheme naming conventions.
     */
    function decode(identifier) {
        if (identifier.startsWith("$scheme_")) {
            return b64Decode(identifier
                .slice(8)
                .replace(/\$([0-9]+)\$/g, (_, code) => String.fromCharCode(parseInt(code))));
        }
        else {
            return identifier.replace(/\$([0-9]+)\$/g, (_, code) => String.fromCharCode(parseInt(code)));
        }
    }
    // Initialize conductor (following py-slang pattern)
    // Note: This will be executed when the module is loaded
    const { runnerPlugin, conduit } = initialise(SchemeEvaluator);

    exports.AbortServiceMessage = AbortServiceMessage;
    exports.BasicEvaluator = BasicEvaluator;
    exports.ConductorError = ConductorError;
    exports.ConductorInternalError = ConductorInternalError;
    exports.EntryServiceMessage = EntryServiceMessage;
    exports.EvaluatorTypeError = EvaluatorTypeError;
    exports.HelloServiceMessage = HelloServiceMessage;
    exports.LexerError = lexerError;
    exports.ParserError = parserError;
    exports.PluginServiceMessage = PluginServiceMessage;
    exports.SchemeComplexNumber = SchemeComplexNumber;
    exports.SchemeEvaluator = SchemeEvaluator;
    exports.createProgramEnvironment = createProgramEnvironment;
    exports.decode = decode;
    exports.encode = encode;
    exports.estreeDecode = estreeDecode;
    exports.estreeEncode = estreeEncode;
    exports.evaluate = evaluate;
    exports.initialise = initialise;
    exports.parseSchemeSimple = parseSchemeSimple;
    exports.schemeParse = schemeParse;
    exports.unparse = unparse;

}));
