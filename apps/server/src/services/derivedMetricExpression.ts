import type {
  DerivedMetricValidationError,
  DerivedMetricValidationErrorCode
} from "@solar-display/shared";

const MAX_EXPRESSION_LENGTH = 512;
const MAX_TOKENS = 256;
const MAX_DEPTH = 32;
const MAX_FUNCTION_ARGUMENTS = 64;
const FUNCTIONS = new Set(["sum", "avg", "min", "max", "adaptiveRound"]);

type Token = {
  kind: "eof" | "identifier" | "number" | "operator" | "paren" | "comma";
  offset: number;
  value: string;
};

export type DerivedMetricExpressionNode =
  | { kind: "number"; value: number }
  | { kind: "input"; alias: string }
  | { kind: "unary"; operator: "+" | "-"; value: DerivedMetricExpressionNode }
  | { kind: "binary"; operator: "+" | "-" | "*" | "/"; left: DerivedMetricExpressionNode; right: DerivedMetricExpressionNode }
  | { kind: "function"; name: "sum" | "avg" | "min" | "max" | "adaptiveRound"; args: DerivedMetricExpressionNode[] };

export class DerivedMetricExpressionError extends Error {
  readonly detail: DerivedMetricValidationError;

  constructor(code: DerivedMetricValidationErrorCode, message: string, token?: Token) {
    super(message);
    this.name = "DerivedMetricExpressionError";
    this.detail = {
      code,
      message,
      ...(token ? { offset: token.offset, token: token.value } : {})
    };
  }
}

function tokenize(expression: string): Token[] {
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    throw new DerivedMetricExpressionError("expression-limit", "Expression exceeds 512 characters");
  }
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < expression.length) {
    const character = expression[offset]!;
    if (/\s/u.test(character)) {
      offset += 1;
      continue;
    }
    if (/[0-9.]/u.test(character)) {
      const start = offset;
      const match = expression.slice(offset).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/u);
      if (!match) throw new DerivedMetricExpressionError("invalid-token", "Invalid number", { kind: "number", offset, value: character });
      offset += match[0].length;
      const value = Number(match[0]);
      if (!Number.isFinite(value)) {
        throw new DerivedMetricExpressionError("non-finite-number", "Numeric literal must be finite", { kind: "number", offset: start, value: match[0] });
      }
      tokens.push({ kind: "number", offset: start, value: match[0] });
    } else if (/[A-Za-z_]/u.test(character)) {
      const start = offset;
      const match = expression.slice(offset).match(/^[A-Za-z_][A-Za-z0-9_]*/u)!;
      offset += match[0].length;
      tokens.push({ kind: "identifier", offset: start, value: match[0] });
    } else if ("+-*/".includes(character)) {
      tokens.push({ kind: "operator", offset, value: character });
      offset += 1;
    } else if (character === "(" || character === ")") {
      tokens.push({ kind: "paren", offset, value: character });
      offset += 1;
    } else if (character === ",") {
      tokens.push({ kind: "comma", offset, value: character });
      offset += 1;
    } else {
      throw new DerivedMetricExpressionError("invalid-token", "Disallowed expression token", { kind: "operator", offset, value: character });
    }
    if (tokens.length > MAX_TOKENS) {
      throw new DerivedMetricExpressionError("expression-limit", "Expression exceeds 256 tokens");
    }
  }
  tokens.push({ kind: "eof", offset: expression.length, value: "" });
  return tokens;
}

class Parser {
  private index = 0;
  private depth = 0;

  constructor(private readonly tokens: Token[], private readonly aliases: ReadonlySet<string>) {}

  parse() {
    const node = this.parseAdditive();
    if (this.current().kind !== "eof") this.fail("syntax", "Unexpected trailing token");
    return node;
  }

  private current() {
    return this.tokens[this.index]!;
  }

  private take() {
    return this.tokens[this.index++]!;
  }

  private fail(code: DerivedMetricValidationErrorCode, message: string): never {
    throw new DerivedMetricExpressionError(code, message, this.current());
  }

  private withDepth<T>(parse: () => T): T {
    this.depth += 1;
    try {
      if (this.depth > MAX_DEPTH) this.fail("expression-limit", "Expression nesting exceeds 32");
      return parse();
    } finally {
      this.depth -= 1;
    }
  }

