## Purpose

Defines a constrained formula-authoring surface with deterministic parsing, validation, preview, and safe failure behavior so operators can create reusable derived metrics without executing arbitrary code.

## ADDED Requirements

### Requirement: Derived expressions use a constrained grammar

An authored derived expression SHALL support only registered input aliases, finite numeric literals, parentheses, binary `+`, `-`, `*`, `/`, unary sign, and allowlisted functions `sum`, `avg`, `min`, `max`, and `adaptiveRound`. `adaptiveRound` SHALL accept exactly one numeric value and apply the existing monitoring precision thresholds (`0` digits at absolute values of at least `100`, `1` digit at values of at least `10`, otherwise `2` digits). The expression engine MUST NOT execute JavaScript, SQL, shell commands, network/file access, property access, assignment, loops, arbitrary function calls, or user-defined executable code.

#### Scenario: Valid arithmetic ratio is submitted
- **WHEN** the expression is `self / consumption * 100` and both aliases are registered numeric inputs
- **THEN** the parser accepts the expression
- **AND** evaluation uses the constrained expression model rather than a general-purpose code evaluator

#### Scenario: Arbitrary function call is submitted
- **WHEN** an expression contains an unregistered function such as `fetch(...)`, `eval(...)`, or `process(...)`
- **THEN** validation rejects the expression before activation
- **AND** no arbitrary code is executed

### Requirement: Expression validation reports stable structural errors

Before a definition is saved as active, validation SHALL detect at least malformed syntax, unknown aliases, duplicate input aliases, disallowed tokens/functions, invalid function arity, non-finite numeric literals, and expressions that cannot produce a numeric result. Validation errors SHALL identify the offending category and location/token when available.

#### Scenario: Unknown alias is referenced
- **WHEN** expression `a + missingInput` is submitted but only alias `a` is registered
- **THEN** validation rejects the definition with an unknown-input error identifying `missingInput`

#### Scenario: Duplicate alias is declared
- **WHEN** two inputs are both assigned alias `power`
- **THEN** validation rejects the definition before expression evaluation

### Requirement: Runtime arithmetic failures are contained

Expression evaluation SHALL reject or safely degrade divide-by-zero, overflow/non-finite results, invalid function input sets, and unavailable required inputs according to the derived metric fallback policy. The engine MUST NOT publish `NaN`, positive/negative infinity, or silently coerced non-numeric values as valid metrics.

#### Scenario: Division produces a non-finite result
- **WHEN** a denominator evaluates to zero
- **THEN** the preview/runtime evaluation returns a structured divide-by-zero failure
- **AND** the derived metric fallback policy determines whether the last-good value is retained or the result is unavailable

### Requirement: Unit compatibility is validated for additive operations

For `+`, `-`, `sum`, `avg`, `min`, and `max`, metric inputs combined directly SHALL have compatible unit families or an explicitly normalized source contract. Multiplication and division MAY combine dimensions, but the definition SHALL declare an output unit and validation MUST reject a result whose known inferred unit family conflicts with that declaration. Allowlisted calculation-setting inputs SHALL carry their registered unit metadata into this validation. Unit checking SHALL compare magnitude as well as dimension: when the declared output unit differs in scale from the inferred result unit, evaluation SHALL apply the corresponding conversion, and a definition whose declared output unit cannot be reconciled with the inferred result SHALL be rejected. A result MUST NOT be published under a unit whose magnitude it does not carry.

#### Scenario: Incompatible values are added
- **WHEN** an expression directly adds a `kW` power input to a `kWh` energy input
- **THEN** validation rejects the definition as unit-incompatible

#### Scenario: Ratio of compatible energy inputs yields percent
- **WHEN** an expression divides one energy input by another and multiplies by 100 with output unit `%`
- **THEN** unit validation accepts the dimensionless percentage result

#### Scenario: Declared output unit differs in magnitude from the inferred result
- **WHEN** an expression multiplies a `kWh` input by a `kg/kWh` setting and declares output unit `t`
- **THEN** evaluation applies the kilogram-to-tonne conversion, or validation rejects the definition
- **AND** a kilogram-magnitude number is never published as tonnes

### Requirement: Formula preview uses an explicit trusted scope/context

Management preview SHALL evaluate a draft definition against an explicit trusted scope/context and current dependency snapshot without activating or persisting the draft definition. Preview SHALL return the computed value or structured failure, effective input scopes/values, output unit/precision, freshness, and provenance summary.

#### Scenario: Operator previews site-scoped formula as CL
- **WHEN** a draft site-scoped definition uses `output-site` inputs and the operator previews CL
- **THEN** preview resolves the inputs under CL
- **AND** no KN input is substituted unless an input explicitly selects KN
- **AND** the draft remains inactive until an explicit save/activate operation succeeds

### Requirement: Saving a definition is atomic with validation

A management mutation that creates or edits a derived definition SHALL validate the complete proposed registry state, including expression, inputs, scope, units, and dependency cycles, before replacing the active definition. A failed validation MUST leave the prior active definition and runtime behavior unchanged.

#### Scenario: Edit introduces a cycle
- **WHEN** an operator edits an active definition and the proposed state introduces a dependency cycle
- **THEN** the save is rejected
- **AND** the previous active definition continues to evaluate unchanged

### Requirement: Formula authoring separates expression from display widgets

The management formula editor SHALL create/edit reusable derived metric definitions. It SHALL NOT embed formula expressions inside page widget configuration. Widgets SHALL select the resulting semantic derived metric key through the normal data-binding capability.

#### Scenario: New derived metric is created for a KPI
- **WHEN** an operator saves a valid new derived metric and later opens Display Editor
- **THEN** compatible widgets can select that metric from the metric catalog
- **AND** the widget config stores only the metric binding, not a copy of the formula

### Requirement: Draft preview rejects malformed definitions with structured errors

Draft preview SHALL apply the same structural validation as an activating mutation before it evaluates anything. A malformed or incomplete draft payload SHALL produce a structured client validation error identifying the offending fields, and MUST NOT surface as an unhandled server error.

#### Scenario: Preview receives an incomplete draft
- **WHEN** a preview request omits required definition fields
- **THEN** the response is a structured validation error naming the missing fields
- **AND** no unhandled exception or server-error response is produced
