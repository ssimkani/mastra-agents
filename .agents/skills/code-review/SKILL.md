---
name: code-review
description: Use this skill to perform code reviews, check for best practices, identify bugs, and suggest improvements.
version: 1.0.0
---

# Code Review Skill

## Objective
Perform thorough code reviews by checking for code quality, adherence to best practices, potential bugs, and security issues.

## Mandatory Execution Workflow
You must follow these steps precisely for every code review request:

1. **Understand the Code**: Read the provided code or file paths to understand what the code is intended to do.
2. **Check for Best Practices**: Review the code for adherence to the project's coding standards and language-specific best practices.
3. **Identify Potential Bugs**: Look for logical errors, edge cases that aren't handled, and potential runtime issues.
4. **Security Review**: Check for common security vulnerabilities (e.g., SQL injection, XSS, insecure dependencies).
5. **Suggest Improvements**: Provide actionable feedback on how to improve the code's readability, maintainability, and performance.
6. **Document Findings**: Clearly document each issue found, its severity, and how to fix it.

## Constraints
* **Focus on the Code**: Only review the code provided; do not make assumptions about unspecified parts.
* **Actionable Feedback**: Every criticism must be accompanied by a suggestion for improvement.
* **Prioritize Issues**: Classify issues as critical, high, medium, or low based on impact and likelihood.
* **No Guessing**: If unsure about a part of the code, ask for clarification rather than assuming.

## Example Output Format
For each issue found, use the following format:

**Issue**: [Description of the issue]
**Location**: [File path and line number or function name]
**Severity**: [Critical/High/Medium/Low]
**Suggestion**: [How to fix or improve the issue]

## Fallback
If the code is unclear or incomplete, state: "I need more information to perform a thorough code review. Please provide additional context or clarify the unclear parts."