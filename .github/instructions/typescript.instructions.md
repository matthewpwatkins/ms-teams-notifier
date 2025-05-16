---
applyTo: '**/*.ts'
---

# General Practices

## General Guidelines

- Follow SOLID principles
- Fix likely typos when updating existing files (but let me know)
- Identify likely bugs when reading code, but prompt me before you fix them
- New classes should be easily unit testable, with their dependencies injected via constructor
- Remove unused imports when you edit any file
- Use private helper methods to reduce duplication
- If a private method does not rely on any instance variables, make it `static`
- Use file names that match the class name, but lowercased with hyphens between words (e.g. `my-class.ts` for `MyClass`)
- Fields should be private and readonly by default, and only made public or mutable when necessary

### Non-test code

- Add JS Doc comments to all public classes, methods, and constructors

### Test code

- Use descriptive names for test files (e.g. `my-class.test.ts` for `my-class.ts`)
- Write unit tests for all public methods
- Use mocks and stubs to isolate the unit of work being tested
- Use parameterized tests when appropriate
- Use the jest framework for testing

## Style

- Use 2 spaces for indentation
- Use single quotes for strings
- No empty line between the class declaration and the first field
- The order of the class should be constants first, followed by instance variables, then constructors, then public methods, then private methods
- Put private methods at the end of the class and surround them with region comments (`// region Private helpers` and `// endregion`)
- One line `if` statements should still use braces
