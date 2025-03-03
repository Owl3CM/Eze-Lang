# Eze-Lang

**Eze-Lang** is a high-performance localization package designed to simplify translation management. Write your translations in simple YAML files, and let Eze-Lang generate language-specific JSON files along with type-safe TypeScript definitions. With smart dynamic message composition—including placeholders, conditions, variants, and nested key lookups (parrotHolders)—Eze-Lang helps you build robust, internationalized applications with ease.

---

## Why Eze-Lang?

- **Organized Translations:**  
  Store translations in separate YAML files (e.g., `actions.yml`, `errors.yml`, `greetings.yml`, `counts.yml`) rather than one huge file. The file name defines the translation group, keeping your project clean and your translations manageable, even as your app grows.

- **Automatic TypeScript Definitions:**  
  Eze-Lang automatically generates a `Parrot.Types.ts` file at your project root for type safety and IDE autocompletion.

- **Dynamic & Static Translations:**  
  - **Static Keys:** Return fixed strings.
  - **Dynamic Keys:** Use runtime placeholders, conditions, and variants to generate context-aware messages.
  - **ParrotHolders:** Reference other keys dynamically so that you can nest translations or reuse values without redundancy.

- **Variants & Conditions:**  
  Define variants to handle enum-like situations—using the first placeholder as the key for the variant. Use conditions for numeric ranges or multiple criteria, ensuring your UI displays user-friendly messages in every situation.

- **Default Parameters & Fallbacks:**  
  Set fallback values via `DefaultParams` to gracefully handle missing placeholders. In cases where a key or placeholder isn’t found or when you want to define the gender for all translations that will use it, Eze-Lang leaves the placeholder intact, making debugging easier.

- **Performance-Optimized:**  
  Precompiled interpolation and smart merging mean minimal runtime overhead, keeping your app fast.

- **Developer Experience:**  
  Integrated with Vite for live reloading and automatic updates, Eze-Lang works seamlessly in a React environment while also being usable in any JavaScript/TypeScript project.

- **Error Handling & Debugging:**  
  Eze-Lang logs warnings for missing keys or placeholders during development. Use verbose mode (if enabled) to track interpolation steps and diagnose issues quickly.

---

## Installation

Install via npm or yarn:

```bash
npm install eze-lang
# or
yarn add eze-lang
```

---

## Configuration

Create a `parrot.config.json` file in your project root. All YAML files must reside in a `yml` folder inside the specified `outputDir`.

```json
{
  "$schema": "./node_modules/eze-lang/dist/parrot.config.schema.json",
  "languages": ["en", "ar"],
  "defaultLanguage": "en",
  "outputDir": "./parrot"
}
```

> **Note:** Organize your translations into different files as needed. The file name defines the translation group.

---

## YAML Blueprint Examples

Below are several example YAML files with real-world scenarios, inline usage examples, and expected outputs.

### 1. Actions (`actions.yml`)

```yaml
upload:
  desc: "Action for uploading a file"
  value: "Upload File"

download:
  desc: "Action for downloading a file"
  value: "Download File"

search:
  desc: "Search action with a query"
  placeholders: query
  value: "Searching for '{query}'..."
```

**Usage & Expected Output:**

```js
console.log(Parrot.upload);                // "Upload File"
console.log(Parrot.download);              // "Download File"
console.log(Parrot.search({ query: "docs" })); // "Searching for 'docs'..."
```

---

### 2. Errors (`errors.yml`)

```yaml
serverError:
  desc: "Generic server error message"
  value: "A server error occurred. Please try again later."

errorWhile:
  desc: "Error message with a dynamic action"
  placeholders: action
  value: "An error occurred while {action}"

errorWithDetail:
  desc: "Nested key lookup error message using parrotHolders"
  parrotHolders: action
  value: "Failed to perform {action}"
```

**Usage & Expected Output:**

```js
console.log(Parrot.serverError); // "A server error occurred. Please try again later."
console.log(Parrot.errorWhile({ action: "uploading" })); // "An error occurred while uploading"
console.log(Parrot.errorWithDetail({ action: "download" })); // "Failed to perform Download File"
```

---

### 3. Greetings & Variants (`greetings.yml`)

