# Marks Practice Portal (Standalone)

A lightweight, high-performance, standalone practice portal styled in the modern **Marks App format**.

## ✨ Features
- **Pure Practice Experience**: All heavy exam simulation (CBT timers, palettes, test builder, PDF generation) stripped out for maximum responsiveness and zero clutter.
- **Fast Metadata Boot**: Loads instantly with high-speed IndexedDB caching.
- **Dynamic Subject & Chapter Navigation**: Seamless switching between Physics, Chemistry, and Mathematics.
- **Source Banks & Filters**:
  - Selected Bank (Curated 1,216 JEE Main questions with subtopic coverage)
  - HCV (HC Verma) Concept Exercises & Questions
  - QRP (Quizrr Physics chapters)
  - FIITJEE AITS Question Bank
  - MS Chouhan & Neeraj Kumar advanced banks
- **Question Modes**:
  - Filter by Exam type (JEE Main, Advanced, All)
  - Filter by Question Type (Single Correct, Multi-Correct, Numerical, Matrix, Paragraph)
  - Attempt Status tracking (hide attempted, bookmark questions, retry mistakes)
  - Detailed single-question mode with stopwatch, instant answer checking, and step-by-step solutions
  - Keyboard navigation (Left / Right arrow keys to jump between questions)

## 🚀 Running Locally
You can open `index.html` directly in any modern web browser or serve it with any static web server:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve
```
Then navigate to `http://localhost:8000`.

## 📦 Data Sources
Metadata and question resources are resolved via fast CDN endpoints (Hugging Face Datasets) as configured in `config.js`.
