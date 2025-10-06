# OpenAI Prompt Engineering Best Practices


**Official Documentation:** https://platform.openai.com/docs/guides/prompt-engineering

## Overview

This guide compiles the latest best practices for prompt engineering with OpenAI models (GPT-4.1, GPT-4o, GPT-5). OpenAI has developed six core strategies for getting better results from their language models, each with specific tactics and examples drawn from research and practical experience.

## The Six Core Strategies

### 1. Write Clear Instructions

**Principle:** Models cannot read your mind. If outputs are too long, ask for brief replies. If outputs are too simple, ask for expert-level writing. If you dislike the format, demonstrate the format you'd like to see.

**Key Tactics:**

- **Include details in your query** to get more relevant answers
- **Ask the model to adopt a persona** (e.g., "You are a senior data scientist")
- **Use delimiters** to clearly indicate distinct parts of the input (triple quotes, XML tags, section markers)
- **Specify the steps** required to complete a task
- **Provide examples** of the desired output format
- **Specify the desired length** of the output (e.g., "in 3 bullet points", "in 2 paragraphs")

**Examples:**

**Using Delimiters:**
```
USER: Summarize the text delimited by triple quotes with a haiku.

"""insert text here"""
```

**Specifying Steps:**
```
SYSTEM: Use the following step-by-step instructions to respond to user inputs.

Step 1 - The user will provide you with text in triple quotes. Summarize this text in one sentence with a prefix that says "Summary: ".

Step 2 - Translate the summary from Step 1 into Spanish, with a prefix that says "Translation: ".

USER: """insert text here"""
```

**Adopting a Persona:**
```
SYSTEM: When I ask for help to write something, you will reply with a document that contains at least one joke or playful comment in every paragraph.

USER: Write a thank you note to my steel bolt vendor for getting the delivery in on time and in short notice.
```

### 2. Provide Reference Text

**Principle:** Language models can confidently invent fake answers, especially on esoteric topics or for citations and URLs. Providing reference text can help the model answer with fewer fabrications.

**Key Tactics:**

- **Instruct the model to answer using a reference text**
- **Instruct the model to answer with citations from a reference text**

**Examples:**

**Answer Using Reference Text:**
```
SYSTEM: Use the provided articles delimited by triple quotes to answer questions. If the answer cannot be found in the articles, write "I could not find an answer."

USER: """articles here"""

Question: <user's question>
```

**Answer with Citations:**
```
SYSTEM: You will be provided with a document delimited by triple quotes and a question. Your task is to answer the question using only the provided document and to cite the passage(s) of the document used to answer the question. If the document does not contain the information needed to answer this question then simply write: "Insufficient information." If an answer to the question is provided, it must be annotated with a citation. Use the following format for to cite relevant passages ({"citation": …}).

USER: """document text"""

Question: <question>
```

### 3. Split Complex Tasks into Simpler Subtasks

**Principle:** Just as it is good practice in software engineering to decompose a complex system into a set of modular components, the same is true of tasks submitted to a language model.

**Key Tactics:**

- **Use intent classification** to identify the most relevant instructions for a user query
- **For dialogue applications that require very long conversations**, summarize or filter previous dialogue
- **Summarize long documents piecewise** and construct a full summary recursively

**Examples:**

**Intent Classification:**
```
SYSTEM: You will be provided with customer service queries. Classify each query into a primary category and a secondary category. Provide your output in json format with the keys: primary and secondary.

Primary categories: Billing, Technical Support, Account Management, or General Inquiry.

Billing secondary categories:
- Unsubscribe or upgrade
- Add a payment method
- Explanation for charge
- Dispute a charge

[Additional categories...]

USER: I need to get my internet working again.
```

### 4. Give Models Time to "Think"

**Principle:** If asked to multiply 17 x 28, you might not know it instantly, but can still work it out with time. Similarly, models make more reasoning errors when trying to answer right away, rather than taking time to work out an answer.

**Key Tactics:**

- **Instruct the model to work out its own solution** before rushing to a conclusion
- **Use inner monologue or a sequence of queries** to hide the model's reasoning process
- **Ask the model if it missed anything** on previous passes

**Examples:**

**Work Out Own Solution First (Correct Approach):**
```
SYSTEM: First work out your own solution to the problem. Then compare your solution to the student's solution and evaluate if the student's solution is correct or not. Don't decide if the student's solution is correct until you have done the problem yourself.

USER: [Problem statement and student solution]
```

**Inner Monologue:**
```
SYSTEM: Follow these steps to answer the user queries.

Step 1 - First work out your own solution to the problem. Don't rely on the student's solution since it may be incorrect. Enclose all your work for this step within triple quotes (""").

Step 2 - Compare your solution to the student's solution and evaluate if the student's solution is correct or not. Enclose all your work for this step within triple quotes (""").

Step 3 - If the student made a mistake, determine what hint you could give the student without giving away the answer. Enclose all your work for this step within triple quotes (""").

Step 4 - If the student made a mistake, provide the hint from the previous step to the student (outside of triple quotes). Instead of writing "Step 4 - ..." write "Hint:".
```

### 5. Use External Tools

**Principle:** Compensate for the weaknesses of models by feeding them the outputs of other tools. For example, a text retrieval system can tell the model about relevant documents. A code execution engine can help the model do math and run code.

**Key Tactics:**

- **Use embeddings-based search** to implement efficient knowledge retrieval
- **Use code execution** to perform more accurate calculations or call external APIs
- **Give the model access to specific functions** via function calling or tools

**Examples:**

**Code Execution:**
```
SYSTEM: You can write and execute Python code by enclosing it in triple backticks, e.g. ```code goes here```. Use this to perform calculations.

USER: Find all real-valued roots of the following polynomial: 3*x**5 - 5*x**4 - 3*x**3 - 7*x - 10.
```

### 6. Test Changes Systematically

**Principle:** Improving performance is easier if you can measure it.

**Key Tactics:**

- **Evaluate model outputs with reference to gold-standard answers**
- **Define clear success criteria** before testing
- **Use comprehensive test suites** that cover edge cases
- **Compare multiple prompt variants** side-by-side

## Advanced Techniques

### Few-Shot Prompting

```
SYSTEM: Answer in a consistent style.

USER: Teach me about patience.

A: The river that carves the deepest valley flows from a modest spring; the grandest symphony originates from a single note; the most intricate tapestry begins with a solitary thread.

USER: Teach me about the ocean.
```

### Structured Outputs

```
SYSTEM: Respond **only** with JSON using keys `city` (string) and `population` (integer).

USER: What is the largest city in the UK?

A: {"city":"London","population":9541000}
```

## Best Practices Summary

| Principle | Action |
|-----------|--------|
| **Clarity** | Write detailed, specific instructions with examples |
| **Grounding** | Provide reference text to reduce hallucinations |
| **Decomposition** | Break complex tasks into simpler subtasks |
| **Reasoning** | Give the model time to think through problems |
| **Augmentation** | Use external tools for calculations, search, and APIs |
| **Validation** | Test changes systematically with clear metrics |

## Additional Resources

- **Prompt Engineering Guide:** https://platform.openai.com/docs/guides/prompt-engineering
- **OpenAI Cookbook:** https://github.com/openai/openai-cookbook
- **GPT-4.1 Prompting Guide:** https://cookbook.openai.com/examples/gpt4-1_prompting_guide
- **Structured Outputs:** https://platform.openai.com/docs/guides/structured-outputs