```yaml
greeting:
  desc: "Basic greeting with variants based on gender"
  placeholders: gender, name
  value: "Hello {name}"
  variants:
    male: "Hello Mr. {name}"
    female: "Hello Ms. {name}"
    default: "Hello {name}"

genderGreeting:
  desc: "Greeting with multi-conditions based on gender and name"
  placeholders: gender, name
  value: "Hi {name}"
  conditions:
    "{gender} === 'female' && {name} === 'Alice'": "Welcome, Queen Alice!"
    "{gender} === 'male'": "Greetings, Sir {name}"
    "{gender} === 'female'": "Greetings, Lady {name}"
```

**Usage & Expected Output:**

```js
console.log(Parrot.greeting({ gender: "male", name: "John" }));     // "Hello Mr. John"
console.log(Parrot.greeting({ gender: "female", name: "Sarah" }));    // "Hello Ms. Sarah"
console.log(Parrot.greeting({ gender: "default", name: "Alex" }));    // "Hello Alex"

console.log(Parrot.genderGreeting({ gender: "female", name: "Alice" })); // "Welcome, Queen Alice!"
console.log(Parrot.genderGreeting({ gender: "male", name: "Robert" }));  // "Greetings, Sir Robert"
console.log(Parrot.genderGreeting({ gender: "female", name: "Emma" }));  // "Greetings, Lady Emma"
```

> **AI Insight:** Variants allow the translation system to automatically select the correct message variant based on the first placeholder (`gender` in this case). Multi-conditions add further flexibility by handling specific cases like special names.

---

### 4. Item Counts with Conditions (`counts.yml`)

```yaml
itemCount:
  desc: "Displays item count with context-aware messages"
  placeholders: count
  value: "{count} items available"
  conditions:
    "{count} < 0": "Invalid count"
    "{count} === 0": "No items available"
    "{count} === 1": "One item available"
    "{count} > 1 && {count} < 10": "A few items available"
    "{count} >= 10 && {count} < 50": "Several items available"
    "{count} >= 50": "Many items available"
```

**Usage & Expected Output:**

```js
console.log(Parrot.itemCount({ count: -1 }));  // "Invalid count"
console.log(Parrot.itemCount({ count: 0 }));   // "No items available"
console.log(Parrot.itemCount({ count: 1 }));   // "One item available"
console.log(Parrot.itemCount({ count: 5 }));   // "A few items available"
console.log(Parrot.itemCount({ count: 15 }));  // "Several items available"
console.log(Parrot.itemCount({ count: 100 })); // "Many items available"
```

> **AI Insight:** Using conditions for numbers ensures that your messages are grammatically correct and contextually appropriate, which enhances the overall user experience.

---

### 5. Composite Custom Messages (`custom.yml`)

```yaml
failed:
  desc: "Custom message combining dynamic elements"
  placeholders: detail, action
  value: "Failed to {action} {detail}"
  
becauseOf:
  desc: "Provides a reason message"
  placeholders: user
  value: "because of {user}"

customMessage:
  desc: "Custom message combining dynamic elements from various sources"
  placeholders: user,anyText
  parrotHolders: detail, action, becauseOf
  value: ".{becauseOf} {detail}, {anyText}"
```

**Usage & Expected Output:**



```js
console.log(Parrot.customMessage({
  detail: "Operation failed",
  action: "upload",
  becauseOf: "becauseOf",
  user: "John"
}));
// Expected output: ".because of John Operation failed"
```

> **AI Insight:** Composite messages demonstrate the power of combining dynamic translations. The use of parrotHolders allows one message to pull in and compose parts from another, ensuring consistency and reusability.

---

## Build Process Overview

1. **YAML Loading & Merging:**  
   Eze-Lang scans the `yml` folder (inside `outputDir`), merges YAML blueprints into a unified configuration, and categorizes keys into _Static_ and _Dynamic_ based on the presence of placeholders or parrotHolders.

2. **Language-Specific JSON Files:**  
   For each language (e.g., `en`, `ar`), Eze-Lang generates a JSON file (e.g., `en.json`) where dynamic keys are compiled into functions for runtime interpolation.