  private parseAdditive(): DerivedMetricExpressionNode {
    let left = this.parseMultiplicative();
    while (this.current().kind === "operator" && ["+", "-"].includes(this.current().value)) {
      const operator = this.take().value as "+" | "-";
      left = { kind: "binary", operator, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  private parseMultiplicative(): DerivedMetricExpressionNode {
    let left = this.parseUnary();
    while (this.current().kind === "operator" && ["*", "/"].includes(this.current().value)) {
      const operator = this.take().value as "*" | "/";
      left = { kind: "binary", operator, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): DerivedMetricExpressionNode {
    if (this.current().kind === "operator" && ["+", "-"].includes(this.current().value)) {
      const operator = this.take().value as "+" | "-";
      return this.withDepth(() => ({ kind: "unary", operator, value: this.parseUnary() }));
    }
    return this.parsePrimary();
  }

  private parsePrimary(): DerivedMetricExpressionNode {
    const token = this.take();
    if (token.kind === "number") return { kind: "number", value: Number(token.value) };
    if (token.kind === "identifier") {
      if (this.current().value === "(") return this.parseFunction(token);
      if (!this.aliases.has(token.value)) {
        throw new DerivedMetricExpressionError("unknown-input", `Unknown input alias: ${token.value}`, token);
      }
      return { kind: "input", alias: token.value };
    }
    if (token.value === "(") {
      return this.withDepth(() => {
        const node = this.parseAdditive();
        if (this.current().value !== ")") this.fail("syntax", "Expected closing parenthesis");
        this.take();
        return node;
      });
    }
    throw new DerivedMetricExpressionError("syntax", "Expected a number, input alias, or parenthesized expression", token);
  }

  private parseFunction(token: Token): DerivedMetricExpressionNode {
    if (!FUNCTIONS.has(token.value)) {
      throw new DerivedMetricExpressionError("unknown-function", `Unknown function: ${token.value}`, token);
    }
    this.take();
    return this.withDepth(() => {
      const args: DerivedMetricExpressionNode[] = [];
      if (this.current().value === ")") this.fail("invalid-arity", `${token.value} requires at least one argument`);
      while (true) {
        args.push(this.parseAdditive());
        if (args.length > MAX_FUNCTION_ARGUMENTS) this.fail("expression-limit", "Function exceeds 64 arguments");
        if (this.current().value !== ",") break;
        this.take();
      }
      if (this.current().value !== ")") this.fail("syntax", "Expected closing function parenthesis");
      this.take();
      if (token.value === "adaptiveRound" && args.length !== 1) {
        this.fail("invalid-arity", "adaptiveRound requires exactly one argument");
      }
      return { kind: "function", name: token.value as "sum" | "avg" | "min" | "max" | "adaptiveRound", args };
    });
  }
}

export function parseDerivedMetricExpression(expression: string, aliases: ReadonlySet<string>) {
  return new Parser(tokenize(expression), aliases).parse();
}

export type DerivedMetricArithmeticResult =
  | { ok: true; value: number }
  | { code: "divide-by-zero" | "input-unavailable" | "invalid-input" | "non-finite-result"; ok: false };

export function evaluateDerivedMetricExpression(
  node: DerivedMetricExpressionNode,
  values: Readonly<Record<string, number | null | undefined>>
): DerivedMetricArithmeticResult {
  const evaluate = (current: DerivedMetricExpressionNode): DerivedMetricArithmeticResult => {
    if (current.kind === "number") {
      return Number.isFinite(current.value)
        ? { ok: true, value: current.value }
        : { code: "non-finite-result", ok: false };
    }
    if (current.kind === "input") {
      const value = values[current.alias];
      if (value === null || value === undefined) return { code: "input-unavailable", ok: false };
      return typeof value === "number" && Number.isFinite(value)
        ? { ok: true, value }
        : { code: "invalid-input", ok: false };
    }
    if (current.kind === "unary") {
      const result = evaluate(current.value);
      if (!result.ok) return result;
      const value = current.operator === "-" ? -result.value : result.value;
      return Number.isFinite(value) ? { ok: true, value } : { code: "non-finite-result", ok: false };
    }
    const operands = current.kind === "binary"
      ? [evaluate(current.left), evaluate(current.right)]
      : current.args.map(evaluate);
    const failure = operands.find((result) => !result.ok);
    if (failure && !failure.ok) return failure;
    const numbers = operands.map((result) => (result as { ok: true; value: number }).value);
    let value: number;
    if (current.kind === "binary") {
      if (current.operator === "/" && numbers[1] === 0) return { code: "divide-by-zero", ok: false };
      value = current.operator === "+" ? numbers[0]! + numbers[1]!
        : current.operator === "-" ? numbers[0]! - numbers[1]!
          : current.operator === "*" ? numbers[0]! * numbers[1]!
            : numbers[0]! / numbers[1]!;
    } else if (current.name === "adaptiveRound") {
      const digits = Math.abs(numbers[0]!) >= 100 ? 0 : Math.abs(numbers[0]!) >= 10 ? 1 : 2;
      value = Number(numbers[0]!.toFixed(digits));
    } else {
      value = current.name === "sum" ? numbers.reduce((sum, number) => sum + number, 0)
        : current.name === "avg" ? numbers.reduce((sum, number) => sum + number, 0) / numbers.length
          : current.name === "min" ? Math.min(...numbers)
            : Math.max(...numbers);
    }
    return Number.isFinite(value) ? { ok: true, value } : { code: "non-finite-result", ok: false };
  };
  return evaluate(node);
}

type UnitDimension = Readonly<Record<string, number>>;

const KNOWN_UNITS: Readonly<Record<string, UnitDimension>> = {
  "": {},
  "%": {},
  W: { power: 1 },
  kW: { power: 1 },
  MW: { power: 1 },
  Wh: { energy: 1 },
  kWh: { energy: 1 },
  MWh: { energy: 1 },
  GWh: { energy: 1 },
  kg: { mass: 1 },
  t: { mass: 1 },
  trees: { mass: 1 },
  "kg/kWh": { energy: -1, mass: 1 },
  h: { time: 1 },
  TWD: { currency: 1 },
  "TWD/kWh": { currency: 1, energy: -1 }
};

const UNIT_SCALES: Readonly<Record<string, number>> = {
  "": 1,
  "%": 1,
  W: 0.001,
  kW: 1,
  MW: 1_000,
  Wh: 0.001,
  kWh: 1,
  MWh: 1_000,
  GWh: 1_000_000,
  kg: 1,
  t: 1_000,
  trees: 1_000,
  "kg/kWh": 1,
  h: 1,
  TWD: 1,
  "TWD/kWh": 1
};

function combineDimensions(left: UnitDimension, right: UnitDimension, direction: 1 | -1) {
  const result: Record<string, number> = { ...left };
  for (const [key, exponent] of Object.entries(right)) {
    result[key] = (result[key] ?? 0) + exponent * direction;
    if (result[key] === 0) delete result[key];
  }
  return result;
}

function sameDimension(left: UnitDimension, right: UnitDimension) {
  return JSON.stringify(Object.entries(left).sort()) === JSON.stringify(Object.entries(right).sort());
}

type InferredUnit = {
  dimension: UnitDimension;
  scale: number;
};

function readKnownUnit(unitName: string): InferredUnit | null {
  if (
    !Object.prototype.hasOwnProperty.call(KNOWN_UNITS, unitName) ||
    !Object.prototype.hasOwnProperty.call(UNIT_SCALES, unitName)
  ) return null;
  const dimension = KNOWN_UNITS[unitName];
  const scale = UNIT_SCALES[unitName];
  return dimension && scale !== undefined ? { dimension, scale } : null;
}

function combineUnitScales(left: number, right: number, direction: 1 | -1) {
  const scale = direction === 1 ? left * right : left / right;
  if (!Number.isFinite(scale) || scale <= 0) throw new Error("Unit scale is not finite");
  return scale;
}

function inferUnit(
  current: DerivedMetricExpressionNode,
  units: Readonly<Record<string, string>>
): InferredUnit {
  if (current.kind === "number") return { dimension: {}, scale: 1 };
  if (current.kind === "input") {
    const unitName = units[current.alias] ?? "";
    const inferred = readKnownUnit(unitName);
    if (!inferred) throw new Error(`Unknown input unit: ${unitName}`);
    return inferred;
  }
  if (current.kind === "unary") return inferUnit(current.value, units);
  if (current.kind === "binary") {
    const left = inferUnit(current.left, units);
    const right = inferUnit(current.right, units);
    if (current.operator === "+" || current.operator === "-") {
      if (!sameDimension(left.dimension, right.dimension) || left.scale !== right.scale) {
        throw new Error("Additive operands have incompatible units");
      }
      return left;
    }
    return {
      dimension: combineDimensions(left.dimension, right.dimension, current.operator === "*" ? 1 : -1),
      scale: combineUnitScales(left.scale, right.scale, current.operator === "*" ? 1 : -1)
    };
  }
  const operands = current.args.map((argument) => inferUnit(argument, units));
  if (current.name === "adaptiveRound") {
    return operands[0]!;
  }
  if (operands.some((operand) =>
    !sameDimension(operand.dimension, operands[0]!.dimension) || operand.scale !== operands[0]!.scale
  )) {
    throw new Error(`${current.name} operands have incompatible units`);
  }
  return operands[0]!;
}

export function validateDerivedMetricExpressionUnit(
  node: DerivedMetricExpressionNode,
  units: Readonly<Record<string, string>>,
  outputUnit: string
): DerivedMetricValidationError | null {
  const output = readKnownUnit(outputUnit);
  if (!output) return { code: "unit-incompatible", message: `Unknown output unit: ${outputUnit}` };
  try {
    const inferred = inferUnit(node, units);
    return sameDimension(inferred.dimension, output.dimension)
      ? null
      : { code: "unit-incompatible", message: `Expression unit is incompatible with ${outputUnit}` };
  } catch (error) {
    return { code: "unit-incompatible", message: error instanceof Error ? error.message : "Unit validation failed" };
  }
}

export function convertDerivedMetricExpressionValue(
  node: DerivedMetricExpressionNode,
  units: Readonly<Record<string, string>>,
  outputUnit: string,
  value: number
): number | null {
  if (!Number.isFinite(value)) return null;
  const output = readKnownUnit(outputUnit);
  if (!output) return null;
  try {
    const inferred = inferUnit(node, units);
    if (!sameDimension(inferred.dimension, output.dimension)) return null;
    const converted = value * inferred.scale / output.scale;
    return Number.isFinite(converted) ? converted : null;
  } catch {
    return null;
  }
}
