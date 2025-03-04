# Eze-Lang

**Eze-Lang** is a high-performance localization package designed to simplify translation management. Write your translations in simple YAML files, and let Eze-Lang generate language-specific JSON files along with type-safe TypeScript definitions. With smart dynamic message composition—including placeholders, conditions, variants, and nested key lookups (parrotHolders)—Eze-Lang helps you build robust, internationalized applications with ease.

---

## Why Eze-Lang?

- **Organized Translations:**  
  Store translations in separate YAML files (e.g., `actions.yml`, `errors.yml`, `greetings.yml`, `counts.yml`) instead of one huge file. The file name defines the translation group, keeping your project clean and scalable.

- **Automatic TypeScript Definitions:**  
  Eze-Lang automatically generates a `Parrot.Types.ts` file at your project root for type safety and IDE autocompletion, reducing potential runtime errors.

- **Dynamic & Static Translations:**  
  - **Static Keys:** Return fixed strings.
  - **Dynamic Keys:** Use runtime placeholders, conditions, and variants to generate context-aware messages.
  - **ParrotHolders:** Reuse or nest translations dynamically without redundancy.

- **Variants & Conditions:**  
  Easily handle multiple message variations based on parameters like gender or numeric conditions.  
  > **Insight:** Variants allow the translation system to automatically select the correct message variant based on the first placeholder (e.g., `gender` in greetings). Multi-conditions add flexibility by handling special cases (e.g., specific names).

- **Default Parameters & Fallbacks:**  
  Set fallback values via `DefaultPlaceholders` and `DefaultVariants` to gracefully handle missing values, making debugging easier.

- **Performance-Optimized:**  
  With precompiled interpolation and smart merging, Eze-Lang delivers minimal runtime overhead.

- **Developer Experience:**  
  Integrated with Vite for live reloading and automatic updates, it works seamlessly in React and any JavaScript/TypeScript project.

- **Error Handling & Debugging:**  
  Verbose mode and detailed logging help track down missing keys or placeholders quickly.

---

## Installation

Install via npm or yarn:

```bash
npm install eze-lang
# or
yarn add eze-lang
```

> **Note:** When you install and start your project, the parrot will auto-generate if no configuration is present. All YAML files in your project are processed as described below.

---

## Quick Start

1. **Add the Vite plugin to your Vite configuration:**

```ts
import { defineConfig } from "vite";
import parrotPlugin from "eze-lang/dist/vite-plugin-parrot";

export default defineConfig({
  plugins: [parrotPlugin()],
});
```

2. **Run your project:**

```bash
npm run dev
# or
yarn dev
```

> **Note:** The Vite plugin automatically generates language-specific JSON files and TypeScript definitions on startup.

3. **Use the generated `Parrot` object in your application:**

```tsx
import { SetLanguage, DefaultPlaceholders, DefaultVariants, Parrot } from "eze-lang";
import GetLanguageConfig from "./parrot/index";

// Set default fallback parameters if needed
DefaultPlaceholders.replace({ name: "Joni" });
DefaultVariants.replace({ gender: "male" });

// Load the language configuration (using English for this example)
SetLanguage(GetLanguageConfig("en") as any);

// Use Parrot in your application
console.log(Parrot.upload); // "Upload File"
console.log(Parrot.search({ query: "projects" })); // "Searching for 'projects'..."
```

---

## Components

Eze-Lang provides three components for rendering translations in your application:

- **Static Component Usage:**

```tsx
//  Renders a static key directly
import { ParrotStaticComponent } from "eze-lang";
return <ParrotStaticComponent k="upload">
```

- **Mixed Component Usage:**

```tsx
// Renders a mixed key, requiring some parameters for interpolation
import { ParrotMixedComponent } from "eze-lang";
return <div>
          <ParrotMixedComponent k="greeting" gender="female" name="Emma" />
          <ParrotMixedComponent k="itemCount" count={5} />
          <ParrotMixedComponent k="upload">
       </div>
```

- **Dynamic Component Usage:**

```tsx
// Renders a dynamic key with placeholders and parrotHolders
import { ParrotDynamicComponent } from "eze-lang";
return <ParrotDynamicComponent k="customMessage" startParrotAction="becauseOf" endParrotAction="tryAgain" anyText="Your text here" user="John" />
```

> **Note:** The `ParrotDynamicComponent` component is used for dynamic keys with placeholders and parrotHolders. The `k` prop is mandatory, and all other props are optional.

---

## Configuration

The `parrot.config.json` file is generated in your project root. All YAML files must reside in a `yml` folder inside the specified `outputDir`.

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
console.log(Parrot.upload);                   // "Upload File"
console.log(Parrot.download);                 // "Download File"
console.log(Parrot.search({ query: "docs" }));  // "Searching for 'docs'..."
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
console.log(Parrot.serverError);               // "A server error occurred. Please try again later."
console.log(Parrot.errorWhile({ action: "uploading" }));  // "An error occurred while uploading"
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
console.log(Parrot.greeting({ gender: "male", name: "John" }));      // "Hello Mr. John"
console.log(Parrot.greeting({ gender: "female", name: "Sarah" }));     // "Hello Ms. Sarah"
console.log(Parrot.greeting({ gender: "default", name: "Alex" }));     // "Hello Alex"

console.log(Parrot.genderGreeting({ gender: "female", name: "Alice" })); // "Welcome, Queen Alice!"
console.log(Parrot.genderGreeting({ gender: "male", name: "Robert" }));  // "Greetings, Sir Robert"
console.log(Parrot.genderGreeting({ gender: "female", name: "Emma" }));  // "Greetings, Lady Emma"
```

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
console.log(Parrot.itemCount({ count: -1 }));    // "Invalid count"
console.log(Parrot.itemCount({ count: 0 }));     // "No items available"
console.log(Parrot.itemCount({ count: 1 }));     // "One item available"
console.log(Parrot.itemCount({ count: 5 }));     // "A few items available"
console.log(Parrot.itemCount({ count: 20 }));    // "Several items available"
console.log(Parrot.itemCount({ count: 75 }));    // "Many items available"
```

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
  placeholders: anyText
  parrotHolders: startParrotAction,endParrotAction
  value: "{startParrotAction} {anyText} {endParrotAction}"
```

**Usage & Expected Output:**

```js
// Using Static keys
console.log(Parrot.customMessage({
  startParrotAction: "upload",
  endParrotAction: "download",
  anyText: "and"
})); // "Upload File and Download File"

// Using Dynamic keys
console.log(Parrot.customMessage({
  startParrotAction: "becauseOf",
  endParrotAction: "tryAgain",
  anyText: "SOME CUSTOM TEXT",
  user: "John"
})); // "because of John SOME CUSTOM TEXT Please try again"

console.log(Parrot.customMessage({
  anyText: ",",
  startParrotAction: "becauseOf",
  user: "John",
  endParrotAction: "failed",
  action: "download",
  detail: "Image URL"
})); // "because of John , Failed to download Image URL"
```


---

## Final Thoughts

Eze-Lang empowers developers by:

- **Effortless Organization:** Managing translations in simple YAML files.
- **Type Safety & Autocompletion:** With generated TypeScript definitions (`Parrot.Types.ts`).
- **Dynamic Message Composition:** Using placeholders, conditions, variants, and parrotHolders for flexible translations.
- **Seamless Integration:** Leveraging the Vite plugin for real-time localization.
- **Optimized Performance:** Enjoying minimal runtime overhead with precompiled interpolation.
Eze-Lang is crafted to make localization intuitive, efficient, and enjoyable. Dive in and experience a smoother workflow for managing translations in your projects! 