3. **TypeScript Definitions:**  
   A `Parrot.Types.ts` file is generated in your project root, providing complete type definitions and ensuring type safety and autocompletion.

4. **Vite Plugin Integration:**  
   The provided Vite plugin automates this build process, regenerating translation files on project startup and during development.

---

## Vite Integration Example

Below is an example Vite configuration integrating Eze-Lang:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import parrotPlugin from "eze-lang/dist/vite-plugin-parrot";

export default defineConfig({
  plugins: [react(), parrotPlugin()],
  server: {
    host: "localhost",
    port: 3000,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
```

> **Tip:** The generated `Parrot.Types.ts` file will be placed at your project root, enabling type safety and autocompletion.

---

## Usage in a React Application

Below is an enhanced React example demonstrating how to use Eze-Lang in your application:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import GetLanguageConfig from "../parrot/index";
import { SetLanguage, DefaultParams } from "eze-lang";

// Set default fallback parameters if needed
DefaultParams.replace({ gender: "default" });

// Load the language configuration (using English for this example)
const Parrot = SetLanguage(GetLanguageConfig("en") as any);

function App() {
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Localized Application Example</h1>

      {/* Actions Section */}
      <section>
        <h2>Actions</h2>
        <p><strong>Upload:</strong> {Parrot.upload}</p>
        <p><strong>Search:</strong> {Parrot.search({ query: "projects" })}</p>
      </section>

      {/* Errors Section */}
      <section>
        <h2>Error Messages</h2>
        <p><strong>Server Error:</strong> {Parrot.serverError}</p>
        <p><strong>Error While:</strong> {Parrot.errorWhile({ action: "processing" })}</p>
        <p><strong>Error With Detail:</strong> {Parrot.errorWithDetail({ action: "download" })}</p>
      </section>

      {/* Greetings Section */}
      <section>
        <h2>Greetings</h2>
        <p><strong>Generic Greeting:</strong> {Parrot.greeting({ gender: "default", name: "Alex" })}</p>
        <p><strong>Gendered Greeting:</strong> {Parrot.greeting({ gender: "female", name: "Emma" })}</p>
        <p><strong>Special Greeting:</strong> {Parrot.genderGreeting({ gender: "female", name: "Alice" })}</p>
      </section>

      {/* Item Counts Section */}
      <section>
        <h2>Item Counts</h2>
        <p>{Parrot.itemCount({ count: 0 })}</p>
        <p>{Parrot.itemCount({ count: 1 })}</p>
        <p>{Parrot.itemCount({ count: 5 })}</p>
        <p>{Parrot.itemCount({ count: 20 })}</p>
        <p>{Parrot.itemCount({ count: 75 })}</p>
      </section>

      {/* Custom Messages Section */}
      <section>
        <h2>Custom Messages</h2>
        <p>
          {Parrot.customMessage({
            detail: "Operation failed",
            action: "upload",
            becauseOf: "becauseOf",
            user: "John"
          })}
        </p>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

> **Developer Note:**  
> While this example is focused on React, Eze-Lang works in any JavaScript/TypeScript environment. Its robust TypeScript definitions and runtime efficiency make it a powerful choice for all localization needs.

---

## Final Thoughts

Eze-Lang empowers developers by:

- **Effortless Organization:** Manage translations in simple YAML files without nested group names.
- **Type Safety & Autocompletion:** Benefit from generated TypeScript definitions (`Parrot.Types.ts`).
- **Dynamic Message Composition:** Utilize placeholders, conditions, variants, and parrotHolders for flexible and powerful translations.
- **Seamless Integration:** Leverage the Vite plugin for automatic updates and real-time localization in your React projects.
- **Optimized Performance:** Enjoy minimal runtime overhead with precompiled interpolation and smart merging.

Eze-Lang is crafted to make localization intuitive, efficient, and enjoyable. Dive in and experience a smoother workflow for managing translations in your projects!

*As an AI, I see Eze-Lang as a powerful tool that bridges dynamic localization requirements with excellent developer ergonomics. It leverages modern TypeScript capabilities to ensure type safety while delivering a flexible, high-performance runtime that stands out among localization solutions. Happy localizing with Eze-Lang!*
