---
name: smart-reader
description: Use this skill to answer questions about infrastructure, deployment, authentication, or product specs.
version: 1.0.0
---

# Smart Local RAG Playbook

## Objective
Answer user queries accurately by extracting data *only* from the most relevant reference files. Do not guess or use pre-trained knowledge if internal documents exist.

## Mandatory Execution Workflow
You must follow these steps precisely for every query:

1. **Query Formulation**: Extract the core entities, keywords, or topics from the user's prompt.
2. **Targeted Search**: Call the `skill_search` tool with your keywords and set the `topK` parameter to `2` or `3` to filter out irrelevant files.
3. **Context Pruning**: Review the filenames and short snippets returned by `skill_search`. If multiple files are returned, pick only the top 1 or 2 files that directly correlate to the question.
4. **Targeted Reading**: Call `skill_read` *only* for those selected files. Do not call `skill_read` on files that do not directly address the prompt.
5. **Formulate Response**: Answer the user using the text from the files. 

## Constraints
* **No Blanket Reads**: Never read the entire directory.
* **Citations Required**: You must end your answer by citing the exact file names you read (e.g., `Source: references/auth-flow.md`).
* **Fallback**: If `skill_search` returns zero matches, do not hallucinate. State clearly: "I searched the documentation but could not find a relevant file."
